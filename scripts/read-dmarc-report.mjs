/**
 * Read a DMARC report and say, in plain words, whether the email is healthy.
 *
 * WHY THIS EXISTS
 * ---------------
 * Google sends one of these every day the domain sends mail, and they arrive
 * as raw XML that nobody sensible can read. The owner should not have to ask
 * a developer "is this good or bad?" every time one lands.
 *
 * The report answers one question that genuinely matters: when a mailbox
 * provider received mail claiming to be from tutorpro.site, did it verify as
 * genuine? A failure means either our own mail is misconfigured, or somebody
 * is forging our address to phish parents. Both are worth knowing about.
 *
 * USAGE
 *   node scripts/read-dmarc-report.mjs <file.xml> [more.xml ...]
 *   node scripts/read-dmarc-report.mjs ~/uploads          # a whole folder
 *
 * Google also sends these gzipped (.xml.gz) or zipped. Unzip first — this
 * reads plain XML only, deliberately, to avoid pulling in a dependency.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, extname } from 'node:path'

/* A deliberately tiny XML reader. DMARC reports are flat and predictable, so
   a full parser would be more dependency than the job needs. */
const tagText = (xml, tag) => {
  const hit = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return hit ? hit[1].trim() : ''
}
const tagBlocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])

const formatDate = (seconds) => {
  const value = Number(seconds)
  if (!Number.isFinite(value)) return 'unknown'
  return new Date(value * 1000).toISOString().replace('T', ' ').slice(0, 16) + ' UTC'
}

function summarise(xml, label) {
  const meta = tagText(xml, 'report_metadata')
  const policy = tagText(xml, 'policy_published')
  const range = tagText(meta, 'date_range')

  const out = {
    label,
    reporter: tagText(meta, 'org_name') || 'unknown',
    from: formatDate(tagText(range, 'begin')),
    to: formatDate(tagText(range, 'end')),
    domain: tagText(policy, 'domain'),
    policy: tagText(policy, 'p') || 'none',
    total: 0,
    passed: 0,
    dkimPass: 0,
    spfPass: 0,
    problems: [],
  }

  for (const record of tagBlocks(xml, 'record')) {
    const row = tagText(record, 'row')
    const count = Number(tagText(row, 'count')) || 0
    const evaluated = tagText(row, 'policy_evaluated')
    const dkim = tagText(evaluated, 'dkim')
    const spf = tagText(evaluated, 'spf')
    const ip = tagText(row, 'source_ip')
    const disposition = tagText(evaluated, 'disposition') || 'none'

    out.total += count
    if (dkim === 'pass') out.dkimPass += count
    if (spf === 'pass') out.spfPass += count

    // DMARC passes when EITHER check passes and aligns. Both failing is the
    // only combination that means trouble.
    if (dkim === 'pass' || spf === 'pass') {
      out.passed += count
    } else {
      out.problems.push({ ip, count, dkim, spf, disposition })
    }
  }
  return out
}

function report(files) {
  const results = files.map((file) => summarise(readFileSync(file, 'utf8'), file.split('/').pop()))

  let total = 0, passed = 0, dkim = 0, spf = 0
  const problems = []

  for (const r of results) {
    total += r.total; passed += r.passed; dkim += r.dkimPass; spf += r.spfPass
    problems.push(...r.problems.map((p) => ({ ...p, label: r.label })))

    console.log(`\n${r.label}`)
    console.log(`  Reported by : ${r.reporter}`)
    console.log(`  Covering    : ${r.from}  ->  ${r.to}`)
    console.log(`  Domain      : ${r.domain}   policy: p=${r.policy}`)
    console.log(`  Messages    : ${r.total}`)
    console.log(`  DKIM passed : ${r.dkimPass}/${r.total}`)
    console.log(`  SPF passed  : ${r.spfPass}/${r.total}`)
  }

  const rate = total ? Math.round((passed / total) * 100) : 0
  console.log('\n' + '='.repeat(58))
  console.log(`  Messages checked        ${total}`)
  console.log(`  Verified as genuinely   ${passed}  (${rate}%)`)
  console.log(`  from your domain`)
  console.log(`  Failed verification     ${total - passed}`)
  console.log('='.repeat(58))

  if (!total) {
    console.log('\nNo messages in these reports. Nothing was sent in this period.')
    return 0
  }

  if (!problems.length) {
    console.log('\n  ✅ HEALTHY.')
    console.log('  Every message was verified as genuinely from your domain.')
    console.log('  Nothing to do.')
    return 0
  }

  console.log('\n  ⚠️  SOME MESSAGES FAILED VERIFICATION\n')
  for (const p of problems) {
    console.log(`  ${p.count} message(s) from ${p.ip} — dkim=${p.dkim} spf=${p.spf} (${p.disposition})`)
  }
  console.log('\n  This means one of two things:')
  console.log('    1. A service you use sends as @tutorpro.site but is not set up')
  console.log('       to prove it. Recognise the address? Then it is this.')
  console.log('    2. Somebody is forging your address to phish your families.')
  console.log('       Do not recognise it? Then it is likely this.')
  console.log('\n  Either way, send this output to your developer.')
  return 1
}

const args = process.argv.slice(2)
if (!args.length) {
  console.error('Usage: node scripts/read-dmarc-report.mjs <file.xml | folder>')
  process.exit(2)
}

const files = []
for (const arg of args) {
  if (!existsSync(arg)) { console.error(`Not found: ${arg}`); continue }
  if (statSync(arg).isDirectory()) {
    for (const entry of readdirSync(arg)) {
      if (extname(entry).toLowerCase() === '.xml') files.push(join(arg, entry))
    }
  } else {
    files.push(arg)
  }
}

if (!files.length) {
  console.error('No .xml reports found. Google sometimes sends .gz or .zip — unzip it first.')
  process.exit(2)
}

process.exit(report(files))
