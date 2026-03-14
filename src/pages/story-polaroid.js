import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isAuthenticated } from "../utils/auth.js";
import { t } from "../utils/i18n.js";
import html from "./story-polaroid.html?raw";

gsap.registerPlugin(ScrollTrigger);

const triggers = [];
let activeOverlay = null;
let activeTimeline = null;
let activeSourceFrame = null;

/* ── Photo sequence ────────────────────────────────────────
   Each entry is a filename stem (without "story-" prefix / ".png" suffix).
   Arrays = paired side-by-side.
   ────────────────────────────────────────────────────────── */

const PHOTOS = [
  "001-ch",
  "002-ch",
  "003",
  "004",
  "005-ch",
  "006-ch",
  "007",
  "008",
  "009",
  // "010-ch",
  "011-ch",
  "012",
  ["013a", "013b"],
  "014-ch",
  "015",
  "016",
  "017",
  ["018b", "018a"],
  "019",
  "020-ch",
  "021",
  ["022a", "022b"],
  "023",
  "024",
  "025-ch",
  "026-ch",
];

const ROTATIONS = [-3, 4, -5, 2, -4, 6, -2, 5, -6, 3];

/* ── Helpers ───────────────────────────────────────────── */

function imgUrl(stem) {
  return `https://drg2mhzb9zcts.cloudfront.net/wedding/story-${stem}.png`;
  // return `/images/story-${stem}.png`;
}

