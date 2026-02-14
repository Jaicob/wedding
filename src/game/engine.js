/**
 * Stardew Valentine — A pixel-art Valentine's Day experience.
 * Complete game engine: loop, state machine, rendering, input, maps.
 */

import { createAllSprites, loadSpriteSheets } from './sprites.js';

// ════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════
const T = 16;           // tile size in pixels
const GW = 320;         // game width
const GH = 240;         // game height
const COLS = GW / T;    // 20 visible tile columns
const ROWS = GH / T;    // 15 visible tile rows
const WALK_SPEED = 1.5; // pixels per frame
const ANIM_RATE = 64;   // frames between walk animation changes
const SCALE = 3;        // render at 3x for crisp fonts/sprites

// Tile types
const _ = 0;   // void
const G = 1;   // grass
const F = 2;   // grass with flowers
const P = 3;   // path
const W = 4;   // wood floor
const L = 5;   // wall
const LT = 6;  // wall top
const D = 7;   // door (indoor)
const WA = 8;  // water
const R = 9;   // rose
const TK = 10; // tree trunk
const TC = 11; // tree canopy
const BH = 12; // bed head
const BF = 13; // bed foot
const MB = 14; // mailbox
const TT = 15; // TV top
const TB = 16; // TV bottom
const RG = 17; // rug
const FN = 18; // fence
const CD = 19; // cabin door (outdoor)
const CB = 20; // cabin body (outdoor, non-walkable, renders as grass)

// Walkability
const WALKABLE = new Set([G, F, P, W, D, BF, RG, CD]);

// ════════════════════════════════════════════
// MAP DATA
// ════════════════════════════════════════════
const CABIN_MAP = [
  [LT,LT,LT,LT,LT,LT,LT,LT,LT,LT,LT,LT],
  [L, W, W, W, W, W, W, W, BH,BH, W, L],
  [L, W, W, W, W, W, W, W, BF,BF, W, L],
  [L, W, TT, W, W, W, W, W, W, W, W, L],
  [L, W, TB, W, RG,RG, W, W, W, W, W, L],
  [L, W, W, W, RG,RG, W, W, W, W, W, L],
  [L, W, W, W, W, W, W, W, W, W, W, L],
  [L, W, W, W, W, W, W, W, W, W, W, L],
  [L, W, W, W, W, D, D, W, W, W, W, L],
  [LT,LT,LT,LT,LT,LT,LT,LT,LT,LT,LT,LT],
];

// Heart outline pattern for rose garden (12 wide x 10 tall)
// . = grass, R = rose, M = mailbox
// Outline only with 1-tile gap at bottom for entry (path at col 4 creates opening)
const HEART = [
  '..RR..RR....',
  '.R..RR..R...',
  'R........R..',
  'R........R..',
  'R........R..',
  '.R...M...R..',
  '..R.....R...',
  '...R...R....',
  '....R.R.....',
  '................',
];

// All tree positions (trunk base x,y) — each tree is 3x5 tiles (48x80 sprite)
const TREE_POSITIONS = [
  // Top border (trunk y=4, canopy extends above)
  [3,4], [6,4], [9,4], [19,4], [22,4], [25,4], [28,4],
  // Bottom border (trunk y=24)
  [3,26], [6,26], [9,26], [12,26], [15,26], [18,26], [21,26], [24,26], [27,26],
  // Left border (trunk x=3)
  [3,7], [3,10], [3,13], [3,16], [3,19], [3,22],
  // Right border (trunk x=28)
  [28,7], [28,10], [28,13], [28,16], [28,19], [28,22],
  // Interior scattered
  [6,9], [25,9], [6,19], [25,19],
];

