import gsap from 'gsap';
import { verifyPassword, setAuthenticated } from '../utils/auth.js';
import { t, getLocale, setLocale } from '../utils/i18n.js';
import { navigate, getCurrentPage } from '../utils/router.js';
import { guests } from '../data/guests.js';
import html from './invite.html?raw';

export const invitePage = {
  html,

  init(container) {
    const sealed = container.querySelector('#invite-sealed');
    const reveal = container.querySelector('#invite-reveal');
    const input = container.querySelector('#invite-input');
    const submit = container.querySelector('#invite-submit');
    const error = container.querySelector('#invite-error');

    // Personalization from ?g= query param
    const dearEl = container.querySelector('#invite-dear');
    const guestKey = new URLSearchParams(window.location.search).get('g');
    const guestName = guestKey && guests[guestKey];
    if (guestName) {
      dearEl.textContent = `Dear ${guestName},`;
      dearEl.classList.remove('hidden');
    }

    // Set sealed-state i18n text
    container.querySelector('#invite-line1').textContent = t('invite.line1');
    container.querySelector('#invite-line2').textContent = t('invite.line2');
    container.querySelector('#invite-couple').textContent = t('invite.couple');
    input.placeholder = t('invite.placeholder');
    submit.textContent = t('invite.submit');
    error.textContent = t('invite.error');

    // Set revealed-state i18n text
    container.querySelector('#invite-date').textContent = t('invite.date');
    container.querySelector('#invite-location').textContent = t('invite.location');
    container.querySelector('#invite-message').textContent = t('invite.message');
    container.querySelector('#invite-rsvp').textContent = t('invite.rsvp');
    container.querySelector('#invite-rsvp-by').textContent = t('invite.rsvpBy');
    container.querySelector('#invite-already').textContent = t('invite.alreadyRsvp');
    container.querySelector('#invite-view-more').textContent = t('invite.viewMore');

    // Language toggle
    const langToggle = container.querySelector('#invite-lang-toggle');
    langToggle.textContent = getLocale() === 'en' ? '한국어' : 'English';
    langToggle.addEventListener('click', () => {
      const next = getLocale() === 'en' ? 'ko' : 'en';
      setLocale(next);
      navigate(getCurrentPage(), { replace: true, skipTransition: true });
    });

    // Entrance animation — slow, elegant stagger
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    if (guestName) {
      tl.from('#invite-dear', { opacity: 0, y: 12, duration: 1 });
    }
    tl.from('#invite-line1', { opacity: 0, y: 12, duration: 1 }, guestName ? '-=0.7' : 0)
      .from('#invite-line2', { opacity: 0, y: 12, duration: 1 }, '-=0.7')
      .from('#invite-couple', { opacity: 0, y: 16, duration: 1.2 }, '-=0.6')
      .from('#invite-input', { opacity: 0, duration: 0.8 }, '-=0.4')
      .from('#invite-submit', { opacity: 0, duration: 0.6 }, '-=0.3');

    input.focus();

    async function attemptLogin() {
      const value = input.value;
      if (!value) return;

      const valid = await verifyPassword(value);
      if (!valid) {
        gsap.fromTo(input, { x: -6 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        error.classList.remove('opacity-0');
        error.classList.add('opacity-100');
        input.value = '';
        input.focus();
        setTimeout(() => {
          error.classList.remove('opacity-100');
          error.classList.add('opacity-0');
        }, 2500);
        return;
      }

      // Success
      setAuthenticated();

      // Animate sealed section out — slow dissolve
      gsap.to(sealed, {
        opacity: 0,
        y: -20,
        duration: 1,
        ease: 'power2.inOut',
        onComplete: () => {
          sealed.style.display = 'none';

          // Show revealed section as flex for vertical centering
          reveal.style.display = 'block';

          // Animate flowers with responsive opacity
          const isMobile = window.innerWidth <= 950;
          const flowerOpacity = isMobile ? 0.3 : 0.5;
          gsap.to(reveal.querySelectorAll('.invite-flower'), {
            opacity: flowerOpacity,
            duration: 1.2,
            ease: 'power3.out',
          });

          // Animate content elements
          const els = reveal.querySelectorAll('.invite-el');
          els.forEach((el, i) => {
            gsap.to(el, {
              opacity: 1,
              y: 0,
              duration: 0.9,
              ease: 'power3.out',
              delay: i * 0.15,
            });
          });
        },
      });
    }

    submit.addEventListener('click', attemptLogin);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptLogin();
    });
  },
};

export function destroyInvite() {
  // No countdown to clear
}
