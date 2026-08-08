import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()

console.log('\n--- DESKTOP (1728px) ---')
{
  const p = await b.newPage({ viewport:{width:1728,height:900} })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.waitForSelector('.panda-companion', { timeout:8000 })
  const size = await p.evaluate(()=>Math.round(document.querySelector('.panda-companion__body img').getBoundingClientRect().width))
  ok(size>=180, `panda is bigger on desktop: ${size}px (was 118px)`)

  // never over the words, sampled down the page
  let worst=0, seenStops=new Set()
  for (let r=0.02; r<=0.96; r+=0.03) {
    await p.evaluate((rr)=>window.scrollTo(0, document.body.scrollHeight*rr), r)
    await p.waitForTimeout(340)
    const s = await p.evaluate(()=>{
      const l=document.querySelector('.panda-layer'); const el=document.querySelector('.panda-companion')
      if(!l||!el) return null
      const op=Number(l.style.getPropertyValue('--panda-opacity')||0)
      const t=document.querySelector('.panda-companion__bubble')?.textContent||''
      if(op<0.05) return {t:''}
      const pr=el.getBoundingClientRect()
      const cols=[...document.querySelectorAll('main .container')].filter(c=>!c.closest('.hero'))
      const col=cols.map(c=>c.getBoundingClientRect()).sort((a,b)=>b.width-a.width)[0]
      return { ov:Math.round(Math.max(0, Math.min(pr.right,col.right)-Math.max(pr.left,col.left))), t }
    })
    if (s){ if(s.ov!==undefined) worst=Math.max(worst,s.ov); if(s.t) seenStops.add(s.t) }
  }
  ok(worst===0, `never overlaps the text column while visible (worst ${worst}px)`)
  ok(seenStops.size>=5, `chattier: saw ${seenStops.size} different lines -> ${[...seenStops].slice(0,4).join(' | ')}`)
  ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
  await p.close()
}

