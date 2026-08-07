import { useEffect, useRef } from 'react'
import { ArrowUpRight } from 'lucide-react'

/**
 * Trustpilot review widget.
 *
 * IMPORTANT — why there is no AggregateRating schema alongside this:
 * Google's structured data policy (2019, restated December 2025) makes pages
 * using Organization / LocalBusiness schema ineligible for star rich results
 * when the entity controls the reviews about itself. Google explicitly counts
 * embedded third-party review widgets as self-serving. So this widget is here
 * to build trust with human visitors, NOT to produce stars in search results.
 * Adding AggregateRating markup next to it would be a policy violation.
 *
 * Stars can still reach Google through Trustpilot's own platform pages and
 * through a Google Business Profile — neither of which needs schema here.
 *
 * The widget renders nothing until a real Business Unit ID is configured, so
 * the site never shows an empty or broken review box to parents.
 */

// Set VITE_TRUSTPILOT_BUSINESS_UNIT_ID in Vercel once the Trustpilot profile
// is live. Find it in Trustpilot: Integrations -> TrustBox -> the
// data-businessunit-id value in the snippet they give you.
const BUSINESS_UNIT_ID = import.meta.env?.VITE_TRUSTPILOT_BUSINESS_UNIT_ID || ''
const DOMAIN = 'tutorpro.site'
const SCRIPT_SRC = 'https://widget.trustpilot.com/bootstrap/v5/tp.widget.bootstrap.min.js'

/** Load the Trustpilot bootstrap script once, shared by every widget instance. */
let scriptPromise = null
function loadTrustpilotScript() {
  if (typeof window === 'undefined') return Promise.resolve(false)
  if (window.Trustpilot) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })
  return scriptPromise
}

/**
 * @param {'mini'|'horizontal'|'carousel'} variant  Which TrustBox template to show.
 * @param {'light'|'dark'} theme
 */
export default function TrustpilotWidget({ variant = 'mini', theme = 'light', className = '' }) {
  const hostRef = useRef(null)

  useEffect(() => {
    if (!BUSINESS_UNIT_ID || !hostRef.current) return
    let cancelled = false
    loadTrustpilotScript().then((ready) => {
      if (cancelled || !ready || !hostRef.current) return
      // Trustpilot hydrates the placeholder div in place.
      window.Trustpilot?.loadFromElement?.(hostRef.current, true)
    })
    return () => { cancelled = true }
  }, [])

  /**
   * No Business Unit ID configured, or TrustBox widgets are not on this plan.
   *
   * Trustpilot has moved website widgets behind paid plans, so a free profile
   * gets "BusinessUnit does not have access to that trustbox" for every
   * template. Rendering the widget anyway would leave an empty grey box, which
   * is worse than nothing.
   *
   * A plain text link is the compliant fallback. Trustpilot encourages linking
   * to your profile — what needs a paid plan is reproducing review CONTENT,
   * their logo or their stars on your own pages. This does none of those: no
   * score, no star graphic, no review text, no Trustpilot logo. Just a link.
   */
  if (!BUSINESS_UNIT_ID) {
    return (
      <a
        className={`trustpilot-link ${className}`.trim()}
        href={`https://www.trustpilot.com/review/${DOMAIN}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        Read our reviews on Trustpilot
        <ArrowUpRight size={14} aria-hidden="true" />
      </a>
    )
  }

  const templates = {
    mini: { id: '53aa8807dec7e10d38f59f32', height: '150px', width: '100%' },
    horizontal: { id: '5406e65db0d04a09e042d5fc', height: '28px', width: '100%' },
    carousel: { id: '53aa8912dec7e10d38f59f36', height: '240px', width: '100%' },
  }
  const template = templates[variant] || templates.mini

  return (
    <div
      ref={hostRef}
      className={`trustpilot-widget ${className}`.trim()}
      data-locale="en-US"
      data-template-id={template.id}
      data-businessunit-id={BUSINESS_UNIT_ID}
      data-style-height={template.height}
      data-style-width={template.width}
      data-theme={theme}
    >
      {/* Fallback link shown until the script hydrates, and for no-JS visitors. */}
      <a href={`https://www.trustpilot.com/review/${DOMAIN}`} target="_blank" rel="noopener noreferrer">
        Read our reviews on Trustpilot
      </a>
    </div>
  )
}
