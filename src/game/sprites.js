/**
 * Sprite creation for Stardew Valentine game.
 * Uses pre-cropped reference sprite sheets with procedural fallbacks.
 *
 * Reference sheets (in public/assets/sprites/ref/):
 *   player-body.png   48x96  — 3 walk frames x 3 directions (down/right/up) at 16x32
 *   player-hair.png   16x96  — 1 frame x 3 directions at 16x32
 *   player-shirt.png   8x32  — 4 rows of 8x8 (down/right/up/left)
 *   player-pants.png  48x96  — same layout as body
 *   cabin.png        128x144 — full cabin exterior sprite (8x9 tiles native)
 *   bed.png           48x55  — bed furniture sprite
 *   flower.png        13x27  — sunflower sprite
 *   trees.png         48x1280— tree sprites stacked vertically
 *   indoor-floors.png 32x32  — wood floor tile
 *   indoor-walls.png  16x48  — heart wallpaper (3 strips of 16x16)
 *   outdoors.png     127x176 — outdoor grass and path tiles
 *   tv.png            30x45  — TV furniture
 *
 * Original sheets (still used):
 *   mail.png   — parchment + night sky
 *   emotes.png — heart emote
 */

const T = 16;

// ════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function fill(ctx, color, rects) {
  ctx.fillStyle = color;
  for (const r of rects) ctx.fillRect(r[0], r[1], r[2], r[3]);
}

