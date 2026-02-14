import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { isAuthenticated } from "../utils/auth.js";
import { t } from "../utils/i18n.js";
import html from "./our-story-book.html?raw";

gsap.registerPlugin(ScrollTrigger);

const triggers = [];
const maskUrls = [];
const webglInstances = [];
const webglMap = new WeakMap();
let webglTickerAttached = false;
let webglTickerHandler = null;

function isWebGLSupported() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl", { alpha: true }) ||
      canvas.getContext("experimental-webgl");
    return Boolean(gl);
  } catch {
    return false;
  }
}

function hexToRgb01(hex) {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) return [0.94, 0.92, 0.87];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [r, g, b];
}

function getThemeBgColor() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(
    "--color-bg",
  );
  return raw ? raw.trim() : "#f0ecdf";
}

const vertexShaderSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  v_uv.y = 1.0 - v_uv.y;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_progress;
uniform vec3 u_color;
uniform float u_seed;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7)) + u_seed * 17.0) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += noise(p) * a;
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = v_uv;

  // Aspect correction for noise domain (very important on wide layouts)
  float aspect = u_resolution.x / max(u_resolution.y, 1.0);
  vec2 uvn = uv;
  uvn.x *= aspect;

  // Subtle drift
  float t = u_time * 0.05;
  vec2 drift = vec2(t * 0.04, -t * 0.03);

  // Progress -> frontier
  float edgePos = mix(-0.25, 1.25, u_progress);

  // Noise domain: add stronger x scaling so edge can't look straight
  vec2 p = uvn * vec2(3.2, 2.1) + drift;

  float n_big  = fbm(p * 1.4 + vec2(u_seed * 1.3, u_seed * 0.7));
  float n_mid  = fbm(p * 3.4 + vec2(4.0 + u_seed * 0.2, 1.3) + n_big * 0.8);
  float n_fine = fbm(p * 9.5 + vec2(9.1, 3.7) + n_mid * 1.2);

  // Stronger warp (noticeable organic edge)
  float edgeNoise =
      (n_big  - 0.5) * 0.30 +
      (n_mid  - 0.5) * 0.16 +
      (n_fine - 0.5) * 0.06;

  // Signed distance to frontier (d > 0 => covered)
  float d = (uv.y + edgeNoise) - edgePos;

  // Binary matte with only tiny AA band (NO global fading)
float aa = 1.5 / max(u_resolution.x, u_resolution.y);


  float alpha = step(0.0, d);
  // only soften inside a ~1px band around the boundary
  float soft = smoothstep(-aa, aa, d);
  alpha = mix(alpha, soft, step(-aa, d) * step(d, aa));

  // Holes only near the edge (hard cutouts, no opacity fade)
  float band = 0.12;
  float inBand = 1.0 - smoothstep(band, band + aa, abs(d));

  float h1 = fbm(uvn * 18.0 + vec2(u_seed * 3.0, u_seed * 1.7));
  float h2 = fbm(uvn * 7.0  + vec2(11.0 + u_seed, 5.0));

  float holes = step(0.84, h1) * 0.65 + step(0.78, h2) * 0.35;

  // Prefer holes on covered side
  float coverSide = step(0.0, d);
  alpha *= 1.0 - holes * inBand * coverSide;

  // Guard the first moments so you don't get early pinholes
  float startGuard = smoothstep(0.02, 0.08, u_progress);
  alpha = mix(1.0, alpha, startGuard);

  // Color: keep opaque paper-like cover, add subtle stain
  float stain = (fbm(uvn * 6.0 + vec2(2.0, 6.0) + u_seed) - 0.5) * 0.08;
  vec3 color = clamp(u_color + stain, 0.0, 1.0);

  // Pigment pooling near edge (color only)
  float poolW = 0.04;
  float pool = smoothstep(poolW, 0.0, d) * alpha;
  color *= (1.0 - 0.10 * pool);


  gl_FragColor = vec4(color, alpha);
}

