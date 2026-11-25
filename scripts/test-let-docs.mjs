/* Guard for the Licensure Examination for Teachers document shelf
 * (owner request): admin-only PDF upload/paste/link/delete through
 * /api/notify/letdocs, files stored in the public `let-docs` Supabase
 * bucket, panel wired into the ADMIN dashboard nav only, and the
 * twelve-function cap untouched (handler merged, never a new file). */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- LET document shelf ---')

/* 1. The function cap: still exactly twelve non-underscore api files. */
function apiFiles(dir) {
  let out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) out = out.concat(apiFiles(full))
    else if (entry.name.endsWith('.js') && !entry.name.startsWith('_')) out.push(full)
  }
  return out
}
test('serverless function cap stays at twelve', () => {
  const files = apiFiles('api')
  must(files.length === 12, `api function files = ${files.length}, must be 12`)
  must(!existsSync('api/let-docs.js') && !existsSync('api/letdocs.js'), 'a standalone LET route file would be function thirteen')
})

/* 2. Router registration. */
const router = readFileSync('api/notify/[type].js', 'utf8')
test('letdocs handler is registered on the [type] router', () => must(
  router.includes("import letdocs from './_letdocs.js'") && router.includes('letdocs }'),
  'HANDLERS registration missing'))

/* 3. Server handler security + storage shape. */
const api = readFileSync('api/notify/_letdocs.js', 'utf8')
test('service role writes to the public let-docs bucket', () => must(
  api.includes('getSupabaseAdmin()') && api.includes("const BUCKET = 'let-docs'") && api.includes('public: true'),
  'storage wiring drifted'))
test('admin gate uses admin_members, never profiles.role', () => must(
  api.includes("from('admin_members')") && !api.includes(".from('profiles')") && !api.includes("eq('role'"),
  'admin verification drifted'))
test('PDF-only with a real magic-byte check and the 3 MB body cap', () => must(
  api.includes('PDF_DATA_URL') && api.includes("startsWith('%PDF-')") && api.includes('3 * 1024 * 1024'),
  'upload validation drifted'))
test('list is public by design; mutations verify the caller first', () => {
  const listAt = api.indexOf("action === 'list'")
  const listEnd = api.indexOf("action === 'upload'", listAt)
  must(listEnd > listAt, 'upload block not found after list block')
  const listSlice = api.slice(listAt, listEnd)
  must(!listSlice.includes('adminCaller'), 'list must stay public for /let-passers.html')
  must(listSlice.includes('Public on purpose'), 'the public list needs its intent comment')
  for (const action of ["action === 'upload'", "action === 'link'", "action === 'delete'"]) {
    const at = api.indexOf(action)
    must(at > -1, `missing ${action}`)
    const slice = api.slice(at, at + 200)
    must(slice.includes('adminCaller(req, supabase)'), `${action} is not admin-gated`)
  }
})
test('manifest keeps the list inside the same bucket', () => must(
  api.includes("const MANIFEST = '_manifest.json'") && api.includes('writeManifest'),
  'manifest bookkeeping drifted'))

/* 4. Panel component. */
const panel = readFileSync('src/LetDocsManager.jsx', 'utf8')
test('panel uploads via the merged route with the session token', () => must(
  panel.includes("const API = '/api/notify/letdocs'") && panel.includes('supabase.auth.getSession()') && panel.includes('Bearer ${token}'),
  'API call wiring drifted'))
test('panel accepts choose + drag/drop + clipboard paste', () => must(
  panel.includes('type="file"') && panel.includes('onDrop') && panel.includes('onPaste') && panel.includes('clipboardData?.files'),
  'a paste/upload path is missing'))
test('paste rejects non-PDF files and oversize files honestly', () => must(
  panel.includes("file.type !== 'application/pdf'") && panel.includes('3 * 1024 * 1024'),
  'client-side validation drifted'))
