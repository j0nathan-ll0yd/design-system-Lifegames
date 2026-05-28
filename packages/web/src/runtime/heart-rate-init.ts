import { classifyHeartRate, classifyHRV, generateECGSamples } from './heart-rate';
import type { HeartRateProps } from '../widgets/health/HeartRate.types';

/**
 * Options for initHeartRateInline. All fields optional; defaults match the
 * consumer's inline IIFE (index.astro:158-481) or canvas data-* attributes.
 */
export interface HeartRateInlineOptions {
  /** Beats per minute. Default: canvas data-bpm attribute, or 72. */
  bpm?: number;
  /** HRV SDNN in ms. Default: canvas data-hrv attribute, or 40. */
  sdnn?: number;
  /** ECG stroke colour. Default: canvas data-stroke attribute, or '#f59e0b'. */
  stroke?: string;
}

/**
 * ECGSYN Gaussian model — ported verbatim from consumer index.astro:167-196.
 * NOTE: differs from generateECGSamples() in heart-rate.ts by one detail:
 * this version clamps the T-wave center to a minimum of 0.42 (the `if (center
 * < 0.42) center = 0.42` guard). generateECGSamples lacks that clamp.
 * Used only by initHeartRateInline; initHeartRate continues to use
 * generateECGSamples so its behaviour is unchanged.
 */
function ecgBeat(bpm: number, numSamples: number): number[] {
  const hrFact = Math.sqrt(bpm / 60);
  const tCenter = Math.max(0.44, 0.6 - (hrFact - 1) * 0.1);
  // [amplitude, center, width] — kept in sync with generateECGSamples and the iOS
  // ECGBackgroundView: R dominant, Q/S sharp flanks, P/T small broad bumps.
  const waves: [number, number, number][] = [
    [0.1,   0.16,    0.022],
    [-0.13, 0.30,    0.013],
    [1.0,   0.335,   0.013],
    [-0.30, 0.365,   0.016],
    [0.22,  tCenter, 0.060],
  ];
  const samples: number[] = [];
  for (let i = 0; i < numSamples; i++) {
    const t = i / numSamples;
    let val = 0;
    for (let j = 0; j < waves.length; j++) {
      const w = waves[j];
      const exponent = (t - w[1]) / w[2];
      val += w[0] * Math.exp(-0.5 * exponent * exponent);
    }
    samples[i] = val;
  }
  return samples;
}

interface ECGWidgetState {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  bpm: number;
  hrv: number;
  stroke: string;
  beatSamples: number[];
  samplesPerBeat: number;
  cursorX: number;
  canvasW: number;
  canvasH: number;
  pixelsPerSecond: number;
  meanRR: number;
  nextBeatTime: number;
  beatStartTime: number;
  beatDurationMs: number;
  currentRR: number;
  lastFrameTime: number;
  prevX: number;
  prevY: number;
  isVisible: boolean;
}

const BG_COLOR = '#06060f';
const GRID_MINOR_ALPHA = 'rgba(255,255,255,0.03)';
const GRID_MAJOR_ALPHA = 'rgba(255,255,255,0.07)';
const GRID_SPACING = 20;

function nextRR(meanRR: number, sdnn: number): number {
  const jitter = (Math.random() - 0.5) * 2 * sdnn;
  let rr = meanRR + jitter;
  if (rr < 250) rr = 250;
  if (rr > 2000) rr = 2000;
  return rr;
}

function drawGrid(gctx: CanvasRenderingContext2D, gw: number, gh: number): void {
  gctx.save();
  gctx.lineWidth = 0.5;
  // Minor grid
  gctx.strokeStyle = GRID_MINOR_ALPHA;
  for (let i = 0; i <= gw; i += GRID_SPACING) {
    gctx.beginPath();
    gctx.moveTo(Math.round(i) + 0.5, 0);
    gctx.lineTo(Math.round(i) + 0.5, gh);
    gctx.stroke();
  }
  for (let i = 0; i <= gh; i += GRID_SPACING) {
    gctx.beginPath();
    gctx.moveTo(0, Math.round(i) + 0.5);
    gctx.lineTo(gw, Math.round(i) + 0.5);
    gctx.stroke();
  }
  // Major grid
  gctx.strokeStyle = GRID_MAJOR_ALPHA;
  for (let i = 0; i <= gw; i += GRID_SPACING * 5) {
    gctx.beginPath();
    gctx.moveTo(Math.round(i) + 0.5, 0);
    gctx.lineTo(Math.round(i) + 0.5, gh);
    gctx.stroke();
  }
  for (let i = 0; i <= gh; i += GRID_SPACING * 5) {
    gctx.beginPath();
    gctx.moveTo(0, Math.round(i) + 0.5);
    gctx.lineTo(gw, Math.round(i) + 0.5);
    gctx.stroke();
  }
  gctx.restore();
}

