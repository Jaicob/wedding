/**
 * Water ripple effect — subtle hand-drawn-style rings expand from the cursor.
 */

let canvas = null;
let ctx = null;
let ripples = [];
let mouse = { x: -9999, y: -9999 };
let lastSpawn = 0;
let animId = null;

const SPAWN_INTERVAL = 80; // ms between ripples
const MAX_RIPPLES = 25;
const RIPPLE_LIFETIME = 1200; // ms
const MAX_RADIUS = 50;

function createCanvas() {
  canvas = document.createElement('canvas');
  canvas.id = 'water-effect';
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  ctx = canvas.getContext('2d');
}

function onResize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function onMouseMove(e) {
  mouse.x = e.clientX;
  mouse.y = e.clientY;

  const now = Date.now();
  if (now - lastSpawn > SPAWN_INTERVAL) {
    spawnRipple(mouse.x, mouse.y);
    lastSpawn = now;
  }
}

function spawnRipple(x, y) {
  if (ripples.length >= MAX_RIPPLES) {
    ripples.shift();
  }
  ripples.push({
    x,
    y,
    born: Date.now(),
    // Slight randomness for a hand-drawn feel
    offsetX: (Math.random() - 0.5) * 4,
    offsetY: (Math.random() - 0.5) * 4,
    wobble: 0.6 + Math.random() * 0.8,
  });
}

function drawRipple(r) {
  const age = Date.now() - r.born;
  if (age > RIPPLE_LIFETIME) return false;

  const progress = age / RIPPLE_LIFETIME;
  const radius = progress * MAX_RADIUS;
  const opacity = (1 - progress) * 0.18;

  const cx = r.x + r.offsetX;
  const cy = r.y + r.offsetY;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = '#342412';
  ctx.lineWidth = 1.2;

  // Draw slightly wobbly ellipse for hand-drawn feel
  ctx.beginPath();
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    // Add subtle per-point noise
    const noise = Math.sin(angle * 3 + r.wobble * 5) * (1.5 * r.wobble);
    const rx = radius + noise;
    const ry = radius * (0.92 + r.wobble * 0.08) + noise * 0.7;
    const px = cx + Math.cos(angle) * rx;
    const py = cy + Math.sin(angle) * ry;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();

  // Second ring — slightly larger, fainter
  ctx.globalAlpha = opacity * 0.4;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  const r2 = radius * 1.4;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const noise = Math.sin(angle * 2 + r.wobble * 3) * (2 * r.wobble);
    const rx = r2 + noise;
    const ry = r2 * (0.94 + r.wobble * 0.06) + noise * 0.5;
    const px = cx + Math.cos(angle) * rx;
    const py = cy + Math.sin(angle) * ry;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
  return true;
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ripples = ripples.filter(drawRipple);
  animId = requestAnimationFrame(animate);
}

export function initWater() {
  createCanvas();
  document.addEventListener('mousemove', onMouseMove);
  window.addEventListener('resize', onResize);
  animId = requestAnimationFrame(animate);
}

export function destroyWater() {
  if (animId) cancelAnimationFrame(animId);
  document.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', onResize);
  ripples = [];
  if (canvas && canvas.parentNode) {
    canvas.parentNode.removeChild(canvas);
  }
  canvas = null;
  ctx = null;
}
