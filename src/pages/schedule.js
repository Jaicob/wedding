import gsap from 'gsap';
import { isAuthenticated } from '../utils/auth.js';
import { t } from '../utils/i18n.js';
import html from './schedule.html?raw';

/* ── Icon SVGs keyed by event.icon ──────────────────────── */

const ICONS = {
  arrive: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  ceremony: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="5"/><circle cx="15" cy="9" r="5"/><path d="M7.5 14.5a5 5 0 0 0 9 0"/></svg>`,
  photo: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  cocktail: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M12 11v11"/><path d="M19.5 2l-7.5 9-7.5-9z"/></svg>`,
  dinner: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/></svg>`,
  dance: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M9 8l1.5 1.5L9 11"/><path d="M15 8l-1.5 1.5L15 11"/><path d="M8 15c1.333 1 2.667 1.5 4 1.5s2.667-.5 4-1.5"/></svg>`,
  conclude: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6z"/></svg>`,
};

export const schedulePage = {
  html,
  guard: () => isAuthenticated(),

  init(container) {
    container.querySelector('#schedule-title').textContent = t('schedule.title');
    container.querySelector('#schedule-subtitle').textContent = t('schedule.subtitle') || '';
    container.querySelector('#schedule-date').textContent = t('schedule.date') || '';
    container.querySelector('#schedule-venue').textContent = t('schedule.venue') || '';

    const eventsContainer = container.querySelector('#schedule-events');
    const events = t('schedule.events');

    if (Array.isArray(events)) {
      eventsContainer.innerHTML = events.map((event) => `
        <div class="schedule-event">
          <div class="schedule-event-time">${event.time || ''}</div>
          <div class="schedule-event-dot-col">
            <span class="schedule-event-dot"></span>
          </div>
          <div class="schedule-event-content">
            <span class="schedule-event-title">${event.title || ''}</span>
            ${event.icon && ICONS[event.icon] ? `<span class="schedule-event-icon">${ICONS[event.icon]}</span>` : ''}
          </div>
        </div>
      `).join('');
    }

    // Entrance animations
    gsap.from(container.querySelector('#schedule-title'), {
      opacity: 0, y: 20, duration: 0.5, ease: 'power2.out',
    });
    gsap.from(container.querySelector('#schedule-subtitle'), {
      opacity: 0, y: 20, duration: 0.5, delay: 0.1, ease: 'power2.out',
    });

    const eventEls = container.querySelectorAll('.schedule-event');
    gsap.from(eventEls, {
      opacity: 0,
      y: 15,
      duration: 0.4,
      stagger: 0.1,
      delay: 0.25,
      ease: 'power2.out',
    });
  },
};
