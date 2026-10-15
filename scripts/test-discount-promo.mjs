import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const app = read('src/App.jsx')
const styles = read('src/styles.css')
const widget = read('src/SupportChatWidget.jsx')
const events = read('src/supportChatEvents.js')
const entry = read('src/main.jsx')
const prerender = read('scripts/prerender-home.mjs')

let passed = 0
let failed = 0
const check = (condition, message) => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? '  ok  ' : 'FAIL  '}${message}`)
}

const pricingIndex = app.indexOf('<Pricing onBook={openRegistration} />')
const promoIndex = app.indexOf('<DiscountPromo />', pricingIndex)
const faqIndex = app.indexOf('<FAQ onBook={openRegistration} />', promoIndex)
check(pricingIndex >= 0 && promoIndex > pricingIndex && faqIndex > promoIndex,
  'the discount section sits immediately after pricing and before the FAQ')

const componentStart = app.indexOf('function DiscountPromo()')
const componentEnd = app.indexOf('\nfunction FAQ(', componentStart)
const component = app.slice(componentStart, componentEnd)
check(component.includes('Looking for a Special Discount?'), 'the requested headline is present')
check(component.includes('At TutorPro English PH, we believe every child deserves quality English education.'),
  'the requested promotional copy is present')
check(component.includes('Ask About Class Discounts'), 'the CTA uses the requested label')
check(component.includes('href="/contact.html"'), 'a visible fallback links to the existing Contact Us page')
check(component.includes('requestOpenSupportChat(discountQuestion)'), 'the CTA opens the configured website support chat')
check(/eligibility vary[\s\S]*final price before you book/i.test(component),
  'the copy says customer service confirms eligibility and final pricing')
check(!/[$%]\s?\d/.test(component), 'the promotion introduces no discount amounts or percentages')

const prerenderPromoStart = prerender.indexOf("heading: 'Looking for a Special Discount?'")
const prerenderPromoEnd = prerender.indexOf("heading: 'Families in any country, lesson times in your own.'", prerenderPromoStart)
const prerenderPromo = prerender.slice(prerenderPromoStart, prerenderPromoEnd)
check(prerenderPromoStart >= 0 && prerenderPromoEnd > prerenderPromoStart,
  'crawlable homepage content includes the promotion after pricing')
check(prerenderPromo.includes("actionHref: '/contact.html'")
  && /section\.actionText && section\.actionHref/.test(prerender),
  'the crawlable promotion links to the existing Contact Us page')
check(!/[$%]\s?\d/.test(prerenderPromo),
  'the crawlable promotion introduces no discount amounts or percentages')

check(events.includes("'tutorpro:open-support-chat'") && /dispatchEvent\(new CustomEvent/.test(events),
  'the shared support-chat open event is dispatched safely')
check(widget.includes('window.addEventListener(SUPPORT_CHAT_OPEN_EVENT, handleWebsiteOpen)')
  && /setOpen\(true\)/.test(widget), 'the public support widget responds to the CTA event')
check(entry.includes('<SupportChatWidget openOnWebsiteEvent />'),
  'the homepage support launcher is the chat instance wired to the promotion')

check(/@media \(max-width: 700px\)[\s\S]*?\.discount-promo__card/.test(styles)
  && /@media \(max-width: 430px\)[\s\S]*?\.discount-promo__cta[\s\S]*?width: 100%/.test(styles),
  'the promotional layout and CTA adapt for mobile widths')
check(/\.discount-promo__illustration[\s\S]*?animation:[\s\S]*?@media \(prefers-reduced-motion: reduce\)/.test(styles),
  'the illustration animates gently and respects reduced-motion preferences')

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
