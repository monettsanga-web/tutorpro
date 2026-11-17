/* Guard for owner request 2026-11-08: KakaoTalk username tutorpro_english
 * on the contact surfaces, without disturbing the other channels. */
import { readFileSync } from 'node:fs'

const failures = []
const checks = { pass: 0, fail: 0 }
const test = (name, fn) => {
  try { fn(); checks.pass++; console.log(`  PASS  ${name}`) }
  catch (e) { checks.fail++; failures.push(`${name} -> ${e.message}`); console.log(`  FAIL  ${name} -> ${e.message}`) }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg) }

console.log('--- KakaoTalk on contact (2026-11-08) ---')

const contact = readFileSync('public/contact.html', 'utf8')
test('contact page shows the KakaoTalk ID', () => must(contact.includes('KakaoTalk ID: tutorpro_english'), 'channel row missing'))
test('contact meta mentions KakaoTalk', () => must(contact.includes('KakaoTalk (tutorpro_english) or email'), 'meta description missing it'))
test('WeChat ID untouched on contact', () => must(contact.includes('WeChat ID: t_cora'), 'wechat row changed'))
test('WhatsApp link untouched on contact', () => must(contact.includes('https://wa.me/639625284849'), 'whatsapp link changed'))

const channels = readFileSync('src/ContactChannels.jsx', 'utf8')
test('channels card copies the username', () => must(channels.includes("copy: 'tutorpro_english'") && channels.includes("handle: 'tutorpro_english'"), 'kakao entry not updated'))
test('channels card keeps the phone fallback in its copy line', () => must(channels.includes('+63 962 528 4849'), 'phone fallback dropped'))
test('WeChat channel untouched', () => must(channels.includes("copy: 't_cora'"), 'wechat channel changed'))

const css = readFileSync('public/assets/pages.css', 'utf8')
test('Kakao icon styled for contrast', () => must(css.includes('.ct-channel__icon--kk') && css.includes('#3c2a08'), 'kakao icon style missing'))

if (checks.fail) {
  console.log(`\nFAILURES (${checks.fail}):`)
  failures.forEach((f) => console.log(' - ' + f))
  process.exit(1)
}
console.log(`\nAll ${checks.pass} checks passed.`)
