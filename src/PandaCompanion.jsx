/**
 * The TutorPro panda, flying around the homepage.
 *
 * WHAT IT DOES
 * ------------
 * A 3D-rendered panda in headphones, holding a book, drifts across the page
 * as you scroll: swooping left to right, banking as it turns, bobbing gently,
 * and pausing at a few sections to say something short and useful. Tap or
 * click it and it does a little spin.
 *
 * WHY IT IS BUILT THIS WAY
 * ------------------------
 * A mascot that follows you down a page is one wrong decision away from being
 * the animated paperclip. The rules it follows:
 *
 *  1. IT NEVER BLOCKS ANYTHING. `pointer-events: none` on the layer, re-enabled
 *     only on the panda itself, so it can never swallow a click meant for a
 *     "Book a free class" button underneath it.
 *  2. IT NEVER COVERS TEXT. It flies down the left and right MARGINS, and it
 *     hides itself entirely on narrow screens where there are no margins.
 *  3. IT CAN BE DISMISSED, AND STAYS DISMISSED. A close button, remembered in
 *     localStorage, because a parent who finds it distracting should only have
 *     to say so once.
 *  4. IT OBEYS prefers-reduced-motion — the whole thing simply never mounts.
 *  5. IT COSTS ALMOST NOTHING. One passive scroll listener feeding a single
 *     requestAnimationFrame that writes CSS custom properties. React does not
 *     re-render while you scroll; only the speech bubble text is state.
 *
 * WHY CSS VARIABLES RATHER THAN REACT STATE FOR POSITION
 * ------------------------------------------------------
 * Re-rendering a component on every scroll event is how you get a janky page.
 * The flight path is computed in a rAF loop and written straight to the node
 * as --panda-x / --panda-y / --panda-rot, so the browser keeps the whole thing
 * on the compositor.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

// Matches the helper App.jsx uses, so the panda resolves correctly under any
// deploy base path rather than assuming the site is served from the root.
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`

const DISMISS_KEY = 'tutorpro_panda_hidden_v1'

/**
 * Places the panda stops to say hello, as a fraction of total scroll.
 * Kept short and genuinely useful — no "Hi, I see you're reading!".
 *
 * These sit inside the windows where the panda is actually out over a margin
 * and fully visible (measured: roughly 0.14–0.20, 0.44–0.50 and 0.76–0.82).
 * A stop placed mid-crossing would be a bubble with no panda under it.
 */
const stops = [
  { at: 0.17, text: 'Your first class is free!' },
  { at: 0.47, text: 'Cambridge & Oxford books' },
  { at: 0.79, text: 'From $8 a class' },
]

