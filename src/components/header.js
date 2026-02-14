import { t } from '../utils/i18n.js';
import { getLocale, setLocale } from '../utils/i18n.js';
import { getCurrentPage, navigate } from '../utils/router.js';

const navLinks = [
  { page: 'home', key: 'nav.home' },
  { page: 'story', key: 'nav.story' },
  { page: 'travel', key: 'nav.travel' },
  { page: 'schedule', key: 'nav.schedule' },
  { page: 'registry', key: 'nav.registry' },
];

export function renderHeader() {
  const current = getCurrentPage();
  const locale = getLocale();
  const otherLabel = locale === 'en' ? '한국어' : 'English';

  return `
    <header id="site-header" class="fixed top-0 left-0 right-0 z-50 bg-bg/90 backdrop-blur-sm">
      <div class="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <a href="#/home" class="font-heading text-2xl tracking-wide text-fg hover:text-accent transition-colors">
          D <span class="text-accent text-lg">&amp;</span> J
        </a>

        <nav class="hidden md:flex items-center gap-6">
          ${navLinks.map(l => `
            <a href="#/${l.page}"
               class="nav-link text-sm tracking-widest uppercase transition-colors duration-200
                      ${current === l.page ? 'text-accent border-b border-accent' : 'text-fg-muted hover:text-fg'}"
               data-page="${l.page}">
              ${t(l.key)}
            </a>
          `).join('')}
        </nav>

        <div class="flex items-center gap-4">
          <button id="lang-toggle"
                  class="text-xs tracking-widest uppercase text-fg-muted hover:text-fg transition-colors cursor-pointer">
            ${otherLabel}
          </button>
          <button id="mobile-menu-btn" class="md:hidden text-fg cursor-pointer">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
          </button>
        </div>
      </div>

      <div id="mobile-menu" class="hidden md:hidden px-6 pb-4">
        <nav class="flex flex-col gap-3">
          ${navLinks.map(l => `
            <a href="#/${l.page}"
               class="text-sm tracking-widest uppercase transition-colors duration-200
                      ${current === l.page ? 'text-accent' : 'text-fg-muted hover:text-fg'}"
               data-page="${l.page}">
              ${t(l.key)}
            </a>
          `).join('')}
        </nav>
      </div>
    </header>
  `;
}

export function initHeader() {
  const langToggle = document.getElementById('lang-toggle');
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  langToggle?.addEventListener('click', () => {
    const next = getLocale() === 'en' ? 'ko' : 'en';
    setLocale(next);
    // Re-render current page to reflect new language
    const current = getCurrentPage();
    if (current) navigate(current, { replace: true, skipTransition: true });
  });

  menuBtn?.addEventListener('click', () => {
    mobileMenu?.classList.toggle('hidden');
  });
}
