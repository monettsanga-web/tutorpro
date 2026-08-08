/**
 * The TutorPro panda, flying around the homepage.
 *
 * WHAT IT DOES
 * ------------
 * A 3D panda in headphones, holding a book, travels with you as you scroll:
 * swooping between the page margins, banking into its turns, bobbing on an
 * idle float, stopping to say things, and waving now and then. Tap it and it
 * does a barrel roll.
 *
 * TWO DIFFERENT BEHAVIOURS, BECAUSE THE TWO LAYOUTS ARE DIFFERENT
 * ---------------------------------------------------------------
 * DESKTOP has real side margins — the content column is 1160px inside a much
 * wider window — so the panda genuinely flies, sweeping left and right in the
 * empty gutters and never crossing a word. Opacity is derived from measured
 * clearance to the text, so it fades out while crossing and swoops back in.
 *
 * MOBILE has no margins at all. Measured on a 390px screen, body text runs
 * from x=16 to x=374, so there is nowhere to fly that is not on top of a
 * sentence. Pretending otherwise would put a panda over the copy. Instead it
 * behaves like a floating companion: it hugs the screen edge, partly
 * off-screen, swaps sides as you scroll, and keeps out of the zones already
 * occupied by the chat widget, the language pill and the sticky action bar
 * (all measured, not guessed). It is small, edge-anchored and dismissible.
 *
 * THE RULES IT ALWAYS FOLLOWS
 * ---------------------------
 *  1. It never blocks a tap. `pointer-events: none` on the layer, re-enabled
 *     only on the panda, so a "Book a free class" button underneath is safe.
 *  2. It can be dismissed, and stays dismissed (localStorage).
 *  3. prefers-reduced-motion removes it completely.
 *  4. It costs almost nothing: one passive scroll listener feeding a single
 *     rAF loop that writes CSS custom properties. React never re-renders while
 *     you scroll — only the speech bubble text is state.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

// Matches the helper App.jsx uses, so the panda resolves correctly under any
// deploy base path rather than assuming the site is served from the root.
const assetUrl = (path) => `${import.meta.env.BASE_URL}${path}`

const DISMISS_KEY = 'tutorpro_panda_hidden_v1'

// Wide enough for real side gutters. Below this the mobile behaviour is used.
const DESKTOP_QUERY = '(min-width: 1100px)'

/**
 * Things the panda says. Every line is a real fact from the site — free first
 * class, the actual coursebooks, the actual price — so it is useful rather
 * than chatter for its own sake.
 *
 * WHY A LIST AND NOT FIXED SCROLL POSITIONS
 * -----------------------------------------
 * On desktop the panda is only fully visible while it is out over a gutter,
 * and there are just three such windows down the page (measured: 0.14-0.20,
 * 0.45-0.50, 0.75-0.80). Pinning each line to a fixed scroll position meant
 * six of ten lines never appeared at all, because the panda was mid-crossing
 * and faded out. So lines are dealt out in order each time it becomes visible,
 * which means every line gets said and you see new ones on the way back up.
 */
const phrases = [
  'Hi! I’m Popo 🐼',
  'Your first class is free!',
  'No card needed to start',
  'Cambridge & Oxford books',
  'Ages 4 to 16 welcome',
  'One-to-one, never a crowd',
  'Real teachers, real progress',
  'Classes from $8',
  'Cancel 12 hours ahead, no charge',
  'Ask me for a free trial! 👋',
]

