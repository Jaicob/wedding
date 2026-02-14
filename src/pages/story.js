import gsap from 'gsap';
import { isAuthenticated } from '../utils/auth.js';
import { t } from '../utils/i18n.js';
import html from './story.html?raw';

export const storyPage = {
  html,
  guard: () => isAuthenticated(),

  init(container) {
    // Set localized text
    container.querySelector('#story-title').textContent = t('story.title');
    container.querySelector('#story-hint').textContent = t('story.hint');

    const hotspots = container.querySelectorAll('.story-hotspot');
    const keyPieces = container.querySelectorAll('.key-piece');
    const panel = container.querySelector('#story-panel');
    const storyText = container.querySelector('#story-text');
    const closeBtn = container.querySelector('#story-close');
    const chest = container.querySelector('#story-chest');
    const illustration = container.querySelector('#story-illustration');

    const visited = new Set();

    // Entrance animation
    gsap.from('#story-title', { opacity: 0, y: 20, duration: 0.5, ease: 'power2.out' });
    gsap.from('#story-hint', { opacity: 0, y: 20, duration: 0.5, delay: 0.15, ease: 'power2.out' });
    gsap.from('#story-illustration', { opacity: 0, y: 20, duration: 0.6, delay: 0.3, ease: 'power2.out' });

    // Stagger hotspot entrance
    gsap.from(hotspots, {
      scale: 0,
      opacity: 0,
      duration: 0.4,
      stagger: 0.1,
      delay: 0.6,
      ease: 'back.out(2)',
    });

    hotspots.forEach((btn) => {
      btn.addEventListener('click', () => {
        const index = parseInt(btn.dataset.index, 10);
        visited.add(index);

        // Mark hotspot as visited
        const circle = btn.querySelector('div');
        circle.classList.remove('bg-accent/30');
        circle.classList.add('bg-accent/70');
        const pulse = circle.querySelector('span');
        if (pulse) pulse.classList.remove('animate-pulse');

        // Light up key piece
        if (keyPieces[index]) {
          keyPieces[index].classList.add('bg-accent');
        }

        // Show story text
        const stories = t('story.entries');
        if (Array.isArray(stories) && stories[index]) {
          storyText.textContent = stories[index];
        } else {
          storyText.textContent = t('story.placeholder') || `Story part ${index + 1}`;
        }

        panel.classList.remove('hidden');
        gsap.fromTo(panel, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.3 });

        // Check if all visited
        if (visited.size === hotspots.length) {
          unlockChest();
        }
      });
    });

    closeBtn?.addEventListener('click', () => {
      gsap.to(panel, {
        opacity: 0,
        y: 10,
        duration: 0.2,
        onComplete: () => panel.classList.add('hidden'),
      });
    });

    function unlockChest() {
      // Hide illustration and panel after a moment
      setTimeout(() => {
        gsap.to(illustration, { opacity: 0, y: -20, duration: 0.4 });
        gsap.to(panel, { opacity: 0, duration: 0.3 });

        setTimeout(() => {
          illustration.classList.add('hidden');
          panel.classList.add('hidden');

          chest.classList.remove('hidden');
          container.querySelector('#chest-title').textContent = t('story.chest');
          container.querySelector('#chest-message').textContent = t('story.wisdom') || '';

          gsap.from(chest, { opacity: 0, scale: 0.9, duration: 0.6, ease: 'power2.out' });
        }, 500);
      }, 1000);
    }
  },
};
