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
    // Localized titles
    container.querySelector('#travel-title').textContent = t('travel.title');
    container.querySelector('#travel-flights-title').textContent = t('travel.flightsTitle') || 'Recommended Flights';
    container.querySelector('#travel-hotel-title').textContent = t('travel.hotelTitle') || 'Main Hotel';
    container.querySelector('#travel-alt-title').textContent = t('travel.altTitle') || 'Alternative Hotels';
    container.querySelector('#travel-tips-title').textContent = t('travel.tipsTitle') || 'Travel Tips';

    // Side nav labels
    const navLabels = { flights: 'travel.navFlights', hotel: 'travel.navHotel', alt: 'travel.navAlt', tips: 'travel.navTips' };
    container.querySelectorAll('[data-nav]').forEach(el => {
      const key = el.getAttribute('data-nav');
      if (navLabels[key]) el.textContent = t(navLabels[key]) || key;
    });

    // --- Flights ---
    const flights = t('travel.flights');
    const flightsContainer = container.querySelector('#travel-flights');
    if (Array.isArray(flights)) {
      flightsContainer.innerHTML = flights.map(f => `
        <div class="travel-card group p-6 border border-fg/10 rounded-lg bg-bg-dark
                    hover:border-accent/30 transition-colors duration-300 relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full bg-accent/0 group-hover:bg-accent/40 transition-colors duration-300"></div>
          <p class="font-heading text-xl mb-1">${f.airline || ''}</p>
          <p class="text-fg-muted text-sm mb-2">${f.route || ''}</p>
          <p class="text-fg-light text-sm italic">${f.note || ''}</p>
        </div>
      `).join('');
    } else {
      flightsContainer.innerHTML = '<p class="text-fg-muted italic">Flight details coming soon.</p>';
    }

    // --- Main Hotel ---
    const hotel = t('travel.hotel');
    const hotelContainer = container.querySelector('#travel-hotel');
    if (typeof hotel === 'object' && hotel !== null) {
      hotelContainer.innerHTML = `
        <p class="font-heading text-2xl mb-2">${hotel.name || ''}</p>
        ${hotel.address ? `<p class="text-fg-muted text-sm mb-1">${hotel.address}</p>` : ''}
        <p class="text-fg-light text-sm mb-4">${hotel.booking || ''}</p>
        ${hotel.link ? `<a href="${hotel.link}" target="_blank" rel="noopener noreferrer"
          class="inline-block px-6 py-2 text-sm tracking-widest uppercase border border-accent text-accent
                 hover:bg-accent hover:text-bg transition-all duration-300">${hotel.linkText || 'Book Now'}</a>` : ''}
      `;
    } else {
      hotelContainer.innerHTML = '<p class="text-fg-muted italic">Hotel details coming soon.</p>';
    }

    // --- Alternative Hotels ---
    const altHotels = t('travel.altHotels');
    const altContainer = container.querySelector('#travel-alt-hotels');
    if (Array.isArray(altHotels)) {
      altContainer.innerHTML = altHotels.map(h => `
        <div class="travel-card group p-6 border border-fg/10 rounded-lg bg-bg-dark
                    hover:border-accent/30 transition-colors duration-300 relative overflow-hidden">
          <div class="absolute top-0 left-0 w-1 h-full bg-accent/0 group-hover:bg-accent/40 transition-colors duration-300"></div>
          <p class="font-heading text-xl mb-1">${h.name || ''}</p>
          <p class="text-fg-muted text-sm">${h.note || ''}</p>
        </div>
      `).join('');
    } else {
      altContainer.innerHTML = '<p class="text-fg-muted italic">Details coming soon.</p>';
    }

    // --- Travel Tips ---
    const tips = t('travel.tips');
    const tipsContainer = container.querySelector('#travel-tips');
    if (Array.isArray(tips)) {
      tipsContainer.innerHTML = tips.map((tip, i) => `
        <div class="travel-card flex gap-4 items-start p-5 border border-fg/10 rounded-lg bg-bg-dark
                    hover:border-accent/30 transition-colors duration-300">
          <span class="flex-shrink-0 w-7 h-7 rounded-full border border-accent/30 flex items-center justify-center
                       text-accent text-xs font-bold">${i + 1}</span>
          <p class="text-fg-light pt-0.5">${tip}</p>
        </div>
      `).join('');
    } else {
      tipsContainer.innerHTML = '<p class="text-fg-muted italic">Tips coming soon.</p>';
    }

    // --- Animations ---

    // Hero entrance
    const reveals = container.querySelectorAll('.travel-reveal');
    gsap.from(reveals, {
      opacity: 0,
      y: 30,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out',
    });

    // Each section slides in on scroll
    const sections = container.querySelectorAll('.travel-section');
    sections.forEach(section => {
      // Section header line + title
      const header = section.querySelector('.flex');
      const lines = section.querySelectorAll('.h-px');
      const cards = section.querySelectorAll('.travel-card, #travel-hotel');

      gsap.from(header, {
        opacity: 0,
        y: 40,
        duration: 0.6,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });

      // Divider lines expand from center
      gsap.from(lines, {
        scaleX: 0,
        duration: 0.8,
        delay: 0.2,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: section,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      });

      // Cards stagger in
      if (cards.length) {
        gsap.from(cards, {
          opacity: 0,
          y: 30,
          duration: 0.5,
          stagger: 0.1,
          delay: 0.3,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            toggleActions: 'play none none none',
          },
        });
      }
    });
  },
};
