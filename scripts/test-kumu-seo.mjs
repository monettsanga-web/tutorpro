/* Guard for the "Kumu English" keyword page (owner 2026-11-21): the phrase the
 * owner wants ranked must stay in the title/H1/description, be honestly defined
 * in the body (no invented brand claims), carry schema, and stay listed in the
 * sitemap and generated blog index. Also checks the sibling guide cross-links. */
import { readFileSync, existsSync } from 'node:fs'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- "Kumu English" keyword page (2026-11-21) ---')

const slug = 'kumu-english'
test('post is built', () => must(existsSync(`dist/blog/${slug}.html`), 'missing from dist'))
const post = readFileSync(`dist/blog/${slug}.html`, 'utf8')
test('title and H1 carry the keyword', () => {
  const title = post.match(/<title>([^<]+)<\/title>/)?.[1] ?? ''
  must(title.includes('Kumu English'), `title lacks keyword: ${title}`)
  must(title.length <= 60, `title ${title.length} chars > 60`)
  must(post.includes('<h1>Kumu English: online English classes for Filipino kids</h1>'), 'H1 drifted')
})
test('description carries the keyword', () => must(/<meta name="description" content="[^"]*Kumu English/.test(post), 'description lacks keyword'))
test('body defines the phrase honestly (kumusta, no invented brand claims)', () => {
  must(post.includes('kumusta'), 'etymology missing')
  must(post.includes('near-native Filipino English'), 'Filipino-teacher positioning missing')
  must(!/official Kumu English|Kumu English is a registered|Kumu™/.test(post), 'invented brand claim present')
})
test('post carries Article + FAQ + Breadcrumb schema', () => must(post.includes('"@type":"Article"') && post.includes('"@type":"FAQPage"') && post.includes('"@type":"BreadcrumbList"'), 'schema missing'))
test('post states only real prices', () => must(post.includes('US$7 per 25-minute lesson') && post.includes('₩8,000'), 'pricing copy drifted'))
const sitemap = readFileSync('public/sitemap.xml', 'utf8')
test('sitemap lists the post', () => must(sitemap.includes(`/blog/${slug}.html`), 'not in sitemap'))
const index = readFileSync('dist/blog/index.html', 'utf8')
test('blog index lists and links the post', () => must(index.includes(`/blog/${slug}.html`) && index.includes(`"position":7,"name":"Kumu English: online English classes for Filipino kids"`), 'not in blog index'))
const guide = readFileSync('dist/blog/how-to-choose-online-english-class-for-kids.html', 'utf8')
test('sibling parent guide cross-links to it', () => must(guide.includes(`/blog/${slug}.html`), 'cross-link missing'))

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
