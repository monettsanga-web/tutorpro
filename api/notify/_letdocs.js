import { getSupabaseAdmin, sendError, sendJson } from '../_paypal.js'

/**
 * Licensure Examination for Teachers (LET) document shelf.
 *
 * WHAT THIS IS
 * ------------
 * The owner asked for a section where she can paste and upload the PDF
 * files for the Licensure Examination for Teachers - reviewer material she
 * shares with teacher applicants. Uploads land in a PUBLIC Supabase
 * Storage bucket (`let-docs`) through the service-role key, so every file
 * gets one permanent link she can copy and send to anyone, and the file
 * survives no matter which browser uploaded it.
 *
 * WHY IT LIVES UNDER /api/notify
 * ------------------------------
 * Vercel's Hobby plan allows twelve serverless functions per deployment
 * and this repo is at exactly twelve. A new `api/let-docs.js` file would
 * be function thirteen and every deploy would die with
 * `exceeded_serverless_functions_per_deployment`. The [type] router is
 * the established merge point (see its header comment), so LET docs are
 * served from `/api/notify/letdocs?action=...`. The name is odd; the cap
 * is real. If a function slot ever frees up, move this file and its
 * HANDLERS registration together.
 *
 * THE MANIFEST
 * ------------
 * There is no `let_docs` table and this route must not depend on DDL it
 * cannot verify, so the list of documents is kept in `_manifest.json`
 * inside the same bucket. Every mutation rewrites it. One admin uses
 * this, so read-modify-write races are theoretical.
 *
 * WHO MAY DO WHAT
 * ---------------
 * list: PUBLIC. Every document here is already public-by-URL in the
 * `let-docs` bucket, and /let-reviewer-files.html renders the same list
 * for any visitor, so the list endpoint hides nothing that the bucket
 * does not already expose. It returns titles and URLs only.
 * upload/delete/link: administrators only, verified through
 * `admin_members` - never `profiles.role`, which any visitor could once
 * PATCH on themselves (same rule as api/teachers/photo.js).
 *
 * SIZE LIMIT
 * ----------
 * Vercel Hobby caps the serverless request body at 4.5 MB. Base64 inflates
 * bytes by ~4/3, so PDFs are accepted up to 3 MB of real file size. That
 * covers typical reviewer handouts; anything bigger must be linked
 * instead of uploaded (the "paste a link" row exists for exactly that).
 */

const BUCKET = 'let-docs'
const MANIFEST = '_manifest.json'
const MAX_BYTES = 3 * 1024 * 1024
const PDF_DATA_URL = /^data:application\/pdf;base64,/

async function adminCaller(req, supabase) {
  const header = req.headers?.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) throw Object.assign(new Error('Please log in again before managing LET files.'), { status: 401 })
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.id) throw Object.assign(new Error('Your login session could not be verified.'), { status: 401 })
  const { data: member } = await supabase
    .from('admin_members')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (!member?.user_id) throw Object.assign(new Error('Only the administrator can change LET files.'), { status: 403 })
  return data.user
}

async function ensureBucket(supabase) {
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true })
  /* 409-style "already exists" is the normal case after the first run. */
  if (error && !/already exists|duplicate/i.test(String(error.message || ''))) {
    /* If the bucket exists but createBucket still errored, carrying on is
     * correct: the real test is whether the next operation succeeds. */
  }
}

async function readManifest(supabase) {
  const { data, error } = await supabase.storage.from(BUCKET).download(MANIFEST)
  if (error || !data) return []
  try {
    const parsed = JSON.parse(await data.text())
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function writeManifest(supabase, entries) {
  const { error } = await supabase.storage.from(BUCKET).upload(MANIFEST, JSON.stringify(entries, null, 2), {
    contentType: 'application/json',
    upsert: true,
  })
  if (error) throw Object.assign(new Error(`Could not save the LET list: ${error.message}`), { status: 502 })
}

function safeName(name) {
  const base = String(name || 'let-document').replace(/\.pdf$/i, '').trim()
  const clean = base.replace(/[^A-Za-z0-9 _-]/g, '').replace(/\s+/g, '-').slice(0, 60) || 'let-document'
  return `${Date.now().toString(36)}-${clean.toLowerCase()}.pdf`
}

function publicUrl(path) {
  return `https://losmkvvwzijipqrlelyt.supabase.co/storage/v1/object/public/${BUCKET}/${path}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return sendError(res, 405, 'Use POST.')
  const action = String(req.query?.action || 'list')

  try {
    const supabase = getSupabaseAdmin()
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {})

    if (action === 'list') {
      /* Public on purpose: see WHO MAY DO WHAT above. */
      await ensureBucket(supabase)
      return sendJson(res, 200, { docs: await readManifest(supabase) })
    }

    if (action === 'upload') {
      await adminCaller(req, supabase)
      const pdf = String(body.pdf || '')
      const title = String(body.title || '').trim().slice(0, 120)
      if (!PDF_DATA_URL.test(pdf)) return sendError(res, 400, 'Send the file as a PDF data URL.')
      if (pdf.length > MAX_BYTES * 1.4) return sendError(res, 413, 'That PDF is too large to upload (3 MB limit). Use "paste a link" for bigger files.')
      const bytes = Buffer.from(pdf.slice(pdf.indexOf(',') + 1), 'base64')
      if (!bytes.subarray(0, 5).toString('latin1').startsWith('%PDF-')) {
        return sendError(res, 400, 'That file is not a real PDF.')
      }
      await ensureBucket(supabase)
      const path = safeName(body.fileName || title)
      const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, { contentType: 'application/pdf', upsert: false })
      if (error) throw Object.assign(new Error(`Upload failed: ${error.message}`), { status: 502 })
      const docs = await readManifest(supabase)
      const entry = {
        id: path,
        kind: 'upload',
        title: title || path.replace(/^\w+-/, '').replace(/\.pdf$/i, ''),
        url: publicUrl(path),
        bytes: bytes.length,
        addedAt: new Date().toISOString(),
      }
      docs.unshift(entry)
      await writeManifest(supabase, docs)
      return sendJson(res, 200, { doc: entry })
    }

    if (action === 'link') {
      await adminCaller(req, supabase)
      const url = String(body.url || '').trim()
      const title = String(body.title || '').trim().slice(0, 120)
      if (!/^https?:\/\/.+/.test(url)) return sendError(res, 400, 'Paste the full web address of the PDF (starting with https://).')
      await ensureBucket(supabase)
      const docs = await readManifest(supabase)
      const entry = { id: `link-${Date.now().toString(36)}`, kind: 'link', title: title || url, url, addedAt: new Date().toISOString() }
      docs.unshift(entry)
      await writeManifest(supabase, docs)
      return sendJson(res, 200, { doc: entry })
    }

    if (action === 'delete') {
      await adminCaller(req, supabase)
      const id = String(body.id || '').trim()
      if (!id) return sendError(res, 400, 'Which document should be removed?')
      await ensureBucket(supabase)
      const docs = await readManifest(supabase)
      const gone = docs.find((d) => d.id === id)
      if (!gone) return sendError(res, 404, 'That document is not on the list.')
      if (gone.kind === 'upload') {
        const { error } = await supabase.storage.from(BUCKET).remove([gone.id])
        if (error) throw Object.assign(new Error(`Delete failed: ${error.message}`), { status: 502 })
      }
      await writeManifest(supabase, docs.filter((d) => d.id !== id))
      return sendJson(res, 200, { deleted: id })
    }

    return sendError(res, 404, 'Unknown LET action.')
  } catch (e) {
    return sendError(res, e.status || 500, e.message || 'Unexpected error.')
  }
}