function prng(seed) {
  let s = seed;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Slice a region from an image/canvas and return as a new canvas */
function slice(img, sx, sy, sw, sh) {
  if (!img) return null;
  const c = makeCanvas(sw, sh);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
  return c;
}

/** Flip a canvas horizontally */
function flipH(src) {
  if (!src) return null;
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

/**
 * Recolor a sprite canvas by mapping color ranges.
 * Each entry: [[testR, testG, testB, tolerance], [replaceR, replaceG, replaceB]]
 */
function recolorSprite(src, colorMap) {
  if (!src) return null;
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0);
  const imgData = ctx.getImageData(0, 0, c.width, c.height);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    for (const [test, replace] of colorMap) {
      if (Math.abs(d[i] - test[0]) < test[3] &&
          Math.abs(d[i+1] - test[1]) < test[3] &&
          Math.abs(d[i+2] - test[2]) < test[3]) {
        const brightness = (d[i] + d[i+1] + d[i+2]) / (test[0] + test[1] + test[2] + 1);
        d[i]   = Math.min(255, Math.floor(replace[0] * brightness));
        d[i+1] = Math.min(255, Math.floor(replace[1] * brightness));
        d[i+2] = Math.min(255, Math.floor(replace[2] * brightness));
        break;
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
  return c;
}

// ════════════════════════════════════════════
// SPRITE SHEET LOADING
// ════════════════════════════════════════════

export async function loadSpriteSheets() {
  const base = import.meta.env.BASE_URL;
  const sources = {
    // Original sheets (mail + emotes)
    mail:    `${base}assets/sprites/mail.png`,
    emotes:  `${base}assets/sprites/emotes.png`,
    // Pre-cropped reference sheets
    body:    `${base}assets/sprites/ref/player-body.png`,
    hair:    `${base}assets/sprites/ref/player-hair.png`,
    shirt:   `${base}assets/sprites/ref/player-shirt.png`,
    pants:   `${base}assets/sprites/ref/player-pants.png`,
    cabin:   `${base}assets/sprites/ref/cabin.png`,
    bed:     `${base}assets/sprites/ref/bed.png`,
    flower:  `${base}assets/sprites/ref/flower.png`,
    mailbox: `${base}assets/sprites/ref/mailbox.png`,
    trees:   `${base}assets/sprites/ref/trees.png`,
    floor:   `${base}assets/sprites/ref/indoor-floors.png`,
    walls:   `${base}assets/sprites/ref/indoor-walls.png`,
    outdoor: `${base}assets/sprites/ref/outdoors.png`,
    tv:      `${base}assets/sprites/ref/tv.png`,
  };
  const sheets = {};
  await Promise.all(
    Object.entries(sources).map(async ([key, src]) => {
      sheets[key] = await loadImage(src);
    })
  );
  return sheets;
}

// ════════════════════════════════════════════
// CHARACTER COMPOSITION
// ════════════════════════════════════════════
//
// Reference layout:
//   body (48x96):  3 cols (frames) x 3 rows (down=0, right=1, up=2) at 16x32
//   hair (16x96):  1 col x 3 rows (down=0, right=1, up=2) at 16x32
//   pants (48x96): same layout as body — overlay on legs
//   shirt (8x32):  4 rows of 8x8 (down=0, right=1, up=2, left=3)
//
// Composition: body + pants + shirt + hair → recolor

// Color remap: SV default farmer → Korean skin, black hair, brown pajamas
const CHAR_COLOR_MAP = [
  // Red/salmon shirt → brown pajama top
  [[200, 60, 60, 90], [139, 115, 85]],
  [[160, 40, 40, 70], [112, 92, 68]],
  [[130, 30, 30, 60], [90, 74, 54]],
  // Blue clothing → brown pajama
  [[80, 80, 180, 70], [130, 108, 78]],
  [[50, 50, 140, 60], [105, 86, 60]],
  [[60, 60, 160, 70], [115, 95, 68]],
  // Brown hair → black hair
  [[150, 90, 50, 60], [26, 22, 38]],
  [[120, 70, 35, 50], [18, 16, 30]],
  [[100, 55, 25, 50], [14, 12, 24]],
  // Light skin → warm Korean skin tone
  [[255, 220, 180, 50], [220, 178, 135]],
  [[240, 200, 160, 50], [205, 162, 118]],
  [[220, 180, 140, 50], [190, 148, 105]],
];

function extractCharacter(sheets) {
  const body = sheets.body;   // 48x96
  const hair = sheets.hair;   // 16x96
  const pants = sheets.pants; // 48x96
  const shirt = sheets.shirt; // 8x32

  if (!body) return null;

  const DIR_ROW = { down: 0, right: 1, up: 2 };

  function composeFrame(dir, frameCol) {
    const dirRow = DIR_ROW[dir];
    const c = makeCanvas(16, 32);
    const ctx = c.getContext('2d');
    // Layer 1: Body
    ctx.drawImage(body, frameCol * 16, dirRow * 32, 16, 32, 0, 0, 16, 32);
    // Layer 2: Pants overlay
    if (pants) ctx.drawImage(pants, frameCol * 16, dirRow * 32, 16, 32, 0, 0, 16, 32);
    // Layer 3: Shirt (8x8 on torso area)
    if (shirt) {
      const shirtRow = DIR_ROW[dir];
      ctx.drawImage(shirt, 0, shirtRow * 8, 8, 8, 4, 14, 8, 8);
    }
    // Layer 4: Hair
    if (hair) ctx.drawImage(hair, 0, dirRow * 32, 16, 32, 0, 0, 16, 32);
    // Recolor for our character
    return recolorSprite(c, CHAR_COLOR_MAP);
  }

  const down  = [0, 1, 2].map(f => composeFrame('down', f));
  const right = [0, 1, 2].map(f => composeFrame('right', f));
  const up    = [0, 1, 2].map(f => composeFrame('up', f));
  const left  = right.map(f => flipH(f));

  // Sleep sprite: rotate idle-down 90deg CCW
  const sleep = makeCanvas(32, 16);
  const sctx = sleep.getContext('2d');
  sctx.translate(16, 16);
  sctx.rotate(-Math.PI / 2);
  sctx.drawImage(down[0], -4, 0);

  return { down, up, left, right, sleep };
}

// ════════════════════════════════════════════
// PROCEDURAL CHARACTER (fallback)
// ════════════════════════════════════════════

const HAIR = '#1a1a2e';
const SKIN = '#d4a574';
const EYES = '#2d1810';
const PJ   = '#8b7340';
const PJ_D = '#705c30';
const BLUSH = '#d09888';

function charBase(ctx, legOffL, legOffR) {
  fill(ctx, SKIN, [[5 + legOffL, 24, 2, 1], [9 + legOffR, 24, 1, 1]]);
  fill(ctx, PJ, [
    [5, 12, 6, 2], [4, 14, 8, 1], [5, 15, 6, 4],
    [5 + legOffL, 19, 2, 5], [9 + legOffR, 19, 2, 5],
  ]);
  fill(ctx, PJ_D, [[7, 15, 2, 3]]);
  fill(ctx, SKIN, [[5, 6, 6, 5]]);
  fill(ctx, BLUSH, [[5, 9, 1, 1], [10, 9, 1, 1]]);
  fill(ctx, HAIR, [
    [5, 2, 6, 1], [4, 3, 8, 1], [3, 4, 10, 2],
    [3, 6, 2, 5], [11, 6, 2, 5],
    [3, 11, 2, 4], [11, 11, 2, 4],
  ]);
  fill(ctx, EYES, [[6, 8, 1, 1], [9, 8, 1, 1]]);
}

function createCharDown() {
  const frames = [];
  for (const [l, r] of [[0, 0], [-1, 1], [1, -1]]) {
    const c = makeCanvas(16, 32);
    charBase(c.getContext('2d'), l, r);
    frames.push(c);
  }
  return frames;
}

function charUpBase(ctx, legOffL, legOffR) {
  fill(ctx, SKIN, [[5 + legOffL, 24, 2, 1], [9 + legOffR, 24, 1, 1]]);
  fill(ctx, PJ, [
    [5, 12, 6, 2], [4, 14, 8, 1], [5, 15, 6, 4],
    [5 + legOffL, 19, 2, 5], [9 + legOffR, 19, 2, 5],
  ]);
  fill(ctx, PJ_D, [[7, 15, 2, 3]]);
  fill(ctx, HAIR, [
    [5, 2, 6, 1], [4, 3, 8, 1], [3, 4, 10, 10],
    [3, 14, 2, 2], [11, 14, 2, 2],
  ]);
}

function createCharUp() {
  const frames = [];
  for (const [l, r] of [[0, 0], [-1, 1], [1, -1]]) {
    const c = makeCanvas(16, 32);
    charUpBase(c.getContext('2d'), l, r);
    frames.push(c);
  }
  return frames;
}

function charLeftBase(ctx, legOff) {
  fill(ctx, SKIN, [[6, 24, 2, 1]]);
  fill(ctx, PJ, [
    [5, 12, 5, 2], [5, 14, 6, 5],
    [6 + legOff, 19, 2, 5], [6 - legOff, 19, 2, 5],
  ]);
  fill(ctx, PJ_D, [[8, 15, 1, 3]]);
  fill(ctx, SKIN, [[6, 6, 4, 5]]);
  fill(ctx, BLUSH, [[6, 9, 1, 1]]);
  fill(ctx, HAIR, [
    [5, 2, 6, 1], [4, 3, 7, 1], [4, 4, 8, 2],
    [4, 6, 2, 5], [10, 6, 2, 2],
    [4, 11, 2, 4],
  ]);
  fill(ctx, EYES, [[7, 8, 1, 1]]);
}

function createCharLeft() {
  const frames = [];
  for (const off of [0, -1, 1]) {
    const c = makeCanvas(16, 32);
    charLeftBase(c.getContext('2d'), off);
    frames.push(c);
  }
  return frames;
}

function createCharSleep() {
  const c = makeCanvas(32, 16);
  const ctx = c.getContext('2d');
  fill(ctx, SKIN, [[2, 4, 4, 4]]);
  fill(ctx, HAIR, [[1, 3, 5, 1], [0, 4, 2, 5], [1, 9, 4, 1]]);
  fill(ctx, EYES, [[4, 6, 1, 1]]);
  fill(ctx, '#c8b8a0', [[6, 3, 16, 8]]);
  fill(ctx, '#b0a090', [[6, 5, 16, 1], [6, 8, 16, 1]]);
  return c;
}

function createProceduralCharacter() {
  const left = createCharLeft();
  return {
    down: createCharDown(),
    up: createCharUp(),
    left,
    right: left.map(f => flipH(f)),
    sleep: createCharSleep(),
  };
}

// ════════════════════════════════════════════
// TILE EXTRACTION FROM REFERENCE SHEETS
// ════════════════════════════════════════════

function extractWorldTiles(sheets) {
  const extracted = {};

  // ── Outdoor tiles from outdoors.png (127x176) ──
  // 16x16 tile grid — first two rows are spring grass variants
  const od = sheets.outdoor;
  if (od) {
    // Grass variants from top-left of sheet
    extracted.grass1 = slice(od, 0, 0, 16, 16);     // bright spring grass
    extracted.grass2 = slice(od, 16, 0, 16, 16);    // grass variant 2
    extracted.grass3 = slice(od, 0, 16, 16, 16);    // grass variant 3

    // Flower grass variants from adjacent tiles
    extracted.grassFlower1 = slice(od, 32, 0, 16, 16);
    extracted.grassFlower2 = slice(od, 16, 16, 16, 16);
    extracted.grassFlower3 = slice(od, 32, 16, 16, 16);

    // Sandy path tile
    extracted.path = slice(od, 32, 48, 16, 16);
  }

  // ── Cabin from cabin.png (128x144) ──
  // Native resolution = 8x9 tiles at 16px/tile — no scaling needed
  const cabinImg = sheets.cabin;
  if (cabinImg) {
    const c = makeCanvas(128, 144);
    const cctx = c.getContext('2d');
    cctx.imageSmoothingEnabled = false;
    cctx.drawImage(cabinImg, 0, 0, cabinImg.width, cabinImg.height, 0, 0, 128, 144);
    extracted.cabin = c;
  }

  // ── Trees from trees.png (48x1280) ──
  // First tree: 48x80 (3x5 tiles)
  const treesImg = sheets.trees;
  if (treesImg) {
    // Dense green canopy from center of tree top (for border tiles)
    extracted.treeCanopy = slice(treesImg, 16, 16, 16, 16);
    // Raw trunk (has transparency — will composite with grass later)
    extracted.treeTrunkRaw = slice(treesImg, 16, 64, 16, 16);
    // Full tree sprite for standalone trees (3 wide x 5 tall)
    extracted.fullTree = slice(treesImg, 0, 0, 48, 80);
  }

  // ── Flower from flower.png (13x27) ──
  const flowerImg = sheets.flower;
  if (flowerImg) {
    extracted.flowerImg = flowerImg;
  }

  // ── Mailbox from mailbox.png — 1x2 tile overlay ──
  const mailboxImg = sheets.mailbox;
  if (mailboxImg) {
    const mb = makeCanvas(16, 32);
    const mctx = mb.getContext('2d');
    mctx.imageSmoothingEnabled = false;
    mctx.drawImage(mailboxImg, 0, 0, mailboxImg.width, mailboxImg.height, 2, 2, 12, 28);
    extracted.mailboxSprite = mb;
  }

  return extracted;
}

function extractIndoorTiles(sheets) {
  const extracted = {};

  // ── Floor from indoor-floors.png (32x32) ──
  const floorImg = sheets.floor;
  if (floorImg) {
    extracted.woodFloor = slice(floorImg, 0, 0, 16, 16);
    extracted.woodFloor2 = slice(floorImg, 16, 0, 16, 16);
  }

  // ── Walls from indoor-walls.png (16x48 = 3 strips of 16x16) ──
  const wallImg = sheets.walls;
  if (wallImg) {
    extracted.wallTop = slice(wallImg, 0, 0, 16, 16);   // top border
    extracted.wallMid = slice(wallImg, 0, 16, 16, 16);  // heart pattern
    extracted.wallBot = slice(wallImg, 0, 32, 16, 16);  // baseboard
  }

  // ── Bed from bed.png (48x55) ──
  const bedImg = sheets.bed;
  if (bedImg) {
    // Scale to 32x32 with nearest-neighbor, take center 16x16 slices
    const scaled = makeCanvas(32, 32);
    const bctx = scaled.getContext('2d');
    bctx.imageSmoothingEnabled = false;
    bctx.drawImage(bedImg, 0, 0, 48, 55, 0, 0, 32, 32);
    extracted.bedHead = slice(scaled, 8, 0, 16, 16);
    extracted.bedFoot = slice(scaled, 8, 16, 16, 16);
  }

  // ── TV from tv.png (30x45) — 2 tiles tall for proper scale ──
  const tvImg = sheets.tv;
  if (tvImg) {
    const full = makeCanvas(16, 32);
    const fctx = full.getContext('2d');
    fctx.imageSmoothingEnabled = false;
    // Floor background for both halves
    if (floorImg) {
      fctx.drawImage(floorImg, 0, 0, 16, 16, 0, 0, 16, 16);
      fctx.drawImage(floorImg, 0, 0, 16, 16, 0, 16, 16, 16);
    }
    // Scale TV to ~16x30, centered in 16x32
    fctx.drawImage(tvImg, 0, 0, 30, 45, 0, 1, 16, 30);
    extracted.tvTop = slice(full, 0, 0, 16, 16);
    extracted.tvBottom = slice(full, 0, 16, 16, 16);
  }

  return extracted;
}

// ════════════════════════════════════════════
// PROCEDURAL TILES (fallbacks)
// ════════════════════════════════════════════

function createGrass(seed) {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  const rnd = prng(seed);
  ctx.fillStyle = '#5a9c3a';
  ctx.fillRect(0, 0, T, T);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#4a8c2a' : '#6aac4a';
    ctx.fillRect(Math.floor(rnd() * T), Math.floor(rnd() * T), 1, 1);
  }
  return c;
}

function createGrassFlower(seed) {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  const rnd = prng(seed);
  ctx.fillStyle = '#5a9c3a';
  ctx.fillRect(0, 0, T, T);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#4a8c2a' : '#6aac4a';
    ctx.fillRect(Math.floor(rnd() * T), Math.floor(rnd() * T), 1, 1);
  }
  const colors = ['#f0e040', '#f0f0f0', '#e080a0', '#a0c0f0'];
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = colors[Math.floor(rnd() * colors.length)];
    ctx.fillRect(Math.floor(rnd() * 14) + 1, Math.floor(rnd() * 14) + 1, 1, 1);
  }
  return c;
}

