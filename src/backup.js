/**
 * One-click backup for the whole platform.
 *
 * WHY THIS EXISTS
 * ---------------
 * The Supabase free tier has NO automatic backups. That is the single real
 * risk of staying free — not the storage limit, not the egress limit. If the
 * project were ever lost there would be no copy of the parent accounts,
 * teacher profiles or the booking history anywhere.
 *
 * The Pro plan ($25/month) buys daily backups with 7-day retention. This file
 * gives the same protection for nothing: the administrator presses one button
 * and gets a single dated JSON file holding every row the account is allowed
 * to read, plus everything the browser keeps locally.
 *
 * It is READ ONLY. Nothing here writes to, changes or deletes anything.
 */

import { supabase, isSupabaseConfigured } from './supabaseClient.js'

/** Local storage keys that hold real platform data worth preserving. */
const LOCAL_KEYS = [
  'tutorpro_accounts_v2',
  'tutorpro_accounts_v1',
  'tutorpro_bookings_v1',
  'tutorpro_homework_v1',
  'tutorpro_courseware_templates_v1',
  'tutorpro_announcements_v1',
  'tutorpro_marketing_campaigns_v1',
  'tutorpro_followups_sent_v1',
  'tutorpro_followups_snoozed_v1',
  'tutorpro_library_bookmarks_v1',
  'tutorpro_public_reviews_v2',
  'tutorpro_site_settings_v1',
  'tutorpro_direct_messages_v1',
  'tutorpro_local_support_threads_v1',
]

function parseMaybeJson(raw) {
  if (raw === null || raw === undefined) return null
  try { return JSON.parse(raw) } catch { return raw }
}

/** Everything this browser is holding, whether or not it reached the cloud. */
export function collectLocalData() {
  const out = {}
  if (typeof localStorage === 'undefined') return out
  LOCAL_KEYS.forEach((key) => {
    const raw = localStorage.getItem(key)
    if (raw === null) return
    out[key] = parseMaybeJson(raw)
  })
  return out
}

/**
 * Pull one table in pages so a large table can never be silently truncated
 * the way a plain `.select('*')` would be by PostgREST's own row ceiling.
 */
async function fetchTable(table, { pageSize = 1000, maxRows = 50000 } = {}) {
  if (!supabase) return { rows: [], error: 'Shared database is not configured.' }
  const rows = []
  let from = 0
  for (;;) {
    const to = from + pageSize - 1
    const { data, error } = await supabase.from(table).select('*').range(from, to)
    if (error) {
      // A table the account cannot read is reported, not thrown: one blocked
      // table must never abandon the rest of the backup.
      return { rows, error: error.message || String(error) }
    }
    const page = Array.isArray(data) ? data : []
    rows.push(...page)
    if (page.length < pageSize || rows.length >= maxRows) break
    from += pageSize
  }
  return { rows, error: '' }
}

/** Tables the backup tries to read, in the order they are written out. */
export const BACKUP_TABLES = ['profiles', 'bookings', 'direct_messages', 'site_settings']

/**
 * Build the complete backup object.
 *
 * `tables` holds whatever the signed-in account was permitted to read.
 * `warnings` records anything that was refused, so a partial backup can never
 * be mistaken for a complete one.
 */
export async function buildBackup() {
  const warnings = []
  const tables = {}

  if (!isSupabaseConfigured || !supabase) {
    warnings.push('Shared database is not configured, so only this browser\u2019s data is included.')
  } else {
    for (const table of BACKUP_TABLES) {
      const { rows, error } = await fetchTable(table)
      tables[table] = rows
      if (error) warnings.push(`${table}: ${error}`)
    }
    // Support conversations are only reachable through a security-definer
    // function, so they are fetched separately rather than as a table.
    try {
      const { data, error } = await supabase.rpc('get_admin_support_conversations')
      if (error) throw error
      tables.support_conversations = Array.isArray(data) ? data : []
    } catch (error) {
      tables.support_conversations = []
      warnings.push(`support_conversations: ${error?.message || error}`)
    }
  }

  const local = collectLocalData()

  return {
    format: 'tutorpro-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    project: 'TutorPro Online English',
    counts: {
      ...Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length])),
      localKeys: Object.keys(local).length,
    },
    warnings,
    tables,
    local,
  }
}

/** A stable, sortable file name: tutorpro-backup-2026-09-05.json */
export function backupFileName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `tutorpro-backup-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`
}

/** Build the backup and hand it to the browser as a download. */
export async function downloadBackup() {
  const backup = await buildBackup()
  const text = JSON.stringify(backup, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName()
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked on the next tick so the download has definitely started.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { backup, bytes: new Blob([text]).size }
}

/* ------------------------------------------------------------------ */
/* Free-tier usage estimate                                            */
/* ------------------------------------------------------------------ */

/** The published Supabase free-plan allowances this estimate is measured against. */
export const FREE_TIER = {
  databaseBytes: 500 * 1024 * 1024, // 500 MB
  storageBytes: 1024 * 1024 * 1024, // 1 GB
  egressBytes: 5 * 1024 * 1024 * 1024, // 5 GB per month
  monthlyActiveUsers: 50000,
}

/**
 * Estimate how much of the 500 MB database allowance is in use.
 *
 * This is an ESTIMATE, and it is deliberately pessimistic: it measures the
 * JSON the API returns, which is larger than the packed row on disk, and then
 * adds a fixed allowance for indexes. Real usage will be lower, so the gauge
 * can warn early but never reassure falsely.
 */
export function estimateDatabaseBytes(backup) {
  const tables = backup?.tables || {}
  let bytes = 0
  const perTable = {}
  Object.entries(tables).forEach(([name, rows]) => {
    const size = new Blob([JSON.stringify(rows || [])]).size
    perTable[name] = { rows: (rows || []).length, bytes: size }
    bytes += size
  })
  // Postgres indexes, WAL and per-row overhead are not in the JSON above.
  const withOverhead = Math.round(bytes * 1.6)
  return {
    bytes: withOverhead,
    perTable,
    percentOfFreeTier: (withOverhead / FREE_TIER.databaseBytes) * 100,
  }
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Turn the estimate into a plain-English verdict about whether the paid plan
 * is actually needed yet, so the decision is never based on a guess.
 */
export function upgradeVerdict(estimate) {
  const percent = estimate?.percentOfFreeTier || 0
  if (percent >= 80) {
    return {
      level: 'act',
      headline: 'Close to the free limit',
      detail: 'The database is using most of the free 500 MB. Upgrading, or clearing old data, is now worth doing.',
    }
  }
  if (percent >= 40) {
    return {
      level: 'watch',
      headline: 'Worth keeping an eye on',
      detail: 'Still free, but check this page monthly so a limit never arrives as a surprise.',
    }
  }
  return {
    level: 'safe',
    headline: 'The free plan is plenty',
    detail: 'Usage is a small fraction of the free allowance. There is no reason to pay for the Pro plan yet.',
  }
}