function buildOutdoorMap() {
  const W_MAP = 32;
  const H_MAP = 28;
  const map = [];
  for (let y = 0; y < H_MAP; y++) {
    map[y] = [];
    for (let x = 0; x < W_MAP; x++) {
      map[y][x] = G;
    }
  }

  // Scatter flower grass
  const rng = ((s) => { let v = s; return () => { v = (v * 1103515245 + 12345) & 0x7fffffff; return v / 0x7fffffff; }; })(777);
  for (let y = 0; y < H_MAP; y++)
    for (let x = 0; x < W_MAP; x++)
      if (map[y][x] === G && rng() < 0.15) map[y][x] = F;

  // Non-walkable border (3 tiles deep, renders as grass under tree sprites)
  for (let y = 0; y < H_MAP; y++)
    for (let x = 0; x < W_MAP; x++)
      if (y < 3 || y >= H_MAP - 3 || x < 3 || x >= W_MAP - 3)
        map[y][x] = CB;

  // Tree trunk collision (non-walkable) at each tree position
  for (const [tx, ty] of TREE_POSITIONS) {
    if (ty >= 0 && ty < H_MAP) map[ty][tx] = CB;
    if (ty - 1 >= 0) map[ty - 1][tx] = CB;
  }

  // Cabin exterior at top center (8 tiles wide at native 128x144)
  const cabinX = 10;
  // Collision: 8 wide x 5 tall covering the building body (y=3..7)
  // Uses CB (renders as grass under cabin sprite, not indoor wall)
  for (let dy = 0; dy < 5; dy++)
    for (let dx = 0; dx < 8; dx++)
      map[3 + dy][cabinX + dx] = CB;
  // Cabin door at bottom center
  map[8][14] = CD;

  // Heart-shaped rose garden (placed before path so path cuts through)
  const hx = 10; // garden start x
  const hy = 12; // garden start y
  for (let r = 0; r < HEART.length; r++) {
    for (let c = 0; c < HEART[r].length; c++) {
      const ch = HEART[r][c];
      if (ch === 'R') map[hy + r][hx + c] = R;
      else if (ch === 'M') map[hy + r][hx + c] = MB;
    }
  }

  // Path from cabin door down, around heart, and entering from bottom
  // Vertical path from cabin to just above heart (y=9..11)
  for (let y = 9; y <= 11; y++) map[y][14] = P;
  // Go left to avoid heart interior (y=11, x=14..9)
  for (let x = 9; x <= 14; x++) map[11][x] = P;
  // Down the left side, outside the heart (x=9, y=11..22)
  for (let y = 11; y <= 22; y++) map[y][9] = P;
  // Along the bottom to heart entry gap (y=22, x=9..15)
  for (let x = 9; x <= 15; x++) map[22][x] = P;
  // Enter heart from bottom, up to near mailbox (x=15, y=22..18)
  for (let y = 18; y <= 22; y++) map[y][15] = P;

  // Re-scatter flowers on remaining grass
  for (let y = 3; y < H_MAP - 3; y++)
    for (let x = 3; x < W_MAP - 3; x++)
      if (map[y][x] === G && rng() < 0.12) map[y][x] = F;

  return map;
}

const OUTDOOR_MAP = buildOutdoorMap();

