import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Copy, ExternalLink, FileText, FileUp, Link2, Trash2 } from 'lucide-react'
import { supabase } from './supabaseClient.js'

/*
 * Licensure Examination for Teachers - passers document shelf (owner request).
 *
 * The owner uploads or pastes the LET PASSERS PDF files here (correction:
 * not reviewer material - the files list passers, and visitors view them
 * at /let-passers.html). Every file gets one permanent public link she can
 * also copy and send anywhere. Files live in the `let-docs` Supabase
 * Storage bucket through /api/notify/letdocs (admin-gated server side -
 * see api/notify/_letdocs.js for why the route lives under /notify).
 *
 * Three honest ways in, matching "paste and upload":
 *   1. Choose a PDF file (button).
 *   2. Drag a PDF onto the panel, or COPY a PDF anywhere and PASTE
 *      (Ctrl/Cmd+V) with this panel focused - clipboard files work.
 *   3. Paste a link to a PDF that is too big to upload (3 MB cap, which
 *      is Vercel's request-body limit, not an arbitrary one).
 */

const API = '/api/notify/letdocs'

function readableSize(bytes) {
  if (!bytes && bytes !== 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function LetDocsManager() {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkTitle, setLinkTitle] = useState('')
  const [copiedId, setCopiedId] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  /* Owner requirement: PRIMARY and SECONDARY passers each have their own
     files. Every upload/link declares which section it belongs to. */
  const [level, setLevel] = useState('primary')
  const fileInputRef = useRef(null)

  const call = useCallback(async (action, payload = {}) => {
    const { data } = supabase ? await supabase.auth.getSession() : { data: null }
    const token = data?.session?.access_token
    if (!token) throw new Error('Please sign in again before managing LET files.')
    const response = await fetch(`${API}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    })
    const json = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(json.error || `Request failed (${response.status}).`)
    return json
  }, [])

  const load = useCallback(async () => {
    try {
      const { docs: list } = await call('list')
      setDocs(Array.isArray(list) ? list : [])
      setError('')
    } catch (listError) {
      setError(listError.message)
    } finally {
      setLoading(false)
    }
  }, [call])

  /* The effect only kicks off the async load - no synchronous setState in
     the effect body (react-hooks/set-state-in-effect). `loading` starts
     true, and the alive flag drops the result if the panel unmounts. */
  useEffect(() => {
    let alive = true
    const run = async () => { if (alive) await load() }
    run()
    return () => { alive = false }
  }, [load])


  const uploadFile = useCallback(async (file) => {
    setError('')
    setNotice('')
    if (!file) return
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name || '')) {
      setError('Only PDF files can be uploaded here.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setError(`"${file.name}" is ${readableSize(file.size)} - over the 3 MB upload limit. Paste its link below instead.`)
      return
    }
    setBusy('upload')
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('Could not read that file.'))
        reader.readAsDataURL(file)
      })
      const { doc } = await call('upload', { pdf: dataUrl, fileName: file.name, title: file.name.replace(/\.pdf$/i, ''), level })
      setDocs((prev) => [doc, ...prev])
      setNotice(`Uploaded "${doc.title}". Use Copy link to share it.`)
    } catch (uploadError) {
      setError(uploadError.message)
    } finally {
      setBusy('')
      setPendingFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [call, level])

  const addLink = useCallback(async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    if (!/^https?:\/\/.+/.test(linkUrl.trim())) {
      setError('Paste the full web address of the PDF (starting with https://).')
      return
    }
    setBusy('link')
    try {
      const { doc } = await call('link', { url: linkUrl.trim(), title: linkTitle.trim(), level })
      setDocs((prev) => [doc, ...prev])
      setNotice(`Link saved for "${doc.title}".`)
      setLinkUrl('')
      setLinkTitle('')
    } catch (linkError) {
      setError(linkError.message)
    } finally {
      setBusy('')
    }
  }, [call, level, linkUrl, linkTitle])

  const removeDoc = useCallback(async (doc) => {
    if (!window.confirm(`Remove "${doc.title}" from the LET shelf?${doc.kind === 'upload' ? ' The uploaded file is deleted permanently.' : ''}`)) return
    setError('')
    setNotice('')
    setBusy(doc.id)
    try {
      await call('delete', { id: doc.id })
      setDocs((prev) => prev.filter((d) => d.id !== doc.id))
      setNotice(`Removed "${doc.title}".`)
    } catch (deleteError) {
      setError(deleteError.message)
    } finally {
      setBusy('')
    }
  }, [call])

  const copyLink = useCallback(async (doc) => {
    try {
      await navigator.clipboard.writeText(doc.url)
      setCopiedId(doc.id)
      setTimeout(() => setCopiedId((current) => (current === doc.id ? '' : current)), 1600)
    } catch {
      setError('Could not copy automatically - select the link text and copy it manually.')
    }
  }, [])

  /* Paste anywhere on the panel: a copied PDF file arrives in
     event.clipboardData.files. Plain text that looks like a PDF URL goes
     to the link field instead, so "paste" works both ways. */
  const onPaste = useCallback((event) => {
    const file = event.clipboardData?.files?.[0]
    if (file) {
      event.preventDefault()
      setPendingFile(file)
      uploadFile(file)
      return
    }
    const text = (event.clipboardData?.getData('text') || '').trim()
    if (/^https?:\/\/\S+\.pdf(\?\S*)?$/i.test(text)) {
      event.preventDefault()
      setLinkUrl(text)
      setNotice('PDF link pasted - add an optional title and press Save link.')
    }
  }, [uploadFile])

  const onDrop = useCallback((event) => {
    event.preventDefault()
    const file = event.dataTransfer?.files?.[0]
    if (file) {
      setPendingFile(file)
      uploadFile(file)
    }
  }, [uploadFile])

  return (
    <div className="portal-view let-docs-view" onPaste={onPaste} tabIndex={-1}>
      <div className="portal-page-heading">
        <div>
          <span className="portal-kicker">Teacher resources</span>
          <h2>Licensure Examination for Teachers</h2>
          <p className="let-docs-sub">Upload or paste the LET passers PDF files; visitors see them on /let-passers.html, and each file gets a permanent link you can copy and send anywhere.</p>
        </div>
      </div>

      <section className="portal-card let-docs-level" role="radiogroup" aria-label="Which passers list does the file belong to?">
        <strong>Adding to:</strong>
        <label className={`let-docs-level__opt${level === 'primary' ? ' let-docs-level__opt--on' : ''}`}>
          <input type="radio" name="let-level" value="primary" checked={level === 'primary'} onChange={() => setLevel('primary')} />
          PRIMARY passers
        </label>
        <label className={`let-docs-level__opt${level === 'secondary' ? ' let-docs-level__opt--on' : ''}`}>
          <input type="radio" name="let-level" value="secondary" checked={level === 'secondary'} onChange={() => setLevel('secondary')} />
          SECONDARY passers
        </label>
        <span className="let-docs-level__hint">Files appear on the website under their own {level === 'primary' ? 'Primary' : 'Secondary'} section.</span>
      </section>

      <section
        className={`portal-card let-docs-drop${pendingFile ? ' let-docs-drop--armed' : ''}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <FileUp size={22} />
        <div>
          <strong>Upload a PDF</strong>
          <span>Choose a file, drag it here, or copy a PDF anywhere and press Ctrl/Cmd+V while this panel is open. Up to 3 MB per file.</span>
        </div>
        <label className="portal-primary-button let-docs-choose">
          {busy === 'upload' ? 'Uploading…' : 'Choose PDF'}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            disabled={busy === 'upload'}
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                setPendingFile(file)
                uploadFile(file)
              }
            }}
          />
        </label>
      </section>

      <form className="portal-card let-docs-linkform" onSubmit={addLink}>
        <Link2 size={20} />
        <div className="let-docs-linkfields">
          <strong>Paste a link instead</strong>
          <input
            type="url"
            value={linkUrl}
            onChange={(event) => setLinkUrl(event.target.value)}
            placeholder="https://…/let-passers-2026.pdf (for files over 3 MB)"
            aria-label="PDF link"
          />
          <input
            type="text"
            value={linkTitle}
            onChange={(event) => setLinkTitle(event.target.value)}
            placeholder="Optional title, e.g. LET Passers - September 2026"
            maxLength={120}
            aria-label="Link title"
          />
        </div>
        <button type="submit" className="portal-primary-button" disabled={busy === 'link'}>
          {busy === 'link' ? 'Saving…' : 'Save link'}
        </button>
      </form>

      {error && <p className="let-docs-error" role="alert">{error}</p>}
      {notice && <p className="let-docs-notice" role="status"><CheckCircle2 size={15} /> {notice}</p>}

      <section className="portal-card let-docs-list">
        <h3>Posted files ({docs.length})</h3>
        {loading && <p className="let-docs-empty">Loading your LET files…</p>}
        {!loading && docs.length === 0 && (
          <p className="let-docs-empty">No files yet. Upload your first LET passers PDF above - or paste a link to one.</p>
        )}
        <ul>
          {docs.map((doc) => (
            <li key={doc.id}>
              <FileText size={18} className="let-docs-icon" />
              <div className="let-docs-meta">
                <strong>{doc.title} <em className={`let-docs-badge let-docs-badge--${doc.level === 'secondary' ? 'secondary' : 'primary'}`}>{doc.level === 'secondary' ? 'Secondary' : 'Primary'}</em></strong>
                <span>
                  {doc.kind === 'link' ? 'Pasted link' : `Uploaded PDF${doc.bytes ? ` · ${readableSize(doc.bytes)}` : ''}`}
                  {doc.addedAt ? ` · ${new Date(doc.addedAt).toLocaleDateString()}` : ''}
                </span>
                <a className="let-docs-url" href={doc.url} target="_blank" rel="noopener noreferrer">{doc.url}</a>
              </div>
              <div className="let-docs-actions">
                <button type="button" onClick={() => copyLink(doc)} title="Copy link">
                  {copiedId === doc.id ? <CheckCircle2 size={16} /> : <Copy size={16} />} {copiedId === doc.id ? 'Copied' : 'Copy link'}
                </button>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" title="Open"><ExternalLink size={16} /></a>
                <button type="button" className="let-docs-delete" onClick={() => removeDoc(doc)} disabled={busy === doc.id} title="Remove">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
