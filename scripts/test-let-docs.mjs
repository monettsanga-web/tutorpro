/* Guard for the Licensure Examination for Teachers document shelf
 * (owner request): admin-only PDF upload/paste/link/delete through
 * /api/notify/letdocs, files stored in the public `let-docs` Supabase
 * bucket, panel wired into the ADMIN dashboard nav only, and the
 * twelve-function cap untouched (handler merged, never a new file). */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs'
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
test('uploads and links must declare PRIMARY or SECONDARY', () => must(
  api.includes("const LEVELS = new Set(['primary', 'secondary'])") &&
  api.split('LEVELS.has(level)').length - 1 === 2 &&
  api.includes('level,') ,
  'level validation missing from upload/link'))
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
test('panel lets the owner pick PRIMARY or SECONDARY before posting', () => must(
  panel.includes("useState('primary')") && panel.includes('PRIMARY passers') && panel.includes('SECONDARY passers') &&
  panel.includes('level })') && panel.includes('let-docs-badge--'),
  'level chooser or badge missing from the panel'))
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
const pagesCss = readFileSync('public/assets/pages.css', 'utf8')
test('visitor page has its own section per level', () => {
  for (const bit of ['data-list="primary"', 'data-list="secondary"', 'Primary LET passers', 'Secondary LET passers', 'let-level-badge--primary', 'let-level-badge--secondary']) {
    must(pub.includes(bit), `page missing ${bit}`)
  }
  for (const cls of ['.pg-let .let-level-block', '.pg-let .let-level-head', '.pg-let .let-level-badge--primary']) {
    must(pagesCss.includes(cls), `css missing ${cls}`)
  }
})
test('hero banner: owner-chosen image is shipped and referenced', () => {
  must(existsSync('public/assets/let-passers-banner.webp'), 'banner file missing from public/assets')
  const kb = statSync('public/assets/let-passers-banner.webp').size / 1024
  must(kb < 200, `banner is ${Math.round(kb)} KB - keep it a compressed WebP under 200 KB`)
  must(pub.includes('/assets/let-passers-banner.webp'), 'page does not reference the banner')
  must(pub.includes('og:image'), 'banner should also be the og:image')
  must(pub.includes('let-hero__banner') && pub.includes('alt="Illustration celebrating Licensure Examination for Teachers passers'), 'banner figure or alt text drifted')
  must(pagesCss.includes('.pg-let .let-hero__banner'), 'banner styles missing')
})
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
test('pages.css styles the visitor page', () => {
  for (const cls of ['.pg-let .let-hero', '.pg-let .let-item', '.pg-let .let-status', '.pg-let .let-cta']) {
    must(pagesCss.includes(cls), `missing ${cls}`)
  }
})
test('premium design layer: hero decor, chips, steps, skeleton, filter, reduced motion', () => {
  for (const bit of ['let-float--cap', 'let-chips', 'let-steps__grid', 'let-skeleton', 'let-empty-card', 'id="let-filter"', '--i:']) {
    must(pub.includes(bit), `page missing ${bit}`)
  }
  for (const cls of ['.pg-let .let-chips', '.pg-let .let-step', '.pg-let .let-skeleton', '.pg-let .let-empty-card', '.pg-let .let-filter', '@keyframes letRise']) {
    must(pagesCss.includes(cls), `css missing ${cls}`)
  }
  must(pagesCss.includes('@media (prefers-reduced-motion: reduce)'), 'reduced-motion fallback missing')
})

/* 7. Styles exist for every class the panel uses. */
const css = readFileSync('src/dashboard.css', 'utf8')
test('dashboard.css styles the shelf', () => {
  for (const cls of ['.let-docs-drop', '.let-docs-linkform', '.let-docs-list', '.let-docs-actions', '.let-docs-error', '.let-docs-notice']) {
    must(css.includes(cls), `missing ${cls}`)
  }
})

/* 8. "LET results" SEO layer (owner request). */
test('page targets LET results in title and description', () => {
  const decode = (v) => v.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  const title = decode(pub.match(/<title>([^<]+)<\/title>/)?.[1] ?? '')
  const desc = decode(pub.match(/<meta name="description" content="([^"]+)"/)?.[1] ?? '')
  must(title.includes('LET Results') && title.includes('Licensure Examination for Teachers'), `title drifted: ${title}`)
  must(title.length <= 60, `title ${title.length} chars > 60`)
  must(desc.includes('LET results') && desc.includes('Primary and Secondary passers'), 'description lacks results keywords')
  must(desc.length <= 160, `description ${desc.length} chars > 160`)
})
test('FAQPage schema mirrors the visible FAQ and stays honest about the PRC', () => must(
  pub.includes('"@type": "FAQPage"') && pub.includes('"@type": "CollectionPage"') &&
  pub.includes('Where can I view LET results online?') && pub.includes('let-faq') &&
  pub.includes('Professional Regulation Commission (PRC)') && !/official PRC publication|PRC-accredited|PRC-endorsed/i.test(pub),
  'FAQ schema, visible FAQ or PRC honesty line drifted'))
test('companion blog post exists in the generator, dist and sitemap', () => {
  const gen = readFileSync('scripts/build-blog.mjs', 'utf8')
  must(gen.includes("slug: 'let-results-passers-list-view-online'"), 'generator entry missing')
  must(existsSync('dist/blog/let-results-passers-list-view-online.html'), 'post not built')
  must(sitemap.includes('/blog/let-results-passers-list-view-online.html'), 'post not in sitemap')
  const post = readFileSync('dist/blog/let-results-passers-list-view-online.html', 'utf8')
  must(post.includes('/let-passers.html') && pub.includes('/blog/let-results-passers-list-view-online.html'), 'cross-links missing')
  must(post.includes('"@type":"FAQPage"'), 'post FAQ schema missing')
})

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