function createPath(seed) {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  const rnd = prng(seed);
  ctx.fillStyle = '#c8b898';
  ctx.fillRect(0, 0, T, T);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = rnd() > 0.5 ? '#b8a888' : '#d0c0a0';
    ctx.fillRect(Math.floor(rnd() * T), Math.floor(rnd() * T), 1, 1);
  }
  return c;
}

function createFloor() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c0a878';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#b09868';
  ctx.fillRect(0, 3, T, 1); ctx.fillRect(0, 7, T, 1);
  ctx.fillRect(0, 11, T, 1); ctx.fillRect(0, 15, T, 1);
  ctx.fillStyle = '#a89060';
  ctx.fillRect(8, 0, 1, T);
  return c;
}

function createWall() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#7a5e3e';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#6a4e2e';
  for (let y = 0; y < T; y += 4) ctx.fillRect(0, y, T, 1);
  ctx.fillStyle = '#8a6e4e';
  ctx.fillRect(0, 2, T, 1); ctx.fillRect(0, 10, T, 1);
  return c;
}

function createWallTop() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a3e1e';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#6a4e2e';
  ctx.fillRect(0, T - 3, T, 3);
  ctx.fillStyle = '#8a6e4e';
  ctx.fillRect(0, 0, T, 2);
  return c;
}

