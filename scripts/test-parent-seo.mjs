/* Guard for the parent-search SEO post (owner 2026-11-09): the choosing-an-
 * online-English-class guide must stay published, indexed and linked. */
import { readFileSync, existsSync } from 'node:fs'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- Parent-search SEO post (2026-11-09) ---')

const slug = 'how-to-choose-online-english-class-for-kids'
test('post is built', () => must(existsSync(`dist/blog/${slug}.html`), 'missing from dist'))
const post = readFileSync(`dist/blog/${slug}.html`, 'utf8')
test('post targets the query in H1 and lede', () => must(post.includes('<h1>How to choose an online English class for kids</h1>') && post.includes('online English class for kids'), 'keyword missing'))
test('post carries Article + FAQ + Breadcrumb schema', () => must(post.includes('"@type":"Article"') && post.includes('"@type":"FAQPage"') && post.includes('"@type":"BreadcrumbList"'), 'schema missing'))
test('post states only real prices', () => must(post.includes('US$7 per 25-minute lesson') && post.includes('₩8,000'), 'pricing copy drifted'))
const sitemap = readFileSync('public/sitemap.xml', 'utf8')
test('sitemap lists the post', () => must(sitemap.includes(`/blog/${slug}.html`), 'not in sitemap'))
const index = readFileSync('public/blog/index.html', 'utf8')
test('blog index lists and links the post', () => must(index.includes(`/blog/${slug}.html`) && index.includes(`"position":6,"name":"How to choose an online English class for kids"`), 'not in blog index'))

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
