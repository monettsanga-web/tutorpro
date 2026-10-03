/**
 * The admin support thread is a docked popup, and it works on a phone.
 *
 * WHAT IT REPLACED
 * ----------------
 * `.support-inbox` was a fixed `320px 1fr` grid, 650px tall. On a phone
 * that stacked into a 330px conversation list ABOVE a 540px thread, so
 * reading a reply meant scrolling past the whole list and the box you type
 * into sat at the bottom of a very long page. On desktop an empty
 * right-hand pane took half the screen whenever nothing was selected.
 *
 * THE TRAP THIS CAUGHT
 * --------------------
 * The panel is rendered OUTSIDE .portal-view on purpose. That element
 * carries `transform: matrix(1,0,0,1,0,0)` and `filter: blur(0px)` from the
 * motion layer — identity values that change nothing visually, but ANY
 * transform or filter other than `none` makes an element the containing
 * block for its `position: fixed` descendants. Nested inside, the panel
 * measured itself against .portal-view: on a 390px phone it came out 366px
 * wide and hung 148px BELOW the bottom of the screen. The assertions below
 * are written against the viewport for exactly that reason.
 */
const SANDBOX='/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const { chromium } = await import('playwright-core').catch(()=>import(SANDBOX))
let pass = 0, fail = 0
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok  ' : 'FAIL  ') + m) }
const BASE = process.env.BASE || 'http://127.0.0.1:4173'
const ADMIN='11111111-1111-4111-8111-111111111111'
const accounts=[{id:ADMIN,role:'admin',status:'active',parentName:'Monett',fullName:'Monett',email:'admin@tutorpro.site',loginId:'admin@tutorpro.site'}]
const CONVS=[
 {id:'c1',parent_name:'Maria Santos',email:'maria@gmail.com',language:'en',status:'open',updated_at:new Date().toISOString(),unread_count:2,last_message:'Is the first class really free?'},
 {id:'c2',parent_name:'Teacher M',email:'teacherm@gmail.com',language:'en',status:'open',updated_at:new Date().toISOString(),unread_count:0,last_message:'Thanks!'},
]
const THREAD={id:'c1',parentName:'Maria Santos',email:'maria@gmail.com',language:'en',status:'open',messages:[
 {id:'m1',sender:'parent',body:'Hello, is the first class really free?',created_at:new Date().toISOString()},
 {id:'m2',sender:'admin',body:'Yes — a full 25-minute lesson, no card needed.',created_at:new Date().toISOString()},
]}
const b=await chromium.launch({args:['--no-sandbox','--disable-dev-shm-usage']})
for(const [w,h,tag] of [[1440,950,'desktop'],[390,844,'phone']]){
  const p=await b.newPage({viewport:{width:w,height:h},isMobile:w<700,hasTouch:w<700})
  await p.route('**/paypal.com/**',r=>r.abort()); await p.route('**/*.{mp4,webm}',r=>r.abort())
  await p.route('**/auth/v1/**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({id:ADMIN})}))
  // Playwright matches routes in REVERSE registration order, so the
  // catch-all has to be registered FIRST or it swallows the specific ones.
  await p.route('**/rest/v1/**',r=>r.fulfill({status:404,contentType:'application/json',body:'{"message":"offline"}'}))
  await p.route('**/rest/v1/rpc/get_admin_support_conversations**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(CONVS)}))
  await p.route('**/rest/v1/rpc/get_admin_support_thread**',r=>r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(THREAD)}))
  await p.goto(BASE+'/',{waitUntil:'domcontentloaded'})
  await p.evaluate(`sessionStorage.setItem('tutorpro_ip_timezone','Asia/Manila');localStorage.setItem('tutorpro_accounts_v2',${JSON.stringify(JSON.stringify(accounts))});localStorage.setItem('tutorpro_session_v2','${ADMIN}');`)
  await p.reload({waitUntil:'domcontentloaded'}); await p.waitForTimeout(2400)
  const e=p.locator('button:has-text("My dashboard"):visible').first()
  if(await e.count()) await e.click(); else { const m=p.locator('.menu-button'); if(await m.count()){await m.click();await p.waitForTimeout(400)} await p.locator('button:has-text("My dashboard"):visible').first().click() }
  await p.waitForSelector('.portal-nav',{timeout:20000})
  const menu=p.locator('.portal-menu'); if(await menu.count()&&await menu.first().isVisible()){await menu.first().click();await p.waitForTimeout(350)}
  await p.locator('.portal-nav button:has-text("support")').first().click(); await p.waitForTimeout(1200)
  const scrim=p.locator('.portal-scrim'); if(await scrim.count()&&await scrim.first().isVisible()){await scrim.first().click();await p.waitForTimeout(300)}
  await p.evaluate("document.querySelectorAll('.sync-health-banner,.portal-error').forEach(e=>e.remove())")
  await p.waitForTimeout(600)
  const info=await p.evaluate(`(()=>{const t=document.querySelector('.support-admin-thread');const inbox=document.querySelector('.support-inbox');
    return {hasInbox:!!inbox, chatting:inbox?inbox.className.includes('chatting'):null, hasThread:!!t,
      pos:t?getComputedStyle(t).position:null, rect:t?{w:Math.round(t.getBoundingClientRect().width),h:Math.round(t.getBoundingClientRect().height),r:Math.round(innerWidth-t.getBoundingClientRect().right),b:Math.round(innerHeight-t.getBoundingClientRect().bottom)}:null,
      listCount:document.querySelectorAll('.support-conversation-list > div > button').length, sideScroll:document.documentElement.scrollWidth-document.documentElement.clientWidth}})()`)
  const expectDocked = tag === 'desktop'
  ok(info.listCount === 2, `${tag}: both conversations are listed (${info.listCount})`)
  ok(info.hasThread, `${tag}: opening one shows the thread`)
  ok(info.pos === 'fixed', `${tag}: the thread is pinned to the viewport, not a second column`)
  ok(info.sideScroll <= 1, `${tag}: no sideways scrolling (${info.sideScroll}px)`)
  if (expectDocked) {
    ok(info.rect.r > 0 && info.rect.r < 40 && info.rect.b > 0 && info.rect.b < 40,
      `desktop: docked to the bottom-right corner (${info.rect.r}px right, ${info.rect.b}px bottom)`)
    ok(info.rect.w >= 380 && info.rect.w <= 430, `desktop: a panel, not half the page (${info.rect.w}px wide)`)
  } else {
    /* These two are the numbers that were wrong: 366 and -148. */
    ok(info.rect.r === 0 && info.rect.b === 0, `phone: flush to the screen edges (right ${info.rect.r}, bottom ${info.rect.b})`)
    ok(info.rect.w === 390, `phone: full width (${info.rect.w}px)`)
    ok(info.rect.h >= 800, `phone: full height (${info.rect.h}px)`)
  }
  const reach = await p.evaluate(`(()=>{const f=document.querySelector('.support-admin-thread--docked form');const ta=f&&f.querySelector('textarea,input[type=text]');if(!ta)return null;const r=ta.getBoundingClientRect();return {onScreen:r.bottom<=innerHeight+1&&r.top>=0,fontSize:parseFloat(getComputedStyle(ta).fontSize)}})()`)
  ok(reach && reach.onScreen, `${tag}: the reply box is on screen without scrolling`)
  ok(reach && reach.fontSize >= 16, `${tag}: the reply box is at least 16px, so iOS does not zoom the page (${reach && reach.fontSize}px)`)
  /* A REAL Playwright click, not el.click() inside page.evaluate(). The
     programmatic one does not always reach React's handler. */
  const closer = p.locator('.support-admin-dismiss')
  const hasCloser = await closer.count() > 0
  ok(hasCloser, `${tag}: there is a close button`)
  if (hasCloser) {
    await closer.first().click()
    await p.waitForTimeout(900)
  }
  ok(await p.locator('.support-admin-thread--docked').count() === 0, `${tag}: and it closes the panel`)
  await p.close()
}
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
