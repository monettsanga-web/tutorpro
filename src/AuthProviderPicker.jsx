import { useEffect, useState } from 'react'
import { MdAlternateEmail } from 'react-icons/md'
import { SiGmail, SiWhatsapp, SiWechat } from 'react-icons/si'
import { FaYahoo } from 'react-icons/fa6'
import { CheckCircle2, CircleAlert } from 'lucide-react'
import { currentVisitorLocale, isChineseVisitor, subscribeToVisitorLocale } from './visitorLocale.js'

const authProviderOptions = [
  { id: 'gmail', label: 'Gmail', action: 'Use Gmail address', Icon: SiGmail },
  { id: 'yahoo', label: 'Yahoo Mail', action: 'Use Yahoo address', Icon: FaYahoo },
  { id: 'wechat', label: 'WeChat', action: 'Use WeChat ID', Icon: SiWechat },
  { id: 'whatsapp', label: 'WhatsApp', action: 'Use phone number', Icon: SiWhatsapp },
  { id: 'email', label: 'Other email', action: 'Any email provider', Icon: MdAlternateEmail },
]

export default function AuthProviderPicker({ value, onSelect }) {
  const [visitorLocale, setVisitorLocale] = useState(currentVisitorLocale)
  const chineseVisitor = isChineseVisitor(visitorLocale)

  useEffect(() => subscribeToVisitorLocale(setVisitorLocale), [])

  return (
    <fieldset className="provider-picker provider-picker--branded">
      <legend>{chineseVisitor ? '选择注册邮箱 / Choose how to create your account' : 'Choose how to create your TutorPro English account'}</legend>
      {chineseVisitor && <div className="china-email-guide" lang="zh-CN"><CircleAlert size={19} /><div><strong>中国家长注册提示</strong><p>请点击 <b>“其他邮箱 / Other email”</b>，并使用可在中国正常接收邮件的邮箱，例如 QQ 邮箱、163 邮箱、126 邮箱、Outlook 或 Yahoo。请不要使用 Gmail，因为 Gmail 在中国大陆可能无法正常打开或接收验证邮件。</p><small>Chinese parents: choose Other email and use an email service available in mainland China.</small></div></div>}
      <div>
        {authProviderOptions.map(({ id, label, action, Icon }) => {
          const displayLabel = chineseVisitor && id === 'email' ? '其他邮箱 / Other email' : label
          const displayAction = chineseVisitor && id === 'email' ? '推荐中国家长使用' : action
          return (
          <button
            type="button"
            className={`provider-method provider-method--${id} ${value === id ? 'active' : ''}`}
            onClick={() => onSelect(id)}
            key={id}
            aria-pressed={value === id}
            aria-label={`${displayLabel}: ${displayAction}`}
          >
            <span className="provider-method__logo"><Icon aria-hidden="true" /></span>
            <strong>{displayLabel}</strong>
            <small>{displayAction}</small>
            {value === id && <CheckCircle2 className="provider-method__selected" size={13} aria-hidden="true" />}
          </button>
          )
        })}
      </div>
      <p>{chineseVisitor ? '账户将在 TutorPro English 内直接创建，不会跳转到其他网站。' : 'Your account is created directly on TutorPro English. Selecting a method will not send you to another website.'}</p>
    </fieldset>
  )
}
