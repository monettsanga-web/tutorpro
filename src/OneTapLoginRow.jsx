import { SiApple, SiGoogle } from 'react-icons/si'
import { FaYahoo } from 'react-icons/fa'
import { startOneTapSignIn } from './oneTapAuth.js'

/*
 * One-click redirect buttons: the browser leaves for Google's, Apple's or
 * Yahoo's own website to log in or register there, and the App resumes the
 * flow when the provider sends the family back.
 *
 * Used in BOTH places the owner asked for it: the registration area
 * (variant="register", student and teacher) and the login forms
 * (variant="login"). While a provider's keys are not configured yet the
 * honest note appears and the address field above still works - nothing
 * here is ever a dead button.
 */
export default function OneTapLoginRow({ surface, note, onNote, variant = 'login', intentKind = 'login', gateMessage = '' }) {
  const go = async (provider) => {
    onNote?.('')
    if (gateMessage) { onNote?.(gateMessage); return }
    const result = await startOneTapSignIn(provider, { kind: intentKind, surface })
    if (result.error) onNote?.(result.error)
  }
  return (
    <div className="onetap-login">
      <span>{variant === 'register' ? 'or register with one click' : 'or continue with'}</span>
      <div className="onetap-login__buttons">
        <button type="button" className="onetap-button" onClick={() => go('google')}><SiGoogle size={16} /> Google</button>
        <button type="button" className="onetap-button" onClick={() => go('apple')}><SiApple size={16} /> Apple</button>
        <button type="button" className="onetap-button" onClick={() => go('yahoo')}><FaYahoo size={16} /> Yahoo</button>
      </div>
      {note && <p className="onetap-note" role="status">{note}</p>}
    </div>
  )
}
