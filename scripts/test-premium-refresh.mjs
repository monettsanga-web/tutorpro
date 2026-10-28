/* Guards for the 2026-10-28 premium refresh spec: the owner's exact hero
   headline/subtitle/buttons, React<->prerender sync, the $6 transparency
   fix, skip-link accessibility, and Log In / Sign Up on contact.html.
   Nothing here may regress the Filipino positioning (separate suite) or
   the keyword title/meta (test-seo-meta). */
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
let pass = 0; let fail = 0
const ok = (cond, label) => { if (cond) { pass += 1 } else { fail += 1; console.log(`FAIL  ${label}`) } }

const app = read('src/App.jsx')
const prerender = read('scripts/prerender-home.mjs')
const dist = read('dist/index.html')
const contact = read('public/contact.html')

const H1 = "Build Your Child's English Confidence with TutorPro!"
const SUB = 'Personalized online English lessons for primary and secondary students'

/* 1 - hero headline, exact and in sync everywhere */
ok(app.includes(`<h1>${H1}</h1>`), 'React renders the owner\'s exact headline')
ok(prerender.includes(`heading: 'Build Your Child\\'s English Confidence with TutorPro!'`), 'the prerender carries the same headline')
ok(dist.includes(H1), 'the BUILT homepage serves that headline to crawlers without JavaScript')

/* 2 - subtitle starts with the owner's exact sentence, keeps the positioning */
const tagline = app.match(/hero__tagline">([^<]*)</)[1]
ok(tagline.startsWith(SUB), 'the hero subtitle starts with the owner\'s exact sentence')
ok(/near-native Filipino English teachers/.test(tagline), 'and still names the near-native Filipino teachers')
ok(prerender.includes(tagline), 'prerender and React taglines are identical')

/* 3 - hero buttons per spec, nothing removed */
ok(/>\s*Book a Free Trial <ArrowRight/.test(app), 'Book a Free Trial is the primary hero button')
ok(/button--outline button--large" href="\/signup">\s*Sign Up/.test(app), 'Sign Up button links to /signup')
ok(/button--quiet button--large" href="\/login">\s*Log In/.test(app), 'Log In button links to /login')
ok(/href="#programmes">\s*Explore our programs/.test(app), 'Explore our programs kept')
ok(/hero__apply-teacher/.test(app), 'Apply as a teacher kept in the hero')
ok(/Book a Free Trial<\/a> · <a href="\/signup">Sign Up<\/a> · <a href="\/login">Log In/.test(prerender), 'the prerendered CTA line lists all three actions')

/* 4 - pricing transparency: the hero no longer contradicts the pricing page */
ok(app.includes('From US$6 per class'), 'hero proof says From US$6 per class')
ok(!/From US\$8/.test(app), 'no From US$8 anywhere in the app copy')

/* 5 - accessibility */
ok(/<a className="skip-link" href="#main-content">Skip to main content<\/a>/.test(app), 'keyboard skip link added')
ok(app.includes('<main id="main-content">'), 'the public main is the skip target')

/* 6 - contact.html follows the same pattern */
ok(/href="\/login">Log In<\/a>/.test(contact) && /btn--primary" href="\/signup">Sign Up<\/a>/.test(contact), 'contact page header offers Log In and Sign Up')
ok(!/Register now/.test(contact), 'the old Register now button was replaced, not duplicated')

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
