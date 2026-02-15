import gsap from 'gsap';
import { isAuthenticated } from '../utils/auth.js';
import { t } from '../utils/i18n.js';
import html from './home.html?raw';

// Wedding date — update this to the actual date/time
const WEDDING_DATE = new Date('2026-08-28T12:00:00-10:00');

let countdownInterval = null;

function updateCountdown() {
  const now = new Date();
  const diff = WEDDING_DATE - now;

  if (diff <= 0) {
    document.getElementById('cd-days').textContent = '0';
    document.getElementById('cd-hours').textContent = '0';
    document.getElementById('cd-minutes').textContent = '0';
    if (countdownInterval) clearInterval(countdownInterval);
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  document.getElementById('cd-days').textContent = days;
  document.getElementById('cd-hours').textContent = hours;
  document.getElementById('cd-minutes').textContent = minutes;
}

export const homePage = {
  html,
  guard: () => isAuthenticated(),

  init(container) {
    // Fix image path for base URL
    container.querySelector('#home-hero-img').src = `${import.meta.env.BASE_URL}images/birds-flying.png`;

    // Set localized text
    container.querySelector('#home-date').textContent = t('home.date');
    container.querySelector('#home-couple').textContent = t('home.couple');
    container.querySelector('#home-location').textContent = t('home.location');
    container.querySelector('#home-message').textContent = t('home.message');
    container.querySelector('#home-rsvp').textContent = t('home.rsvp');

    // Countdown labels
    const labels = container.querySelectorAll('.cd-label');
    const labelKeys = ['countdown.days', 'countdown.hours', 'countdown.minutes'];
    labels.forEach((el, i) => {
      el.textContent = t(`home.${labelKeys[i]}`);
    });

    // Start countdown
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);

    // Entrance animations
    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
    tl.from('#home-date', { opacity: 0, y: 20, duration: 0.5 })
      .from('#home-couple', { opacity: 0, y: 20, duration: 0.6 }, '-=0.3')
      .from('#home-location', { opacity: 0, y: 20, duration: 0.5 }, '-=0.3')
      .from('#countdown', { opacity: 0, y: 20, duration: 0.6 }, '-=0.2')
      .from('#home-message', { opacity: 0, y: 20, duration: 0.5 }, '-=0.1')
      .from('#home-rsvp', { opacity: 0, y: 20, duration: 0.5 }, '-=0.2');
  },
};

// Cleanup countdown when leaving the page
export function destroyHome() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}