function redrawGridStrip(gctx: CanvasRenderingContext2D, sx: number, stripW: number, gh: number): void {
  const x2 = sx + stripW;
  gctx.save();
  gctx.lineWidth = 0.5;
  // Minor
  gctx.strokeStyle = GRID_MINOR_ALPHA;
  const firstMinor = Math.floor(sx / GRID_SPACING) * GRID_SPACING;
  for (let gx = firstMinor; gx <= x2; gx += GRID_SPACING) {
    if (gx >= sx && gx <= x2) {
      gctx.beginPath();
      gctx.moveTo(Math.round(gx) + 0.5, 0);
      gctx.lineTo(Math.round(gx) + 0.5, gh);
      gctx.stroke();
    }
  }
  for (let gy = 0; gy <= gh; gy += GRID_SPACING) {
    gctx.beginPath();
    gctx.moveTo(sx, Math.round(gy) + 0.5);
    gctx.lineTo(x2, Math.round(gy) + 0.5);
    gctx.stroke();
  }
  // Major
  gctx.strokeStyle = GRID_MAJOR_ALPHA;
  const firstMajor = Math.floor(sx / (GRID_SPACING * 5)) * (GRID_SPACING * 5);
  for (let gx = firstMajor; gx <= x2; gx += GRID_SPACING * 5) {
    if (gx >= sx && gx <= x2) {
      gctx.beginPath();
      gctx.moveTo(Math.round(gx) + 0.5, 0);
      gctx.lineTo(Math.round(gx) + 0.5, gh);
      gctx.stroke();
    }
  }
  for (let gy = 0; gy <= gh; gy += GRID_SPACING * 5) {
    gctx.beginPath();
    gctx.moveTo(sx, Math.round(gy) + 0.5);
    gctx.lineTo(x2, Math.round(gy) + 0.5);
    gctx.stroke();
  }
  gctx.restore();
}

function resizeCanvas(wgt: ECGWidgetState): void {
  const rect = wgt.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  wgt.canvas.width = Math.round(rect.width * dpr);
  wgt.canvas.height = Math.round(rect.height * dpr);
  wgt.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  wgt.canvasW = rect.width;
  wgt.canvasH = rect.height;
  wgt.ctx.fillStyle = BG_COLOR;
  wgt.ctx.fillRect(0, 0, rect.width, rect.height);
  drawGrid(wgt.ctx, rect.width, rect.height);
  wgt.cursorX = 0;
  wgt.prevX = 0;
  wgt.prevY = rect.height * 0.6;
}

function renderFrame(wgt: ECGWidgetState, ts: number): void {
  const ctx = wgt.ctx;
  let elapsed = ts - wgt.lastFrameTime;
  if (elapsed > 100) elapsed = 100;
  wgt.lastFrameTime = ts;
  const advance = (elapsed / 1000) * wgt.pixelsPerSecond;
  let x = wgt.cursorX + advance;
  let wrapped = false;
  const w = wgt.canvasW;
  const h = wgt.canvasH;

  if (x >= w) {
    x = x - w;
    wrapped = true;
  }

  const clearWidth = Math.max(10, w * 0.04);

  if (wrapped) {
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(Math.round(wgt.cursorX), 0, Math.ceil(w - wgt.cursorX), h);
    redrawGridStrip(ctx, Math.round(wgt.cursorX), Math.ceil(w - wgt.cursorX), h);
  }
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(Math.round(x), 0, Math.ceil(clearWidth), h);
  redrawGridStrip(ctx, Math.round(x), Math.ceil(clearWidth), h);

  const baseline = h * 0.6;
  const amplitude = h * 0.48;
  let sample = 0;

  if (ts >= wgt.nextBeatTime) {
    wgt.currentRR = nextRR(wgt.meanRR, wgt.hrv);
    wgt.nextBeatTime = ts + wgt.currentRR;
    wgt.beatStartTime = ts;
    const activeFraction = 0.55 + 0.30 * (1 - Math.exp(-(wgt.bpm - 40) / 80));
    wgt.beatDurationMs = wgt.currentRR * activeFraction;
  }

  const timeSinceBeat = ts - wgt.beatStartTime;
  if (timeSinceBeat >= 0 && timeSinceBeat < wgt.beatDurationMs) {
    const progress = timeSinceBeat / wgt.beatDurationMs;
    let idx = Math.floor(progress * wgt.samplesPerBeat);
    if (idx >= wgt.samplesPerBeat) idx = wgt.samplesPerBeat - 1;
    sample = wgt.beatSamples[idx];
  }

  const y = baseline - sample * amplitude;

  if (!wrapped) {
    // Glow pass
    ctx.beginPath();
    ctx.moveTo(Math.round(wgt.prevX), Math.round(wgt.prevY));
    ctx.lineTo(Math.round(x), Math.round(y));
    ctx.strokeStyle = wgt.stroke;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 3.5;
    ctx.stroke();
    // Sharp pass
    ctx.beginPath();
    ctx.moveTo(Math.round(wgt.prevX), Math.round(wgt.prevY));
    ctx.lineTo(Math.round(x), Math.round(y));
    ctx.globalAlpha = 1.0;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1.0;
  } else {
    ctx.beginPath();
    ctx.arc(Math.round(x), Math.round(y), 1.5, 0, Math.PI * 2);
    ctx.fillStyle = wgt.stroke;
    ctx.globalAlpha = 1.0;
    ctx.fill();
  }

  wgt.cursorX = x;
  wgt.prevX = x;
  wgt.prevY = y;
}

