import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()

// ---- MOBILE / TABLET: banner must be a real, whole, unobscured image ----
for (const [w,h] of [[320,700],[360,740],[390,844],[414,896],[430,932],[768,1024],[899,900]]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:w<900, hasTouch:w<900 })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.waitForTimeout(900)
  const r = await p.evaluate(()=>{
    const img=document.querySelector('.hero__bg'), stage=document.querySelector('.hero__bg-stage')
    const hero=document.querySelector('.hero--banner'), h1=document.querySelector('h1')
    const ib=img.getBoundingClientRect(), hb=h1.getBoundingClientRect()
    const scrim=getComputedStyle(hero,'::after').display
    // do image and headline overlap vertically?
    const overlap = Math.max(0, Math.min(ib.bottom,hb.bottom)-Math.max(ib.top,hb.top))
    return { iw:Math.round(ib.width), ih:Math.round(ib.height), itop:Math.round(ib.top),
      fit:getComputedStyle(img).objectFit, pos:getComputedStyle(stage).position,
      ratio:+(ib.width/ib.height).toFixed(3), overlap:Math.round(overlap), scrim,
      heroH:Math.round(hero.getBoundingClientRect().height),
      h1top:Math.round(hb.top), vw:document.documentElement.clientWidth,
      over:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      ctaTop:Math.round(document.querySelector('.hero__actions a,.hero__actions button').getBoundingClientRect().top) }
  })
  const wide = w<900
  ok(r.iw>=r.vw-2, `${w}px: banner spans full width (${r.iw}/${r.vw})`)
  if (wide) {
    ok(Math.abs(r.ratio-2.279)<0.03, `${w}px: whole banner, true aspect ${r.ratio}`)
    ok(r.overlap===0, `${w}px: headline does not sit on the artwork (overlap ${r.overlap}px)`)
    ok(r.scrim==='none', `${w}px: cream scrim off, photo not washed out`)
    ok(r.itop>=0 && r.itop<200, `${w}px: banner at top of hero (${r.itop}px)`)
    ok(r.ih>120, `${w}px: banner has real height ${r.ih}px (was a 171px sliver behind text)`)
  }
  // 768px/899px carry a 35px/88px overflow that predates this work: measured
  // identically on the stashed baseline build, caused by .premium-ambient-orb
  // and a wide table elsewhere on the page, not by the hero.
  const budget = w>=768 ? 90 : 2
  ok(r.over<=budget, `${w}px: no NEW horizontal overflow (${r.over}px, budget ${budget})`)
  ok(errs.length===0, `${w}px: no JS errors`)
  if (w===390||w===768) await p.screenshot({ path:`/tmp/h-${w}.png`, fullPage:false })
  await p.close()
}

// ---- DESKTOP: must be UNCHANGED (background behaviour retained) ----
for (const [w,h] of [[1280,900],[1440,900]]) {
  const p = await b.newPage({ viewport:{width:w,height:h} })
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.waitForTimeout(900)
  const r = await p.evaluate(()=>{
    const stage=document.querySelector('.hero__bg-stage'), hero=document.querySelector('.hero--banner')
    return { pos:getComputedStyle(stage).position, fit:getComputedStyle(document.querySelector('.hero__bg')).objectFit,
      scrim:getComputedStyle(hero,'::after').display, minH:getComputedStyle(hero).minHeight,
      bg:getComputedStyle(document.querySelector('.hero--banner .hero__content')).backgroundColor,
      radius:getComputedStyle(document.querySelector('.hero--banner .hero__content')).borderRadius,
      orbs:[...document.querySelectorAll('.hero__orb')].filter(o=>getComputedStyle(o).display!=='none').length,
      over:document.documentElement.scrollWidth-document.documentElement.clientWidth }
  })
  ok(r.pos==='absolute', `${w}px desktop: banner still a full-bleed background`)
  ok(r.scrim!=='none', `${w}px desktop: scrim still on`)
  // Headless Chromium reports backdrop-filter as 'none' even when the rule
  // matches, so assert the panel's other properties, which it does report.
  ok(r.bg==='rgba(253, 250, 242, 0.82)' && r.radius==='26px', `${w}px desktop: frosted copy panel intact`)
  ok(r.orbs===3, `${w}px desktop: all 3 depth orbs still there`)
  ok(r.minH!=='0px', `${w}px desktop: hero floor intact (${r.minH})`)
  ok(r.over<=2, `${w}px desktop: no overflow`)
  await p.close()
}
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
