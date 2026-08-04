import { useMemo, useState } from 'react'
import { AlertTriangle, Copy, Download, Filter, TrendingDown, TrendingUp, Users } from 'lucide-react'
import { getAccounts } from './auth.js'
import { getBookings } from './bookings.js'
import { actionableFamilies, buildFunnel, funnelByChannel, registrationTrend } from './funnel.js'
import { attributionLabel } from './attribution.js'

const WINDOWS = [
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
  { id: null, label: 'All time' },
]

const LEAD_LISTS = [
  {
    id: 'stalled',
    title: 'Took the free class, never paid',
    why: 'Highest intent of anyone on this list — they already met a teacher and liked you enough to show up.',
    tone: 'hot',
  },
  {
    id: 'bookedNotYetTaught',
    title: 'Free class booked, not taught yet',
    why: 'Send a reminder so they actually turn up. No-shows are the cheapest loss to prevent.',
    tone: 'warm',
  },
  {
    id: 'noShows',
    title: 'Booked a free class and missed it',
    why: 'Life got in the way. A single friendly rebooking message wins a share of these back.',
    tone: 'warm',
  },
  {
    id: 'neverBooked',
    title: 'Registered but never booked',
    why: 'Something stopped them at the booking step — usually timezone confusion or not knowing what to expect.',
    tone: 'cool',
  },
]

function displayName(account) {
  return account?.parentName || account?.fullName || 'TutorPro family'
}

function contactFor(account) {
  return account?.loginId || account?.email || account?.phone || ''
}

/**
 * Admin → Growth funnel.
 *
 * Shows where families drop off between registering and paying, which channel
 * actually produces paying families, and exactly who to contact today.
 * Everything is derived from bookings and accounts already in the platform.
 */