function esc(str) {
  return (str || "").replace(/"/g, "&quot;");
}

function captionKey(stem) {
  return stem.replace(/-ch$/, "").replace(/-$/, "");
}

function hasChapterMarker(entry) {
  if (Array.isArray(entry)) {
    return entry.some((f) => f.endsWith("-ch"));
  }
  return entry.endsWith("-ch");
}

/* ── Build page content ────────────────────────────────── */

function buildChapters(container) {
  const chaptersEl = container.querySelector("#story-polaroid-chapters");
  const chapters = t("storyBook.chapters");
  const captions = t("storyBook.captions") || {};
  if (!Array.isArray(chapters)) return;

  let markup = "";
  let chapterIndex = 0;
  let flowIndex = 0;

  PHOTOS.forEach((entry, entryIndex) => {
    const isPair = Array.isArray(entry);
    const isLast = entryIndex === PHOTOS.length - 1;

    // Insert chapter BEFORE the -ch image
    const triggersChapter = hasChapterMarker(entry);

    if (triggersChapter && chapterIndex < chapters.length) {
      const ch = chapters[chapterIndex];

      markup += `
      <article class="story-polaroid-chapter">
        <div class="story-polaroid-text-inner">
          <span class="section-label">${ch.label}</span>
          <h2 class="section-heading">${ch.title}</h2>
          <div class="body-text">${ch.text}</div>
        </div>
      </article>
      <p class="story-tap-hint text-center text-sm tracking-[0.2em] text-accent mt-2 mb--2 story-tap-hint-pulse">↓ ${esc(t('storyBook.tapHint'))} ↓</p>`;

      chapterIndex++;
    }

    if (isPair) {
      const [fileA, fileB] = entry;
      const capA = captions[captionKey(fileA)] || "";
      const capB = captions[captionKey(fileB)] || "";
      const rotA = ROTATIONS[flowIndex % ROTATIONS.length];
      const rotB = ROTATIONS[(flowIndex + 1) % ROTATIONS.length];

      markup += `
      <div class="story-photo-pair">
        <div class="story-polaroid-parallax">
          <div class="story-polaroid-frame" data-base-rotation="${rotA}" data-back="${esc(capA)}" data-label="" data-title="">
            <img src="${imgUrl(fileA)}" alt="" loading="lazy">
          </div>
        </div>
        <div class="story-polaroid-parallax">
          <div class="story-polaroid-frame" data-base-rotation="${rotB}" data-back="${esc(capB)}" data-label="" data-title="">
            <img src="${imgUrl(fileB)}" alt="" loading="lazy">
          </div>
        </div>
      </div>`;
      flowIndex += 2;
    } else {
      const rot = ROTATIONS[flowIndex % ROTATIONS.length];
      const cap = captions[captionKey(entry)] || "";

      if (isLast) {
        markup += `
      <div class="story-photo-final">
        <div class="story-polaroid-parallax">
          <div class="story-polaroid-frame" data-base-rotation="0" data-back="${esc(cap)}" data-label="" data-title="">
            <img src="${imgUrl(entry)}" alt="" loading="lazy">
          </div>
        </div>
      </div>`;
      } else {
        const stagger = flowIndex % 4;
        markup += `
      <div class="story-photo-single" data-stagger="${stagger}">
        <div class="story-polaroid-parallax">
          <div class="story-polaroid-frame" data-base-rotation="${rot}" data-back="${esc(cap)}" data-label="" data-title="">
            <img src="${imgUrl(entry)}" alt="" loading="lazy">
          </div>
        </div>
      </div>`;
      }
      flowIndex++;
    }
  });

  chaptersEl.innerHTML = markup;
}

/* ── Animations ────────────────────────────────────────── */

function setupAnimations(container) {
  const statement = container.querySelector("#story-polaroid-statement");
  if (statement) {
    const st = ScrollTrigger.create({
      trigger: statement,
      start: "top 80%",
      end: "top 20%",
      animation: gsap.fromTo(
        statement,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1, ease: "none" },
      ),
      scrub: 1.5,
    });
    triggers.push(st);

    const ghosts = statement.querySelectorAll(".statement-ghost");
    ghosts.forEach((ghost) => {
      const st2 = ScrollTrigger.create({
        trigger: statement,
        start: "top 50%",
        end: "bottom 50%",
        animation: gsap.fromTo(
          ghost,
          { opacity: 0.15 },
          { opacity: 0.7, duration: 1, ease: "none" },
        ),
        scrub: 2,
      });
      triggers.push(st2);
    });
  }

  container
    .querySelectorAll(
      ".story-polaroid-chapter, .story-photo-single, .story-photo-pair, .story-photo-final",
    )
    .forEach((section) => {
      const textInner = section.querySelector(".story-polaroid-text-inner");
      const parallaxWraps = section.querySelectorAll(
        ".story-polaroid-parallax",
      );
      const frames = section.querySelectorAll(".story-polaroid-frame");

      if (textInner) {
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top 75%",
          end: "top 25%",
          animation: gsap.fromTo(
            textInner,
            { y: 80, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: "none" },
          ),
          scrub: 1.5,
        });
        triggers.push(st);
      }

      frames.forEach((frame) => {
        const baseRot = parseFloat(frame.dataset.baseRotation) || 0;
        const swingExtra = baseRot > 0 ? 12 : -12;

        const st = ScrollTrigger.create({
          trigger: section,
          start: "top 85%",
          end: "top 30%",
          animation: gsap.fromTo(
            frame,
            { rotation: baseRot + swingExtra, opacity: 0, scale: 0.9 },
            {
              rotation: baseRot,
              opacity: 1,
              scale: 1,
              duration: 1,
              ease: "none",
            },
          ),
          scrub: 1.2,
        });
        triggers.push(st);
      });

      parallaxWraps.forEach((wrap) => {
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          animation: gsap.fromTo(
            wrap,
            { yPercent: -6 },
            { yPercent: 6, ease: "none" },
          ),
          scrub: true,
        });
        triggers.push(st);
      });
    });
}

/* ── Modal ─────────────────────────────────────────────── */

function dismissTapHint() {
  const hints = document.querySelectorAll(".story-tap-hint");
  hints.forEach((hint) => {
    if (hint.style.opacity !== "0") {
      gsap.to(hint, { opacity: 0, y: -8, duration: 0.6, ease: "power2.out", onComplete: () => hint.remove() });
    }
  });
}

