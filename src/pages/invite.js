import gsap from 'gsap';
import { t, getLocale, setLocale } from '../utils/i18n.js';
import { navigate, getCurrentPage } from '../utils/router.js';
import { guests } from '../data/guests.js';
import html from './invite.html?raw';

export const invitePage = {
  html,

  init(container) {
    const sealed = container.querySelector('#invite-sealed');
    const reveal = container.querySelector('#invite-reveal');
    const continueBtn = container.querySelector('#invite-continue');

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
    continueBtn.textContent = t('invite.continue');

    // Set revealed-state i18n text
    container.querySelector('#invite-date').textContent = t('invite.date');
    container.querySelector('#invite-location').textContent = t('invite.location');
    container.querySelector('#invite-message').textContent = t('invite.message');
    container.querySelector('#invite-action-prompt').textContent = t('invite.actionPrompt');
    container.querySelector('#invite-rsvp').textContent = t('invite.rsvp');
    container.querySelector('#invite-mailing').textContent = t('invite.mailing');
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
      .from('#invite-continue', { opacity: 0, duration: 0.6 }, '-=0.3');

    function showReveal() {
      gsap.to(sealed, {
        opacity: 0,
        y: -20,
        duration: 1,
        ease: 'power2.inOut',
        onComplete: () => {
          sealed.style.display = 'none';
          reveal.style.display = 'block';

          const isMobile = window.innerWidth <= 950;
          const flowerOpacity = isMobile ? 0.3 : 0.5;
          gsap.to(reveal.querySelectorAll('.invite-flower'), {
            opacity: flowerOpacity,
            duration: 1.2,
            ease: 'power3.out',
          });

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

    continueBtn.addEventListener('click', showReveal);
  },
};

export function destroyInvite() {
  // No countdown to clear
}
