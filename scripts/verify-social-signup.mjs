import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()

// ---- Case 1: REAL project state (all providers off) -> must NOT show live buttons
{
  const p = await b.newPage({ viewport:{width:1280,height:1000} })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.locator('.header-actions a:has-text("Student registration"), .header-actions button:has-text("Student registration")').first().click()
  await p.waitForSelector('.social-signup', { timeout: 8000 })
  await p.waitForTimeout(2500)
  const tiles = p.locator('.social-tile')
  ok(await tiles.count()===4, 'four provider buttons rendered: '+await tiles.count())
  const labels = await p.locator('.social-tile__text strong').allTextContents()
  ok(JSON.stringify(labels)===JSON.stringify(['Facebook','KakaoTalk','Naver','QQ']), 'labels: '+labels.join(', '))
  const ready = await p.locator('.social-tile.is-ready').count()
  const pend  = await p.locator('.social-tile.is-pending').count()
  ok(ready===0 && pend===4, `real project has all providers off -> 0 live, 4 marked pending (got ${ready}/${pend})`)
  ok(await p.locator('.social-signup__note').first().isVisible(), 'a note explains the email form still works')
  // clicking a pending tile must reveal setup steps, NOT navigate
  const before = p.url()
  await tiles.nth(2).click(); await p.waitForTimeout(400)
  ok(p.url()===before, 'clicking a not-ready provider does not navigate to an error page')
  ok(await p.locator('.social-setup').isVisible(), 'setup steps shown instead')
  const steps = await p.locator('.social-setup li').allTextContents()
  ok(steps.some(s=>s.includes('nid.naver.com/oauth2.0/authorize')), 'Naver steps carry the real authorize endpoint')
  ok(steps.some(s=>s.includes('supabase.co/auth/v1/callback')), 'steps carry the exact callback URL')
  ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
  await p.screenshot({ path:'/tmp/social-real.png' })
  await p.close()
}

// ---- Case 2: pretend Facebook + Kakao are enabled -> buttons must go live
{
  const p = await b.newPage({ viewport:{width:1280,height:1000} })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  await p.route('**/auth/v1/settings*', (route)=>route.fulfill({
    status:200, contentType:'application/json',
    headers:{'access-control-allow-origin':'*'},
    body: JSON.stringify({ external:{ facebook:true, kakao:true, google:false } }) }))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.locator('.header-actions a:has-text("Student registration"), .header-actions button:has-text("Student registration")').first().click()
  await p.waitForSelector('.social-signup')
  await p.waitForTimeout(2500)
  ok(await p.locator('.social-tile--facebook.is-ready').count()===1, 'Facebook goes live when the project enables it')
  ok(await p.locator('.social-tile--kakao.is-ready').count()===1, 'Kakao goes live when the project enables it')
  ok(await p.locator('.social-tile--naver.is-pending').count()===1, 'Naver stays pending (still not configured)')
  ok(await p.locator('.social-tile--qq.is-pending').count()===1, 'QQ stays pending (still not configured)')
  ok((await p.locator('.social-signup__note--safe').textContent()).includes('never see your password'), 'privacy reassurance shown when live')
  // Motion: hover must produce a real 3D matrix
  const tile = p.locator('.social-tile--facebook')
  const box = await tile.boundingBox()
  await p.mouse.move(box.x+box.width*0.8, box.y+box.height*0.3, {steps:6}); await p.waitForTimeout(600)
  const t = await p.evaluate(()=>{
    const el=document.querySelector('.social-tile--facebook')
    return { tx:el.style.getPropertyValue('--tilt-x'), tf:getComputedStyle(el).transform,
             logo:getComputedStyle(el.querySelector('.social-tile__logo')).transform }
  })
  ok(t.tx!=='' && t.tx!=='0', 'pointer published to CSS: --tilt-x='+t.tx)
  ok(t.tf.startsWith('matrix3d'), '3D tilt applied: '+t.tf.slice(0,26))
  const rot = Number(t.tf.replace('matrix3d(','').split(',')[2])
  ok(Math.abs(rot)>0.005, 'tilt carries real rotation, not identity: '+rot.toFixed(4))
  ok(t.logo.startsWith('matrix3d'), 'logo lifts on its own plane')
  // clicking a LIVE tile must attempt a real redirect to the provider
  let navigated=''
  await p.route('**/auth/v1/authorize*', (route)=>{ navigated=route.request().url(); route.abort() })
  await tile.click(); await p.waitForTimeout(1500)
  ok(navigated.includes('provider=facebook'), 'clicking Facebook really calls authorize: '+navigated.slice(0,80))
  ok(decodeURIComponent(navigated).includes('social=1'), 'redirect_to carries the return marker')
  ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
  await p.screenshot({ path:'/tmp/social-live.png' })
  await p.close()
}

// ---- Case 3: mobile layout + reduced motion
{
  const p = await b.newPage({ viewport:{width:390,height:900}, isMobile:true, hasTouch:true })
  await p.route('**/auth/v1/settings*', (route)=>route.fulfill({ status:200, contentType:'application/json',
    headers:{'access-control-allow-origin':'*'}, body: JSON.stringify({ external:{ facebook:true, kakao:true } }) }))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.locator('button:has-text("Book free class")').first().click()
  await p.waitForSelector('.social-signup'); await p.waitForTimeout(2200)
  const cols = await p.evaluate(()=>getComputedStyle(document.querySelector('.social-signup__row')).gridTemplateColumns)
  ok(cols.split(' ').length===1, 'mobile stacks to one column: '+cols)
  const over = await p.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)
  ok(over<=2, 'no horizontal overflow on mobile: '+over)
  await p.screenshot({ path:'/tmp/social-mobile.png' })
  await p.close()

  const rm = await b.newPage({ viewport:{width:1280,height:1000}, reducedMotion:'reduce' })
  await rm.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await rm.locator('.header-actions a:has-text("Student registration"), .header-actions button:has-text("Student registration")').first().click()
  await rm.waitForSelector('.social-tile'); await rm.waitForTimeout(1200)
  const anim = await rm.evaluate(()=>getComputedStyle(document.querySelector('.social-tile')).animationName)
  ok(anim==='none', 'reduced motion disables the deal-in animation: '+anim)
  await rm.close()
}
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