function drawStaticWaveform(wgt: ECGWidgetState): void {
  const ctx = wgt.ctx;
  const w = wgt.canvasW;
  const h = wgt.canvasH;
  const baseline = h * 0.6;
  const amplitude = h * 0.48;
  const samples = wgt.beatSamples;
  const n = samples.length;
  const waveW = w * 0.6;
  const startX = w * 0.2;

  ctx.beginPath();
  ctx.moveTo(0, baseline);
  ctx.lineTo(startX, baseline);
  for (let i = 0; i < n; i++) {
    const px = startX + (i / (n - 1)) * waveW;
    const py = baseline - samples[i] * amplitude;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.lineTo(w, baseline);
  ctx.strokeStyle = wgt.stroke;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.globalAlpha = 1.0;
}

export function initHeartRate(container: HTMLElement, fixture: HeartRateProps): void {
  // Idempotency guard: prevent duplicate requestAnimationFrame loops when
  // multiple HeartRateIsland instances observe the same container document-wide.
  if (container.dataset.heartRateInit === '1') return;
  container.dataset.heartRateInit = '1';

  const hr = Math.round(fixture.health.quantities.heartRate.value);
  const hrv = Math.round(fixture.health.quantities.hrvSDNN.value);
  const zone = classifyHeartRate(hr);
  const hrvStyle = classifyHRV(hrv);

  // Update text elements
  const bpm = container.querySelector<HTMLElement>('#pulseBpm');
  if (bpm) {
    bpm.textContent = String(hr);
    bpm.style.color = zone.bpmColor;
    bpm.style.textShadow = zone.bpmShadow;
  }

  const badge = container.querySelector<HTMLElement>('#hrZoneBadge');
  if (badge) {
    badge.textContent = zone.zone;
    badge.style.color = zone.badgeColor;
    badge.style.background = zone.badgeBg;
    badge.style.border = '1px solid ' + zone.badgeBorder;
  }

  const hrvEl = container.querySelector<HTMLElement>('#hrHrvValue');
  if (hrvEl) {
    hrvEl.textContent = String(hrv);
    hrvEl.style.color = hrvStyle.color;
    hrvEl.style.textShadow = hrvStyle.shadow;
  }

  const card = container.querySelector<HTMLElement>('.tri-card');
  if (card) {
    card.classList.remove('is-loading');
    card.classList.add(zone.accentClass);
  }

  // Canvas ECG animation
  const canvas = container.querySelector<HTMLCanvasElement>('canvas.ecg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const now = performance.now();

  const wgt: ECGWidgetState = {
    canvas,
    ctx,
    bpm: hr,
    hrv,
    stroke: zone.ecgStroke,
    beatSamples: generateECGSamples(hr, 256),
    samplesPerBeat: 256,
    cursorX: 0,
    canvasW: 0,
    canvasH: 0,
    pixelsPerSecond: 50,
    meanRR: 60000 / hr,
    nextBeatTime: now + Math.random() * (60000 / hr),
    beatStartTime: now - 9999,
    beatDurationMs: 0,
    currentRR: 60000 / hr,
    lastFrameTime: now,
    prevX: 0,
    prevY: 0,
    isVisible: false,
  };

  // Set ECG background opacity
  const ecgBg = container.querySelector<HTMLElement>('.hr-ecg-bg');
  if (ecgBg) {
    ecgBg.style.opacity = String(zone.ecgOpacity);
  }

  if (prefersReducedMotion) {
    resizeCanvas(wgt);
    drawStaticWaveform(wgt);
    return;
  }

  // IntersectionObserver for visibility tracking
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target === wgt.canvas) {
          wgt.isVisible = entry.isIntersecting;
          if (entry.isIntersecting && !wgt.canvasW) {
            resizeCanvas(wgt);
            wgt.lastFrameTime = performance.now();
          }
        }
      }
    },
    { threshold: 0.1 },
  );
  observer.observe(wgt.canvas);

  // Debounced resize
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resizeCanvas(wgt), 200);
  });

  // Animation loop
  function animLoop(timestamp: number): void {
    if (wgt.isVisible) {
      renderFrame(wgt, timestamp);
    }
    requestAnimationFrame(animLoop);
  }
  requestAnimationFrame(animLoop);
}