`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);

    throw new Error(info || "Shader compile failed");
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(info || "Program link failed");
  }
  return program;
}

class WatercolorWebGL {
  constructor(canvas, { seed, color }) {
    this.canvas = canvas;
    this.seed = seed;
    this.color = color;
    this.progress = 0;
    this.gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!this.gl) {
      throw new Error("WebGL not available");
    }

    this.program = createProgram(
      this.gl,
      vertexShaderSource,
      fragmentShaderSource,
    );
    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      this.gl.STATIC_DRAW,
    );

    this.aPosition = this.gl.getAttribLocation(this.program, "a_position");
    this.uResolution = this.gl.getUniformLocation(this.program, "u_resolution");
    this.uTime = this.gl.getUniformLocation(this.program, "u_time");
    this.uProgress = this.gl.getUniformLocation(this.program, "u_progress");
    this.uColor = this.gl.getUniformLocation(this.program, "u_color");
    this.uSeed = this.gl.getUniformLocation(this.program, "u_seed");

    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) {
      this.resizeObserver.observe(canvas.parentElement);
    }
    this.resize();
  }

  resize() {
    const target = this.canvas.parentElement || this.canvas;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const overscan = 1.2;
    const width = Math.max(1, Math.floor(target.clientWidth * overscan * dpr));
    const height = Math.max(
      1,
      Math.floor(target.clientHeight * overscan * dpr),
    );
    if (this.canvas.width === width && this.canvas.height === height) return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${target.clientWidth * overscan}px`;
    this.canvas.style.height = `${target.clientHeight * overscan}px`;
    this.gl.viewport(0, 0, width, height);
  }

  render(time) {
    if (!this.gl) return;
    this.gl.useProgram(this.program);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.enableVertexAttribArray(this.aPosition);
    this.gl.vertexAttribPointer(this.aPosition, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
    this.gl.uniform1f(this.uTime, time);
    this.gl.uniform1f(this.uProgress, this.progress);
    this.gl.uniform3f(this.uColor, this.color[0], this.color[1], this.color[2]);
    this.gl.uniform1f(this.uSeed, this.seed);

    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
  }

  destroy() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.gl = null;
  }
}

// --- Noise generation for watercolor mask ---

function hash2D(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = h ^ (h >>> 16);
  return (h & 0x7fffffff) / 0x7fffffff;
}

function smoothNoise(x, y, seed) {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const fx = x - ix,
    fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2D(ix, iy, seed);
  const n10 = hash2D(ix + 1, iy, seed);
  const n01 = hash2D(ix, iy + 1, seed);
  const n11 = hash2D(ix + 1, iy + 1, seed);
  return (
    n00 * (1 - sx) * (1 - sy) +
    n10 * sx * (1 - sy) +
    n01 * (1 - sx) * sy +
    n11 * sx * sy
  );
}