function createDoor() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6a4e2e';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#8a6e4e';
  ctx.fillRect(2, 1, 12, 14);
  ctx.fillStyle = '#c0a878';
  ctx.fillRect(3, 2, 10, 12);
  ctx.fillStyle = '#d0c090';
  ctx.fillRect(10, 7, 2, 2);
  return c;
}

function createWater(frame) {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#4868b8';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#5878c8';
  const off = frame * 3;
  for (let y = 0; y < T; y += 4) {
    ctx.fillRect((off + y) % T, y, 4, 1);
    ctx.fillRect((off + y + 8) % T, y + 2, 3, 1);
  }
  ctx.fillStyle = '#6888d8';
  ctx.fillRect((2 + off) % T, 1, 2, 1);
  ctx.fillRect((10 + off) % T, 9, 2, 1);
  return c;
}

function createRose() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#3a7820';
  ctx.fillRect(1, 4, 14, 11); ctx.fillRect(3, 3, 10, 1);
  ctx.fillStyle = '#4a8830';
  ctx.fillRect(2, 5, 12, 8);
  fill(ctx, '#e04040', [[3,4,2,2],[8,5,2,2],[5,8,2,2],[10,7,2,2]]);
  fill(ctx, '#c03030', [[4,5,1,1],[9,6,1,1],[6,9,1,1],[11,8,1,1]]);
  ctx.fillStyle = '#2a6010';
  ctx.fillRect(7, 14, 2, 2);
  return c;
}