// ════════════════════════════════════════════
// GAME CLASS
// ════════════════════════════════════════════
export class StardewValentine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = GW * SCALE;
    this.canvas.height = GH * SCALE;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    this.sprites = null; // loaded async in start()
    this.loaded = false;
    this.keys = {};
    this.touchDir = null;
    this.touchAction = false;
    this.running = false;
    this.frameCount = 0;

    // Game state
    this.state = 'TITLE';
    this.stateTimer = 0;
    this.fadeAlpha = 0;
    this.fadeDir = 0; // 1 = fading out, -1 = fading in
    this.fadeCallback = null;
    this.pendingState = null;

    // Player
    this.player = {
      tx: 8, ty: 2,     // tile position (cabin bed)
      px: 8 * T, py: 2 * T, // pixel position
      dir: 'down',
      walking: false,
      animFrame: 0,
      animPhase: 0,      // walk phase: cycles through [0,1,0,2] for smooth SV-style walk
      animCounter: 0,
      targetTx: 8, targetTy: 2,
    };

    // Camera
    this.cam = { x: 0, y: 0 };

    // Current map
    this.map = CABIN_MAP;
    this.mapW = CABIN_MAP[0].length;
    this.mapH = CABIN_MAP.length;
    this.scene = 'cabin'; // 'cabin' or 'outdoor'

    // Music
    this.music = new Audio('/assets/36 Pleasant Memory (Penny\'s Theme).mp3');
    this.music.loop = true;
    this.music.volume = 0.4;

    // Interaction
    this.showInteractPrompt = false;
    this.letterOpen = false;
    this.letterScroll = 0;

    // Title screen animation
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * GW,
        y: Math.random() * (GH * 0.6),
        brightness: Math.random(),
        speed: 0.5 + Math.random() * 2,
      });
    }

    // Bind input
    this._onKeyDown = e => { this.keys[e.code] = true; e.preventDefault(); };
    this._onKeyUp = e => { this.keys[e.code] = false; };
    this._onClick = () => this._handleClick();
    this._onResize = () => this._resize();

    // Touch controls
    this._setupTouch();
  }

  async start() {
    this.running = true;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this.canvas.addEventListener('click', this._onClick);
    window.addEventListener('resize', this._onResize);
    this._resize();

    // Show loading screen while sprites load
    this._renderLoading();
    const sheets = await loadSpriteSheets();
    this.sprites = createAllSprites(sheets);
    this.loaded = true;

    this._showTouchControls();
    this._loop();
  }

  _renderLoading() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0a2e';
    ctx.fillRect(0, 0, GW, GH);
    ctx.fillStyle = '#f8e8d0';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', GW / 2, GH / 2);
  }

  destroy() {
    this.running = false;
    this.music.pause();
    this.music.currentTime = 0;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('click', this._onClick);
    window.removeEventListener('resize', this._onResize);
  }

  _resize() {
    const container = this.canvas.parentElement;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / GW, ch / GH);
    // Use integer scaling when possible for crispness
    const intScale = Math.max(1, Math.floor(scale));
    const useScale = (scale - intScale < 0.3) ? intScale : scale;
    this.canvas.style.width = `${Math.floor(GW * useScale)}px`;
    this.canvas.style.height = `${Math.floor(GH * useScale)}px`;
  }

  _showTouchControls() {
    if ('ontouchstart' in window) {
      const tc = document.getElementById('touch-controls');
      const ta = document.getElementById('touch-action');
      if (tc) tc.style.display = 'block';
      if (ta) ta.style.display = 'block';
    }
  }

  _setupTouch() {
    const setDir = (dir) => { this.touchDir = dir; };
    const clearDir = () => { this.touchDir = null; };

    document.querySelectorAll('#dpad button').forEach(btn => {
      const dir = btn.dataset.dir;
      btn.addEventListener('touchstart', e => { e.preventDefault(); setDir(dir); });
      btn.addEventListener('touchend', e => { e.preventDefault(); clearDir(); });
    });

    const actionBtn = document.getElementById('touch-action');
    if (actionBtn) {
      actionBtn.addEventListener('touchstart', e => { e.preventDefault(); this.touchAction = true; });
      actionBtn.addEventListener('touchend', e => { e.preventDefault(); this.touchAction = false; });
    }
  }

  _handleClick() {
    if (this.state === 'TITLE') {
      this.music.play().catch(() => {});
      this._fadeToState('DAY_START');
    } else if (this.state === 'LETTER') {
      this.letterOpen = false;
      this.state = 'OUTDOOR';
    }
  }

  // ── Fade transitions ──
  _fadeToState(newState) {
    if (this.fadeDir !== 0) return;
    this.pendingState = newState;
    this.fadeDir = 1; // fade out
    this.fadeAlpha = 0;
  }

  _updateFade() {
    if (this.fadeDir === 0) return;
    const speed = 0.03;
    this.fadeAlpha += this.fadeDir * speed;
    if (this.fadeDir === 1 && this.fadeAlpha >= 1) {
      this.fadeAlpha = 1;
      this._enterState(this.pendingState);
      this.fadeDir = -1; // fade in
    } else if (this.fadeDir === -1 && this.fadeAlpha <= 0) {
      this.fadeAlpha = 0;
      this.fadeDir = 0;
    }
  }

  _enterState(state) {
    this.state = state;
    this.stateTimer = 0;
    switch (state) {
      case 'DAY_START':
        break;
      case 'WAKEUP':
        this.map = CABIN_MAP;
        this.mapW = CABIN_MAP[0].length;
        this.mapH = CABIN_MAP.length;
        this.scene = 'cabin';
        this.player.tx = 8; this.player.ty = 2;
        this.player.px = 8 * T; this.player.py = 2 * T;
        this.player.dir = 'down';
        this.player.walking = false;
        break;
      case 'CABIN':
        this.map = CABIN_MAP;
        this.mapW = CABIN_MAP[0].length;
        this.mapH = CABIN_MAP.length;
        this.scene = 'cabin';
        // Player enters at door, facing up
        this.player.tx = 5; this.player.ty = 7;
        this.player.px = 5 * T; this.player.py = 7 * T;
        this.player.dir = 'up';
        this.player.walking = false;
        break;
      case 'OUTDOOR':
        this.map = OUTDOOR_MAP;
        this.mapW = OUTDOOR_MAP[0].length;
        this.mapH = OUTDOOR_MAP.length;
        this.scene = 'outdoor';
        this._mailboxPos = null; // recalculate
        this.player.tx = 14; this.player.ty = 9;
        this.player.px = 14 * T; this.player.py = 9 * T;
        this.player.dir = 'down';
        this.player.walking = false;
        break;
    }
  }

  // ── Game loop ──
  _loop() {
    if (!this.running) return;
    this.frameCount++;
    this._update();
    this._render();
    requestAnimationFrame(() => this._loop());
  }

  // ── Update ──
  _update() {
    this._updateFade();
    this.stateTimer++;

    switch (this.state) {
      case 'TITLE':
        this._updateTitle();
        break;
      case 'DAY_START':
        this._updateDayStart();
        break;
      case 'WAKEUP':
        this._updateWakeup();
        break;
      case 'CABIN':
      case 'OUTDOOR':
        this._updatePlayer();
        this._updateCamera();
        this._updateInteraction();
        break;
    }
  }

  _updateTitle() {
    // Stars twinkle
    for (const s of this.stars) {
      s.brightness += (Math.random() - 0.5) * 0.1;
      s.brightness = Math.max(0.1, Math.min(1, s.brightness));
    }
    // Start on keypress
    if (this.keys['Space'] || this.keys['Enter']) {
      this.music.play().catch(() => {});
      this._fadeToState('DAY_START');
    }
  }

  _updateDayStart() {
    if (this.stateTimer > 180) { // ~3 seconds at 60fps
      this._fadeToState('WAKEUP');
    }
  }

  _updateWakeup() {
    if (this.stateTimer > 120) { // ~2 seconds
      this.state = 'CABIN';
      this.stateTimer = 0;
      this.player.tx = 7; this.player.ty = 3;
      this.player.px = 7 * T; this.player.py = 3 * T;
    }
  }

  _updatePlayer() {
    const p = this.player;

    // If currently moving, continue to target
    if (p.walking) {
      const dx = p.targetTx * T - p.px;
      const dy = p.targetTy * T - p.py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < WALK_SPEED) {
        p.px = p.targetTx * T;
        p.py = p.targetTy * T;
        p.tx = p.targetTx;
        p.ty = p.targetTy;
        p.walking = false;
        p.animFrame = 0;

        // Check door transition
        if (this.scene === 'cabin' && this.map[p.ty]?.[p.tx] === D) {
          this._fadeToState('OUTDOOR');
          return;
        }
        if (this.scene === 'outdoor' && this.map[p.ty]?.[p.tx] === CD) {
          this._fadeToState('CABIN');
          return;
        }
      } else {
        p.px += (dx / dist) * WALK_SPEED;
        p.py += (dy / dist) * WALK_SPEED;
        p.animCounter++;
        if (p.animCounter >= ANIM_RATE) {
          p.animCounter = 0;
          // SV-style 4-phase walk: idle → stepA → idle → stepB
          const WALK_PHASES = [0, 1, 0, 2];
          p.animPhase = (p.animPhase + 1) % WALK_PHASES.length;
          p.animFrame = WALK_PHASES[p.animPhase];
        }
      }
      return;
    }

    // Read input for direction
    let dir = null;
    if (this.keys['ArrowUp'] || this.keys['KeyW'] || this.touchDir === 'up') dir = 'up';
    else if (this.keys['ArrowDown'] || this.keys['KeyS'] || this.touchDir === 'down') dir = 'down';
    else if (this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touchDir === 'left') dir = 'left';
    else if (this.keys['ArrowRight'] || this.keys['KeyD'] || this.touchDir === 'right') dir = 'right';

    if (dir) {
      p.dir = dir;
      const offsets = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
      const [ox, oy] = offsets[dir];
      const nx = p.tx + ox;
      const ny = p.ty + oy;

      // Bounds + collision check
      if (nx >= 0 && nx < this.mapW && ny >= 0 && ny < this.mapH) {
        const tile = this.map[ny][nx];
        if (WALKABLE.has(tile)) {
          p.targetTx = nx;
          p.targetTy = ny;
          p.walking = true;
          p.animPhase = 0;
          p.animFrame = 1;
          p.animCounter = 0;
        }
      }
    }
  }

  _updateCamera() {
    if (this.scene === 'cabin') {
      // Center cabin in viewport
      this.cam.x = (this.mapW * T - GW) / 2;
      this.cam.y = (this.mapH * T - GH) / 2;
      return;
    }
    // Follow player in outdoor
    this.cam.x = this.player.px - GW / 2 + T / 2;
    this.cam.y = this.player.py - GH / 2 + T / 2;
    // Clamp
    this.cam.x = Math.max(0, Math.min(this.mapW * T - GW, this.cam.x));
    this.cam.y = Math.max(0, Math.min(this.mapH * T - GH, this.cam.y));
  }

  _updateInteraction() {
    this.showInteractPrompt = false;
    if (this.scene !== 'outdoor') return;

    // Check if facing mailbox
    const p = this.player;
    const offsets = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [ox, oy] = offsets[p.dir];
    const fx = p.tx + ox;
    const fy = p.ty + oy;

    if (fx >= 0 && fx < this.mapW && fy >= 0 && fy < this.mapH) {
      if (this.map[fy][fx] === MB) {
        this.showInteractPrompt = true;
        if (this.keys['Space'] || this.keys['Enter'] || this.touchAction) {
          this.state = 'LETTER';
          this.stateTimer = 0;
          this.letterOpen = true;
          this.letterScroll = 0;
          this.keys['Space'] = false;
          this.keys['Enter'] = false;
          this.touchAction = false;
        }
      }
    }
  }

  // ── Render ──
  _render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;

    switch (this.state) {
      case 'TITLE':
        this._renderTitle(ctx);
        break;
      case 'DAY_START':
        this._renderDayStart(ctx);
        break;
      case 'WAKEUP':
        this._renderCabin(ctx);
        this._renderWakeup(ctx);
        break;
      case 'CABIN':
        this._renderCabin(ctx);
        this._renderPlayer(ctx);
        break;
      case 'OUTDOOR':
        this._renderOutdoor(ctx);
        this._renderPlayer(ctx);
        this._renderOutdoorUI(ctx);
        break;
      case 'LETTER':
        this._renderOutdoor(ctx);
        this._renderPlayer(ctx);
        this._renderLetter(ctx);
        break;
    }

    // Fade overlay
    if (this.fadeAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.fadeAlpha})`;
      ctx.fillRect(0, 0, GW, GH);
    }
  }

  // ── Title Screen ──
  _renderTitle(ctx) {
    const nightSky = this.sprites.sv.nightSky;

    if (nightSky) {
      // Use SV night sky sprite, scaled to fill
      ctx.drawImage(nightSky, 0, 0, nightSky.width, nightSky.height, 0, 0, GW, GH);
    } else {
      // Fallback: procedural night sky
      ctx.fillStyle = '#0a0a2e';
      ctx.fillRect(0, 0, GW, GH);
      ctx.fillStyle = '#141438';
      ctx.fillRect(0, 0, GW, GH * 0.3);
      ctx.fillStyle = '#0e0e30';
      ctx.fillRect(0, GH * 0.3, GW, GH * 0.3);
    }

    // Stars (extra twinkle on top of SV sky)
    for (const s of this.stars) {
      const b = Math.floor(s.brightness * 255);
      ctx.fillStyle = `rgba(${b},${b},${Math.min(255, b + 40)},${nightSky ? 0.4 : 1})`;
      ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
    }

    if (!nightSky) {
      // Rolling hills (only for fallback)
      ctx.fillStyle = '#1a4a1a';
      for (let x = 0; x < GW; x++) {
        const h = GH * 0.72 + Math.sin(x * 0.02) * 15 + Math.sin(x * 0.05) * 8;
        ctx.fillRect(x, Math.floor(h), 1, GH - Math.floor(h));
      }
      ctx.fillStyle = '#1a3a18';
      for (let x = 0; x < GW; x++) {
        const h = GH * 0.78 + Math.sin(x * 0.03 + 1) * 12 + Math.sin(x * 0.07) * 6;
        ctx.fillRect(x, Math.floor(h), 1, GH - Math.floor(h));
      }
    }

    // Title text
    const pulse = 0.8 + Math.sin(this.frameCount * 0.03) * 0.2;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Title shadow
    ctx.fillStyle = '#000';
    ctx.font = 'bold 28px "Allison", cursive';
    ctx.fillText('Love in Lyon', GW / 2 + 1, GH * 0.38 + 1);

    // Title
    ctx.fillStyle = '#f8e8d0';
    ctx.font = 'bold 28px "Allison", cursive';
    ctx.fillText('Love in Lyon', GW / 2, GH * 0.38);

    // Subtitle
    ctx.font = '8px monospace';
    ctx.fillStyle = `rgba(200,200,220,${pulse})`;
    ctx.fillText('~ Press Space or Click to Start ~', GW / 2, GH * 0.6);

    // Heart decorations
    const heart = this.sprites.objects.heart;
    const hOff = Math.sin(this.frameCount * 0.05) * 3;
    ctx.drawImage(heart, GW / 2 - 50, GH * 0.38 - 10 + hOff);
    ctx.drawImage(heart, GW / 2 + 44, GH * 0.38 - 10 - hOff);

    ctx.restore();
  }

  // ── Day Start ──
  _renderDayStart(ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GW, GH);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const t = this.stateTimer;
    const alpha1 = Math.min(1, t / 40);
    const alpha2 = Math.min(1, Math.max(0, (t - 40) / 40));

    ctx.font = '18px "Allison", cursive';
    ctx.fillStyle = `rgba(248,232,208,${alpha1})`;
    ctx.fillText("Valentine's Day", GW / 2, GH * 0.4);

    ctx.font = '10px monospace';
    ctx.fillStyle = `rgba(200,180,160,${alpha2})`;
    ctx.fillText('February 14th', GW / 2, GH * 0.55);

    // Small heart
    if (alpha2 > 0.5) {
      ctx.globalAlpha = alpha2;
      const h = this.sprites.objects.heart;
      ctx.drawImage(h, GW / 2 - 3, GH * 0.64);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  // ── Cabin Scene ──
  _renderCabin(ctx) {
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(0, 0, GW, GH);

    const ox = Math.floor(-this.cam.x);
    const oy = Math.floor(-this.cam.y);

    for (let y = 0; y < this.mapH; y++) {
      for (let x = 0; x < this.mapW; x++) {
        const tile = this.map[y][x];
        const sprite = this._getTileSprite(tile, x, y);
        if (sprite) {
          ctx.drawImage(sprite, ox + x * T, oy + y * T);
        }
      }
    }
  }

  _renderWakeup(ctx) {
    const t = this.stateTimer;
    const ox = Math.floor(-this.cam.x);
    const oy = Math.floor(-this.cam.y);

    if (t < 60) {
      // Sleeping character
      const sleepSprite = this.sprites.char.sleep;
      ctx.drawImage(sleepSprite, ox + 8 * T - 4, oy + 2 * T - 2);
      // Zzz animation
      const zOff = Math.sin(t * 0.1) * 2;
      ctx.fillStyle = '#fff';
      ctx.font = '6px monospace';
      ctx.fillText('z', ox + 8 * T + 14, oy + 2 * T - 4 + zOff);
      ctx.fillText('z', ox + 8 * T + 18, oy + 2 * T - 8 + zOff);
      ctx.fillText('Z', ox + 8 * T + 22, oy + 2 * T - 14 + zOff);
    } else {
      // Standing up
      const frame = this.sprites.char.down[0];
      ctx.drawImage(frame, ox + 7 * T, oy + 3 * T - 16);
      // Exclamation
      if (t < 90) {
        ctx.fillStyle = '#fff';
        ctx.font = '7px monospace';
        ctx.fillText('!', ox + 7 * T + 8, oy + 3 * T - 14);
      }
    }
  }

  // ── Outdoor Scene ──
  _renderOutdoor(ctx) {
    ctx.fillStyle = '#5a9c3a';
    ctx.fillRect(0, 0, GW, GH);

    const ox = Math.floor(-this.cam.x);
    const oy = Math.floor(-this.cam.y);

    // Calculate visible tile range
    const startCol = Math.max(0, Math.floor(this.cam.x / T));
    const startRow = Math.max(0, Math.floor(this.cam.y / T));
    const endCol = Math.min(this.mapW, startCol + COLS + 2);
    const endRow = Math.min(this.mapH, startRow + ROWS + 2);

    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = this.map[y][x];
        const sprite = this._getTileSprite(tile, x, y);
        if (sprite) {
          ctx.drawImage(sprite, ox + x * T, oy + y * T);
        }
      }
    }

    // Cabin exterior object (8x9 tiles, sprite top at y=0 so bottom aligns with door at y=8)
    const cabinSprite = this.sprites.objects.cabin;
    ctx.drawImage(cabinSprite, ox + 10 * T, oy);

    // Flower + mailbox overlays (drawn after tiles so full 1x2 sprites are visible)
    const roseSpr = this.sprites.tiles.rose;
    const mailSpr = this.sprites.tiles.mailbox;
    for (let y = startRow; y < endRow; y++) {
      for (let x = startCol; x < endCol; x++) {
        const tile = this.map[y][x];
        if (tile === R && roseSpr) {
          ctx.drawImage(roseSpr, ox + x * T, oy + y * T - T);
        } else if (tile === MB && mailSpr) {
          ctx.drawImage(mailSpr, ox + x * T, oy + y * T - T);
        }
      }
    }

    // Standalone trees (3x5 sprites, drawn after tiles)
    const treeSpr = this.sprites.objects.tree;
    if (treeSpr) {
      for (const [tx, ty] of TREE_POSITIONS) {
        // Sprite is 48x80; top-left at (tx-1, ty-4) in tiles
        ctx.drawImage(treeSpr, ox + (tx - 1) * T, oy + (ty - 4) * T);
      }
    }

    // Heart indicator bouncing above mailbox
    this._renderMailboxHeart(ctx, ox, oy);
  }

  _renderMailboxHeart(ctx, ox, oy) {
    // Cache mailbox position on first call
    if (!this._mailboxPos) {
      for (let y = 0; y < this.mapH; y++)
        for (let x = 0; x < this.mapW; x++)
          if (this.map[y][x] === MB) { this._mailboxPos = { x, y }; break; }
    }
    if (this._mailboxPos) {
      const { x, y } = this._mailboxPos;
      const bounce = Math.sin(this.frameCount * 0.08) * 3;
      const heart = this.sprites.objects.heart;
      ctx.drawImage(heart, ox + x * T + 5, oy + y * T - 10 + bounce);
    }
  }

  _renderOutdoorUI(ctx) {
    if (this.showInteractPrompt) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = '7px monospace';
      // Background
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(GW / 2 - 40, GH - 28, 80, 16);
      ctx.fillStyle = '#fff';
      ctx.fillText('Press Space to Read', GW / 2, GH - 18);
      ctx.restore();
    }
  }

  // ── Player Rendering ──
  _renderPlayer(ctx) {
    const p = this.player;
    const ox = Math.floor(-this.cam.x);
    const oy = Math.floor(-this.cam.y);
    const frames = this.sprites.char[p.dir];
    const frame = frames[p.walking ? p.animFrame : 0];
    // Draw character (sprite is 16x32, anchored at feet tile, offset up by 16px)
    ctx.drawImage(frame, ox + Math.floor(p.px), oy + Math.floor(p.py) - 16);
  }

  // ── Letter Overlay ──
  _renderLetter(ctx) {
    const t = Math.min(1, this.stateTimer / 20); // open animation
    const parchment = this.sprites.sv.parchment;

    ctx.save();

    // Dim background
    ctx.fillStyle = `rgba(0,0,0,${0.5 * t})`;
    ctx.fillRect(0, 0, GW, GH);

    // Letter dimensions
    const lw = 260;
    const lh = 190;
    const lx = (GW - lw) / 2;
    const ly = (GH - lh) / 2;
    const scale = 0.5 + 0.5 * t;

    ctx.translate(GW / 2, GH / 2);
    ctx.scale(scale, scale);
    ctx.translate(-GW / 2, -GH / 2);
    ctx.globalAlpha = t;

    // Paper shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(lx + 3, ly + 3, lw, lh);

    if (parchment) {
      // Use SV parchment sprite as letter background
      ctx.drawImage(parchment, 0, 0, parchment.width, parchment.height, lx, ly, lw, lh);
    } else {
      // Fallback: procedural paper
      ctx.fillStyle = '#f5eed8';
      ctx.fillRect(lx, ly, lw, lh);
      ctx.fillStyle = '#e8dfc8';
      ctx.fillRect(lx, ly, lw, 2);
      ctx.fillRect(lx, ly + lh - 2, lw, 2);
      ctx.fillRect(lx, ly, 2, lh);
      ctx.fillRect(lx + lw - 2, ly, 2, lh);
      // Decorative border
      ctx.fillStyle = '#d4c8a8';
      ctx.fillRect(lx + 6, ly + 6, lw - 12, 1);
      ctx.fillRect(lx + 6, ly + lh - 7, lw - 12, 1);
      ctx.fillRect(lx + 6, ly + 6, 1, lh - 12);
      ctx.fillRect(lx + lw - 7, ly + 6, 1, lh - 12);
    }

    // Letter text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Header
    ctx.fillStyle = '#4a3020';
    ctx.font = '14px "Allison", cursive';
    ctx.fillText('My Dearest Dana,', lx + 24, ly + 20);

    // Body text
    ctx.font = '7px monospace';
    ctx.fillStyle = '#5a4a3a';
    const lines = [
      'Never did I imagine that one day',
      'I would be lucky enough to have',
      'met someone you like you.',
      '',
      'A determined soul',
      'Empowering and loving',
      'My heart forever',
      '',
      'Will you be my valentine?',
      '',
      '       Love,',
      '       Jaicob',
    ];

    let textY = ly + 44;
    for (const line of lines) {
      ctx.fillText(line, lx + 24, textY);
      textY += 9;
    }

    // Hearts decoration
    const heart = this.sprites.objects.heart;
    ctx.drawImage(heart, lx + lw - 32, ly + lh - 28);
    ctx.drawImage(heart, lx + lw - 24, ly + lh - 22);

    // Close hint
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8a7a6a';
    ctx.font = '5px monospace';
    ctx.fillText('click or press space to close', lx + lw / 2, ly + lh - 10);

    ctx.restore();
  }

  // ── Tile Sprite Lookup ──
  _getTileSprite(tile, x, y) {
    const s = this.sprites.tiles;
    const waterFrame = Math.floor(this.frameCount / 15) % 4;
    const variant = ((x * 7 + y * 13) & 0xffff) % 3;

    switch (tile) {
      case G:  return s.grass[variant];
      case F:  return s.grassFlower[variant];
      case P:  return s.path;
      case W:  return s.floor;
      case L:  return s.wall;
      case LT: return s.wallTop;
      case D:  return s.door;
      case WA: return s.water[waterFrame];
      case R:  return s.grass[variant]; // ground only; flower overlay drawn separately
      case TK: return s.treeTrunk;
      case TC: return s.treeCanopy;
      case BH: return s.bedHead;
      case BF: return s.bedFoot;
      case MB: return s.grass[variant]; // ground only; mailbox overlay drawn separately
      case TT: return s.tvTop;
      case TB: return s.tvBottom;
      case RG: return s.rug;
      case FN: return s.fence;
      case CD: return s.door; // reuse door sprite for cabin entrance
      case CB: return s.grass[variant]; // cabin body — grass under cabin sprite
      default: return null;
    }
  }
}
