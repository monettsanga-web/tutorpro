import { MdAlternateEmail } from 'react-icons/md'
import { SiGmail, SiWhatsapp, SiWechat } from 'react-icons/si'
import { FaYahoo } from 'react-icons/fa6'
import { ExternalLink } from 'lucide-react'

const authProviderOptions = [
  {
    id: 'gmail',
    label: 'Gmail',
    action: 'Google sign in',
    url: 'https://accounts.google.com/AccountChooser?continue=https%3A%2F%2Fmail.google.com%2F',
    Icon: SiGmail,
  },
  {
    id: 'yahoo',
    label: 'Yahoo Mail',
    action: 'Yahoo sign in',
    url: 'https://login.yahoo.com/',
    Icon: FaYahoo,
  },
  {
    id: 'wechat',
    label: 'WeChat',
    action: 'Open WeChat',
    url: 'https://www.wechat.com/',
    Icon: SiWechat,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    action: 'WhatsApp Web',
    url: 'https://web.whatsapp.com/',
    Icon: SiWhatsapp,
  },
  {
    id: 'email',
    label: 'Other email',
    action: 'Open email app',
    url: 'mailto:',
    Icon: MdAlternateEmail,
  },
]

export default function AuthProviderPicker({ value, onSelect }) {
  return (
    <fieldset className="provider-picker provider-picker--branded">
      <legend>Choose how to sign in</legend>
      <div>
        {authProviderOptions.map(({ id, label, action, url, Icon }) => {
          const external = url.startsWith('http')
          return (
            <a
              className={`provider-method provider-method--${id} ${value === id ? 'active' : ''}`}
              href={url}
              target={external ? '_blank' : undefined}
              rel={external ? 'noopener noreferrer' : undefined}
              onClick={() => onSelect(id)}
              key={id}
              aria-label={`${action}; use ${label} for TutorPro English`}
              title={`${action} — opens in ${external ? 'a new tab' : 'your email app'}`}
            >
              <span className="provider-method__logo"><Icon aria-hidden="true" /></span>
              <strong>{label}</strong>
              <small>{action}</small>
              <ExternalLink className="provider-method__external" size={11} aria-hidden="true" />
            </a>
          )
        })}
      </div>
      <p>Choose a logo to open that provider securely. TutorPro English stays open so you can return and finish registration.</p>
    </fieldset>
  )
}
