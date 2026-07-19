import { useEffect, useRef, useState } from 'react'
import { Download, FileUp, Headphones, Languages, MessageCircle, Paperclip, RotateCcw, Send, ShieldCheck, X } from 'lucide-react'
import { getCurrentAccount } from './auth.js'
import {
  clearSavedSupportThread,
  createSupportConversation,
  downloadSupportAttachment,
  fetchSupportThread,
  readSavedSupportThread,
  sendParentSupportMessage,
  uploadParentSupportAttachment,
} from './supportChat.js'
import { translateSupportText } from './supportTranslation.js'
import { currentVisitorLocale, isChineseVisitor, subscribeToVisitorLocale } from './visitorLocale.js'

function accountEmail(account) {
  const candidate = account?.email || account?.loginId || ''
  return candidate.includes('@') ? candidate : ''
}

export default function SupportChatWidget({ embedded = false }) {
  const [account, setAccount] = useState(getCurrentAccount)
  const [locale, setLocale] = useState(currentVisitorLocale)
  const [open, setOpen] = useState(embedded)
  const [credentials, setCredentials] = useState(readSavedSupportThread)
  const [thread, setThread] = useState(null)
  const [form, setForm] = useState(() => ({
    parentName: account?.parentName || '',
    email: accountEmail(account),
    message: '',
  }))
  const [draft, setDraft] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [translations, setTranslations] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const messagesRef = useRef(null)
  const attachmentInputRef = useRef(null)
  const chinese = isChineseVisitor(locale)

  useEffect(() => {
    const refreshAccount = () => {
      const latest = getCurrentAccount()
      setAccount(latest)
      setForm((current) => ({
        ...current,
        parentName: current.parentName || latest?.parentName || '',
        email: current.email || accountEmail(latest),
      }))
    }
    window.addEventListener('storage', refreshAccount)
    window.addEventListener('tutorpro:data-change', refreshAccount)
    const unsubscribeLocale = subscribeToVisitorLocale(setLocale)
    return () => {
      window.removeEventListener('storage', refreshAccount)
      window.removeEventListener('tutorpro:data-change', refreshAccount)
      unsubscribeLocale()
    }
  }, [])

  useEffect(() => {
    if (!embedded) return undefined
    document.body.classList.add('support-embedded-open')
    return () => document.body.classList.remove('support-embedded-open')
  }, [embedded])

  useEffect(() => {
    if (!open || !credentials) return undefined
    let active = true
    const refresh = async () => {
      try {
        const next = await fetchSupportThread(credentials)
        if (active) {
          setThread(next)
          setError('')
        }
      } catch (refreshError) {
        if (active) setError(refreshError.message)
      }
    }
    refresh()
    const interval = window.setInterval(refresh, 5000)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [open, credentials])

  useEffect(() => {
    const element = messagesRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [thread?.messages?.length, open])

  useEffect(() => {
    if (!thread?.messages?.length || !locale.language || locale.language === 'en') return undefined
    let active = true
    thread.messages.filter((message) => message.sender === 'admin' && !translations[message.id]).forEach(async (message) => {
      const translated = await translateSupportText(message.body, locale.language)
      if (active && translated) setTranslations((current) => ({ ...current, [message.id]: translated }))
    })
    return () => { active = false }
  }, [locale.language, thread?.messages, translations])

  if (account?.role === 'admin') return null

  const beginConversation = async (event) => {
    event.preventDefault()
    if (form.parentName.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(form.email.trim()) || !form.message.trim()) {
      setError(chinese ? '请填写姓名、有效邮箱和您的问题。' : 'Add your name, a valid email and your question.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const nextCredentials = await createSupportConversation({
        parentName: form.parentName.trim(),
        email: form.email.trim(),
        language: locale.language || 'en',
        message: form.message.trim(),
      })
      setCredentials(nextCredentials)
      setForm((current) => ({ ...current, message: '' }))
      setThread(await fetchSupportThread(nextCredentials))
    } catch (createError) {
      setError(createError.message)
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()
    const message = draft.trim()
    if ((!message && !attachment) || !credentials) return
    setLoading(true)
    setError('')
    try {
      if (attachment) await uploadParentSupportAttachment(credentials, attachment, message)
      else await sendParentSupportMessage(credentials, message)
      setDraft('')
      setAttachment(null)
      if (attachmentInputRef.current) attachmentInputRef.current.value = ''
      setThread(await fetchSupportThread(credentials))
    } catch (sendError) {
      setError(sendError.message)
    } finally {
      setLoading(false)
    }
  }

  const chooseAttachment = (event) => {
    const file = event.target.files?.[0] || null
    if (file && file.size > (3 * 1024 * 1024)) {
      setError(chinese ? '附件大小不能超过 3 MB。' : 'Keep chat attachments under 3 MB.')
      event.target.value = ''
      return
    }
    setAttachment(file)
    setError('')
  }

  const startAgain = () => {
    clearSavedSupportThread()
    setCredentials(null)
    setThread(null)
    setError('')
    setDraft('')
    setAttachment(null)
    setTranslations({})
  }

  return (
    <div className={`support-widget ${embedded ? 'support-widget--embedded' : ''} ${open ? 'support-widget--open' : ''}`}>
      {!embedded && !open && <button className="support-launcher" onClick={() => setOpen(true)} aria-label={chinese ? '联系 TutorPro 管理员' : 'Chat with TutorPro English support'}><span><MessageCircle size={23} /></span><div><strong>{chinese ? '联系管理员' : 'Need help?'}</strong><small>{chinese ? '中文家长咨询' : 'Chat with us'}</small></div><i /></button>}

      {open && <section className="support-panel" role="dialog" aria-label={chinese ? '家长客服聊天' : 'Parent support chat'}>
        <header><span><Headphones size={21} /></span><div><strong>{chinese ? 'TutorPro 中文家长客服' : 'TutorPro Parent Support'}</strong><small>{chinese ? '给管理员留言，我们会尽快回复' : 'Message the administrator'}</small></div>{!embedded && <button onClick={() => setOpen(false)} aria-label="Close chat"><X size={18} /></button>}</header>

        {!credentials ? <form className="support-start" onSubmit={beginConversation}>
          <div className="support-language-note"><Languages size={15} /><span>{chinese ? '您可以使用中文留言。管理员的回复会保存在这里。' : 'Write in English or Chinese. Replies stay in this private conversation.'}</span></div>
          {account?.role === 'student' && <div className="support-identified"><ShieldCheck size={14} /> {chinese ? '已识别为注册家长账户' : 'Registered family account identified'}</div>}
          <label><span>{chinese ? '家长姓名' : 'Parent name'}</span><input value={form.parentName} onChange={(event) => setForm((current) => ({ ...current, parentName: event.target.value }))} placeholder={chinese ? '请输入您的姓名' : 'Your name'} maxLength="100" /></label>
          <label><span>{chinese ? '联系邮箱' : 'Contact email'}</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder={chinese ? 'QQ、163、Outlook 或其他邮箱' : 'you@example.com'} maxLength="180" /></label>
          <label><span>{chinese ? '您的问题' : 'How can we help?'}</span><textarea value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} placeholder={chinese ? '请告诉我们您想咨询的问题…' : 'Tell us your question…'} maxLength="1000" /></label>
          {error && <div className="support-error">{error}</div>}
          <button type="submit" disabled={loading}>{loading ? (chinese ? '正在发送…' : 'Sending…') : (chinese ? '开始咨询' : 'Start conversation')} <Send size={16} /></button>
          <p><ShieldCheck size={13} /> {chinese ? '此对话仅对您和 TutorPro 管理员可见。' : 'Private between you and the TutorPro administrator.'}</p>
        </form> : <div className="support-thread">
          <div className="support-thread-meta"><span className={`support-thread-status support-thread-status--${thread?.status || 'open'}`}>{thread?.status === 'closed' ? (chinese ? '已结束' : 'Closed') : (chinese ? '客服对话' : 'Support conversation')}</span><button onClick={startAgain}><RotateCcw size={13} /> {chinese ? '新对话' : 'New'}</button></div>
          <div className="support-messages" ref={messagesRef}>{thread?.messages?.length ? thread.messages.map((message) => <div className={`support-message support-message--${message.sender}`} key={message.id}><small>{message.sender === 'admin' ? (chinese ? 'TutorPro 管理员' : 'TutorPro Admin') : (chinese ? '您' : 'You')}</small><p>{message.body}</p>{translations[message.id] && <p className="support-translation"><Languages size={12} /> {translations[message.id]}</p>}{message.attachment && <button className="support-attachment" onClick={() => downloadSupportAttachment(message.attachment).catch((downloadError) => setError(downloadError.message))}><Paperclip size={13} /><span>{message.attachment.name}</span><Download size={13} /></button>}<time>{new Date(message.createdAt).toLocaleTimeString(locale.language || 'en', { hour: 'numeric', minute: '2-digit' })}</time></div>) : <div className="support-loading">{chinese ? '正在加载对话…' : 'Loading conversation…'}</div>}</div>
          {error && <div className="support-error">{error}</div>}
          <form className="support-reply" onSubmit={sendMessage}>{attachment && <div className="support-selected-file"><Paperclip size={13} /><span>{attachment.name}</span><button type="button" onClick={() => { setAttachment(null); if (attachmentInputRef.current) attachmentInputRef.current.value = '' }}><X size={13} /></button></div>}<label className="support-file-button" title={chinese ? '上传文件' : 'Upload file'}><FileUp size={17} /><input ref={attachmentInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,.jpg,.jpeg,.png,.webp,.pdf,.txt" onChange={chooseAttachment} /></label><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={thread?.status === 'closed' ? (chinese ? '发送消息将重新开启对话' : 'A new message will reopen this conversation') : (chinese ? '输入消息…' : 'Write a message…')} maxLength="1000" /><button type="submit" disabled={loading || (!draft.trim() && !attachment)} aria-label="Send message"><Send size={17} /></button></form>
        </div>}
      </section>}
    </div>
  )
}
