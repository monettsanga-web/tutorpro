import { useEffect, useRef, useState } from 'react'
import { SiFacebook, SiKakaotalk, SiWechat, SiWhatsapp } from 'react-icons/si'
import { Check, Copy, LifeBuoy, Mail, X } from 'lucide-react'
import { readDismissed, rememberDismissed, shouldShowWelcome, welcomeEnquiry } from './welcomeMessage.js'

/**
 * The first thing a newly registered parent sees on their dashboard.
 *
 * WHY THIS EXISTS
 * ---------------
 * Registration used to end in silence. A parent created an account, landed on
 * a dashboard full of unfamiliar panels, and had no obvious way to ask a
 * question. The contact details existed — on the public site, in the footer —
 * but not at the one moment a new parent is most likely to need them and
 * least likely to go looking.
 *
 * So this greets them by name, tells them plainly what happens next, and puts
 * every channel one tap away.
 *
 * DESIGN DECISIONS
 * ----------------
 * - **It disappears after 14 days.** A welcome message that never goes away
 *   stops being a welcome and becomes clutter, and clutter trains people to
 *   ignore the whole top of the page. Fourteen days covers the period where
 *   somebody is still finding their way around.
 * - **It is dismissible, and that is remembered.** Forcing a parent to keep
 *   seeing something they have read is disrespectful of their attention.
 * - **WeChat and KakaoTalk copy rather than link.** Neither has a dependable
 *   web link that opens a chat from a phone number, so a link would fail
 *   silently. Copying the ID is the action that actually helps.
 * - **The message is prefilled with their name.** A parent who taps WhatsApp
 *   should not have to introduce themselves.
 */

const WECHAT_ID = 't_cora'
const KAKAO_NUMBER = '+639625284849'
const WHATSAPP = '639625284849'
const MESSENGER = 'https://m.me/526047974195321'
const EMAIL = 'sejongenglish@yahoo.com'

export default function WelcomeMessage({ account, learnerName = '' }) {
  const [dismissed, setDismissed] = useState(() => readDismissed())
  const [copied, setCopied] = useState('')
  const timerRef = useRef(0)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  if (!shouldShowWelcome(account, dismissed)) return null

  const parentName = account.parentName || account.fullName || ''
  const firstName = String(parentName).trim().split(/\s+/)[0] || 'there'
  const enquiry = welcomeEnquiry({ parentName, childName: learnerName })
  const encoded = encodeURIComponent(enquiry)

  const close = () => {
    rememberDismissed(account.id)
    setDismissed(readDismissed())
  }

  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard is refused on insecure origins and in some in-app browsers.
      window.prompt('Copy this and add us:', value)
      return
    }
    setCopied(label)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setCopied(''), 2400)
  }

  return (
    <section className="welcome-card" role="region" aria-label="Welcome and how to contact us">
      <button type="button" className="welcome-card__close" onClick={close} aria-label="Dismiss this welcome message">
        <X size={17} />
      </button>

      <div className="welcome-card__head">
        <span className="welcome-card__icon" aria-hidden="true"><LifeBuoy size={20} /></span>
        <div>
          <span className="portal-kicker">Welcome to TutorPro</span>
          <h2>Thanks for joining us, {firstName}</h2>
        </div>
      </div>

      <p className="welcome-card__lead">
        Your account is ready. Your first 25-minute class is free, with no card required — book any time that suits
        you and we will match {learnerName || 'your child'} to a teacher.
      </p>
      <p className="welcome-card__lead">
        <strong>Questions before you book?</strong> A real person answers these, usually within one business day.
        There is no obligation to book anything.
      </p>

      <div className="welcome-card__channels">
        <a
          className="welcome-card__channel welcome-card__channel--whatsapp"
          href={`https://wa.me/${WHATSAPP}?text=${encoded}`}
          target="_blank"
          rel="noreferrer"
        >
          <SiWhatsapp size={17} /> WhatsApp us
        </a>

        <a
          className="welcome-card__channel welcome-card__channel--messenger"
          href={MESSENGER}
          target="_blank"
          rel="noreferrer"
        >
          <SiFacebook size={17} /> Messenger
        </a>

        {/* No dependable web link exists for a personal WeChat ID or a
            KakaoTalk phone number, so these copy instead of pretending. */}
        <button
          type="button"
          className={`welcome-card__channel welcome-card__channel--wechat ${copied === 'wechat' ? 'is-copied' : ''}`}
          onClick={() => copy(WECHAT_ID, 'wechat')}
          aria-label={`Copy our WeChat ID, ${WECHAT_ID}`}
        >
          {copied === 'wechat'
            ? <><Check size={17} /> Copied {WECHAT_ID}</>
            : <><SiWechat size={17} /> WeChat: {WECHAT_ID} <Copy size={13} /></>}
        </button>

        <button
          type="button"
          className={`welcome-card__channel welcome-card__channel--kakao ${copied === 'kakao' ? 'is-copied' : ''}`}
          onClick={() => copy(KAKAO_NUMBER, 'kakao')}
          aria-label={`Copy our KakaoTalk number, ${KAKAO_NUMBER}`}
        >
          {copied === 'kakao'
            ? <><Check size={17} /> Copied {KAKAO_NUMBER}</>
            : <><SiKakaotalk size={17} /> KakaoTalk <Copy size={13} /></>}
        </button>

        <a
          className="welcome-card__channel welcome-card__channel--email"
          href={`mailto:${EMAIL}?subject=${encodeURIComponent('Question about my new TutorPro account')}&body=${encoded}`}
        >
          <Mail size={17} /> Email us
        </a>
      </div>

      <p className="welcome-card__note">
        New here? <a href="/how-it-works.html">How lessons work</a> · <a href="/faq.html">Common questions</a> ·{' '}
        <a href="/pricing.html">Pricing</a>
      </p>
    </section>
  )
}
