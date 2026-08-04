import { useEffect, useMemo, useState } from 'react'
import { Check, Clock, Copy, Mail, Pencil, Send, X } from 'lucide-react'
import {
  buildFollowUpQueue,
  followUpHistory,
  followUpSummary,
  markFollowUpSent,
  snoozeFollowUp,
} from './followUps.js'
import { followUpEmailAvailable, sendFollowUpEmail } from './followUpSender.js'

/**
 * Admin → Follow-ups.
 *
 * Shows which families are due a message today and what to say. Nothing is
 * ever sent automatically: the administrator reviews each one, edits if they
 * want, then sends. Every send is recorded so no family is messaged twice.
 */
export default function AdminFollowUpPanel() {
  const [refreshToken, setRefreshToken] = useState(0)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({ subject: '', body: '' })
  const [sendingId, setSendingId] = useState('')
  const [flash, setFlash] = useState('')
  const [problem, setProblem] = useState('')
  const [copiedId, setCopiedId] = useState('')

  // refreshToken is deliberately the only dependency: both helpers read from
  // localStorage rather than props, so bumping the token is how we re-read
  // after a send. eslint flags it as "unnecessary" because it is unused in the
  // body — removing it would freeze the queue after the first render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const queue = useMemo(() => buildFollowUpQueue(), [refreshToken])
  const summary = useMemo(() => followUpSummary(queue), [queue])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const history = useMemo(() => followUpHistory().slice(0, 8), [refreshToken])
  const canEmail = followUpEmailAvailable()

  useEffect(() => {
    if (!flash) return undefined
    const timer = window.setTimeout(() => setFlash(''), 4000)
    return () => window.clearTimeout(timer)
  }, [flash])

  const refresh = () => setRefreshToken((value) => value + 1)

  const openEditor = (item) => {
    setEditing(item.id)
    setDraft({ subject: item.subject, body: item.body })
  }

  const messageFor = (item) => (editing === item.id ? draft : { subject: item.subject, body: item.body })

  const copyMessage = (item) => {
    const message = messageFor(item)
    const text = `To: ${item.email || 'no email on file'}\nSubject: ${message.subject}\n\n${message.body}`
    navigator.clipboard?.writeText(text).then(() => {
      setCopiedId(item.id)
      window.setTimeout(() => setCopiedId(''), 1800)
    }).catch(() => {})
  }

  const send = async (item) => {
    const message = messageFor(item)
    setSendingId(item.id)
    setProblem('')
    try {
      await sendFollowUpEmail({
        accountId: item.accountId,
        type: item.type.id,
        subject: message.subject,
        body: message.body,
      })
      markFollowUpSent(item.accountId, item.type.id, { subject: message.subject, channel: 'email' })
      setFlash(`Sent to ${item.parentName}.`)
      setEditing(null)
      refresh()
    } catch (error) {
      setProblem(error.message || 'That email could not be sent.')
    } finally {
      setSendingId('')
    }
  }

  const markSentManually = (item) => {
    markFollowUpSent(item.accountId, item.type.id, { subject: messageFor(item).subject, channel: 'manual' })
    setFlash(`Marked as sent to ${item.parentName}. They will not appear again.`)
    setEditing(null)
    refresh()
  }

  const skip = (item) => {
    snoozeFollowUp(item.accountId, item.type.id)
    setFlash(`Skipped ${item.parentName}.`)
    refresh()
  }

  return (
    <div className="portal-view">
      <div className="portal-page-heading">
        <div>
          <span className="portal-kicker">Growth</span>
          <h1>Follow-ups</h1>
          <p>Families worth a message today, with the message already written. Nothing sends until you approve it.</p>
        </div>
      </div>

      {flash && <div className="website-control-flash website-control-flash--ok"><Check size={16} /> {flash}</div>}
      {problem && <div className="website-control-flash website-control-flash--warn">{problem}</div>}
      {!canEmail && (
        <div className="website-control-flash website-control-flash--warn">
          Email sending is not configured, so the Send button is disabled. You can still use
          <strong> Copy message</strong> and send from your own email, then press <strong>Mark as sent</strong>.
        </div>
      )}

      <div className="followup-summary">
        {summary.map((type) => (
          <div className={`followup-summary__item followup-summary__item--${type.tone}`} key={type.id}>
            <strong>{type.count}</strong>
            <span>{type.label}</span>
            <small>{type.blurb}</small>
          </div>
        ))}
      </div>

      {queue.length === 0 ? (
        <section className="portal-card funnel-empty-card">
          <Mail size={34} />
          <h2>Nobody needs a message right now</h2>
          <p>
            This page fills up on its own as families book free classes, attend them, or go quiet.
            Come back after your next few trial lessons.
          </p>
        </section>
      ) : (
        <section className="portal-card">
          <div className="portal-card__heading portal-card__heading--small">
            <div><span className="portal-kicker">Ready to send</span><h2>{queue.length} {queue.length === 1 ? 'message' : 'messages'}</h2></div>
          </div>
          <div className="followup-queue">
            {queue.map((item) => {
              const message = messageFor(item)
              const isEditing = editing === item.id
              return (
                <article className={`followup-card followup-card--${item.type.tone}`} key={item.id}>
                  <header>
                    <div>
                      <span className="followup-card__type">{item.type.label}</span>
                      <strong>{item.parentName}</strong>
                      <small>{item.email || 'No email on file'} · about {item.learnerName}</small>
                    </div>
                    <div className="followup-card__actions">
                      <button type="button" className="portal-text-button" onClick={() => (isEditing ? setEditing(null) : openEditor(item))}>
                        <Pencil size={14} /> {isEditing ? 'Done' : 'Edit'}
                      </button>
                      <button type="button" className="portal-text-button" onClick={() => skip(item)}>
                        <X size={14} /> Skip
                      </button>
                    </div>
                  </header>

                  {isEditing ? (
                    <div className="followup-card__editor">
                      <input
                        value={draft.subject}
                        onChange={(event) => setDraft((current) => ({ ...current, subject: event.target.value }))}
                        placeholder="Subject"
                      />
                      <textarea
                        rows={11}
                        value={draft.body}
                        onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
                      />
                    </div>
                  ) : (
                    <div className="followup-card__preview">
                      <strong>{message.subject}</strong>
                      <pre>{message.body}</pre>
                    </div>
                  )}

                  <footer>
                    <button
                      type="button"
                      className="portal-primary-button"
                      onClick={() => send(item)}
                      disabled={!canEmail || !item.email || sendingId === item.id}
                    >
                      <Send size={15} /> {sendingId === item.id ? 'Sending…' : 'Send email'}
                    </button>
                    <button type="button" className="portal-secondary-button" onClick={() => copyMessage(item)}>
                      <Copy size={15} /> {copiedId === item.id ? 'Copied' : 'Copy message'}
                    </button>
                    <button type="button" className="portal-text-button" onClick={() => markSentManually(item)}>
                      <Check size={14} /> Mark as sent
                    </button>
                  </footer>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {history.length > 0 && (
        <section className="portal-card followup-history-card">
          <div className="portal-card__heading portal-card__heading--small">
            <div><span className="portal-kicker">Recently sent</span><h2>History</h2></div>
          </div>
          <div className="followup-history">
            {history.map((entry) => (
              <div key={`${entry.accountId}-${entry.typeId}`}>
                <Clock size={13} />
                <span>{entry.subject || entry.typeId}</span>
                <small>{entry.sentAt ? new Date(entry.sentAt).toLocaleDateString('en', { day: 'numeric', month: 'short' }) : ''}{entry.channel === 'manual' ? ' · sent manually' : ''}</small>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
