import { useEffect, useRef, useState } from 'react'
import { SiFacebook, SiWechat, SiWhatsapp } from 'react-icons/si'
import { Check, Copy, LifeBuoy, Mail } from 'lucide-react'

/**
 * Shown inside the sign-up / login form when registration fails for a reason
 * the person cannot fix — the database is unreachable, restricted, or refused
 * the write.
 *
 * WHY THIS EXISTS
 * ---------------
 * Previously a parent in that situation saw a raw technical string such as
 * "Shared registration failed: ..." and had no route forward. They had shown
 * real intent — filled in their name, their child's year and curriculum — and
 * were then silently lost. That is the most expensive moment on the whole
 * site to fail.
 *
 * So the failure now ends with a person, not a dead end. The prefilled
 * message means they do not have to explain what went wrong, and the parent
 * and student names they already typed travel with it so the account can be
 * created by hand.
 *
 * WeChat is a copy action rather than a link for the same reason as
 * elsewhere: a personal WeChat ID has no dependable web deep link.
 */

const WECHAT_ID = 't_cora'

function buildMessage({ parentName = '', childName = '', email = '' } = {}) {
  const lines = [
    'Hello TutorPro, I tried to create an account on your website but it did not work.',
  ]
  if (parentName.trim()) lines.push(`Parent: ${parentName.trim()}`)
  if (childName.trim()) lines.push(`Student: ${childName.trim()}`)
  if (email.trim()) lines.push(`Login: ${email.trim()}`)
  lines.push('Please could you help me sign up?')
  return lines.join('\n')
}

export default function ContactFallback({ message, details, compact = false }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(0)

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const prefilled = buildMessage(details)
  const encoded = encodeURIComponent(prefilled)

  const copyWechat = async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID)
    } catch {
      return
    }
    setCopied(true)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setCopied(false), 2200)
  }

  const emailBody = encodeURIComponent(prefilled)
  const emailSubject = encodeURIComponent('I could not create my TutorPro account')

  return (
    <div className={`contact-fallback ${compact ? 'contact-fallback--compact' : ''}`} role="group" aria-label="Ways to contact us for help">
      <p className="contact-fallback__lead">
        <LifeBuoy size={17} />
        <span>{message}</span>
      </p>

      <div className="contact-fallback__actions">
        {/* WhatsApp carries the prefilled text, so the parent sends one tap. */}
        <a
          className="contact-fallback__button contact-fallback__button--whatsapp"
          href={`https://wa.me/639625284849?text=${encoded}`}
          target="_blank"
          rel="noreferrer"
        >
          <SiWhatsapp size={17} /> WhatsApp us
        </a>

        <a
          className="contact-fallback__button contact-fallback__button--facebook"
          href="https://m.me/526047974195321"
          target="_blank"
          rel="noreferrer"
        >
          <SiFacebook size={17} /> Messenger
        </a>

        <button
          type="button"
          className={`contact-fallback__button contact-fallback__button--wechat ${copied ? 'is-copied' : ''}`}
          onClick={copyWechat}
          aria-label={`Copy our WeChat ID, ${WECHAT_ID}`}
        >
          {copied
            ? <><Check size={17} /> Copied {WECHAT_ID}</>
            : <><SiWechat size={17} /> WeChat: {WECHAT_ID} <Copy size={13} /></>}
        </button>

        <a
          className="contact-fallback__button contact-fallback__button--email"
          href={`mailto:sejongenglish@yahoo.com?subject=${emailSubject}&body=${emailBody}`}
        >
          <Mail size={17} /> Email us
        </a>
      </div>

      <p className="contact-fallback__note">
        Your details are safe and nothing has been charged. We reply to most messages within one business day.
      </p>
    </div>
  )
}