export default function AdminFunnelPanel() {
  const [windowDays, setWindowDays] = useState(90)
  const [copied, setCopied] = useState('')

  const accounts = useMemo(() => getAccounts(), [])
  const bookings = useMemo(() => getBookings(), [])

  const funnel = useMemo(
    () => buildFunnel({ accounts, bookings, sinceDays: windowDays }),
    [accounts, bookings, windowDays],
  )
  const channels = useMemo(() => funnelByChannel(funnel.journeys), [funnel])
  const leads = useMemo(() => actionableFamilies(funnel.journeys), [funnel])
  const trend = useMemo(() => registrationTrend(funnel.journeys, 8), [funnel])

  const maxTrend = Math.max(1, ...trend.map((week) => week.families))
  const hasData = funnel.totals.families > 0

  const copyList = (listId, journeys) => {
    const text = journeys
      .map((journey) => `${displayName(journey.account)} — ${contactFor(journey.account) || 'no contact saved'}`)
      .join('\n')
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(listId)
      window.setTimeout(() => setCopied(''), 1800)
    }).catch(() => {})
  }

  const exportCsv = () => {
    const rows = [['Family', 'Contact', 'Channel', 'Country', 'Registered', 'Trial booked', 'Trial attended', 'Paid', 'Paid lessons', 'Revenue']]
    funnel.journeys.forEach((journey) => {
      rows.push([
        displayName(journey.account),
        contactFor(journey.account),
        journey.channel,
        journey.country,
        journey.createdAt ? journey.createdAt.slice(0, 10) : '',
        journey.stages.trialBooked ? 'yes' : 'no',
        journey.stages.trialAttended ? 'yes' : 'no',
        journey.stages.paid ? 'yes' : 'no',
        journey.paidLessonCount,
        journey.revenue,
      ])
    })
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `tutorpro-funnel-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="portal-view">
      <div className="portal-page-heading">
        <div>
          <span className="portal-kicker">Growth</span>
          <h1>Your funnel</h1>
          <p>Every family from sign-up to paying, so you can see exactly which step is losing them.</p>
        </div>
        <button className="portal-secondary-button" onClick={exportCsv} disabled={!hasData}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="funnel-window-row">
        <Filter size={14} />
        {WINDOWS.map((option) => (
          <button
            key={String(option.id)}
            type="button"
            className={`funnel-window-chip${windowDays === option.id ? ' funnel-window-chip--active' : ''}`}
            onClick={() => setWindowDays(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {!hasData ? (
        <section className="portal-card funnel-empty-card">
          <Users size={34} />
          <h2>No families registered in this period yet</h2>
          <p>
            As soon as parents start registering, this page fills in automatically — no setup needed. Try
            <strong> All time</strong> if you have older sign-ups, or share a tagged link
            (for example <code>tutorpro.site/?src=fb</code>) so new visitors are credited to the right channel.
          </p>
        </section>
      ) : (
        <>
          <div className="portal-stat-grid">
            <article>
              <span className="stat-icon stat-icon--blue"><Users size={21} /></span>
              <div><small>Families</small><strong>{funnel.totals.families}</strong><em>in this period</em></div>
            </article>
            <article>
              <span className="stat-icon stat-icon--green"><TrendingUp size={21} /></span>
              <div><small>Paying families</small><strong>{funnel.totals.payingFamilies}</strong><em>{funnel.steps[3]?.shareOfTotal || 0}% of sign-ups</em></div>
            </article>
            <article>
              <span className="stat-icon stat-icon--gold"><TrendingUp size={21} /></span>
              <div><small>Trial → paid</small><strong>{funnel.totals.trialToPaid}%</strong><em>of families who attended</em></div>
            </article>
            <article>
              <span className="stat-icon stat-icon--orange"><TrendingUp size={21} /></span>
              <div><small>Revenue per family</small><strong>${funnel.totals.revenuePerFamily}</strong><em>${funnel.totals.revenue} tracked</em></div>
            </article>
          </div>

          {funnel.leak && funnel.leak.droppedHere > 0 && (
            <div className="funnel-leak-banner">
              <span><TrendingDown size={20} /></span>
              <div>
                <strong>Biggest drop-off: {funnel.leak.label}</strong>
                <small>
                  {funnel.leak.droppedHere} {funnel.leak.droppedHere === 1 ? 'family' : 'families'} did not
                  make it to this step — only {funnel.leak.conversionFromPrevious}% got through.
                  Fixing this one step moves the most money.
                </small>
              </div>
            </div>
          )}

          <section className="portal-card funnel-stage-card">
            <div className="portal-card__heading portal-card__heading--small">
              <div><span className="portal-kicker">Stage by stage</span><h2>Where families are lost</h2></div>
            </div>
            <div className="funnel-stages">
              {funnel.steps.map((stage, index) => (
                <div className="funnel-stage" key={stage.id}>
                  <div className="funnel-stage__head">
                    <strong>{stage.label}</strong>
                    <span>{stage.count}</span>
                  </div>
                  <div className="funnel-stage__bar">
                    <i style={{ width: `${Math.max(stage.shareOfTotal, stage.count ? 3 : 0)}%` }} />
                  </div>
                  <div className="funnel-stage__meta">
                    <small>{stage.hint}</small>
                    {index > 0 && (
                      <em className={stage.conversionFromPrevious < 50 ? 'funnel-stage__drop--bad' : ''}>
                        {stage.conversionFromPrevious}% carried over
                        {stage.droppedHere > 0 && ` · lost ${stage.droppedHere}`}
                      </em>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="funnel-split">
            <section className="portal-card">
              <div className="portal-card__heading portal-card__heading--small">
                <div><span className="portal-kicker">Acquisition</span><h2>Which channel pays off</h2></div>
              </div>
              <div className="funnel-channel-table">
                <div className="funnel-channel-table__head">
                  <span>Channel</span><span>Families</span><span>Paid</span><span>Rate</span><span>Revenue</span>
                </div>
                {channels.map((channel) => (
                  <div className="funnel-channel-table__row" key={channel.channel}>
                    <div><strong>{channel.channel}</strong></div>
                    <span>{channel.families}</span>
                    <span>{channel.paid}</span>
                    <span className={channel.conversion >= 30 ? 'funnel-rate--good' : ''}>{channel.conversion}%</span>
                    <span>${channel.revenue}</span>
                  </div>
                ))}
              </div>
              <p className="funnel-hint">
                Tag your links to fill this in: add <code>?src=fb</code>, <code>?src=msg</code> or
                <code> ?src=flyer</code> to any address you share.
              </p>
            </section>

            <section className="portal-card">
              <div className="portal-card__heading portal-card__heading--small">
                <div><span className="portal-kicker">Trend</span><h2>New families per week</h2></div>
              </div>
              <div className="funnel-trend">
                {trend.map((week) => (
                  <div key={week.label}>
                    <i style={{ height: `${Math.max(6, (week.families / maxTrend) * 100)}%` }}>
                      <b style={{ height: `${week.families ? (week.paid / week.families) * 100 : 0}%` }} />
                    </i>
                    <span>{week.label}</span>
                    <small>{week.families}</small>
                  </div>
                ))}
              </div>
              <p className="funnel-hint">Solid portion = families who went on to pay.</p>
            </section>
          </div>

          <section className="portal-card">
            <div className="portal-card__heading portal-card__heading--small">
              <div><span className="portal-kicker">Act on it</span><h2>Who to contact today</h2></div>
            </div>
            <div className="funnel-lead-lists">
              {LEAD_LISTS.map((list) => {
                const journeys = leads[list.id] || []
                return (
                  <div className={`funnel-lead-list funnel-lead-list--${list.tone}`} key={list.id}>
                    <div className="funnel-lead-list__head">
                      <div>
                        <strong>{list.title}</strong>
                        <small>{list.why}</small>
                      </div>
                      <span className="funnel-lead-list__count">{journeys.length}</span>
                    </div>
                    {journeys.length > 0 && (
                      <>
                        <ul>
                          {journeys.slice(0, 6).map((journey) => (
                            <li key={journey.account.id}>
                              <strong>{displayName(journey.account)}</strong>
                              <small>{contactFor(journey.account) || 'no contact saved'} · {attributionLabel(journey.account.attribution)}</small>
                            </li>
                          ))}
                        </ul>
                        {journeys.length > 6 && <p className="funnel-lead-list__more">+{journeys.length - 6} more in the CSV export</p>}
                        <button type="button" className="portal-text-button" onClick={() => copyList(list.id, journeys)}>
                          <Copy size={14} /> {copied === list.id ? 'Copied' : 'Copy contact list'}
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

          <div className="funnel-footnote">
            <AlertTriangle size={15} />
            <span>
              Counts come from your own bookings and payment records. A family counts as
              <strong> paid</strong> once a payment is recorded or an admin marks their trial as enrolled —
              so keep marking those in the booking screen for accurate numbers.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