export default function PandaCompanion() {
  const layerRef = useRef(null)
  const [message, setMessage] = useState('')
  const [spinning, setSpinning] = useState(false)
  const [waving, setWaving] = useState(false)
  const spinTimer = useRef(0)
  const waveTimer = useRef(0)
  // Cached content-column width. Measured per layout rather than per scroll
  // frame, because reading a box forces the browser to flush layout.
  const layoutWidthRef = useRef(0)

  // Worked out in the initialiser rather than an effect: both inputs are
  // knowable synchronously, so an effect would only add a cascading render and
  // a frame where the panda flashes in before being hidden again.
  const [hidden, setHidden] = useState(() => {
    if (typeof window === 'undefined') return true
    try { if (window.localStorage.getItem(DISMISS_KEY) === '1') return true } catch { /* private mode */ }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [isDesktop, setIsDesktop] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches
  ))

  // Follow the breakpoint live, so rotating a tablet swaps behaviour cleanly.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY)
    const onChange = (event) => setIsDesktop(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (hidden) return undefined
    const layer = layerRef.current
    if (!layer) return undefined

    const PANDA_WIDTH = isDesktop ? 190 : 108

    // Measure the content column from a container that is NOT the hero: the
    // hero's is parallax-translated, and getBoundingClientRect reports the
    // post-transform box, which produced a bogus gutter reading.
    const measureColumn = () => {
      const columns = [...document.querySelectorAll('main .container')].filter((el) => !el.closest('.hero'))
      const width = columns.reduce((widest, el) => Math.max(widest, el.getBoundingClientRect().width), 0)
      layoutWidthRef.current = width || Math.min(1160, window.innerWidth - 48)
    }
    measureColumn()

    // Eased values, so the panda glides toward its target rather than snapping.
    // This is what makes the movement read as flight and not as a slider.
    let currentSweep = 0
    let currentY = 0
    let currentRot = 0
    let lastSweep = 0
    let wasVisible = false
    let phraseIndex = 0

    const tick = () => {
      const doc = document.documentElement
      const max = Math.max(1, doc.scrollHeight - window.innerHeight)
      const ratio = Math.min(1, Math.max(0, window.scrollY / max))

      /*
       * A sine sweeps the panda from one side to the other as you scroll; a
       * faster wave adds a bob so it never looks like it is on rails.
       *
       * The easing factor matters as much as the sweep count. At 0.08 the
       * panda physically could not reach the margin before the target
       * reversed, so it hovered near the middle, stayed faded out, and said
       * nothing — raising the sweep count alone made that worse, not better.
       */
      /*
       * How many times the panda crosses the page as you scroll. Three sweeps
       * gave only three visible windows (measured 0.14-0.20, 0.45-0.50,
       * 0.75-0.80), so at most three lines could ever be said. Six sweeps
       * roughly doubles the arrivals — and each arrival deals a new phrase.
       */
      const sweep = Math.sin(ratio * Math.PI * 5)
      currentSweep += (sweep - currentSweep) * 0.22
      const bob = Math.sin(ratio * Math.PI * 14) * 2.2

      let centreX
      let opacity

      if (isDesktop) {
        /*
         * DESKTOP: fly in the real gutters.
         * The gutter is derived from the column's WIDTH, not its measured
         * edges, because a transform on the hero container corrupts the edges.
         * The panda's centre must clear the column by at least half its own
         * width — being centred in the gutter is not enough when the gutter is
         * narrower than the panda.
         */
        const columnWidth = layoutWidthRef.current || Math.min(1160, window.innerWidth - 48)
        const columnEdge = columnWidth / 2
        const halfPanda = PANDA_WIDTH / 2
        const innerLimit = columnEdge + halfPanda + 6
        const outerLimit = window.innerWidth / 2 - halfPanda - 6

        if (outerLimit < innerLimit) {
          layer.style.setProperty('--panda-opacity', '0')
          return
        }
        const gutter = (window.innerWidth - columnWidth) / 2
        const laneOffset = Math.min(outerLimit, Math.max(innerLimit, window.innerWidth / 2 - gutter / 2))
        centreX = window.innerWidth / 2 + currentSweep * laneOffset

        // Fade by REAL clearance to the text, not by the raw sweep. The eased
        // position lags the sweep, so keying opacity off the sweep let it reach
        // full opacity while still physically over the column.
        const clearance = Math.abs(centreX - window.innerWidth / 2) - (columnEdge + halfPanda)
        opacity = Math.min(1, Math.max(0, clearance / 10))

        currentY += (ratio * 100 - currentY) * 0.10
        layer.style.setProperty('--panda-top', `${(120 + (currentY + bob) * 0.62 * (window.innerHeight / 100)).toFixed(1)}px`)
      } else {
        /*
         * MOBILE: hug the edge instead of flying.
         * There is no gutter to fly in, so the panda anchors to whichever side
         * it is heading for and sits partly off-screen. It stays fully opaque
         * the whole time — a mascot that faded in and out on a phone would just
         * look like a rendering fault.
         */
        /*
         * Tuck further off-screen than the first attempt. At 34% peek the
         * panda still sat a third of its width over the card text (measured:
         * it covered the words "I understand" on the Built for children card).
         * At 72% only a sliver shows, which reads as peeking in from the side
         * rather than standing on the copy. Measured worst-case overlap with
         * body text at this inset: under 30px, and only at the very edge of
         * the paragraph where there is no glyph.
         */
        const edgeInset = PANDA_WIDTH * 0.72
        const side = currentSweep >= 0 ? 1 : -1
        const reach = Math.min(1, Math.abs(currentSweep) * 2.4)
        centreX = window.innerWidth / 2
          + side * (window.innerWidth / 2 - PANDA_WIDTH / 2 + edgeInset) * reach
        // Fade down while crossing the middle, where there is no way to avoid
        // the text; full strength only once it is tucked against an edge.
        opacity = 0.25 + 0.75 * reach

        /*
         * Vertical placement avoids the furniture already on screen, all of it
         * measured on a 390x844 phone rather than guessed:
         *   header      top 0-56
         *   chat widget 760-826 (right)
         *   action bar  762-832
         *   language    789-832 (left)
         *
         * The panda is positioned by its CENTRE (translate(-50%, -50%)), so
         * the band has to be inset by half its height at both ends. Using the
         * raw band let the top of the panda reach y=61 and tuck under the
         * sticky header.
         */
        const halfHeight = PANDA_WIDTH * 1.24 * 0.5 // artwork is ~1.24:1 tall
        const bandTop = 64 + halfHeight
        const bandBottom = Math.max(bandTop + 40, window.innerHeight - 150 - halfHeight)
        const target = bandTop + (bandBottom - bandTop) * ((Math.sin(ratio * Math.PI * 4) + 1) / 2)
        currentY += (target - currentY) * 0.09
        layer.style.setProperty('--panda-top', `${(currentY + bob).toFixed(1)}px`)
      }

      // Bank into the turn: the panda leans the way it is actually moving.
      const drift = currentSweep - lastSweep
      lastSweep = currentSweep
      const targetRot = Math.max(-16, Math.min(16, drift * 160))
      currentRot += (targetRot - currentRot) * 0.12

      /*
       * Which way the speech bubble should open. Anchored to the right edge
       * the bubble ran off-screen and was clipped mid-word, so it is pinned to
       * whichever side has room: -1 opens leftward, 1 opens rightward.
       */
      const onRightHalf = centreX > window.innerWidth / 2
      layer.style.setProperty('--panda-bubble-side', onRightHalf ? '-1' : '1')
      // A class, not just a custom property: CSS attribute selectors cannot
      // match inline custom properties reliably, so the earlier
      // [style*="--panda-bubble-side: -1"] rules never applied.
      layer.classList.toggle('panda-layer--right', onRightHalf)
      layer.classList.toggle('panda-layer--left', !onRightHalf)
      layer.style.setProperty('--panda-left', `${centreX.toFixed(1)}px`)
      layer.style.setProperty('--panda-rot', currentRot.toFixed(2))
      layer.style.setProperty('--panda-opacity', opacity.toFixed(3))
      layer.style.setProperty('--panda-flip', drift < -0.0005 ? '-1' : '1')

      /*
       * Speak on each ARRIVAL, not at fixed scroll positions. `visible` is a
       * latch: the next phrase is dealt only on the transition from hidden to
       * shown, so the panda says one thing per appearance and works through
       * the whole list as you scroll rather than repeating the same few.
       */
      const visible = opacity > 0.85
      if (visible !== wasVisible) {
        wasVisible = visible
        if (visible) {
          setMessage(phrases[phraseIndex % phrases.length])
          phraseIndex += 1
          // Wave as it arrives — the raised paw is already in the artwork, so
          // rocking the body is what sells it as a wave.
          setWaving(true)
          window.clearTimeout(waveTimer.current)
          waveTimer.current = window.setTimeout(() => setWaving(false), 1700)
        } else {
          setMessage('')
        }
      }
    }

    /*
     * Keep animating until the easing has settled.
     * A previous version ran one frame per scroll event, so a single jump left
     * the panda frozen part-way through its glide — parked invisible until the
     * next scroll. The loop now runs on while there is distance still to cover.
     */
    let settleFrame = 0
    const settle = () => {
      settleFrame = 0
      const before = `${currentSweep}|${currentY}|${currentRot}`
      tick()
      if (`${currentSweep}|${currentY}|${currentRot}` !== before) {
        settleFrame = window.requestAnimationFrame(settle)
      }
    }
    const onScroll = () => {
      if (settleFrame) return
      settleFrame = window.requestAnimationFrame(settle)
    }
    const onResize = () => { measureColumn(); onScroll() }

    tick()
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (settleFrame) window.cancelAnimationFrame(settleFrame)
    }
  }, [hidden, isDesktop])

  // An occasional unprompted wave, so it feels alive when you stop scrolling.
  useEffect(() => {
    if (hidden) return undefined
    const timer = window.setInterval(() => {
      setWaving(true)
      window.setTimeout(() => setWaving(false), 1600)
    }, 9000)
    return () => window.clearInterval(timer)
  }, [hidden])

  useEffect(() => () => {
    window.clearTimeout(spinTimer.current)
    window.clearTimeout(waveTimer.current)
  }, [])

  const dismiss = useCallback((event) => {
    event.stopPropagation()
    setHidden(true)
    try { window.localStorage.setItem(DISMISS_KEY, '1') } catch { /* private mode */ }
  }, [])

  const poke = useCallback(() => {
    setSpinning(true)
    setMessage('Let’s learn English!')
    window.clearTimeout(spinTimer.current)
    spinTimer.current = window.setTimeout(() => { setSpinning(false); setMessage('') }, 1600)
  }, [])

  if (hidden) return null

  return (
    // aria-hidden: everything the panda says is already written on the page, so
    // announcing it again would only add noise for a screen reader.
    <div className={`panda-layer ${isDesktop ? 'panda-layer--desktop' : 'panda-layer--mobile'}`} ref={layerRef} aria-hidden="true">
      {/*
        * On mobile the bubble and close button are SIBLINGS of the panda, not
        * children. The panda carries a transform, and a transformed element is
        * a containing block for its position: fixed descendants — so nested
        * they stayed glued to a panda that is deliberately 72% off-screen and
        * were clipped (measured: bubble at x=456 on a 390px screen, close
        * button fully outside). As siblings they clamp to the viewport.
        */}
      {!isDesktop && (
        <>
          <button type="button" className="panda-companion__dismiss panda-companion__dismiss--loose" onClick={dismiss} aria-label="Hide the panda">
            <X size={13} />
          </button>
          {message && <span className="panda-companion__bubble panda-companion__bubble--loose" key={message}>{message}</span>}
        </>
      )}

      <div className={`panda-companion ${spinning ? 'is-spinning' : ''} ${waving ? 'is-waving' : ''}`}>
        {isDesktop && (
          <>
            <button type="button" className="panda-companion__dismiss" onClick={dismiss} aria-label="Hide the panda">
              <X size={13} />
            </button>
            {message && <span className="panda-companion__bubble" key={message}>{message}</span>}
          </>
        )}

        <button type="button" className="panda-companion__body" onClick={poke} aria-label="Play with the panda">
          <img src={assetUrl('assets/panda-mascot.webp')} alt="" width="190" height="235" loading="lazy" decoding="async" />
          <span className="panda-companion__shadow" />
        </button>
      </div>
    </div>
  )
}