function createTreeTrunk() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a9c3a';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#6b4e30';
  ctx.fillRect(5, 0, 6, T);
  ctx.fillStyle = '#5a3e20';
  ctx.fillRect(6, 0, 1, T); ctx.fillRect(9, 0, 1, T);
  return c;
}

function createTreeCanopy() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2a7018';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#3a8828';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#4a9838';
  ctx.fillRect(3, 2, 8, 4); ctx.fillRect(2, 5, 10, 3);
  ctx.fillStyle = '#5aaa48';
  ctx.fillRect(4, 3, 3, 2); ctx.fillRect(9, 6, 2, 2);
  return c;
}

function createBedHead() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c0a878';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#8b6e4e';
  ctx.fillRect(1, 2, 14, 14);
  ctx.fillStyle = '#a08060';
  ctx.fillRect(2, 3, 12, 12);
  ctx.fillStyle = '#f0e8d8';
  ctx.fillRect(3, 6, 10, 8);
  ctx.fillStyle = '#e0d8c8';
  ctx.fillRect(4, 7, 8, 6);
  return c;
}

function createBedFoot() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c0a878';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#8b6e4e';
  ctx.fillRect(1, 0, 14, 14);
  ctx.fillStyle = '#c8b8a0';
  ctx.fillRect(2, 1, 12, 12);
  ctx.fillStyle = '#b8a890';
  ctx.fillRect(2, 5, 12, 1); ctx.fillRect(2, 9, 12, 1);
  ctx.fillStyle = '#7a5e3e';
  ctx.fillRect(1, 13, 14, 3);
  return c;
}