test('panel can paste a link, copy links and delete with confirmation', () => must(
  panel.includes('addLink') && panel.includes('navigator.clipboard.writeText(doc.url)') && panel.includes('window.confirm'),
  'link/copy/delete affordance missing'))

/* 5. Dashboard wiring - admin nav only. */
const dash = readFileSync('src/Dashboards.jsx', 'utf8')
test('admin nav lists the section by its full name', () => must(
  dash.includes("{ id: 'letdocs', label: 'Licensure Examination for Teachers', icon: FileText }"),
  'nav entry missing'))
test('nav entry sits inside AdminDashboard, not the teacher portal', () => {
  const navAt = dash.indexOf("id: 'letdocs'")
  const adminAt = dash.lastIndexOf('export function AdminDashboard', navAt)
  const anyExport = dash.lastIndexOf('export function', navAt)
  must(adminAt > -1 && adminAt === anyExport, 'letdocs nav is not inside AdminDashboard')
  const teacherNav = dash.indexOf("{ id: 'courseware', label: 'Courseware', icon: BookOpen },", 0)
  must(dash.indexOf("id: 'letdocs'") > teacherNav + 1000, 'letdocs appears too early - teacher nav contaminated?')
})
test('panel renders for the letdocs tab with Suspense', () => must(
  dash.includes("active === 'letdocs'") && dash.includes('<LetDocsManager />') && dash.includes("lazy(() => import('./LetDocsManager.jsx'))"),
  'render wiring missing'))

/* 6. Public visitor page for the shelf. */
const pub = readFileSync('public/let-passers.html', 'utf8')
test('visitor page exists, fetches the public list and escapes titles', () => must(
  pub.includes('/api/notify/letdocs?action=list') && pub.includes('escapeHtml(doc.title') && pub.includes('let-status--empty'),
  'public page wiring drifted'))
test('visitor page says PASSERS, not reviewer, and claims no PRC endorsement', () => must(
  pub.includes('LET passers') && pub.includes('posted here by') && !/reviewer/i.test(pub) && !/PRC-accredited|official PRC|PRC-endorsed/i.test(pub),
  'page still says reviewer, or an endorsement claim appeared'))
test('old reviewer URL 301s to the passers page', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'))
  const rule = (vercel.redirects || []).find((r) => r.source === '/let-reviewer-files.html')
  must(rule && rule.destination === '/let-passers.html' && rule.permanent === true, 'redirect missing')
  must(!existsSync('public/let-reviewer-files.html'), 'old page file must be gone')
})
test('visitor page CTA links only to real pages', () => must(
  pub.includes('href="/teachers.html"') && pub.includes('href="/contact.html"') && !pub.includes('/?teach=1'),
  'CTA links drifted or an invented route returned'))
const app = readFileSync('src/App.jsx', 'utf8')
test('footer links the visitor page', () => must(
  app.includes('<a href="/let-passers.html">LET passers</a>'),
  'footer link missing'))
const sitemap = readFileSync('public/sitemap.xml', 'utf8')
test('sitemap lists the visitor page', () => must(sitemap.includes('/let-passers.html') && !sitemap.includes('let-reviewer-files'), 'not in sitemap'))
const pagesCss = readFileSync('public/assets/pages.css', 'utf8')
test('pages.css styles the visitor page', () => {
  for (const cls of ['.pg-let .let-hero', '.pg-let .let-item', '.pg-let .let-status', '.pg-let .let-cta']) {
    must(pagesCss.includes(cls), `missing ${cls}`)
  }
})

/* 7. Styles exist for every class the panel uses. */
const css = readFileSync('src/dashboard.css', 'utf8')
test('dashboard.css styles the shelf', () => {
  for (const cls of ['.let-docs-drop', '.let-docs-linkform', '.let-docs-list', '.let-docs-actions', '.let-docs-error', '.let-docs-notice']) {
    must(css.includes(cls), `missing ${cls}`)
  }
})

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
