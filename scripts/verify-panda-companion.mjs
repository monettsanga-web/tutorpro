import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()

// ---- Desktop: the panda exists, flies, banks and talks.
// 1728px: a 1160px column needs a wide window before the panda can clear the
// text at all. At 1440 the gutter is 140px against a 118px panda, so it stays
// faded — correct behaviour, but nothing to assert movement against.
{
  const p = await b.newPage({ viewport:{width:1728,height:900} })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  const bad=[]; p.on('response',r=>{ if(r.url().includes('panda-mascot') && r.status()!==200) bad.push(r.status()) })
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.waitForSelector('.panda-companion', { timeout: 8000 })
  ok(true, 'panda mounts on the homepage')
  ok(bad.length===0, 'mascot image loads (no 404)')
  const img = await p.evaluate(()=>{ const i=document.querySelector('.panda-companion__body img'); return {n:i.naturalWidth+'x'+i.naturalHeight, src:i.getAttribute('src')} })
  ok(img.n!=='0x0', 'image decoded: '+img.n)

  const read = () => p.evaluate(()=>{
    const l=document.querySelector('.panda-layer'); const c=document.querySelector('.panda-companion')
    const r=c.getBoundingClientRect()
    return { x:l.style.getPropertyValue('--panda-left'), y:l.style.getPropertyValue('--panda-y'),
      rot:l.style.getPropertyValue('--panda-rot'), left:Math.round(r.left), top:Math.round(r.top),
      pe:getComputedStyle(l).pointerEvents, z:getComputedStyle(l).zIndex }
  })
  const a = await read()
  ok(a.pe==='none', 'layer never intercepts clicks (pointer-events: '+a.pe+')')

  await p.evaluate(()=>window.scrollTo(0, document.body.scrollHeight*0.30))
  await p.waitForTimeout(1400)
  const bpos = await read()
  await p.evaluate(()=>window.scrollTo(0, document.body.scrollHeight*0.62))
  await p.waitForTimeout(1400)
  const c = await read()
  ok(a.x!==bpos.x || bpos.x!==c.x, `panda flies sideways across scroll: ${a.x} -> ${bpos.x} -> ${c.x}`)
  ok(bpos.top!==a.top || c.top!==bpos.top, `panda moves vertically: ${a.top} -> ${bpos.top} -> ${c.top}`)
  ok(Math.abs(Number(c.rot))>0.01 || Math.abs(Number(bpos.rot))>0.01, `panda banks into turns: rot ${bpos.rot} / ${c.rot}`)

  // THE IMPORTANT ONE: while actually visible, the panda must never sit on the
  // words. Sampled right down the page, not at a single lucky scroll position.
  let worstOverlap = 0
  for (let r=0.02; r<=0.95; r+=0.05) {
    await p.evaluate((rr)=>window.scrollTo(0, document.body.scrollHeight*rr), r)
    await p.waitForTimeout(380)
    const s = await p.evaluate(()=>{
      const l=document.querySelector('.panda-layer'); if(!l) return null
      const el=document.querySelector('.panda-companion'); if(!el) return null
      const op=Number(l.style.getPropertyValue('--panda-opacity')||0)
      if (op < 0.05) return null
      const pr=el.getBoundingClientRect()
      const cols=[...document.querySelectorAll('main .container')].filter(c=>!c.closest('.hero'))
      const col=cols.map(c=>c.getBoundingClientRect()).sort((a,b)=>b.width-a.width)[0]
      return Math.round(Math.max(0, Math.min(pr.right,col.right)-Math.max(pr.left,col.left)))
    })
    if (s !== null) worstOverlap = Math.max(worstOverlap, s)
  }
  ok(worstOverlap === 0, `never overlaps the text column while visible (worst ${worstOverlap}px)`)

  // Speech bubble at a stop. Stops sit inside the windows where the panda is
  // actually out over a margin, so it can never speak while invisible.
  await p.evaluate(()=>window.scrollTo(0, document.body.scrollHeight*0.17))
  // The flight is eased, so it takes a moment to glide out to the margin after
  // a jump. Wait for it to settle rather than sampling mid-glide.
  await p.waitForFunction(
    ()=>Number(document.querySelector('.panda-layer')?.style.getPropertyValue('--panda-opacity')||0) > 0.9,
    null, { timeout: 8000 }).catch(()=>{})
  await p.waitForTimeout(300)
  const said = await p.locator('.panda-companion__bubble').count()
  const bubbleText = said ? await p.locator('.panda-companion__bubble').textContent() : ''
  ok(said===1, 'panda says something at a stop: '+JSON.stringify(bubbleText))
  const opAtStop = await p.evaluate(()=>Number(document.querySelector('.panda-layer').style.getPropertyValue('--panda-opacity')))
  ok(opAtStop>0.85, 'it is fully visible when it speaks (opacity '+opAtStop+')')

  // Poke -> spin. Wait until it is actually faded in first.
  await p.waitForFunction(()=>Number(document.querySelector('.panda-layer').style.getPropertyValue('--panda-opacity'))>0.9, null, {timeout:6000}).catch(()=>{})
  await p.locator('.panda-companion__body').click({ force: true })
  await p.waitForTimeout(300)
  ok(await p.locator('.panda-companion.is-spinning').count()===1, 'clicking the panda makes it spin')
  await p.waitForTimeout(1600)
  ok(await p.locator('.panda-companion.is-spinning').count()===0, 'spin ends on its own')

  // A CTA underneath must still be clickable
  const cta = await p.evaluate(()=>{
    const btns=[...document.querySelectorAll('.button--primary')]
    const b=btns.find(x=>x.getBoundingClientRect().height>0)
    if(!b) return 'none'
    const r=b.getBoundingClientRect()
    const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2)
    return el ? (el.closest('.panda-layer') ? 'BLOCKED' : 'clickable') : 'none'
  })
  ok(cta==='clickable', 'buttons underneath remain clickable: '+cta)

  // Dismiss sticks
  await p.hover('.panda-companion')
  await p.locator('.panda-companion__dismiss').click({ force: true })
  await p.waitForTimeout(400)
  ok(await p.locator('.panda-companion').count()===0, 'dismiss hides the panda')
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(1200)
  ok(await p.locator('.panda-companion').count()===0, 'stays dismissed after reload')
  ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
  await p.close()
}

// ---- Mobile: must not appear at all
{
  const p = await b.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true })
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' }); await p.waitForTimeout(1200)
  ok(await p.locator('.panda-companion').count()===0, 'no panda on phones (no margin to fly in)')
  const over = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
  ok(over<=2, 'mobile still has no horizontal overflow: '+over)
  await p.close()
}

// ---- Reduced motion: must not appear
{
  const p = await b.newPage({ viewport:{width:1440,height:900}, reducedMotion:'reduce' })
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' }); await p.waitForTimeout(1200)
  ok(await p.locator('.panda-companion').count()===0, 'reduced motion removes the panda entirely')
  await p.close()
}
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