function createMailbox() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a9c3a';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#8b6e4e';
  ctx.fillRect(7, 6, 2, 10);
  ctx.fillStyle = '#a08868';
  ctx.fillRect(3, 2, 10, 6);
  ctx.fillStyle = '#8b7858';
  ctx.fillRect(4, 3, 8, 4);
  ctx.fillStyle = '#e04040';
  ctx.fillRect(13, 2, 2, 3); ctx.fillRect(12, 2, 1, 1);
  return c;
}

function createTable() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#c0a878';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#8b6e4e';
  ctx.fillRect(2, 3, 12, 10);
  ctx.fillStyle = '#a08060';
  ctx.fillRect(3, 4, 10, 8);
  ctx.fillStyle = '#6b4e30';
  ctx.fillRect(3, 12, 2, 3); ctx.fillRect(11, 12, 2, 3);
  return c;
}

function createRug() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9b4040';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#b85050';
  ctx.fillRect(2, 2, 12, 12);
  ctx.fillStyle = '#c86060';
  ctx.fillRect(4, 4, 8, 8);
  ctx.fillStyle = '#d89040';
  ctx.fillRect(3, 3, 10, 1); ctx.fillRect(3, 12, 10, 1);
  ctx.fillRect(3, 3, 1, 10); ctx.fillRect(12, 3, 1, 10);
  return c;
}

