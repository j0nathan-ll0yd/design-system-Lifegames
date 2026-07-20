// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {type HeartRateTestSeam, initHeartRateInline} from '../../src/runtime/heart-rate-init'

/**
 * Deterministic test-seam coverage for the ECG canvas animator.
 *
 * jsdom does not implement a real 2D canvas context, so we install a no-op
 * recording stub via HTMLCanvasElement.prototype.getContext. This lets the
 * animation code run end-to-end without throwing; the assertions target the
 * seam's deterministic control surface (seed / freezeAt / step / state / ready)
 * and the production-safety gating, NOT raster pixels (which jsdom can't
 * produce). Pixel-level determinism is covered by the Playwright visual suite.
 */

type WindowWithSeam = Window & {__hrEcg?: HeartRateTestSeam}

function makeStubContext(): CanvasRenderingContext2D {
  // Every method is a no-op; every property is writable. Enough surface for
  // renderFrame / resizeCanvas / drawGrid to execute without error.
  const noop = (): void => {}
  const ctx: Record<string, unknown> = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    globalAlpha: 1,
    save: noop,
    restore: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    stroke: noop,
    fill: noop,
    fillRect: noop,
    setTransform: noop
  }
  return ctx as unknown as CanvasRenderingContext2D
}

function mountCanvas(opts: {withDataTest: boolean}): HTMLCanvasElement {
  const wrapper = document.createElement('div')
  if (opts.withDataTest) {
    wrapper.setAttribute('data-test', '1')
  }
  const canvas = document.createElement('canvas')
  canvas.id = 'hrEcgCanvas'
  canvas.setAttribute('data-bpm', '60')
  canvas.setAttribute('data-hrv', '40')
  wrapper.appendChild(canvas)
  document.body.appendChild(wrapper)
  return canvas
}

function getSeam(): HeartRateTestSeam | undefined {
  return (window as WindowWithSeam).__hrEcg
}

describe('initHeartRateInline test seam', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    delete (window as WindowWithSeam).__hrEcg
    // jsdom canvas has no 2d context — supply a recording stub.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => makeStubContext() as unknown as RenderingContext)
    // IntersectionObserver is not in jsdom.
    vi.stubGlobal('IntersectionObserver', class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    })
    // matchMedia (prefers-reduced-motion: reduce) -> false by default.
    vi.stubGlobal('matchMedia', () => ({matches: false, addEventListener() {}, removeEventListener() {}}))
    // requestAnimationFrame should NOT be needed in test mode (seam suppresses
    // the loop). Provide a throwing stub to prove it is never called.
    vi.stubGlobal('requestAnimationFrame', () => {
      throw new Error('rAF must not run when the test seam is driving frames')
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('installs window.__hrEcg when MODE === test AND a data-test="1" ancestor exists', () => {
    mountCanvas({withDataTest: true})
    initHeartRateInline('hrEcgCanvas')
    const seam = getSeam()
    expect(seam).toBeDefined()
    expect(typeof seam?.seed).toBe('function')
    expect(typeof seam?.step).toBe('function')
    expect(typeof seam?.freezeAt).toBe('function')
    expect(typeof seam?.state).toBe('function')
    expect(seam?.ready).toBe(false)
  })

  it('does NOT install the seam when the data-test="1" ancestor is absent', () => {
    mountCanvas({withDataTest: false})
    // Without the data-test gate the rAF loop would normally start, which our
    // throwing stub would surface. Swap in a counting stub for this case only.
    let rafCalls = 0
    vi.stubGlobal('requestAnimationFrame', () => {
      rafCalls++
      return 1
    })
    initHeartRateInline('hrEcgCanvas')
    expect(getSeam()).toBeUndefined()
    // Production path: the animation loop self-starts.
    expect(rafCalls).toBeGreaterThan(0)
  })

  it('ready flips true after the first step()', () => {
    mountCanvas({withDataTest: true})
    initHeartRateInline('hrEcgCanvas')
    const seam = getSeam()!
    expect(seam.ready).toBe(false)
    seam.step()
    expect(seam.ready).toBe(true)
  })

  it('seed + freezeAt + step produce identical state across two independent runs', () => {
    // Run 1
    mountCanvas({withDataTest: true})
    initHeartRateInline('hrEcgCanvas')
    const seam1 = getSeam()!
    seam1.seed(42)
    seam1.freezeAt(0)
    seam1.step(60)
    const state1 = seam1.state()

    // Run 2 — fresh DOM + fresh init, same seed/freeze/step sequence.
    document.body.innerHTML = ''
    delete (window as WindowWithSeam).__hrEcg
    mountCanvas({withDataTest: true})
    initHeartRateInline('hrEcgCanvas')
    const seam2 = getSeam()!
    seam2.seed(42)
    seam2.freezeAt(0)
    seam2.step(60)
    const state2 = seam2.state()

    expect(state2).toEqual(state1)
  })

  it('different seeds diverge (proves the RNG actually drives jitter)', () => {
    mountCanvas({withDataTest: true})
    initHeartRateInline('hrEcgCanvas')
    const seamA = getSeam()!
    seamA.seed(1)
    seamA.freezeAt(0)
    seamA.step(120)
    const a = seamA.state()

    document.body.innerHTML = ''
    delete (window as WindowWithSeam).__hrEcg
    mountCanvas({withDataTest: true})
    initHeartRateInline('hrEcgCanvas')
    const seamB = getSeam()!
    seamB.seed(999)
    seamB.freezeAt(0)
    seamB.step(120)
    const b = seamB.state()

    // currentX advances identically (time-driven), but lastBeatAt depends on
    // the RNG-driven nextRR schedule, so the two seeds must differ somewhere.
    expect(a.lastBeatAt).not.toBe(b.lastBeatAt)
  })

  it('state() reports the bpm/hrv the canvas was initialised with', () => {
    mountCanvas({withDataTest: true})
    initHeartRateInline('hrEcgCanvas')
    const seam = getSeam()!
    const s = seam.state()
    expect(s.bpm).toBe(60)
    expect(s.hrv).toBe(40)
  })
})