/**
 * Self-bootstrapping ECG canvas animator. Finds a canvas by id and renders
 * a synthetic ECG waveform. Used by the consumer's pre-D2b inline script
 * pattern (extracted via D2b).
 *
 * For the typed-props variant used by production islands, see initHeartRate().
 *
 * Ported verbatim (ES5 → TS only) from consumer index.astro:158-481.
 * Algorithm is identical to the inline IIFE; shared module-scope helpers
 * (nextRR, drawGrid, redrawGridStrip, resizeCanvas, renderFrame,
 * drawStaticWaveform) are reused directly. ecgBeat() is a module-scope
 * duplicate of the inline's ecgBeat — NOT generateECGSamples — because the
 * inline includes a T-wave center clamp (center < 0.42) absent from
 * generateECGSamples.
 */
export function initHeartRateInline(canvasId: string, opts?: Partial<HeartRateInlineOptions>): void {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Read data-* attributes from canvas element, matching inline IIFE behaviour.
  const bpm = opts?.bpm ?? (parseInt(canvas.getAttribute('data-bpm') ?? '', 10) || 72);
  const hrv  = opts?.sdnn ?? (parseInt(canvas.getAttribute('data-hrv') ?? '', 10) || 40);
  const stroke = opts?.stroke ?? (canvas.getAttribute('data-stroke') || '#f59e0b');

  const now = performance.now();

  const wgt: ECGWidgetState = {
    canvas,
    ctx,
    bpm,
    hrv,
    stroke,
    beatSamples: ecgBeat(bpm, 256),
    samplesPerBeat: 256,
    cursorX: 0,
    canvasW: 0,
    canvasH: 0,
    pixelsPerSecond: 50,
    meanRR: 60000 / bpm,
    nextBeatTime: now + Math.random() * (60000 / bpm),
    beatStartTime: now - 9999,
    beatDurationMs: 0,
    currentRR: 60000 / bpm,
    lastFrameTime: now,
    prevX: 0,
    prevY: 0,
    isVisible: false,
  };

  // Live-data bridge — matches inline window.__ecgUpdate verbatim.
  (window as Window & { __ecgUpdate?: (newBpm: number, newHrv: number, newStroke: string) => void }).__ecgUpdate = function(newBpm: number, newHrv: number, newStroke: string): void {
    wgt.bpm = newBpm;
    wgt.hrv = newHrv;
    wgt.stroke = newStroke;
    wgt.meanRR = 60000 / newBpm;
    wgt.beatSamples = ecgBeat(newBpm, 256);
  };

  if (motionReduced) {
    resizeCanvas(wgt);
    drawStaticWaveform(wgt);
    return;
  }

  // IntersectionObserver — matches inline behaviour.
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.target === wgt.canvas) {
          wgt.isVisible = entry.isIntersecting;
          if (entry.isIntersecting) {
            if (!wgt.canvasW) resizeCanvas(wgt);
            wgt.lastFrameTime = performance.now();
          }
        }
      }
    },
    { threshold: 0.1 },
  );
  observer.observe(wgt.canvas);

  // Debounced resize — matches inline behaviour.
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => resizeCanvas(wgt), 200);
  });

  // Animation loop — matches inline behaviour.
  function animLoop(timestamp: number): void {
    if (wgt.isVisible) {
      renderFrame(wgt, timestamp);
    }
    requestAnimationFrame(animLoop);
  }
  requestAnimationFrame(animLoop);
}
