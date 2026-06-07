import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { t, getLocale, setLocale } from '../utils/i18n.js';
import html from './kr.html?raw';

gsap.registerPlugin(ScrollTrigger);

/* ── State ─────────────────────────────────────────────── */

const WEDDING_DATE = new Date('2026-08-28T12:00:00-10:00');

let countdownInterval = null;
let previousLocale = null;
const triggers = [];
let activeOverlay = null;
let activeTimeline = null;
let activeSourceFrame = null;

/* ── Photo sequence (duplicated — independent module state) ── */

const PHOTOS = [
  '001-ch',
  '002-ch',
  '003',
  '004',
  '005-ch',
  '006-ch',
  '007',
  '008',
  '009',
  '011-ch',
  '012',
  ['013a', '013b'],
  '014-ch',
  '015',
  '016',
  '017',
  ['018b', '018a'],
  '019',
  '020-ch',
  '021',
  ['022a', '022b'],
  '023',
  '024',
  '025-ch',
  '026-ch',
];

const ROTATIONS = [-3, 4, -5, 2, -4, 6, -2, 5, -6, 3];

/* ── Helpers ───────────────────────────────────────────── */

function imgUrl(stem) {
  return `https://drg2mhzb9zcts.cloudfront.net/wedding/story-${stem}.png`;
}

