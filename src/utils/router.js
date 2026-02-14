/**
 * Minimal hash-based SPA router.
 * Pages are registered as { name, html, init?, guard? } objects.
 * HTML is injected into the container; init() runs after insertion.
 */

const pages = {};
let container = null;
let currentPage = null;
let beforeNavigate = null;
let afterNavigate = null;

export function registerPage(name, page) {
  pages[name] = page;
}

export function setContainer(el) {
  container = el;
}

export function onBeforeNavigate(fn) {
  beforeNavigate = fn;
}

export function onAfterNavigate(fn) {
  afterNavigate = fn;
}

export function getCurrentPage() {
  return currentPage;
}

export function navigate(name, options = {}) {
  const { replace = false, skipTransition = false } = options;

  if (replace) {
    history.replaceState(null, '', `#/${name}`);
  } else {
    history.pushState(null, '', `#/${name}`);
  }

  renderPage(name, skipTransition);
}

function pageNameFromHash() {
  const hash = window.location.hash.slice(2); // strip "#/"
  return hash || 'password';
}

async function renderPage(name, skipTransition = false) {
  const page = pages[name];
  if (!page) return;

  // Run guard (e.g. auth check)
  if (page.guard && !page.guard()) {
    navigate('password', { replace: true, skipTransition: true });
    return;
  }

  if (beforeNavigate) {
    await beforeNavigate(name, currentPage, skipTransition);
  }

  currentPage = name;
  container.innerHTML = page.html;

  // Run page-specific init (binds events, starts animations, etc.)
  if (page.init) {
    page.init(container);
  }

  if (afterNavigate) {
    await afterNavigate(name, skipTransition);
  }
}

export function startRouter() {
  window.addEventListener('hashchange', () => {
    renderPage(pageNameFromHash());
  });

  renderPage(pageNameFromHash());
}
