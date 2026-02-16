import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isAuthenticated } from '../utils/auth.js';
import { t } from '../utils/i18n.js';
import html from './travel.html?raw';

gsap.registerPlugin(ScrollTrigger);

export const travelPage = {
  html,
  guard: () => isAuthenticated(),

  init(container) {
    // Bind all data-i18n elements
    container.querySelectorAll('[data-i18n]').forEach(el => {
      const value = t(el.getAttribute('data-i18n'));
      if (typeof value === 'string') el.textContent = value;
    });

    // Hotel link href
    const hotel = t('travel.hotel');
    if (typeof hotel === 'object' && hotel.link) {
      const hotelLink = container.querySelector('#travel-hotel-link');
      if (hotelLink) hotelLink.href = hotel.link;
    }

    // Alt hotel link hrefs
    const altHotels = t('travel.altHotels');
    if (Array.isArray(altHotels)) {
      altHotels.forEach((h, i) => {
        const el = container.querySelector(`#travel-alt-hotel-${i}`);
        if (el && h.link) el.href = h.link;
      });
    }

    // Discount code (build-time injected)
    const discountCode = typeof __DISCOUNT_CODE__ !== 'undefined' ? __DISCOUNT_CODE__ : '';
    if (discountCode) {
      const discountEl = container.querySelector('#travel-discount');
      const codeEl = container.querySelector('#travel-discount-code');
      if (discountEl) discountEl.classList.replace('hidden', 'flex');
      if (codeEl) codeEl.textContent = discountCode;
    }

    // --- Animations ---

    // Hero entrance
    gsap.from(container.querySelectorAll('.travel-reveal'), {
      opacity: 0,
      y: 30,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out',
    });

    // Each section slides in on scroll
    container.querySelectorAll('.travel-section').forEach(section => {
      const header = section.querySelector('h3');
      const cards = section.querySelectorAll('.travel-card');

      if (header) {
        gsap.from(header, {
          opacity: 0,
          y: 30,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        });
      }

      cards.forEach(card => {
        gsap.from(card, {
          opacity: 0,
          y: 25,
          duration: 0.5,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 90%',
            toggleActions: 'play none none none',
          },
        });
      });
    });
  },
};