function fractalNoise(x, y, seed, octaves) {
  let value = 0,
    amplitude = 1,
    frequency = 1,
    max = 0;
  for (let i = 0; i < octaves; i++) {
    value +=
      smoothNoise(x * frequency, y * frequency, seed + i * 97) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / max;
}

/**
 * Generates a pair of watercolor mask textures (normal + vertically flipped).
 *
 * The mask is 4x element height with guaranteed safe zones:
 *   - Top 25%: pure white (image fully visible when pos=0%)
 *   - Middle 50%: domain-warped watercolor transition
 *   - Bottom 25%: pure black (image fully hidden when pos=100%)
 *
 * The flipped mask is used when scrolling up, so the watercolor edge
 * sweeps from bottom to top instead of retracing the top-down edge.
 */
function generateWatercolorMasks(seed) {
  const W = 200;
  const H = 800;
  const imageData = new ImageData(W, H);
  const data = imageData.data;

  for (let py = 0; py < H; py++) {
    const ny = py / H;

    for (let px = 0; px < W; px++) {
      const idx = (py * W + px) * 4;
      const nx = px / W;

      let v;

      // Safe zones — no noise, guaranteed clean edges
      if (ny <= 0.25) {
        v = 255;
      } else if (ny >= 0.75) {
        v = 0;
      } else {
        // Remap to 0–1 within transition zone (0.25 to 0.75)
        const tn = (ny - 0.25) / 0.5;

        // --- Domain warping level 1 ---
        const w1x = fractalNoise(nx * 3.0, tn * 2.5, seed, 3);
        const w1y = fractalNoise(nx * 3.0 + 5.2, tn * 2.5 + 1.3, seed + 11, 3);
        const dx1 = nx + (w1x - 0.5) * 0.85;
        const dy1 = tn + (w1y - 0.5) * 0.85;

        // --- Domain warping level 2 ---
        const w2x = fractalNoise(dx1 * 4.0, dy1 * 3.5, seed + 33, 2);
        const w2y = fractalNoise(
          dx1 * 4.0 + 8.1,
          dy1 * 3.5 + 4.7,
          seed + 44,
          2,
        );
        const dx2 = dx1 + (w2x - 0.5) * 0.35;
        const dy2 = dy1 + (w2y - 0.5) * 0.35;

        // Main noise at doubly-warped position
        const mainNoise = fractalNoise(dx2 * 4.0, dy2 * 3.0, seed + 100, 4);

        // Detail noise — single warp
        const detailNoise = fractalNoise(
          nx * 7.0 + (w1x - 0.5) * 0.4,
          tn * 5.0 + (w1y - 0.5) * 0.4,
          seed + 200,
          3,
        );

        // Fine speckle noise
        const speckNoise = fractalNoise(nx * 18.0, tn * 14.0, seed + 300, 2);

        // Base gradient centered in transition zone
        const gradBase = (tn - 0.5) / 0.3;
        const edgeShift = (mainNoise - 0.5) * 0.72 + (detailNoise - 0.5) * 0.12;
        const adjusted = gradBase - edgeShift;

        // Smoothstep falloff
        if (adjusted < -0.12) {
          v = 255;
        } else if (adjusted < 0.2) {
          const t = (adjusted + 0.12) / 0.32;
          const s = t * t * (3.0 - 2.0 * t);
          v = Math.round(255 * (1.0 - s));
        } else {
          v = 0;
        }

        // Scattered blobs below edge
        if (v === 0 && tn > 0.15 && tn < 0.9) {
          const distFromEdge = Math.max(0, adjusted - 0.2);
          const blobThresh = 0.62 + distFromEdge * 1.0;
          if (mainNoise > blobThresh && blobThresh < 1.0) {
            const str = (mainNoise - blobThresh) / (1.0 - blobThresh);
            v = Math.round(Math.min(240 * str * str, 240));
          }
        }

        // Fine specks
        if (v === 0 && tn > 0.25 && tn < 0.92) {
          if (speckNoise > 0.86) {
            const str = (speckNoise - 0.86) / 0.14;
            v = Math.round(100 * str * str);
          }
        }

        // Blend toward safe zones at transition boundaries
        if (tn < 0.1) {
          v = Math.round(v + (255 - v) * (1 - tn / 0.1));
        } else if (tn > 0.9) {
          v = Math.round(v * (1 - (tn - 0.9) / 0.1));
        }
      }

      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }

  // Render raw noise, then soften with blur
  const temp = document.createElement("canvas");
  temp.width = W;
  temp.height = H;
  temp.getContext("2d").putImageData(imageData, 0, 0);

  const blurred = document.createElement("canvas");
  blurred.width = W;
  blurred.height = H;
  const bCtx = blurred.getContext("2d");
  bCtx.filter = "blur(1.5px)";
  bCtx.drawImage(temp, 0, 0);

  const normalUrl = blurred.toDataURL("image/png");

  // Flip vertically for bottom-up mask
  const flipped = document.createElement("canvas");
  flipped.width = W;
  flipped.height = H;
  const fCtx = flipped.getContext("2d");
  fCtx.translate(0, H);
  fCtx.scale(1, -1);
  fCtx.drawImage(blurred, 0, 0);

  const flippedUrl = flipped.toDataURL("image/png");

  return { normal: normalUrl, flipped: flippedUrl };
}

// --- Page setup ---

function buildChapters(container) {
  const chaptersEl = container.querySelector("#story-book-chapters");
  const chapters = t("storyBook.chapters");
  if (!Array.isArray(chapters)) return;

  chaptersEl.innerHTML = chapters
    .map((ch, i) => {
      return `
      <article class="story-book-chapter">
        <div class="story-book-image-col">
        <div class="story-book-image-wrap" data-mask-index="${i}">
          <div class="story-book-image-inner">
            <img src="/images/story-${i + 1}.png" alt="${ch.title}">
          </div>
          <div class="story-book-cover" aria-hidden="true"></div>
          <div class="story-book-cover-solid" aria-hidden="true"></div>
        </div>
        </div>
        <div class="story-book-text-col">
          <div class="story-book-text-inner">
            <span class="story-book-label">${ch.label}</span>
            <h2 class="story-book-heading">${ch.title}</h2>
            <div class="story-book-body">${ch.text}</div>
          </div>
        </div>
      </article>`;
    })
    .join("");
}

function applyMasks(container) {
  const wraps = container.querySelectorAll(".story-book-image-wrap");
  wraps.forEach((wrap, i) => {
    const cover = wrap.querySelector(".story-book-cover");
    if (!cover) return;
    // Clear any previous image masking on the wrapper
    wrap.style.maskImage = "none";
    wrap.style.webkitMaskImage = "none";
    wrap.style.maskSize = "";
    wrap.style.webkitMaskSize = "";
    wrap.style.maskRepeat = "";
    wrap.style.webkitMaskRepeat = "";
    wrap.style.maskPosition = "";
    wrap.style.webkitMaskPosition = "";
    wrap.style.maskMode = "";
    wrap.style.webkitMaskMode = "";

    const masks = generateWatercolorMasks(i * 37 + 7);
    maskUrls.push(masks.normal);
    const maskCss = `url("${masks.normal}")`;
    cover.style.maskImage = maskCss;
    cover.style.webkitMaskImage = maskCss;
    cover.style.maskSize = "100% 100%";
    cover.style.webkitMaskSize = "100% 100%";
    cover.style.maskRepeat = "no-repeat";
    cover.style.webkitMaskRepeat = "no-repeat";
    cover.style.maskPosition = "50% 50%";
    cover.style.webkitMaskPosition = "50% 50%";
    cover.style.maskMode = "luminance";
    cover.style.webkitMaskMode = "luminance";
    cover.style.transform = "translate3d(0, 0, 0)";
  });
}

function setupWebGLMasks(container) {
  const wraps = container.querySelectorAll(".story-book-image-wrap");
  const color = hexToRgb01("#f0ecdf");

  wraps.forEach((wrap, i) => {
    const cover = wrap.querySelector(".story-book-cover");
    const solidCover = wrap.querySelector(".story-book-cover-solid");

    // If WebGL succeeds, we don't need DOM covers.
    if (cover) cover.style.display = "none";
    if (solidCover) solidCover.style.display = "none";

    const canvas = document.createElement("canvas");
    canvas.className = "story-book-webgl";
    canvas.setAttribute("aria-hidden", "true");
    wrap.appendChild(canvas);

    try {
      const instance = new WatercolorWebGL(canvas, { seed: i * 37 + 7, color });
      webglInstances.push(instance);
      webglMap.set(wrap, instance);
    } catch (err) {
      // Restore fallback UI if WebGL fails
      if (canvas.parentElement) canvas.parentElement.removeChild(canvas);
      if (cover) cover.style.display = "";
      if (solidCover) solidCover.style.display = "";

      console.error("[story-book] WebGL mask init failed", err);
    }
  });

  if (!webglTickerAttached && webglInstances.length) {
    webglTickerAttached = true;
    webglTickerHandler = () => {
      const time = gsap.ticker.time;
      webglInstances.forEach((instance) => instance.render(time));
    };
    gsap.ticker.add(webglTickerHandler);
  }
}

function setupAnimations(container) {
  // Statement text
  const statement = container.querySelector("#story-book-statement");
  if (statement) {
    const st = ScrollTrigger.create({
      trigger: statement,
      start: "top 80%",
      end: "top 20%",
      animation: gsap.fromTo(
        statement,
        { opacity: 0, y: 60 },
        { opacity: 1, y: 0, duration: 1, ease: "none" },
      ),
      scrub: 1.5,
    });
    triggers.push(st);

    const ghosts = statement.querySelectorAll(".statement-ghost");
    ghosts.forEach((ghost) => {
      const st2 = ScrollTrigger.create({
        trigger: statement,
        start: "top 50%",
        end: "bottom 50%",
        animation: gsap.fromTo(
          ghost,
          { opacity: 0.15 },
          { opacity: 0.7, duration: 1, ease: "none" },
        ),
        scrub: 2,
      });
      triggers.push(st2);
    });
  }

  // Chapter animations
  container.querySelectorAll(".story-book-chapter").forEach((chapter) => {
    const textInner = chapter.querySelector(".story-book-text-inner");
    const imageWrap = chapter.querySelector(".story-book-image-wrap");
    const imageInner = chapter.querySelector(".story-book-image-inner");
    const cover = chapter.querySelector(".story-book-cover");
    const solidCover = chapter.querySelector(".story-book-cover-solid");

    // Text drift
    if (textInner) {
      const st = ScrollTrigger.create({
        trigger: chapter,
        start: "top 75%",
        end: "top 25%",
        animation: gsap.fromTo(
          textInner,
          { y: 80, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, ease: "none" },
        ),
        scrub: 1.5,
      });
      triggers.push(st);
    }

    // Watercolor cover reveal — WebGL drives progress (DOM covers are disabled in setupWebGLMasks)
    if (imageWrap) {
      const instance = webglMap.get(imageWrap);

      if (instance) {
        // Ensure the image is visible (WebGL cover reveals it)
        if (imageInner) imageInner.style.opacity = "1";

        const tween = gsap.fromTo(
          instance,
          { progress: 0 },
          { progress: 1, ease: "none" },
        );
        const st = ScrollTrigger.create({
          trigger: imageWrap,
          start: "top 50%",
          end: "top 10%",
          scrub: true,
          animation: tween,
          invalidateOnRefresh: true,
        });
        triggers.push(st);
      } else {
        // Fallback path (CSS mask cover slide)
        if (cover) {
          const tween = gsap.fromTo(
            cover,
            { y: 0 },
            {
              y: () => -(cover.offsetHeight - imageWrap.offsetHeight),
              ease: "none",
            },
          );

          const st = ScrollTrigger.create({
            trigger: imageWrap,
            start: "top 50%",
            end: "top 10%",
            scrub: true,
            animation: tween,
            invalidateOnRefresh: true,
          });
          triggers.push(st);
        }
      }
    }

    // Image parallax
    if (imageInner) {
      const st = ScrollTrigger.create({
        trigger: chapter,
        start: "top bottom",
        end: "bottom top",
        animation: gsap.fromTo(
          imageInner,
          { yPercent: -8 },
          { yPercent: 8, ease: "none" },
        ),
        scrub: true,
      });
      triggers.push(st);
    }
  });
}

export function destroyStoryBook() {
  triggers.forEach((st) => st.kill());
  triggers.length = 0;
  maskUrls.forEach((url) => {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
  });
  maskUrls.length = 0;
  webglInstances.forEach((instance) => instance.destroy());
  webglInstances.length = 0;
  if (webglTickerAttached && webglTickerHandler) {
    gsap.ticker.remove(webglTickerHandler);
    webglTickerHandler = null;
    webglTickerAttached = false;
  }
}

export const storyBookPage = {
  html,
  guard: () => isAuthenticated(),

  init(container) {
    // Set i18n text
    container.querySelector("#story-book-title").textContent =
      t("storyBook.title");
    container.querySelector("#story-book-subtitle").textContent =
      t("storyBook.subtitle");

    // Build statement text with ghost words
    const statementLine1 = t("storyBook.statementLine1") || "";
    const statementLine2 = t("storyBook.statementLine2") || "";
    const statementEl = container.querySelector("#story-book-statement-text");
    statementEl.innerHTML =
      `<span class="statement-solid">${statementLine1}</span><br>` +
      `<span class="statement-ghost">${statementLine2}</span>`;

    // Build chapters
    buildChapters(container);

    // Generate and apply watercolor masks
    if (isWebGLSupported()) {
      setupWebGLMasks(container);
    } else {
      applyMasks(container);
    }

    // Hero entrance
    gsap.from("#story-book-title", {
      opacity: 0,
      y: 30,
      duration: 0.7,
      ease: "power2.out",
    });
    gsap.from("#story-book-subtitle", {
      opacity: 0,
      y: 30,
      duration: 0.7,
      delay: 0.2,
      ease: "power2.out",
    });

    // Setup scroll animations after a tick
    requestAnimationFrame(() => {
      setupAnimations(container);
      ScrollTrigger.refresh();
    });
  },
};
