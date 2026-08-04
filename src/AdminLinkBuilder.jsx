import { useMemo, useState } from 'react'
import { Check, Copy, ExternalLink, Link2, QrCode } from 'lucide-react'
import { qrDataUri } from './qrCode.js'

/**
 * Admin → Share links.
 *
 * Builds a tagged link for anywhere you post, so the Growth funnel can tell
 * you which Facebook post, group or flyer actually produced paying families.
 * Also generates a QR code for offline use (flyers, tarpaulins, school gates).
 */

const DESTINATIONS = [
  { id: '/', label: 'Homepage', hint: 'General purpose — full site with everything on it.' },
  { id: '/free-english-class.html', label: 'Free class landing page', hint: 'Best for ads and posts. One goal, no distractions.' },
  { id: '/english-tutor-for-shy-child.html', label: 'For shy children', hint: 'Strong in parenting groups and mum communities.' },
  { id: '/online-english-for-filipino-families.html', label: 'For Filipino families', hint: 'Leads with DTI registration and GCash.' },
  { id: '/pricing.html', label: 'Pricing page', hint: 'For people who already asked "how much?"' },
  { id: '/english-for-kids-ages-4-7.html', label: 'Ages 4–7', hint: '' },
  { id: '/english-for-kids-ages-8-11.html', label: 'Ages 8–11', hint: '' },
  { id: '/english-for-teens-ages-12-16.html', label: 'Ages 12–16', hint: '' },
]

const SOURCES = [
  { id: 'fb', label: 'Facebook post' },
  { id: 'msg', label: 'Messenger' },
  { id: 'wa', label: 'WhatsApp' },
  { id: 'ig', label: 'Instagram' },
  { id: 'tt', label: 'TikTok' },
  { id: 'yt', label: 'YouTube' },
  { id: 'flyer', label: 'Printed flyer' },
  { id: 'qr', label: 'QR code' },
]

const SITE = 'https://www.tutorpro.site'

export default function AdminLinkBuilder() {
  const [destination, setDestination] = useState('/free-english-class.html')
  const [source, setSource] = useState('fb')
  const [campaign, setCampaign] = useState('')
  const [openBooking, setOpenBooking] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  const link = useMemo(() => {
    const params = new URLSearchParams()
    params.set('src', source)
    const tidyCampaign = campaign.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (tidyCampaign) params.set('utm_campaign', tidyCampaign)
    if (openBooking) params.set('book', '1')
    return `${SITE}${destination}?${params.toString()}`
  }, [destination, source, campaign, openBooking])

  const qr = useMemo(() => {
    if (!showQr) return ''
    try { return qrDataUri(link) } catch { return '' }
  }, [link, showQr])

  const copy = () => {
    navigator.clipboard?.writeText(link).then(() => {
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    }).catch(() => {})
  }

  const activeDestination = DESTINATIONS.find((entry) => entry.id === destination)

  return (
    <div className="portal-view">
      <div className="portal-page-heading">
        <div>
          <span className="portal-kicker">Growth</span>
          <h1>Share links</h1>
          <p>Build a tagged link for anywhere you post, so the funnel can tell you which one actually brought paying families.</p>
        </div>
      </div>

      <section className="portal-card linkbuilder-card">
        <div className="linkbuilder-field">
          <label htmlFor="lb-destination">Where should it go?</label>
          <select id="lb-destination" value={destination} onChange={(event) => setDestination(event.target.value)}>
            {DESTINATIONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.label}</option>)}
          </select>
          {activeDestination?.hint && <small>{activeDestination.hint}</small>}
        </div>

        <div className="linkbuilder-field">
          <label>Where are you posting it?</label>
          <div className="linkbuilder-chips">
            {SOURCES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`linkbuilder-chip${source === entry.id ? ' linkbuilder-chip--active' : ''}`}
                onClick={() => setSource(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </div>

        <div className="linkbuilder-field">
          <label htmlFor="lb-campaign">Name this post (optional)</label>
          <input
            id="lb-campaign"
            value={campaign}
            onChange={(event) => setCampaign(event.target.value)}
            placeholder="e.g. mums-group-august"
            maxLength={60}
          />
          <small>Use a different name for each post so you can compare them against each other.</small>
        </div>

        <label className="linkbuilder-toggle">
          <input type="checkbox" checked={openBooking} onChange={(event) => setOpenBooking(event.target.checked)} />
          <span>Open the booking form straight away<small>Recommended — one less click between the parent and a free class.</small></span>
        </label>

        <div className="linkbuilder-result">
          <span className="linkbuilder-result__label"><Link2 size={14} /> Your link</span>
          <code>{link}</code>
          <div className="linkbuilder-result__actions">
            <button type="button" className="portal-primary-button" onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
            </button>
            <a className="portal-secondary-button" href={link} target="_blank" rel="noreferrer">
              <ExternalLink size={15} /> Preview
            </a>
            <button type="button" className="portal-secondary-button" onClick={() => setShowQr((value) => !value)}>
              <QrCode size={15} /> {showQr ? 'Hide QR' : 'QR code'}
            </button>
          </div>
          {showQr && qr && (
            <div className="linkbuilder-qr">
              <img src={qr} alt="QR code for this link" width="188" height="188" />
              <p>Right-click to save. Good for flyers, tarpaulins and school noticeboards — scans are credited to this link automatically.</p>
            </div>
          )}
        </div>
      </section>

      <section className="portal-card">
        <div className="portal-card__heading portal-card__heading--small">
          <div><span className="portal-kicker">How to use these</span><h2>Getting the first families in</h2></div>
        </div>
        <ol className="linkbuilder-guide">
          <li>
            <strong>Post the free-class page, not the homepage.</strong>
            The landing page has one button and nothing else to click, so far more visitors reach the booking form.
          </li>
          <li>
            <strong>Use a different campaign name every time.</strong>
            After a few weeks the Growth funnel will show which post produced paying families, not just clicks.
          </li>
          <li>
            <strong>Ask your existing parents to share their referral link.</strong>
            Referrals convert better than anything else, and every parent already has a link in their dashboard.
          </li>
          <li>
            <strong>Put the QR code on anything printed.</strong>
            Scans are credited automatically, so you finally learn whether flyers actually work.
          </li>
        </ol>
      </section>
    </div>
  )
}
