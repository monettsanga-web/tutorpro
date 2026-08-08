import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }

const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1280,height:900} })
const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p.locator('#materials').scrollIntoViewIfNeeded()
await p.waitForTimeout(900)

// 1. thumbnail strip gone
ok(await p.locator('.curriculum-thumbnails').count()===0, 'old thumbnail strip removed')
// 2. dots present, 15 of them, inside the panel
const dots = p.locator('.curriculum-dot')
ok(await dots.count()===15, 'dots: '+await dots.count()+' (expect 15)')
ok(await p.locator('.curriculum-carousel .curriculum-dots').count()===1, 'dots live inside the panel')
// 3. nothing below panel that scrolls sideways
// Only elements that can actually SHOW a scrollbar matter. The sheen and the
// screen-reader text overhang their parents by design and are clipped.
const strayScroll = await p.evaluate(()=>{
  const sec=document.querySelector('#materials')
  return [...sec.querySelectorAll('*')].filter(e=>{
    if (e.scrollWidth-e.clientWidth<=4) return false
    const o=getComputedStyle(e).overflowX
    return o==='auto'||o==='scroll'
  }).map(e=>e.className).slice(0,5)
})
ok(strayScroll.length===0, 'nothing can show a scrollbar in the section: '+JSON.stringify(strayScroll))

// 4. direction attribute flips
await p.locator('.curriculum-arrow--next').click(); await p.waitForTimeout(200)
const dNext = await p.getAttribute('.curriculum-carousel','data-direction')
await p.locator('.curriculum-arrow--prev').click(); await p.waitForTimeout(200)
const dPrev = await p.getAttribute('.curriculum-carousel','data-direction')
ok(dNext==='next' && dPrev==='prev', `direction-aware: next=${dNext} prev=${dPrev}`)

// 5. animations actually applied
const anims = await p.evaluate(()=>{
  const g=s=>getComputedStyle(document.querySelector(s)).animationName
  return { copy:g('.curriculum-carousel__copy'), visual:g('.curriculum-carousel__visual'),
           h3:g('.curriculum-carousel__copy h3'), sheen:g('.curriculum-carousel__sheen'),
           aurora:g('.curriculum-aurora i') }
})
ok(anims.copy.startsWith('curriculum-copy-in'), 'copy animation: '+anims.copy)
ok(anims.visual.startsWith('curriculum-image-in'), '3D hinge animation: '+anims.visual)
ok(anims.h3==='curriculum-rise', 'staggered heading: '+anims.h3)
ok(anims.sheen==='curriculum-sheen', 'light sweep: '+anims.sheen)
ok(anims.aurora.startsWith('curriculum-drift'), 'aurora drift: '+anims.aurora)

// 6. pointer tilt produces a real transform
// Playwright's hover() scrolls the element into view, so any box measured
// before it is stale. Settle the scroll first, then measure, then move.
await p.locator('.curriculum-carousel').scrollIntoViewIfNeeded()
await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))))
await p.waitForTimeout(400)
const pb = await p.locator('.curriculum-carousel').boundingBox()
await p.mouse.move(pb.x + pb.width*0.72, pb.y + pb.height*0.4, { steps: 8 })
await p.waitForTimeout(700)
const read = () => p.evaluate(()=>({
  px:getComputedStyle(document.querySelector('.curriculum-carousel')).getPropertyValue('--pointer-x'),
  tilt:getComputedStyle(document.querySelector('.curriculum-book-cover')).transform,
  cover:getComputedStyle(document.querySelector('.curriculum-cover-photo')).transform }))
const t = await read()
ok(t.px.trim()!=='0' && t.px!=='', 'pointer published: --pointer-x='+t.px)
ok(t.tilt.startsWith('matrix3d'), '3D tilt is a real 3D matrix')
// A rotation must actually be present. An identity-ish matrix here is the
// classic symptom of an animation with fill-mode:both outranking the hover.
const rot = Number(t.tilt.replace('matrix3d(','').split(',')[2])
ok(Math.abs(rot) > 0.005, 'tilt carries real rotation, not an identity matrix: '+rot.toFixed(4))
ok(t.cover.startsWith('matrix3d'), 'cover lifts on its own plane')
// Moving the pointer elsewhere must produce a DIFFERENT matrix.
await p.mouse.move(pb.x + pb.width*0.95, pb.y + pb.height*0.85, { steps: 8 })
await p.waitForTimeout(650)
const t2 = await read()
ok(t2.tilt !== t.tilt, 'tilt tracks the pointer (matrix changed on move)')

// 7. autoplay advances then pauses on hover
await p.mouse.move(5,5); await p.waitForTimeout(100)
const before = await p.textContent('.curriculum-carousel__count')
await p.waitForTimeout(6200)
const after = await p.textContent('.curriculum-carousel__count')
ok(before!==after, `autoplay advanced ${before.trim()} -> ${after.trim()}`)
await p.hover('.curriculum-carousel'); await p.waitForTimeout(6200)
const held = await p.textContent('.curriculum-carousel__count')
ok(after===held, 'autoplay pauses on hover: stayed '+held.trim())

// 8. dot click + keyboard
await p.mouse.move(5,5)
await p.locator('.curriculum-dot').nth(11).click(); await p.waitForTimeout(400)
ok((await p.textContent('.curriculum-carousel__count')).includes('12'), 'dot jumps to slide 12')
ok(await p.locator('.curriculum-dot.is-active').count()===1, 'exactly one active dot')
await p.locator('.curriculum-carousel').focus()
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400)
ok((await p.textContent('.curriculum-carousel__count')).includes('13'), 'arrow key advances')

// 9. reduced motion honoured
const p2 = await b.newPage({ viewport:{width:1280,height:900}, reducedMotion:'reduce' })
await p2.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p2.locator('#materials').scrollIntoViewIfNeeded(); await p2.waitForTimeout(600)
const rm = await p2.evaluate(()=>({
  copy:getComputedStyle(document.querySelector('.curriculum-carousel__copy')).animationName,
  aurora:document.querySelector('.curriculum-aurora')?getComputedStyle(document.querySelector('.curriculum-aurora')).display:'gone'
}))
ok(rm.copy==='none', 'reduced motion stops slide animation: '+rm.copy)
ok(rm.aurora==='none', 'reduced motion hides aurora: '+rm.aurora)
const c1 = await p2.textContent('.curriculum-carousel__count')
await p2.waitForTimeout(6200)
ok(c1===await p2.textContent('.curriculum-carousel__count'), 'reduced motion disables autoplay')
await p2.close()

// 10. overflow at three widths
for (const w of [1440,1280,768,390]) {
  const pv = await b.newPage({ viewport:{width:w,height:900} })
  await pv.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await pv.locator('#materials').scrollIntoViewIfNeeded(); await pv.waitForTimeout(700)
  const box = await pv.evaluate(()=>{ const s=document.querySelector('#materials'); const r=s.getBoundingClientRect(); return { over: s.scrollWidth-s.clientWidth, right: Math.round(r.right) } })
  ok(box.over<=3, `${w}px: section overflow ${box.over}px`)
  await pv.locator('#materials').screenshot({ path:`/tmp/cm-${w}.png` })
  await pv.close()
}
ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