function openPolaroidModal(frame) {
  if (activeOverlay) return;
  dismissTapHint();

  const rect = frame.getBoundingClientRect();
  const img = frame.querySelector("img");
  const imgSrc = img ? img.src : "";
  const backText = frame.dataset.back || "";
  const label = frame.dataset.label || "";
  const title = frame.dataset.title || "";

  const overlay = document.createElement("div");
  overlay.className = "story-polaroid-overlay";
  overlay.innerHTML = `
    <div class="story-polaroid-overlay-backdrop"></div>
    <div class="story-polaroid-modal-perspective">
      <div class="story-polaroid-modal-card">
        <div class="story-polaroid-modal-front">
          <img src="${imgSrc}" alt="${title}">
        </div>
        <div class="story-polaroid-modal-back">
          <span class="section-label">${label}</span>
          <h3 class="section-heading" style="font-size: clamp(1.5rem, 3vw, 2.5rem);">${title}</h3>
          <p class="body-text">${backText}</p>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  activeOverlay = overlay;
  activeSourceFrame = frame;

  frame.style.visibility = "hidden";
  document.body.style.overflow = "hidden";

  const backdrop = overlay.querySelector(".story-polaroid-overlay-backdrop");
  const card = overlay.querySelector(".story-polaroid-modal-card");
  const perspective = overlay.querySelector(
    ".story-polaroid-modal-perspective",
  );

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const modalW = Math.min(420, vw - 64);
  const modalH = Math.min(560, vh - 96);

  const centerX = (vw - modalW) / 2;
  const centerY = (vh - modalH) / 2;

  const currentRotation = gsap.getProperty(frame, "rotation") || 0;

  gsap.set(perspective, {
    position: "fixed",
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top,
    zIndex: 1001,
    overflow: "visible",
    rotation: currentRotation,
  });

  gsap.set(card, {
    width: "100%",
    height: "100%",
    rotateY: 0,
  });

  const tl = gsap.timeline({
    defaults: { ease: "power3.inOut" },
  });

  tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.4 });
  tl.to(
    perspective,
    {
      left: centerX,
      top: centerY,
      width: modalW,
      height: modalH,
      rotation: 0,
      duration: 0.8,
    },
    0.1,
  );
  tl.to(card, { rotateY: 180, duration: 0.8 }, 0.1);

  activeTimeline = tl;

  overlay.addEventListener("click", closePolaroidModal);
}

function closePolaroidModal() {
  if (!activeOverlay || !activeTimeline) return;

  const overlay = activeOverlay;
  const sourceFrame = activeSourceFrame;
  activeTimeline.reverse();
  activeTimeline.then(() => {
    overlay.remove();
    document.body.style.overflow = "";
    if (sourceFrame) sourceFrame.style.visibility = "";
    activeOverlay = null;
    activeTimeline = null;
    activeSourceFrame = null;
  });
}

function handleChapterClick(e) {
  const frame = e.target.closest(".story-polaroid-frame");
  if (!frame) return;
  openPolaroidModal(frame);
}

/* ── Lifecycle ─────────────────────────────────────────── */

export function destroyStoryPolaroid() {
  if (activeOverlay) {
    activeOverlay.remove();
    document.body.style.overflow = "";
    if (activeSourceFrame) activeSourceFrame.style.visibility = "";
    activeOverlay = null;
    activeTimeline = null;
    activeSourceFrame = null;
  }
  triggers.forEach((st) => st.kill());
  triggers.length = 0;
}

export const storyPolaroidPage = {
  html,
  guard: () => isAuthenticated(),

  init(container) {
    container.querySelector("#story-polaroid-title").textContent =
      t("storyBook.title");

    const statementLine1 = t("storyBook.statementLine1") || "";
    const statementLine2 = t("storyBook.statementLine2") || "";
    const statementEl = container.querySelector(
      "#story-polaroid-statement-text",
    );
    statementEl.innerHTML =
      `<span class="statement-solid">${statementLine1}</span><br>` +
      `<span class="statement-ghost">${statementLine2}</span>`;

    buildChapters(container);

    gsap.from("#story-polaroid-title", {
      opacity: 0,
      y: 30,
      duration: 0.7,
      ease: "power2.out",
    });
    gsap.from("#story-polaroid-subtitle", {
      opacity: 0,
      y: 30,
      duration: 0.7,
      delay: 0.2,
      ease: "power2.out",
    });

    container
      .querySelector("#story-polaroid-chapters")
      .addEventListener("click", handleChapterClick);

    requestAnimationFrame(() => {
      setupAnimations(container);
      ScrollTrigger.refresh();
    });
  },
};