function createCabinExterior() {
  const c = makeCanvas(128, 144);
  const ctx = c.getContext('2d');
  // Roof (top ~50px)
  ctx.fillStyle = '#3a7a3a';
  ctx.fillRect(0, 0, 128, 54);
  ctx.fillStyle = '#4a8a4a';
  ctx.fillRect(4, 4, 120, 12);
  ctx.fillRect(10, 16, 108, 10);
  ctx.fillRect(16, 26, 96, 10);
  ctx.fillRect(22, 36, 84, 10);
  // Walls
  ctx.fillStyle = '#a08060';
  ctx.fillRect(10, 54, 108, 80);
  ctx.fillStyle = '#8b6e4e';
  ctx.fillRect(16, 58, 96, 72);
  // Left window
  ctx.fillStyle = '#88b8e8';
  ctx.fillRect(24, 68, 20, 20);
  ctx.fillStyle = '#6898c8';
  ctx.fillRect(26, 70, 16, 16);
  ctx.fillStyle = '#a08060';
  ctx.fillRect(33, 68, 2, 20); ctx.fillRect(24, 77, 20, 2);
  // Right window
  ctx.fillStyle = '#88b8e8';
  ctx.fillRect(84, 68, 20, 20);
  ctx.fillStyle = '#6898c8';
  ctx.fillRect(86, 70, 16, 16);
  ctx.fillStyle = '#a08060';
  ctx.fillRect(93, 68, 2, 20); ctx.fillRect(84, 77, 20, 2);
  // Door
  ctx.fillStyle = '#6a4e2e';
  ctx.fillRect(50, 76, 28, 58);
  ctx.fillStyle = '#8a6e4e';
  ctx.fillRect(52, 78, 24, 54);
  ctx.fillStyle = '#d0c090';
  ctx.fillRect(70, 100, 4, 4);
  return c;
}

function createFullTree() {
  const c = makeCanvas(48, 80);
  const ctx = c.getContext('2d');
  // Trunk (center, bottom 32px = 2 tiles)
  ctx.fillStyle = '#6b4e30';
  ctx.fillRect(20, 48, 8, 32);
  ctx.fillStyle = '#5a3e20';
  ctx.fillRect(22, 48, 1, 32); ctx.fillRect(26, 48, 1, 32);
  // Canopy (top 48px = 3 tiles, rough circle)
  ctx.fillStyle = '#2a7018';
  ctx.fillRect(8, 8, 32, 40);
  ctx.fillRect(4, 12, 40, 32);
  ctx.fillRect(0, 16, 48, 24);
  ctx.fillStyle = '#3a8828';
  ctx.fillRect(12, 12, 24, 32);
  ctx.fillRect(8, 16, 32, 24);
  ctx.fillStyle = '#4a9838';
  ctx.fillRect(16, 16, 16, 20);
  ctx.fillRect(12, 20, 24, 12);
  return c;
}

function createHeartIndicator() {
  const c = makeCanvas(7, 7);
  const ctx = c.getContext('2d');
  fill(ctx, '#e04040', [
    [1,0,2,1],[4,0,2,1],
    [0,1,3,1],[4,1,3,1],
    [0,2,7,1],[1,3,5,1],
    [2,4,3,1],[3,5,1,1],
  ]);
  return c;
}

function createFence() {
  const c = makeCanvas(T, T);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#5a9c3a';
  ctx.fillRect(0, 0, T, T);
  ctx.fillStyle = '#a08868';
  ctx.fillRect(0, 5, T, 2); ctx.fillRect(0, 11, T, 2);
  ctx.fillRect(7, 2, 2, 13);
  ctx.fillStyle = '#8a7050';
  ctx.fillRect(7, 1, 2, 2);
  return c;
}

// ════════════════════════════════════════════
// SPRITE VALIDATION
// ════════════════════════════════════════════

function isValidTile(canvas) {
  if (!canvas) return false;
  const ctx = canvas.getContext('2d');
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let nonTransparent = 0;
  let uniqueColors = new Set();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10) {
      nonTransparent++;
      uniqueColors.add((data[i] << 16) | (data[i+1] << 8) | data[i+2]);
    }
  }
  return nonTransparent > 10 && uniqueColors.size > 2;
}

// ════════════════════════════════════════════
// MAIN EXPORT
// ════════════════════════════════════════════

