import gsap from 'gsap';
import { isAuthenticated } from '../utils/auth.js';
import { t } from '../utils/i18n.js';
import html from './schedule.html?raw';

export const schedulePage = {
  html,
  guard: () => isAuthenticated(),

  init(container) {
    container.querySelector('#schedule-title').textContent = t('schedule.title');

    const eventsContainer = container.querySelector('#schedule-events');
    const events = t('schedule.events');

    if (Array.isArray(events)) {
      eventsContainer.innerHTML = events.map((event, i) => `
        <div class="schedule-event relative pl-12 md:pl-0 md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 items-start">
          <!-- Time (left on desktop) -->
          <div class="md:text-right ${i % 2 === 0 ? '' : 'md:order-3 md:text-left'}">
            <p class="font-heading text-xl text-accent">${event.time || ''}</p>
          </div>

          <!-- Dot on the line -->
          <div class="absolute left-4 md:relative md:left-auto flex items-center justify-center
                      w-3 h-3 rounded-full bg-accent ring-4 ring-bg -translate-x-1/2 mt-2"></div>

          <!-- Description (right on desktop) -->
          <div class="${i % 2 === 0 ? '' : 'md:order-1 md:text-right'}">
            <p class="font-heading text-lg mb-1">${event.title || ''}</p>
            <p class="text-fg-muted text-sm">${event.description || ''}</p>
            ${event.location ? `<p class="text-fg-muted text-xs mt-1">${event.location}</p>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      eventsContainer.innerHTML = '<p class="text-center text-fg-muted italic">Schedule details coming soon.</p>';
    }

    // Entrance animations
    gsap.from('#schedule-title', { opacity: 0, y: 20, duration: 0.5, ease: 'power2.out' });
    const eventEls = container.querySelectorAll('.schedule-event');
    gsap.from(eventEls, {
      opacity: 0,
      y: 20,
      duration: 0.4,
      stagger: 0.12,
      delay: 0.2,
      ease: 'power2.out',
    });
  },
};