function esc(str) {
  return (str || '').replace(/"/g, '&quot;');
}

function captionKey(stem) {
  return stem.replace(/-ch$/, '').replace(/-$/, '');
}

function hasChapterMarker(entry) {
  if (Array.isArray(entry)) {
    return entry.some((f) => f.endsWith('-ch'));
  }
  return entry.endsWith('-ch');
}

/* ── Countdown ─────────────────────────────────────────── */

function updateCountdown() {
  const now = new Date();
  const diff = WEDDING_DATE - now;

  if (diff <= 0) {
    const zero = document.getElementById('kr-cd-days');
    if (zero) zero.textContent = '0';
    const zh = document.getElementById('kr-cd-hours');
    if (zh) zh.textContent = '0';
    const zm = document.getElementById('kr-cd-minutes');
    if (zm) zm.textContent = '0';
    if (countdownInterval) clearInterval(countdownInterval);
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  const dEl = document.getElementById('kr-cd-days');
  const hEl = document.getElementById('kr-cd-hours');
  const mEl = document.getElementById('kr-cd-minutes');
  if (dEl) dEl.textContent = days;
  if (hEl) hEl.textContent = hours;
  if (mEl) mEl.textContent = minutes;
}

/* ── Build story chapters ──────────────────────────────── */

function buildChapters(container) {
  const chaptersEl = container.querySelector('#kr-story-chapters');
  const chapters = t('storyBook.chapters');
  const captions = t('storyBook.captions') || {};
  if (!Array.isArray(chapters)) return;

  let markup = '';
  let chapterIndex = 0;
  let flowIndex = 0;

  PHOTOS.forEach((entry, entryIndex) => {
    const isPair = Array.isArray(entry);
    const isLast = entryIndex === PHOTOS.length - 1;
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
      </article>`;
      chapterIndex++;
      // Tap hint above each chapter's photos
      markup += `
      <p class="kr-tap-hint text-center text-sm tracking-[0.2em] text-accent mt-2 mb--2 story-tap-hint-pulse">↓ ${esc(t('storyBook.tapHint'))} ↓</p>`;
    }

    if (isPair) {
      const [fileA, fileB] = entry;
      const capA = captions[captionKey(fileA)] || '';
      const capB = captions[captionKey(fileB)] || '';
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
      const cap = captions[captionKey(entry)] || '';

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
  const statement = container.querySelector('#kr-story-statement');
  if (statement) {
    const st = ScrollTrigger.create({
      trigger: statement,
      start: 'top 80%',
      end: 'top 20%',
      animation: gsap.fromTo(
        statement,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1, ease: 'none' },
      ),
      scrub: 1.5,
    });
    triggers.push(st);

    const ghosts = statement.querySelectorAll('.statement-ghost');
    ghosts.forEach((ghost) => {
      const st2 = ScrollTrigger.create({
        trigger: statement,
        start: 'top 50%',
        end: 'bottom 50%',
        animation: gsap.fromTo(
          ghost,
          { opacity: 0.15 },
          { opacity: 0.7, duration: 1, ease: 'none' },
        ),
        scrub: 2,
      });
      triggers.push(st2);
    });
  }

  const galleryThumbs = container.querySelectorAll('.kr-gallery-thumb');
  if (galleryThumbs.length) {
    const st = ScrollTrigger.create({
      trigger: '#kr-gallery',
      start: 'top 85%',
      animation: gsap.from(galleryThumbs, {
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.06,
        ease: 'power2.out',
      }),
    });
    triggers.push(st);
  }

  container
    .querySelectorAll(
      '.story-polaroid-chapter, .story-photo-single, .story-photo-pair, .story-photo-final',
    )
    .forEach((section) => {
      const textInner = section.querySelector('.story-polaroid-text-inner');
      const parallaxWraps = section.querySelectorAll('.story-polaroid-parallax');
      const frames = section.querySelectorAll('.story-polaroid-frame');

      if (textInner) {
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top 75%',
          end: 'top 25%',
          animation: gsap.fromTo(
            textInner,
            { y: 80, opacity: 0 },
            { y: 0, opacity: 1, duration: 1, ease: 'none' },
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
          start: 'top 85%',
          end: 'top 30%',
          animation: gsap.fromTo(
            frame,
            { rotation: baseRot + swingExtra, opacity: 0, scale: 0.9 },
            {
              rotation: baseRot,
              opacity: 1,
              scale: 1,
              duration: 1,
              ease: 'none',
            },
          ),
          scrub: 1.2,
        });
        triggers.push(st);
      });

      parallaxWraps.forEach((wrap) => {
        const st = ScrollTrigger.create({
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          animation: gsap.fromTo(
            wrap,
            { yPercent: -6 },
            { yPercent: 6, ease: 'none' },
          ),
          scrub: true,
        });
        triggers.push(st);
      });
    });
}

/* ── Modal ─────────────────────────────────────────────── */

function openPolaroidModal(frame) {
  if (activeOverlay) return;

  const rect = frame.getBoundingClientRect();
  const img = frame.querySelector('img');
  const imgSrc = img ? img.src : '';
  const backText = frame.dataset.back || '';
  const label = frame.dataset.label || '';
  const title = frame.dataset.title || '';

  const overlay = document.createElement('div');
  overlay.className = 'story-polaroid-overlay';
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

  frame.style.visibility = 'hidden';
  document.body.style.overflow = 'hidden';

  const backdrop = overlay.querySelector('.story-polaroid-overlay-backdrop');
  const card = overlay.querySelector('.story-polaroid-modal-card');
  const perspective = overlay.querySelector('.story-polaroid-modal-perspective');

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const modalW = Math.min(420, vw - 64);
  const modalH = Math.min(560, vh - 96);

  const centerX = (vw - modalW) / 2;
  const centerY = (vh - modalH) / 2;

  const currentRotation = gsap.getProperty(frame, 'rotation') || 0;

  gsap.set(perspective, {
    position: 'fixed',
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top,
    zIndex: 1001,
    overflow: 'visible',
    rotation: currentRotation,
  });

  gsap.set(card, {
    width: '100%',
    height: '100%',
    rotateY: 0,
  });

  const tl = gsap.timeline({
    defaults: { ease: 'power3.inOut' },
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

  overlay.addEventListener('click', closePolaroidModal);
}

function closePolaroidModal() {
  if (!activeOverlay || !activeTimeline) return;

  const overlay = activeOverlay;
  const sourceFrame = activeSourceFrame;
  activeTimeline.reverse();
  activeTimeline.then(() => {
    overlay.remove();
    document.body.style.overflow = '';
    if (sourceFrame) sourceFrame.style.visibility = '';
    activeOverlay = null;
    activeTimeline = null;
    activeSourceFrame = null;
  });
}

function handleChapterClick(e) {
  const frame = e.target.closest('.story-polaroid-frame');
  if (!frame) return;
  openPolaroidModal(frame);
}

/* ── Background music ──────────────────────────────────── */

const MUSIC_SRC = `${import.meta.env.BASE_URL}assets/warm-welcome.mp3`;
const MUSIC_VOLUME = 0.35;
const INTERACTION_EVENTS = ['pointerdown', 'keydown', 'touchstart'];

let bgMusic = null;
let musicToggleBtn = null;
let firstInteractionHandler = null;

function updateMusicButton() {
  if (!musicToggleBtn) return;
  const playing = !!bgMusic && !bgMusic.paused;
  musicToggleBtn.classList.toggle('is-playing', playing);
  musicToggleBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
}

function clearInteractionListeners() {
  if (!firstInteractionHandler) return;
  INTERACTION_EVENTS.forEach((evt) =>
    window.removeEventListener(evt, firstInteractionHandler),
  );
  firstInteractionHandler = null;
}

function setupMusic(container) {
  musicToggleBtn = container.querySelector('#kr-music-toggle');
  if (!musicToggleBtn) return;

  bgMusic = new Audio(MUSIC_SRC);
  bgMusic.loop = true;
  bgMusic.volume = MUSIC_VOLUME;
  bgMusic.preload = 'auto';

  // Only reveal the control once the file is confirmed playable. If the
  // track hasn't been added yet, `error` fires and the button stays hidden.
  bgMusic.addEventListener(
    'loadedmetadata',
    () => musicToggleBtn.classList.add('is-ready'),
    { once: true },
  );
  bgMusic.addEventListener('error', () =>
    musicToggleBtn.classList.remove('is-ready'),
  );
  bgMusic.addEventListener('play', updateMusicButton);
  bgMusic.addEventListener('pause', updateMusicButton);

  musicToggleBtn.addEventListener('click', () => {
    if (bgMusic.paused) {
      bgMusic.play().catch(() => {});
    } else {
      bgMusic.pause();
    }
  });

  // Attempt autoplay; most browsers block sound until a user gesture, so
  // fall back to starting on the visitor's first interaction with the page.
  bgMusic.play().catch(() => {
    firstInteractionHandler = () => {
      clearInteractionListeners();
      if (bgMusic) bgMusic.play().catch(() => {});
    };
    INTERACTION_EVENTS.forEach((evt) =>
      window.addEventListener(evt, firstInteractionHandler, { passive: true }),
    );
  });
}

/* ── Bank copy ─────────────────────────────────────────── */

function wireBankCopy(container) {
  container.querySelectorAll('.kr-copy-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const number = btn.dataset.copy;
      if (!number) return;

      try {
        await navigator.clipboard.writeText(number);
      } catch {
        // Fallback for older browsers
        const ta = document.createElement('textarea');
        ta.value = number;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }

      btn.textContent = '완료';
      btn.classList.add('kr-copy-done');
      setTimeout(() => {
        btn.textContent = '복사';
        btn.classList.remove('kr-copy-done');
      }, 1500);
    });
  });
}

/* ── Photo gallery + lightbox ──────────────────────────── */

// Imported through Vite so each file gets a content-hashed URL — changing a
// photo produces a new URL, so browsers never serve a stale cached version.
const galleryModules = import.meta.glob('../assets/gallery/kr-*.jpg', {
  eager: true,
  query: '?url',
  import: 'default',
});
const GALLERY_PHOTOS = Object.keys(galleryModules)
  .sort((a, b) => {
    const na = parseInt(a.match(/kr-(\d+)/)[1], 10);
    const nb = parseInt(b.match(/kr-(\d+)/)[1], 10);
    return na - nb;
  })
  .map((key) => galleryModules[key]);

let galleryLightbox = null;
let galleryIndex = 0;
let galleryKeyHandler = null;

function buildGallery(container) {
  const grid = container.querySelector('#kr-gallery');
  if (!grid) return;
  grid.innerHTML = GALLERY_PHOTOS.map(
    (src, i) => `
      <button class="kr-gallery-thumb" type="button" data-index="${i}" aria-label="사진 ${i + 1} 크게 보기">
        <img src="${src}" alt="다나 & 제이콥" loading="lazy">
      </button>`,
  ).join('');
}

function renderLightboxImage() {
  if (!galleryLightbox) return;
  const img = galleryLightbox.querySelector('.kr-lightbox-img');
  const counter = galleryLightbox.querySelector('.kr-lightbox-counter');
  img.src = GALLERY_PHOTOS[galleryIndex];
  if (counter) counter.textContent = `${galleryIndex + 1} / ${GALLERY_PHOTOS.length}`;
  gsap.fromTo(
    img,
    { opacity: 0, scale: 0.98 },
    { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' },
  );
}

function stepLightbox(dir) {
  galleryIndex = (galleryIndex + dir + GALLERY_PHOTOS.length) % GALLERY_PHOTOS.length;
  renderLightboxImage();
}

function closeLightbox() {
  if (!galleryLightbox) return;
  const overlay = galleryLightbox;
  galleryLightbox = null;
  if (galleryKeyHandler) {
    window.removeEventListener('keydown', galleryKeyHandler);
    galleryKeyHandler = null;
  }
  gsap.to(overlay, {
    opacity: 0,
    duration: 0.2,
    ease: 'power2.in',
    onComplete: () => {
      overlay.remove();
      // Only release the scroll lock if no new lightbox opened during the fade.
      if (!galleryLightbox) document.body.style.overflow = '';
    },
  });
}

function openLightbox(index) {
  if (galleryLightbox) return;
  galleryIndex = index;

  const overlay = document.createElement('div');
  overlay.className = 'kr-lightbox';
  overlay.innerHTML = `
    <div class="kr-lightbox-backdrop"></div>
    <button class="kr-lightbox-close" type="button" aria-label="닫기">&times;</button>
    <button class="kr-lightbox-nav kr-lightbox-prev" type="button" aria-label="이전 사진">&#8249;</button>
    <img class="kr-lightbox-img" src="" alt="다나 & 제이콥">
    <button class="kr-lightbox-nav kr-lightbox-next" type="button" aria-label="다음 사진">&#8250;</button>
    <span class="kr-lightbox-counter"></span>
  `;
  document.body.appendChild(overlay);
  galleryLightbox = overlay;
  document.body.style.overflow = 'hidden';

  renderLightboxImage();
  gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });

  overlay.querySelector('.kr-lightbox-backdrop').addEventListener('click', closeLightbox);
  overlay.querySelector('.kr-lightbox-close').addEventListener('click', closeLightbox);
  overlay.querySelector('.kr-lightbox-prev').addEventListener('click', (e) => {
    e.stopPropagation();
    stepLightbox(-1);
  });
  overlay.querySelector('.kr-lightbox-next').addEventListener('click', (e) => {
    e.stopPropagation();
    stepLightbox(1);
  });

  galleryKeyHandler = (e) => {
    if (e.key === 'Escape') closeLightbox();
    else if (e.key === 'ArrowLeft') stepLightbox(-1);
    else if (e.key === 'ArrowRight') stepLightbox(1);
  };
  window.addEventListener('keydown', galleryKeyHandler);
}

function handleGalleryClick(e) {
  const thumb = e.target.closest('.kr-gallery-thumb');
  if (!thumb) return;
  openLightbox(parseInt(thumb.dataset.index, 10) || 0);
}

/* ── Lifecycle ─────────────────────────────────────────── */

export function destroyKr() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  if (activeOverlay) {
    activeOverlay.remove();
    document.body.style.overflow = '';
    if (activeSourceFrame) activeSourceFrame.style.visibility = '';
    activeOverlay = null;
    activeTimeline = null;
    activeSourceFrame = null;
  }

  triggers.forEach((st) => st.kill());
  triggers.length = 0;

  // Tear down photo lightbox
  if (galleryLightbox) {
    if (galleryKeyHandler) window.removeEventListener('keydown', galleryKeyHandler);
    galleryKeyHandler = null;
    galleryLightbox.remove();
    galleryLightbox = null;
    document.body.style.overflow = '';
  }

  // Tear down background music
  clearInteractionListeners();
  if (bgMusic) {
    bgMusic.pause();
    bgMusic.src = '';
    bgMusic = null;
  }
  musicToggleBtn = null;

  // Restore previous locale
  if (previousLocale && previousLocale !== getLocale()) {
    setLocale(previousLocale);
  }
  previousLocale = null;
}

export const krPage = {
  html,

  init(container) {
    // Force Korean locale
    previousLocale = getLocale();
    if (previousLocale !== 'ko') {
      setLocale('ko');
    }

    // Hero image
    container.querySelector('#kr-hero-img').src = 'https://drg2mhzb9zcts.cloudfront.net/wedding/birds-flying.png';

    // Home i18n text
    container.querySelector('#kr-date').textContent = t('home.date');
    container.querySelector('#kr-couple').textContent = t('home.couple');
    container.querySelector('#kr-location').textContent = t('home.location');
    container.querySelector('#kr-message').textContent = t('home.message');
    container.querySelector('#kr-rsvp').textContent = t('home.rsvp');

    // Countdown labels
    const labels = container.querySelectorAll('.kr-cd-label');
    const labelKeys = ['countdown.days', 'countdown.hours', 'countdown.minutes'];
    labels.forEach((el, i) => {
      el.textContent = t(`home.${labelKeys[i]}`);
    });

    // Start countdown
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);

    // Bank copy buttons
    wireBankCopy(container);

    // Background music
    setupMusic(container);

    // Photo gallery
    buildGallery(container);
    container.querySelector('#kr-gallery').addEventListener('click', handleGalleryClick);

    // Story section i18n
    container.querySelector('#kr-story-title').textContent = t('storyBook.title');

    const statementLine1 = t('storyBook.statementLine1') || '';
    const statementLine2 = t('storyBook.statementLine2') || '';
    const statementEl = container.querySelector('#kr-story-statement-text');
    statementEl.innerHTML =
      `<span class="statement-solid">${statementLine1}</span><br>` +
      `<span class="statement-ghost">${statementLine2}</span>`;

    // Build chapters
    buildChapters(container);

    // Entrance animations for home section
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('#kr-date', { opacity: 0, y: 20, duration: 0.5 })
      .from('#kr-couple', { opacity: 0, y: 20, duration: 0.6 }, '-=0.3')
      .from('#kr-location', { opacity: 0, y: 20, duration: 0.5 }, '-=0.3')
      .from('#kr-message', { opacity: 0, y: 20, duration: 0.5 }, '-=0.1')
      .from('#kr-rsvp', { opacity: 0, y: 20, duration: 0.5 }, '-=0.2');

    // Chapter click handler
    container
      .querySelector('#kr-story-chapters')
      .addEventListener('click', handleChapterClick);

    // Set up scroll animations after layout
    requestAnimationFrame(() => {
      setupAnimations(container);
      ScrollTrigger.refresh();
    });
  },
};
