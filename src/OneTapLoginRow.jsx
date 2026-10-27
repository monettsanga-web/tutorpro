import { SiApple, SiGoogle } from 'react-icons/si'
import { FaYahoo } from 'react-icons/fa'
import { startOneTapSignIn } from './oneTapAuth.js'

/*
 * The Novakid pattern the owner asked for: big one-click provider buttons
 * at the TOP of the form, an "Or continue with" divider, then the email
 * fields below. One click leaves for Google's / Apple's / Yahoo's own
 * website to log in or register there; the App resumes the flow when the
 * provider sends the family back (students at step 2, teachers at step 2
 * of the application).
 *
 * Used in the student registration, the teacher application and both
 * login forms. While a provider's keys are not configured yet the honest
 * note appears under the buttons and the fields below still work - nothing
 * here is ever a dead button.
 */
export default function OneTapLoginRow({ surface, note, onNote, intentKind = 'login', gateMessage = '' }) {
  const go = async (provider) => {
    onNote?.('')
    if (gateMessage) { onNote?.(gateMessage); return }
    const result = await startOneTapSignIn(provider, { kind: intentKind, surface })
    if (result.error) onNote?.(result.error)
  }
  return (
    <div className="onetap-primary">
      <div className="onetap-primary__buttons">
        <button type="button" className="onetap-primary__btn" onClick={() => go('google')}><SiGoogle size={18} /> Google</button>
        <button type="button" className="onetap-primary__btn" onClick={() => go('apple')}><SiApple size={18} /> Apple</button>
        <button type="button" className="onetap-primary__btn" onClick={() => go('yahoo')}><FaYahoo size={18} /> Yahoo</button>
      </div>
      {note && <p className="onetap-note" role="status">{note}</p>}
      <div className="onetap-divider"><span>Or continue with</span></div>
    </div>
  )
}
