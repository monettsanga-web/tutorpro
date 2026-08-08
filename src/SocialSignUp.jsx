/**
 * The "sign up with a service you already use" row at the top of registration.
 *
 * HONESTY IS THE DESIGN CONSTRAINT
 * --------------------------------
 * Every button here is a promise that a parent can finish signing up. A button
 * for a provider that is not configured redirects them to a raw JSON error
 * page, on the screen where trust matters most. So this component asks the
 * Supabase project what is genuinely enabled before it renders anything as
 * live, and shows the rest as clearly "coming soon" rather than pretending.
 *
 * THE MOTION
 * ----------
 * Four things move, and each earns its place:
 *   1. Buttons deal in on load, one after another, so the row reads as a set.
 *   2. Each tile tilts in 3D toward the pointer, with the logo lifting further
 *      than the tile — the difference in travel is what reads as depth.
 *   3. A light sweeps across on hover.
 *   4. The pressed tile keeps its own spinner while the browser leaves for the
 *      provider, so a slow redirect never looks like a dead click.
 *
 * All of it is driven by two CSS custom properties written straight to the
 * node, so pointer movement never re-renders React, and all of it is switched
 * off for prefers-reduced-motion.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { SiFacebook, SiKakaotalk, SiNaver, SiTencentqq } from 'react-icons/si'
import { CircleAlert, Info, Loader2, ShieldCheck } from 'lucide-react'
import { detectAvailableSocialProviders, socialProviders, startSocialSignIn } from './socialAuth.js'

const providerIcons = {
  facebook: SiFacebook,
  kakao: SiKakaotalk,
  naver: SiNaver,
  qq: SiTencentqq,
}

export default function SocialSignUp({ plan = '', referralCode = '', chineseVisitor = false, onError }) {
  const [availability, setAvailability] = useState(null) // null = still checking
  const [busyId, setBusyId] = useState('')
  const [openSetup, setOpenSetup] = useState('')
  const rowRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    detectAvailableSocialProviders({ signal: controller.signal })
      .then((result) => { if (active) setAvailability(result) })
      .catch(() => { if (active) setAvailability({}) })
    return () => { active = false; controller.abort() }
  }, [])

  const handlePointer = useCallback((event) => {
    const tile = event.currentTarget
    const box = tile.getBoundingClientRect()
    tile.style.setProperty('--tilt-x', ((event.clientX - box.left) / box.width - 0.5).toFixed(3))
    tile.style.setProperty('--tilt-y', ((event.clientY - box.top) / box.height - 0.5).toFixed(3))
  }, [])

  const releasePointer = useCallback((event) => {
    const tile = event.currentTarget
    tile.style.setProperty('--tilt-x', '0')
    tile.style.setProperty('--tilt-y', '0')
  }, [])

  const choose = async (entry) => {
    if (busyId) return
    setBusyId(entry.id)
    onError?.('')
    try {
      await startSocialSignIn(entry.id, { plan, referralCode })
      // On success the browser navigates away, so we deliberately keep the
      // spinner running rather than clearing it.
    } catch (error) {
      onError?.(error.message)
      setBusyId('')
    }
  }

  const checking = availability === null
  const liveCount = availability ? Object.values(availability).filter(Boolean).length : 0

  return (
    <section className="social-signup" aria-labelledby="social-signup-title">
      <h3 id="social-signup-title" className="social-signup__title">
        {chineseVisitor ? '使用您常用的账号快速注册' : 'Sign up with an account you already have'}
      </h3>

      <div className="social-signup__row" ref={rowRef} role="group" aria-busy={checking}>
        {socialProviders.map((entry, index) => {
          const Icon = providerIcons[entry.id]
          const ready = Boolean(availability?.[entry.id])
          const busy = busyId === entry.id
          return (
            <button
              type="button"
              key={entry.id}
              className={`social-tile social-tile--${entry.id} ${ready ? 'is-ready' : 'is-pending'} ${busy ? 'is-busy' : ''}`}
              style={{ '--brand': entry.brand, '--deal-delay': `${90 + index * 85}ms` }}
              onMouseMove={handlePointer}
              onMouseLeave={releasePointer}
              onClick={() => (ready ? choose(entry) : setOpenSetup(openSetup === entry.id ? '' : entry.id))}
              disabled={checking || Boolean(busyId)}
              aria-label={ready
                ? `Sign up with ${entry.label}`
                : `${entry.label} sign-up is not switched on yet. Show the steps to enable it.`}
            >
              <span className="social-tile__sheen" aria-hidden="true" />
              <span className="social-tile__logo" aria-hidden="true">
                {busy ? <Loader2 className="social-tile__spin" size={22} /> : <Icon size={22} />}
              </span>
              <span className="social-tile__text">
                <strong>{entry.label}</strong>
                <small>{checking ? 'Checking…' : ready ? entry.blurb : 'Not switched on yet'}</small>
              </span>
              {!checking && !ready && <span className="social-tile__flag" aria-hidden="true"><Info size={13} /></span>}
            </button>
          )
        })}
      </div>

      {!checking && liveCount === 0 && (
        <p className="social-signup__note" role="status">
          <CircleAlert size={16} aria-hidden="true" />
          <span>
            {chineseVisitor
              ? '社交账号注册尚未开启，请使用下方的邮箱注册。'
              : 'One-tap sign-up is not switched on yet. Please create your account with the form below — it works exactly the same.'}
          </span>
        </p>
      )}

      {!checking && liveCount > 0 && (
        <p className="social-signup__note social-signup__note--safe" role="status">
          <ShieldCheck size={16} aria-hidden="true" />
          <span>
            {chineseVisitor
              ? '我们只接收您的姓名和邮箱，绝不会获取您的密码。'
              : 'We only receive your name and email address. We never see your password.'}
          </span>
        </p>
      )}

      {/* The setup steps are for the site owner, not the parent, so they stay
          collapsed until asked for. Showing them beats a button that fails. */}
      {openSetup && (() => {
        const entry = socialProviders.find((item) => item.id === openSetup)
        if (!entry) return null
        return (
          <div className="social-setup" role="region" aria-label={`How to switch on ${entry.label} sign-up`}>
            <strong>How to switch on {entry.label} sign-up</strong>
            <ol>{entry.setup.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <a href={entry.setup.console} target="_blank" rel="noreferrer noopener">Open the {entry.label} developer console ↗</a>
            <button type="button" onClick={() => setOpenSetup('')}>Hide</button>
          </div>
        )
      })()}

      <div className="social-signup__divider"><span>{chineseVisitor ? '或使用邮箱注册' : 'or sign up with your email'}</span></div>
    </section>
  )
}
