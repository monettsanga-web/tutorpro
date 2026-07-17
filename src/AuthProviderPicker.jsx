import { MdAlternateEmail } from 'react-icons/md'
import { SiGmail, SiWhatsapp, SiWechat } from 'react-icons/si'
import { FaYahoo } from 'react-icons/fa6'
import { CheckCircle2 } from 'lucide-react'

const authProviderOptions = [
  { id: 'gmail', label: 'Gmail', action: 'Use Gmail address', Icon: SiGmail },
  { id: 'yahoo', label: 'Yahoo Mail', action: 'Use Yahoo address', Icon: FaYahoo },
  { id: 'wechat', label: 'WeChat', action: 'Use WeChat ID', Icon: SiWechat },
  { id: 'whatsapp', label: 'WhatsApp', action: 'Use phone number', Icon: SiWhatsapp },
  { id: 'email', label: 'Other email', action: 'Any email provider', Icon: MdAlternateEmail },
]

export default function AuthProviderPicker({ value, onSelect }) {
  return (
    <fieldset className="provider-picker provider-picker--branded">
      <legend>Choose how to create your TutorPro English account</legend>
      <div>
        {authProviderOptions.map(({ id, label, action, Icon }) => (
          <button
            type="button"
            className={`provider-method provider-method--${id} ${value === id ? 'active' : ''}`}
            onClick={() => onSelect(id)}
            key={id}
            aria-pressed={value === id}
            aria-label={`Use ${label} to create a TutorPro English account`}
          >
            <span className="provider-method__logo"><Icon aria-hidden="true" /></span>
            <strong>{label}</strong>
            <small>{action}</small>
            {value === id && <CheckCircle2 className="provider-method__selected" size={13} aria-hidden="true" />}
          </button>
        ))}
      </div>
      <p>Your account is created directly on TutorPro English. Selecting a method will not send you to another website.</p>
    </fieldset>
  )
}
