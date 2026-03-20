import gsap from 'gsap';
import { t } from '../utils/i18n.js';
import html from './faq.html?raw';

export const faqPage = {
  html,
  init(container) {
    container.querySelector('#faq-title').textContent = t('faq.title');
    container.querySelector('#faq-subtitle').textContent = t('faq.subtitle') || '';

    const itemsContainer = container.querySelector('#faq-items');
    const items = t('faq.items');

    if (Array.isArray(items)) {
      itemsContainer.innerHTML = items.map((item) => `
        <div class="faq-item border-t border-fg/10 pt-6">
          <h3 class="text-[0.6875rem] tracking-[0.2em] uppercase text-fg font-medium mb-3">${item.question}</h3>
          <p class="text-fg-light leading-[1.75] text-sm">${item.answer}</p>
        </div>
      `).join('');
    }

    // Entrance animations
    gsap.from(container.querySelector('#faq-title'), {
      opacity: 0, y: 20, duration: 0.5, ease: 'power2.out',
    });
    gsap.from(container.querySelector('#faq-subtitle'), {
      opacity: 0, y: 20, duration: 0.5, delay: 0.1, ease: 'power2.out',
    });

    const faqEls = container.querySelectorAll('.faq-item');
    gsap.from(faqEls, {
      opacity: 0,
      y: 15,
      duration: 0.4,
      stagger: 0.1,
      delay: 0.25,
      ease: 'power2.out',
    });
  },
};