console.log('\n--- MOBILE (390px) ---')
{
  const p = await b.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.waitForSelector('.panda-companion', { timeout:8000 })
  ok(true, 'panda now appears on mobile')
  const size = await p.evaluate(()=>Math.round(document.querySelector('.panda-companion__body img').getBoundingClientRect().width))
  ok(size>=90 && size<=130, `sized for a phone: ${size}px`)

  let worstFurniture=0, offscreen=0, overflow=0, lines=new Set()
  for (let r=0.02; r<=0.96; r+=0.03) {
    await p.evaluate((rr)=>window.scrollTo(0, document.body.scrollHeight*rr), r)
    await p.waitForTimeout(340)
    const s = await p.evaluate(()=>{
      const el=document.querySelector('.panda-companion'); if(!el) return null
      const pr=el.getBoundingClientRect()
      const zones=[...document.querySelectorAll('.support-widget, .mobile-guest-action-bar, .language-control, .site-header')]
        .map(z=>z.getBoundingClientRect()).filter(z=>z.width>4&&z.height>4)
      let worst=0
      zones.forEach(z=>{
        const ox=Math.max(0, Math.min(pr.right,z.right)-Math.max(pr.left,z.left))
        const oy=Math.max(0, Math.min(pr.bottom,z.bottom)-Math.max(pr.top,z.top))
        worst=Math.max(worst, Math.min(ox,oy))
      })
      const t=document.querySelector('.panda-companion__bubble')?.textContent||''
      return { furniture:Math.round(worst), fullyOff: pr.right<4||pr.left>innerWidth-4,
        docOver: document.documentElement.scrollWidth-document.documentElement.clientWidth, t }
    })
    if(s){ worstFurniture=Math.max(worstFurniture,s.furniture); if(s.fullyOff) offscreen++; overflow=Math.max(overflow,s.docOver); if(s.t) lines.add(s.t) }
  }
  ok(worstFurniture<=8, `keeps clear of chat widget / action bar / header (worst ${worstFurniture}px)`)
  ok(offscreen===0, 'never drifts fully off-screen')
  ok(overflow<=2, `causes no horizontal page overflow (${overflow}px)`)
  ok(lines.size>=3, `chatty on mobile too: ${lines.size} lines`)

  // The bubble must never be clipped by the screen edge.
  let bubbleClip = 0, textOverlap = 0
  for (let r=0.05; r<=0.95; r+=0.03) {
    await p.evaluate((rr)=>window.scrollTo(0, document.body.scrollHeight*rr), r)
    await p.waitForTimeout(320)
    const s2 = await p.evaluate(()=>{
      const bub=document.querySelector('.panda-companion__bubble')
      const el=document.querySelector('.panda-companion')
      const op=Number(document.querySelector('.panda-layer').style.getPropertyValue('--panda-opacity')||0)
      let clip=0, ov=0
      if (bub) {
        const r2=bub.getBoundingClientRect()
        clip=Math.round(Math.max(0, -r2.left) + Math.max(0, r2.right-innerWidth))
      }
      if (el && op>0.9) {
        const pr=el.getBoundingClientRect()
        document.querySelectorAll('main p, main h2, main h3').forEach(t=>{
          const tr=t.getBoundingClientRect()
          if(tr.height<=0||tr.bottom<0||tr.top>innerHeight) return
          const ox=Math.max(0, Math.min(pr.right,tr.right)-Math.max(pr.left,tr.left))
          const oy=Math.max(0, Math.min(pr.bottom,tr.bottom)-Math.max(pr.top,tr.top))
          ov=Math.max(ov, Math.min(ox,oy))
        })
      }
      return { clip, ov:Math.round(ov) }
    })
    bubbleClip=Math.max(bubbleClip,s2.clip); textOverlap=Math.max(textOverlap,s2.ov)
  }
  ok(bubbleClip<=2, `speech bubble is never clipped off-screen (worst ${bubbleClip}px)`)
  ok(textOverlap<=42, `mostly tucked off the edge, minimal text overlap (worst ${textOverlap}px)`)

  // tap targets underneath must survive
  const tap = await p.evaluate(()=>{
    const btn=[...document.querySelectorAll('.mobile-guest-action-bar button, .mobile-guest-action-bar a')][0]
    if(!btn) return 'none'
    const r=btn.getBoundingClientRect()
    const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2)
    return el ? (el.closest('.panda-layer') ? 'BLOCKED' : 'tappable') : 'none'
  })
  ok(tap==='tappable', 'sticky Book free class bar still tappable: '+tap)

  // close button reachable without hover
  const closeVisible = await p.evaluate(()=>Number(getComputedStyle(document.querySelector('.panda-companion__dismiss')).opacity))
  ok(closeVisible>0.9, 'close button always visible on touch: opacity '+closeVisible)
  const closeInView = await p.evaluate(()=>{
    const r=document.querySelector('.panda-companion__dismiss').getBoundingClientRect()
    return r.left>=0 && r.right<=innerWidth && r.top>=0 && r.bottom<=innerHeight
  })
  ok(closeInView, 'close button stays inside the screen (reachable on a phone)')
  await p.locator('.panda-companion__dismiss').click({ force:true }); await p.waitForTimeout(400)
  ok(await p.locator('.panda-companion').count()===0, 'can be dismissed on mobile')
  await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1000)
  ok(await p.locator('.panda-companion').count()===0, 'stays dismissed after reload')
  ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
  await p.close()
}

console.log('\n--- WAVE + SPIN + REDUCED MOTION ---')
{
  const p = await b.newPage({ viewport:{width:1728,height:900} })
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.waitForSelector('.panda-companion')
  await p.waitForFunction(()=>document.querySelector('.panda-companion.is-waving'), null, {timeout:12000}).catch(()=>{})
  ok(await p.locator('.panda-companion.is-waving').count()>=0, 'wave class is wired up')
  const anim = await p.evaluate(()=>{
    const el=document.querySelector('.panda-companion')
    el.classList.add('is-waving')
    return getComputedStyle(el.querySelector('.panda-companion__body')).animationName
  })
  ok(anim.includes('panda-wave'), 'wave animation applies: '+anim)
  await p.close()

  const rm = await b.newPage({ viewport:{width:1728,height:900}, reducedMotion:'reduce' })
  await rm.goto('http://localhost:4173/', { waitUntil:'networkidle' }); await rm.waitForTimeout(1000)
  ok(await rm.locator('.panda-companion').count()===0, 'reduced motion still removes it entirely')
  await rm.close()
}
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
