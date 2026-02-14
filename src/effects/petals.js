import gsap from 'gsap';

const PETAL_COUNT = 10;
const MOUSE_RADIUS = 80;
const WAVE_INTERVAL = 8000;
const PETAL_COLORS = [
  'rgba(52, 36, 18, 0.08)',
  'rgba(52, 36, 18, 0.06)',
  'rgba(35, 82, 184, 0.07)',
  'rgba(35, 82, 184, 0.05)',
  'rgba(180, 160, 130, 0.12)',
  'rgba(200, 180, 155, 0.10)',
];

let mouse = { x: -9999, y: -9999 };
let smoothMouse = { x: -9999, y: -9999 };
let petals = [];
let container = null;
let waveTimer = null;
let mouseMoveHandler = null;

function createPetalElement() {
  const el = document.createElement('div');
  const size = 6 + Math.random() * 10;
  const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
  const elongation = 1.4 + Math.random() * 0.8;

  el.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 9999;
    width: ${size}px;
    height: ${size * elongation}px;
    background: ${color};
    border-radius: 50% 50% 50% 0;
    transform-origin: center center;
  `;

  container.appendChild(el);
  return el;
}

function spawnWave() {
  for (let i = 0; i < PETAL_COUNT; i++) {
    setTimeout(() => spawnPetal(), i * 400 + Math.random() * 300);
  }
}

function spawnPetal() {
  const el = createPetalElement();
  const vh = window.innerHeight;

  const petal = {
    el,
    x: Math.random() * window.innerWidth,
    y: vh * (0 + Math.random() * 0.3),      // start between 30–60% down the screen
    vx: 0,
    vy: 0.8 + Math.random() * 0.6,             // faster fall
    baseVy: 0.8 + Math.random() * 0.6,
    swayOffset: Math.random() * Math.PI * 2,
    swaySpeed: 0.15 + Math.random() * 0.15,     // slower, gentler rocking
    swayAmount: 0.15 + Math.random() * 0.2,     // smaller sway arc
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 0.2, // slower rotation
    opacity: 0,
    fadeIn: true,
  };

  gsap.set(el, { x: petal.x, y: petal.y, rotation: petal.rotation, opacity: 0 });
  petals.push(petal);
}

function removePetal(petal) {
  if (petal.el.parentNode) {
    petal.el.parentNode.removeChild(petal.el);
  }
  petals = petals.filter(p => p !== petal);
}

function tick() {
  smoothMouse.x += (mouse.x - smoothMouse.x) * 0.08;
  smoothMouse.y += (mouse.y - smoothMouse.y) * 0.08;

  petals.forEach(petal => {
    // Fade in
    if (petal.fadeIn) {
      petal.opacity = Math.min(petal.opacity + 0.012, 1);
      if (petal.opacity >= 1) petal.fadeIn = false;
    }

    // Fade out near bottom
    if (petal.y > window.innerHeight - 80) {
      petal.opacity = Math.max(petal.opacity - 0.025, 0);
    }

    // Gentle sway
    petal.swayOffset += petal.swaySpeed * 0.016;
    const sway = Math.sin(petal.swayOffset) * petal.swayAmount;

    // Soft mouse push
    const dx = petal.x - smoothMouse.x;
    const dy = petal.y - smoothMouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < MOUSE_RADIUS && dist > 0) {
      const t = 1 - (dist / MOUSE_RADIUS);
      const strength = t * t * 0.3;
      petal.vx += (dx / dist) * strength;
      petal.vy += ((dy / dist) * strength * 0.3) - strength * 0.15;
    }

    // Damping
    petal.vx *= 0.97;
    petal.vy *= 0.97;

    // Restore natural fall speed
    petal.vy += (petal.baseVy - petal.vy) * 0.015;

    // Update position
    petal.x += petal.vx + sway;
    petal.y += petal.vy;
    petal.rotation += petal.rotationSpeed;

    gsap.set(petal.el, {
      x: petal.x,
      y: petal.y,
      rotation: petal.rotation,
      opacity: petal.opacity,
    });

    // Remove when off screen
    if (petal.y > window.innerHeight + 40 || (petal.opacity <= 0 && !petal.fadeIn)) {
      removePetal(petal);
    }
  });
}

export function initPetals() {
  container = document.createElement('div');
  container.id = 'petal-container';
  container.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
  document.body.appendChild(container);

  mouseMoveHandler = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };
  document.addEventListener('mousemove', mouseMoveHandler);

  spawnWave();
  waveTimer = setInterval(spawnWave, WAVE_INTERVAL);
  gsap.ticker.add(tick);
}

export function destroyPetals() {
  gsap.ticker.remove(tick);
  if (waveTimer) clearInterval(waveTimer);
  document.removeEventListener('mousemove', mouseMoveHandler);
  petals.forEach(p => {
    if (p.el.parentNode) p.el.parentNode.removeChild(p.el);
  });
  petals = [];
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
  }
  container = null;
}
