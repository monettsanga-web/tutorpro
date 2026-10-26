import { SiApple, SiGoogle } from 'react-icons/si'
import { startOneTapSignIn } from './oneTapAuth.js'

/* "Continue with Google / Apple" under an existing login form. Clicking
   leaves for the provider's own site; the App resumes when it returns.
   If the provider is not switched on yet, the honest note appears and the
   password form right above still works. */
export default function OneTapLoginRow({ surface, note, onNote }) {
  const go = async (provider) => {
    onNote?.('')
    const result = await startOneTapSignIn(provider, { kind: 'login', surface })
    if (result.error) onNote?.(result.error)
  }
  return (
    <div className="onetap-login">
      <span>or continue with</span>
      <div className="onetap-login__buttons">
        <button type="button" className="onetap-button" onClick={() => go('google')}><SiGoogle size={16} /> Google</button>
        <button type="button" className="onetap-button" onClick={() => go('apple')}><SiApple size={16} /> Apple</button>
      </div>
      {note && <p className="onetap-note" role="status">{note}</p>}
    </div>
  )
}
