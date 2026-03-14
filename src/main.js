import gsap from 'gsap';
import './styles/main.css';
import { isAuthenticated } from './utils/auth.js';
import { registerPage, setContainer, startRouter, onBeforeNavigate, onAfterNavigate } from './utils/router.js';
import { renderHeader, initHeader } from './components/header.js';
import { passwordPage } from './pages/password.js';
import { homePage, destroyHome } from './pages/home.js';
import { travelPage } from './pages/travel.js';
import { schedulePage } from './pages/schedule.js';
import { registryPage } from './pages/registry.js';
import { storyPolaroidPage, destroyStoryPolaroid } from './pages/story-polaroid.js';
import { valentinePage, destroyValentine } from './pages/valentine.js';
import { invitePage, destroyInvite } from './pages/invite.js';
import { krPage, destroyKr } from './pages/kr.js';
import { startEffect, stopEffect } from './effects/index.js';

// Containers
const app = document.getElementById('app');
const headerContainer = document.getElementById('header-container');
setContainer(app);

// Track cleanup functions per page
const cleanups = { home: destroyHome, 'story-polaroid': destroyStoryPolaroid, valentine: destroyValentine, invite: destroyInvite, kr: destroyKr };

// Register pages
registerPage('password', passwordPage);
registerPage('home', homePage);
registerPage('story', storyPolaroidPage);
registerPage('travel', travelPage);
registerPage('schedule', schedulePage);
registerPage('registry', registryPage);
registerPage('story-polaroid', storyPolaroidPage);
registerPage('valentine', valentinePage);
registerPage('invite', invitePage);
registerPage('kr', krPage);

// Show/hide header based on page
function updateHeader(pageName) {
  if (pageName === 'password' || pageName === 'valentine' || pageName === 'invite' || pageName === 'kr') {
    headerContainer.innerHTML = '';
    return;
  }
  // Password page already rendered and revealed the header — skip
  if (previousPage === 'password') return;
  headerContainer.innerHTML = renderHeader();
  initHeader();
  gsap.from('#site-header', { opacity: 0, y: -20, duration: 0.4, ease: 'power2.out' });
}

// Page transition: fade out old content
let previousPage = null;
onBeforeNavigate(async (name, oldPage, skipTransition) => {
  // Run cleanup for the old page
  if (oldPage && cleanups[oldPage]) {
    cleanups[oldPage]();
  }

  previousPage = oldPage;

  if (skipTransition || !oldPage) return;

  await gsap.to(app, { opacity: 0, duration: 0.25, ease: 'power2.in' }).then();
});

// Page transition: fade in new content + update header
onAfterNavigate(async (name, skipTransition) => {
  updateHeader(name);

  if (name === 'home') {
    startEffect('petals');
  } else if (name !== 'valentine') {
    stopEffect();
  }

  if (skipTransition) {
    gsap.set(app, { opacity: 1 });
    return;
  }

  gsap.fromTo(app, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out' });
});

// Boot
if (isAuthenticated() && (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#/password')) {
  window.location.hash = '#/home';
}

startRouter();
