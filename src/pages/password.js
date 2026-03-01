import gsap from 'gsap';
import { verifyPassword, setAuthenticated } from '../utils/auth.js';
import { navigate, getCurrentPage } from '../utils/router.js';
import { t, getLocale, setLocale } from '../utils/i18n.js';
import html from './password.html?raw';

export const passwordPage = {
  html,

  init(container) {
    const input = container.querySelector('#pw-input');
    const submit = container.querySelector('#pw-submit');
    const error = container.querySelector('#pw-error');
    const logo = container.querySelector('#pw-logo');
    const form = container.querySelector('#pw-form');
    const scene = container.querySelector('#password-scene');

    // Set localized text
    input.placeholder = t('password.placeholder');
    submit.textContent = t('password.submit');
    error.textContent = t('password.error');

    // Language toggle
    const langToggle = container.querySelector('#pw-lang-toggle');
    langToggle.textContent = getLocale() === 'en' ? '한국어' : 'English';
    langToggle.addEventListener('click', () => {
      const next = getLocale() === 'en' ? 'ko' : 'en';
      setLocale(next);
      navigate(getCurrentPage(), { replace: true, skipTransition: true });
    });

    // Entrance animation — slower, more elegant
    gsap.from(logo, { opacity: 0, y: -20, duration: 1.2, ease: 'power3.out' });
    gsap.from(form, { opacity: 0, y: 14, duration: 1, delay: 0.5, ease: 'power3.out' });

    input.focus();

    async function attemptLogin() {
      const value = input.value;
      if (!value) return;

      const valid = await verifyPassword(value);
      if (!valid) {
        // Shake input + show error
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

      // Success — animate transition
      setAuthenticated();

      // Fade out the form
      gsap.to(form, { opacity: 0, y: 8, duration: 0.6, ease: 'power2.inOut' });

      // Slide logo up and shrink
      gsap.to(logo, {
        y: -(window.innerHeight / 2 - 40),
        scale: 0.5,
        duration: 1,
        delay: 0.3,
        ease: 'power3.inOut',
      });

      // Fade out scene and navigate
      gsap.to(scene, {
        opacity: 0,
        duration: 0.6,
        delay: 1,
        onComplete: () => {
          navigate('home', { replace: true });
        },
      });
    }

    submit.addEventListener('click', attemptLogin);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') attemptLogin();
    });
  },
};
