import gsap from 'gsap';
import { isAuthenticated } from '../utils/auth.js';
import { t } from '../utils/i18n.js';
import html from './registry.html?raw';

export const registryPage = {
  html,
  guard: () => isAuthenticated(),

  init(container) {
    container.querySelector('#registry-title').textContent = t('registry.title');
    container.querySelector('#registry-message').textContent = t('registry.message') || '';

    const link = container.querySelector('#registry-link');
    link.textContent = t('registry.linkText') || 'View Registry';
    link.href = t('registry.url') || '#';

    // Entrance animations
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('#registry-title', { opacity: 0, y: 20, duration: 0.5 })
      .from('#registry-message', { opacity: 0, y: 20, duration: 0.5 }, '-=0.3')
      .from('#registry-link', { opacity: 0, y: 20, duration: 0.5 }, '-=0.3');
  },
};