export function createAllSprites(sheets) {
  // ── Character ──
  const svChar = sheets ? extractCharacter(sheets) : null;
  const char = svChar || createProceduralCharacter();

  // ── Extract tiles from reference sheets ──
  const world = sheets ? extractWorldTiles(sheets) : {};
  const indoor = sheets ? extractIndoorTiles(sheets) : {};

  // ── Heart emote from emotes.png ──
  // Row 5 (y=80) = hearts. Row 4 (y=64) = exclamation marks.
  const heartEmote = sheets?.emotes ? slice(sheets.emotes, 0, 80, 16, 16) : null;

  const v = isValidTile;

  // ── Grass tiles (all from sprite sheet) ──
  const grass = [
    v(world.grass1) ? world.grass1 : createGrass(1),
    v(world.grass2) ? world.grass2 : createGrass(42),
    v(world.grass3) ? world.grass3 : createGrass(99),
  ];

  // ── Flower grass tiles (from sprite sheet) ──
  const grassFlower = [
    v(world.grassFlower1) ? world.grassFlower1 : createGrassFlower(7),
    v(world.grassFlower2) ? world.grassFlower2 : createGrassFlower(55),
    v(world.grassFlower3) ? world.grassFlower3 : createGrassFlower(123),
  ];

  // ── Path tile (single type) ──
  const pathTile = v(world.path) ? world.path : createPath(10);

  // ── Water (procedural animated) ──
  const water = [
    createWater(0), createWater(1), createWater(2), createWater(3),
  ];

  // ── Tree trunk: composite SV trunk on grass background ──
  const grassBg = grass[0];
  let treeTrunk = null;
  if (v(world.treeTrunkRaw)) {
    treeTrunk = makeCanvas(16, 16);
    const tctx = treeTrunk.getContext('2d');
    tctx.drawImage(grassBg, 0, 0);
    tctx.drawImage(world.treeTrunkRaw, 0, 0);
  }

  // ── Flower/rose tile: full flower as 1x2 transparent overlay ──
  let roseTile = null;
  if (world.flowerImg) {
    const fi = world.flowerImg;
    roseTile = makeCanvas(16, 32);
    const rctx = roseTile.getContext('2d');
    // Transparent background — drawn as overlay after tiles
    rctx.drawImage(fi, 0, 0, fi.width, fi.height, 1, 2, 14, 28);
  }

  // ── Cabin exterior ──
  const cabin = v(world.cabin) ? world.cabin : createCabinExterior();

  return {
    char,
    tiles: {
      grass,
      grassFlower,
      path: pathTile,
      floor:    v(indoor.woodFloor)  ? indoor.woodFloor  : createFloor(),
      wall:     v(indoor.wallMid)    ? indoor.wallMid    : createWall(),
      wallTop:  v(indoor.wallTop)    ? indoor.wallTop    : createWallTop(),
      door:     createDoor(),
      water,
      rose:     v(roseTile) ? roseTile : createRose(),
      treeTrunk:  v(treeTrunk) ? treeTrunk : createTreeTrunk(),
      treeCanopy: v(world.treeCanopy) ? world.treeCanopy : createTreeCanopy(),
      bedHead:  v(indoor.bedHead)    ? indoor.bedHead    : createBedHead(),
      bedFoot:  v(indoor.bedFoot)    ? indoor.bedFoot    : createBedFoot(),
      mailbox:  v(world.mailboxSprite) ? world.mailboxSprite : createMailbox(),
      tvTop:    v(indoor.tvTop)      ? indoor.tvTop      : createTable(),
      tvBottom: v(indoor.tvBottom)   ? indoor.tvBottom   : createTable(),
      rug:      createRug(),
      fence:    createFence(),
    },
    objects: {
      cabin,
      heart: v(heartEmote) ? heartEmote : createHeartIndicator(),
      tree: v(world.fullTree) ? world.fullTree : createFullTree(),
    },
    sv: {
      parchment: sheets?.mail ? slice(sheets.mail, 0, 0, 320, 132) : null,
      nightSky:  sheets?.mail ? slice(sheets.mail, 0, 396, 320, 198) : null,
    },
  };
}
