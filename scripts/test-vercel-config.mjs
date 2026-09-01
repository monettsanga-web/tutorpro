/**
 * vercel.json validity check.
 *
 * WHY THIS EXISTS
 * ---------------
 * A `"comment"` key was added to a headers rule to explain a caching decision.
 * JSON has no comment syntax, and Vercel validates vercel.json against a
 * strict schema that rejects unknown properties — so every deployment after
 * that commit failed validation and never shipped.
 *
 * The failure was silent from the outside: the live site kept serving the last
 * good build, so the site looked fine while four commits' worth of work — the
 * self-hosted video, the egress fixes, the booking limit and the new subjects
 * — sat undeployed for about twelve hours. Nothing in `npm run build` or
 * `eslint` catches this, because the file is never read locally.
 *
 * This test does what Vercel does: rejects any key that is not in the schema.
 * Put explanations in the commit message or in docs/, never in vercel.json.
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

let passed = 0
const check = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ok  ${name}`) }
  catch (error) { console.error(`FAIL  ${name}\n      ${error.message}`); process.exitCode = 1 }
}

const raw = readFileSync('vercel.json', 'utf8')
let config
check('vercel.json is parseable JSON', () => { config = JSON.parse(raw) })

// Only the keys Vercel documents. Anything else fails the deploy.
const TOP_LEVEL = new Set([
  '$schema', 'buildCommand', 'cleanUrls', 'crons', 'devCommand', 'framework',
  'functions', 'headers', 'ignoreCommand', 'images', 'installCommand',
  'outputDirectory', 'public', 'redirects', 'regions', 'rewrites',
  'trailingSlash', 'git',
])
const ROUTE_MATCH = new Set(['source', 'has', 'missing'])
const HEADER_RULE = new Set([...ROUTE_MATCH, 'headers'])
const REDIRECT_RULE = new Set([...ROUTE_MATCH, 'destination', 'permanent', 'statusCode'])
const REWRITE_RULE = new Set([...ROUTE_MATCH, 'destination'])

const noUnknownKeys = (object, allowed, label) => {
  const unknown = Object.keys(object).filter((key) => !allowed.has(key))
  assert.deepEqual(unknown, [], `${label} has key(s) Vercel will reject: ${unknown.join(', ')}`)
}

check('no unknown top-level keys', () => {
  noUnknownKeys(config, TOP_LEVEL, 'vercel.json')
})

check('every headers rule uses only schema keys', () => {
  ;(config.headers || []).forEach((rule, index) => {
    noUnknownKeys(rule, HEADER_RULE, `headers[${index}]`)
    assert.ok(rule.source, `headers[${index}] needs a source`)
    assert.ok(Array.isArray(rule.headers), `headers[${index}].headers must be an array`)
    rule.headers.forEach((header, headerIndex) => {
      noUnknownKeys(header, new Set(['key', 'value']), `headers[${index}].headers[${headerIndex}]`)
      assert.ok(header.key && typeof header.value === 'string',
        `headers[${index}].headers[${headerIndex}] needs a key and a string value`)
    })
  })
})

check('every redirect uses only schema keys', () => {
  ;(config.redirects || []).forEach((rule, index) => {
    noUnknownKeys(rule, REDIRECT_RULE, `redirects[${index}]`)
    assert.ok(rule.source && rule.destination, `redirects[${index}] needs source and destination`)
  })
})

check('every rewrite uses only schema keys', () => {
  ;(config.rewrites || []).forEach((rule, index) => {
    noUnknownKeys(rule, REWRITE_RULE, `rewrites[${index}]`)
  })
})

check('the word "comment" appears nowhere — JSON has no comments', () => {
  // The exact mistake that blocked deploys for twelve hours.
  assert.ok(!/"comment"\s*:/.test(raw),
    'a "comment" key will fail Vercel validation and silently block every deploy')
})

check('the long-lived media cache header is still configured', () => {
  const rule = (config.headers || []).find((entry) => /assets/.test(entry.source || '')
    && (entry.headers || []).some((header) => header.key.toLowerCase() === 'cache-control'))
  assert.ok(rule, 'the /assets immutable cache rule is missing — video egress would return')
  const cacheControl = rule.headers.find((header) => header.key.toLowerCase() === 'cache-control').value
  assert.match(cacheControl, /max-age=\d{6,}/, 'expected a long max-age')
  assert.match(cacheControl, /immutable/)
})

check('the security headers are still present', () => {
  const all = (config.headers || []).flatMap((rule) => rule.headers.map((header) => header.key))
  ;['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options'].forEach((key) => {
    assert.ok(all.includes(key), `${key} must not be dropped`)
  })
})

console.log(`\n${passed} checks passed.`)