export default function PandaCompanion() {
  const layerRef = useRef(null)
  const pandaRef = useRef(null)
  const [message, setMessage] = useState('')
  // Worked out in the initialiser rather than an effect: all three inputs are
  // knowable synchronously, so an effect would only add a cascading render and
  // a frame where the panda flashes in before being hidden again.
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return true
    try { if (window.localStorage.getItem(DISMISS_KEY) === '1') return true } catch { /* private mode */ }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true
    // Below 1100px the page has no side margin left to fly in without crossing
    // the text, so the panda stays away rather than getting in the way.
    return !window.matchMedia('(min-width: 1100px)').matches
  })
  const [spinning, setSpinning] = useState(false)
  const spinTimer = useRef(0)
  // Cached content-column width. Measured once per layout rather than on every
  // scroll frame, because reading a box forces the browser to flush layout.
  const layoutWidthRef = useRef(0)

  useEffect(() => {
    if (hidden) return undefined
    const layer = layerRef.current
    if (!layer) return undefined

    const PANDA_WIDTH = 118

    // Measure the content column once, from a container that is NOT the hero
    // (the hero's is parallax-translated). Re-measured on resize only.
    const measureColumn = () => {
      const columns = [...document.querySelectorAll('main .container')]
        .filter((el) => !el.closest('.hero'))
      const width = columns.reduce((widest, el) => Math.max(widest, el.getBoundingClientRect().width), 0)
      layoutWidthRef.current = width || Math.min(1160, window.innerWidth - 48)
    }
    measureColumn()

    // Eased values, so the panda glides toward its target rather than snapping
    // to it. This is what makes the movement read as flight and not as a
    // scrollbar-driven slider.
    let currentSweep = 0
    let currentY = 0
    let currentRot = 0
    let lastSweep = 0
    let activeStop = -1

    const tick = () => {
      const doc = document.documentElement
      const max = Math.max(1, doc.scrollHeight - window.innerHeight)
      const ratio = Math.min(1, Math.max(0, window.scrollY / max))

      /*
       * WORKING OUT WHERE IT IS SAFE TO FLY.
       *
       * The content column is 1160px wide, so on a 1440px screen there is only
       * 140px of margin either side — barely wider than the panda. Anything
       * that simply sweeps across the viewport therefore spends most of its
       * time on top of the words. So the lane is measured from the real
       * column rather than guessed: the panda flies down the middle of the
       * left or right margin and nowhere else.
       */
      /*
       * The gutter is derived from the column's WIDTH, not from its measured
       * left/right edges. getBoundingClientRect() reports the post-transform
       * box, and the hero's container carries a parallax translate, so reading
       * its edges gave a bogus 46px gutter on one side and hid the panda
       * everywhere. Width is unaffected by a translate, and the column is
       * centred by `margin: 0 auto`, so half the leftover space is the truth.
       */
      const columnWidth = layoutWidthRef.current || Math.min(1160, window.innerWidth - 48)
      const gutter = (window.innerWidth - columnWidth) / 2

      /*
       * The panda must sit entirely OUTSIDE the text column, so its centre has
       * to be at least half its own width clear of the column edge — being
       * centred in the gutter is not enough when the gutter is narrower than
       * the panda. Anything less and it clips the words, which is exactly what
       * the first version did (measured 118px of overlap at 1440px).
       */
      const columnEdge = columnWidth / 2          // centre -> edge of the text
      const halfPanda = PANDA_WIDTH / 2
      const innerLimit = columnEdge + halfPanda + 6   // nearest it may come
      const outerLimit = window.innerWidth / 2 - halfPanda - 6 // page edge

      // If the window is too narrow for the panda to clear the text at all,
      // it stays away rather than flying over the copy.
      if (outerLimit < innerLimit) {
        layer.style.setProperty('--panda-opacity', '0')
        return
      }
      const laneOffset = Math.min(outerLimit, Math.max(innerLimit, window.innerWidth / 2 - gutter / 2))

      // The flight path: a slow sine sweeps the panda from one margin to the
      // other as the page scrolls, while a faster wave adds a gentle bob so it
      // never looks like it is running on rails.
      const sweep = Math.sin(ratio * Math.PI * 3)
      const targetY = ratio * 100
      const bob = Math.sin(ratio * Math.PI * 14) * 2.2

      currentSweep += (sweep - currentSweep) * 0.08
      currentY += (targetY - currentY) * 0.10

      /*
       * Crossing from one margin to the other means passing over the content,
       * so the panda fades out while it crosses and swoops back in on the far
       * side. It reads as flying away and returning, and it is never visible
       * on top of the words.
       *
       * The fade is driven by the panda's REAL horizontal position, not by the
       * raw sweep value. The eased position lags the sweep, so keying opacity
       * off the sweep made it reach full opacity while still physically over
       * the column — measured 91px of overlap at 1440px. Deriving it from the
       * actual gap to the text edge means the fade cannot disagree with where
       * the panda really is.
       */
      const centreX = window.innerWidth / 2 + currentSweep * laneOffset
      const clearance = Math.abs(centreX - window.innerWidth / 2) - (columnEdge + halfPanda)
      const opacity = Math.min(1, Math.max(0, clearance / 10))

      // Bank into the turn: the panda leans the way it is actually moving.
      const drift = currentSweep - lastSweep
      lastSweep = currentSweep
      const targetRot = Math.max(-16, Math.min(16, drift * 160))
      currentRot += (targetRot - currentRot) * 0.12

      layer.style.setProperty('--panda-left', `${centreX.toFixed(1)}px`)
      layer.style.setProperty('--panda-y', (currentY + bob).toFixed(2))
      layer.style.setProperty('--panda-rot', currentRot.toFixed(2))
      layer.style.setProperty('--panda-opacity', opacity.toFixed(3))
      // Face the direction of travel.
      layer.style.setProperty('--panda-flip', drift < -0.0005 ? '-1' : '1')

      // Speak, but only when passing a stop, while actually visible, and only
      // once per pass. A bubble from an invisible panda would be a ghost.
      const nextStop = opacity > 0.85
        ? stops.findIndex((stop) => Math.abs(ratio - stop.at) < 0.045)
        : -1
      if (nextStop !== activeStop) {
        activeStop = nextStop
        setMessage(nextStop === -1 ? '' : stops[nextStop].text)
      }
    }

    /*
     * Keep animating until the easing has actually settled.
     *
     * The first version only ran a frame per scroll event. Because the position
     * is eased toward its target, a single jump (or a flick of the wheel that
     * ends instantly) left the panda frozen part-way through its glide —
     * measured parked at 1320px with opacity 0, i.e. permanently invisible
     * until the next scroll. So the loop now keeps running of its own accord
     * while there is still distance to cover, and only then goes back to sleep.
     */
    let settleFrame = 0
    const settle = () => {
      settleFrame = 0
      const before = `${currentSweep}|${currentY}|${currentRot}`
      tick()
      const after = `${currentSweep}|${currentY}|${currentRot}`
      if (before !== after) settleFrame = window.requestAnimationFrame(settle)
    }

    const onScroll = () => {
      if (settleFrame) return
      settleFrame = window.requestAnimationFrame(settle)
    }

    const onResize = () => { measureColumn(); onScroll() }

    tick()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (settleFrame) window.cancelAnimationFrame(settleFrame)
    }
  }, [hidden])

  useEffect(() => () => window.clearTimeout(spinTimer.current), [])

  const dismiss = useCallback((event) => {
    event.stopPropagation()
    setHidden(true)
    try { window.localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode */ }
  }, [])

  const poke = useCallback(() => {
    setSpinning(true)
    setMessage('Let’s learn English!')
    window.clearTimeout(spinTimer.current)
    spinTimer.current = window.setTimeout(() => { setSpinning(false); setMessage('') }, 1500)
  }, [])

  if (hidden) return null

  return (
    // aria-hidden: the panda repeats information already written on the page,
    // so announcing it again would only add noise for a screen reader.
    <div className="panda-layer" ref={layerRef} aria-hidden="true">
      <div className={`panda-companion ${spinning ? 'is-spinning' : ''}`} ref={pandaRef}>
        <button type="button" className="panda-companion__dismiss" onClick={dismiss} aria-label="Hide the panda">
          <X size={13} />
        </button>

        {message && <span className="panda-companion__bubble" key={message}>{message}</span>}

        <button type="button" className="panda-companion__body" onClick={poke} aria-label="Play with the panda">
          <img src={assetUrl('assets/panda-mascot.webp')} alt="" width="118" height="146" loading="lazy" decoding="async" />
          <span className="panda-companion__shadow" />
        </button>
      </div>
    </div>
  )
}
