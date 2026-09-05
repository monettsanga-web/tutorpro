import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const pages = ['online-maths-tutor-for-kids.html','online-science-tutor-for-kids.html','online-ict-computing-classes-for-kids.html']
for (const slug of pages) {
  for (const [w,h,label] of [[1280,900,'desktop'],[390,844,'mobile']]) {
    const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:w<500 })
    const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
    const r = await p.goto(`http://localhost:4173/${slug}`, { waitUntil:'networkidle' })
    ok(r.status()===200, `${slug} @${label}: HTTP ${r.status()}`)
    const info = await p.evaluate(()=>({
      h1: document.querySelectorAll('h1').length,
      title: document.title,
      canonical: document.querySelector('link[rel=canonical]')?.href,
      robots: document.querySelector('meta[name=robots]')?.content,
      cssLoaded: getComputedStyle(document.body).backgroundColor,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      internalLinks: [...document.querySelectorAll('a[href^="/"]')].length,
    }))
    ok(info.h1===1, `${slug} @${label}: exactly one H1`)
    ok(/index, follow/.test(info.robots||''), `${slug} @${label}: indexable`)
    ok(info.canonical?.includes(slug), `${slug} @${label}: self-canonical`)
    ok(info.overflow<=2, `${slug} @${label}: no sideways scroll (${info.overflow}px)`)
    ok(info.internalLinks>=6, `${slug} @${label}: ${info.internalLinks} internal links`)
    ok(errs.length===0, `${slug} @${label}: no JS errors`)
    if (label==='desktop' && slug.includes('maths')) await p.screenshot({ path:'/tmp/seo-maths.png', fullPage:false })
    await p.close()
  }
}
// homepage must link to them
const p = await b.newPage({ viewport:{width:1280,height:900} })
await p.goto('http://localhost:4173/', { waitUntil:'networkidle' }); await p.waitForTimeout(1500)
const linked = await p.evaluate(()=>['online-maths-tutor-for-kids','online-science-tutor-for-kids','online-ict-computing-classes-for-kids']
  .filter(s=>document.querySelector(`a[href*="${s}"]`)).length)
ok(linked===3, `homepage links to all 3 subject pages (${linked}/3)`)
await p.close()
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
