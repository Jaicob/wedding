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

// Left-side photos: 0 to -30 degrees (tilt left)
const CHAPTER_ROTS = [-5, -18, -10, -25, -14];

// Right-side interstitial photos: 0 to +30 degrees (tilt right)
const INTERSTITIAL_CONFIGS = [
  { rot: 8, offset: "0%" },
  { rot: 22, offset: "0%" },
  { rot: 12, offset: "0%" },
  { rot: 28, offset: "0%" },
];

function buildChapters(container) {
  const chaptersEl = container.querySelector("#story-polaroid-chapters");
  const chapters = t("storyBook.chapters");
  if (!Array.isArray(chapters)) return;

  let markup = "";

  chapters.forEach((ch, i) => {
    const rot = CHAPTER_ROTS[i % CHAPTER_ROTS.length];
    const imgIndex = (i % 2) + 1;

    // Chapter with image left, text right
    const backText = ch.back || "";
    markup += `
      <article class="story-polaroid-chapter">
        <div class="story-polaroid-image-col">
          <div class="story-polaroid-parallax">
            <div class="story-polaroid-frame" data-base-rotation="${rot}" data-back="${backText.replace(/"/g, '&quot;')}" data-label="${ch.label}" data-title="${ch.title}">
              <img src="${import.meta.env.BASE_URL}images/story-${imgIndex}.png" alt="${ch.title}">
            </div>
          </div>
        </div>
        <div class="story-polaroid-text-col">
          <div class="story-polaroid-text-inner">
            <span class="section-label">${ch.label}</span>
            <h2 class="section-heading">${ch.title}</h2>
            <div class="body-text">${ch.text}</div>
          </div>
        </div>
      </article>`;

    // Interstitial image between chapters (not after the last one)
    if (i < chapters.length - 1) {
      const inter = INTERSTITIAL_CONFIGS[i % INTERSTITIAL_CONFIGS.length];
      const interImg = ((i + 1) % 2) + 1;
      markup += `
      <div class="story-polaroid-interstitial" style="margin-left:${inter.offset}">
        <div class="story-polaroid-parallax">
          <div class="story-polaroid-frame" data-base-rotation="${inter.rot}" data-back="${backText.replace(/"/g, '&quot;')}" data-label="${ch.label}" data-title="${ch.title}">
            <img src="${import.meta.env.BASE_URL}images/story-${interImg}.png" alt="">
          </div>
        </div>
      </div>`;
    }
  });

  chaptersEl.innerHTML = markup;
}

function setupAnimations(container) {
  // Statement text
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

  // Animate all polaroid frames (chapters + interstitials)
  container
    .querySelectorAll(
      ".story-polaroid-chapter, .story-polaroid-interstitial",
    )
    .forEach((section) => {
      const textInner = section.querySelector(".story-polaroid-text-inner");
      const parallaxWrap = section.querySelector(".story-polaroid-parallax");
      const frame = section.querySelector(".story-polaroid-frame");

      // Text fade in + slide up (only on chapters)
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

      // Polaroid swing in
      if (frame) {
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
      }

      // Parallax
      if (parallaxWrap) {
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "bottom top",
          animation: gsap.fromTo(
            parallaxWrap,
            { yPercent: -6 },
            { yPercent: 6, ease: "none" },
          ),
          scrub: true,
        });
        triggers.push(st);
      }
    });
}

function openPolaroidModal(frame) {
  if (activeOverlay) return;

  const rect = frame.getBoundingClientRect();
  const img = frame.querySelector("img");
  const imgSrc = img ? img.src : "";
  const backText = frame.dataset.back || "";
  const label = frame.dataset.label || "";
  const title = frame.dataset.title || "";

  // Create overlay
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

  // Hide the original so it doesn't double up
  frame.style.visibility = "hidden";

  // Lock scroll
  document.body.style.overflow = "hidden";

  const backdrop = overlay.querySelector(".story-polaroid-overlay-backdrop");
  const card = overlay.querySelector(".story-polaroid-modal-card");
  const perspective = overlay.querySelector(".story-polaroid-modal-perspective");

  // Calculate modal size — fit within viewport with padding
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const modalW = Math.min(420, vw - 64);
  const modalH = Math.min(560, vh - 96);

  // Center position
  const centerX = (vw - modalW) / 2;
  const centerY = (vh - modalH) / 2;

  // Match the frame's current rotation so the transition is seamless
  const currentRotation = gsap.getProperty(frame, "rotation") || 0;

  // Set perspective wrapper size + position at the frame's original location
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

  // Build timeline
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

  // Close on backdrop click
  backdrop.addEventListener("click", closePolaroidModal);
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
  if (!frame || !frame.dataset.back) return;
  openPolaroidModal(frame);
}

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
    container.querySelector("#story-polaroid-subtitle").textContent =
      t("storyBook.subtitle");

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

    // Click-to-flip modal
    container
      .querySelector("#story-polaroid-chapters")
      .addEventListener("click", handleChapterClick);

    requestAnimationFrame(() => {
      setupAnimations(container);
      ScrollTrigger.refresh();
    });
  },
};
