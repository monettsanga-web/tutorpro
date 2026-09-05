import { useEffect, useRef, useState } from 'react'
import { SiFacebook, SiWechat, SiWhatsapp } from 'react-icons/si'
import { ArrowUpRight, Check, Copy, Clock3, ShieldCheck } from 'lucide-react'

/**
 * "Contact us" — Facebook, WeChat and WhatsApp.
 *
 * DESIGN NOTES
 * ------------
 * Three channels, three different interaction models, and the honest design
 * problem is that they are NOT equivalent:
 *
 *   Facebook  → a link that opens a page
 *   WhatsApp  → a link that opens a chat
 *   WeChat    → an ID. There is no reliable web deep link for a personal
 *               WeChat account, so the only thing that actually helps
 *               somebody is putting the ID on their clipboard.
 *
 * Pretending all three are the same button would look tidier and work worse.
 * So WeChat gets a copy action with real feedback, and its card explains the
 * extra step ("Add on WeChat") rather than implying a chat will open.
 *
 * Each card also carries the response time and the language, because the
 * question a parent actually has before messaging a stranger about their
 * child is "will anyone reply, and will they understand me".
 */

const CHANNELS = [
  {
    id: 'facebook',
    Icon: SiFacebook,
    name: 'Facebook',
    handle: '@tutorproenglish',
    // The page, not Messenger: the floating Messenger button already covers
    // chat, and this is the link a parent uses to CHECK we are real.
    href: 'https://www.facebook.com/tutorproenglish',
    action: 'Open our page',
    detail: 'See our page, posts and parent recommendations.',
    meta: 'Replies within 1 business day',
    brand: '#1877f2',
  },
  {
    id: 'wechat',
    Icon: SiWechat,
    name: 'WeChat',
    handle: 't_cora',
    // No dependable deep link exists for a personal WeChat ID, so the useful
    // action is copying it rather than a link that would fail on desktop.
    copy: 't_cora',
    action: 'Copy WeChat ID',
    detail: 'Add us on WeChat, then send a message.',
    meta: 'Best for families in China',
    brand: '#07c160',
  },
  {
    id: 'whatsapp',
    Icon: SiWhatsapp,
    name: 'WhatsApp',
    handle: '+63 962 528 4849',
    href: 'https://wa.me/639625284849',
    action: 'Start a chat',
    detail: 'Message us directly about lessons or bookings.',
    meta: 'Fastest reply',
    brand: '#25d366',
  },
]

function ChannelCard({ channel }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(0)

  // The timeout must be cleared on unmount, or a state update lands on a
  // component that no longer exists.
  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(channel.copy)
    } catch {
      // Clipboard access is refused on insecure origins and by some
      // browsers. Fall back to selecting the text so it can still be copied
      // by hand rather than failing silently.
      const node = document.getElementById(`contact-copy-${channel.id}`)
      if (node) {
        const range = document.createRange()
        range.selectNodeContents(node)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
      }
      return
    }
    setCopied(true)
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setCopied(false), 2200)
  }

  const { Icon } = channel
  const inner = (
    <>
      <span className="contact-card__glow" aria-hidden="true" />
      <span className="contact-card__icon" style={{ '--brand': channel.brand }}>
        <Icon size={23} />
      </span>
      <span className="contact-card__body">
        <strong className="contact-card__name">{channel.name}</strong>
        <span className="contact-card__handle" id={`contact-copy-${channel.id}`}>{channel.handle}</span>
        <span className="contact-card__detail">{channel.detail}</span>
      </span>
      <span className="contact-card__foot">
        <span className="contact-card__meta"><Clock3 size={13} /> {channel.meta}</span>
        <span className="contact-card__action">
          {channel.copy
            ? (copied ? <><Check size={15} /> Copied</> : <><Copy size={15} /> {channel.action}</>)
            : <>{channel.action} <ArrowUpRight size={15} /></>}
        </span>
      </span>
    </>
  )

  // A copy action is a button and a navigation is a link. Using the correct
  // element is what makes this work with a keyboard and a screen reader.
  if (channel.copy) {
    return (
      <button
        type="button"
        className={`contact-card contact-card--${channel.id} ${copied ? 'contact-card--copied' : ''}`}
        onClick={handleCopy}
        aria-label={`Copy our WeChat ID, ${channel.handle}`}
      >
        {inner}
      </button>
    )
  }

  return (
    <a
      className={`contact-card contact-card--${channel.id}`}
      href={channel.href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${channel.name}: ${channel.handle} — opens in a new tab`}
    >
      {inner}
    </a>
  )
}

export default function ContactChannels() {
  return (
    <section className="section contact-channels" id="contact">
      <div className="container">
        <div className="contact-channels__head">
          <span className="kicker">Talk to a real person</span>
          <h2>Contact us</h2>
          <p>
            Message us on whichever app you already use. A real member of our team replies —
            never a bot — and there is no obligation to book anything.
          </p>
        </div>

        <div className="contact-channels__grid">
          {CHANNELS.map((channel) => <ChannelCard channel={channel} key={channel.id} />)}
        </div>

        <p className="contact-channels__assurance">
          <ShieldCheck size={16} />
          <span>
            Registered with the Philippine DTI, Reg. No. 5274092. We never ask for card details over chat.
          </span>
        </p>
      </div>
    </section>
  )
}
