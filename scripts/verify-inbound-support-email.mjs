import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1000} })
const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
const notify=[]
// stub the whole support backend so we can watch the calls
await p.route('**/rest/v1/rpc/create_support_conversation', r=>r.fulfill({status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*'}, body:JSON.stringify({conversationId:'c1',accessToken:'tok1'})}))
await p.route('**/rest/v1/rpc/get_support_thread*', r=>r.fulfill({status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*'}, body:JSON.stringify({id:'c1',status:'open',messages:[]})}))
await p.route('**/rest/v1/rpc/send_support_message', r=>r.fulfill({status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*'}, body:JSON.stringify({ok:true})}))
p.on('request', r=>{
  if (r.url().includes('/functions/v1/support-notification')) {
    try { notify.push(JSON.parse(r.postData()||'{}')) } catch { notify.push({}) }
  }
})

await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p.waitForTimeout(1500)
await p.locator('.support-launcher').first().click({force:true})
await p.waitForSelector('.support-start', { timeout:10000 }); await p.waitForTimeout(800)

await p.locator('.support-start input').nth(0).fill('Maria Santos')
await p.locator('.support-start input[type="email"]').fill('maria@example.com')
await p.locator('.support-start textarea').fill('Hello, can we move Friday class?')
await p.locator('.support-start button[type="submit"]').click()
// The alert is fired with `void` after the thread reloads, so wait for the
// request itself rather than guessing a delay.
await p.waitForRequest(r=>r.url().includes('/functions/v1/support-notification'), { timeout: 15000 })
  .catch(()=>{})
await p.waitForTimeout(500)

ok(notify.length >= 1, `admin is emailed when a parent writes in (${notify.length} call(s))`)
if (notify.length) {
  ok(notify[0].conversationId === 'c1', 'the conversation id is passed: '+notify[0].conversationId)
  ok(notify[0].direction === 'to-admin', 'marked as going TO the admin: '+notify[0].direction)
  ok(String(notify[0].messageBody||'').includes('Friday'), 'the message text is quoted: '+JSON.stringify(notify[0].messageBody))
}
// --- a REPLY must also notify ---
const before = notify.length
await p.locator('.support-reply textarea').fill('One more thing about payment.')
await p.locator('.support-reply button[type="submit"]').click()
await p.waitForTimeout(2500)
ok(notify.length > before, `replies notify the admin too (${notify.length - before} more)`)
ok(String(notify[notify.length-1]?.messageBody||'').includes('payment'), 'reply text is quoted')

// --- a FAILED email must NOT break sending ---
const p2 = await b.newPage({ viewport:{width:1440,height:1000} })
const errs2=[]; p2.on('pageerror',e=>errs2.push(String(e)))
await p2.route('**/rest/v1/rpc/create_support_conversation', r=>r.fulfill({status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*'}, body:JSON.stringify({conversationId:'c2',accessToken:'tok2'})}))
await p2.route('**/rest/v1/rpc/get_support_thread*', r=>r.fulfill({status:200,contentType:'application/json',
  headers:{'access-control-allow-origin':'*'}, body:JSON.stringify({id:'c2',status:'open',messages:[{id:'m1',sender:'parent',body:'Saved anyway',createdAt:new Date().toISOString()}]})}))
await p2.route('**/functions/v1/support-notification', r=>r.fulfill({status:500,contentType:'application/json',
  headers:{'access-control-allow-origin':'*'}, body:JSON.stringify({error:'provider down'})}))
await p2.goto('http://localhost:4173/', { waitUntil:'networkidle' }); await p2.waitForTimeout(1500)
await p2.locator('.support-launcher').first().click({force:true})
await p2.waitForSelector('.support-start'); await p2.waitForTimeout(700)
await p2.locator('.support-start input').nth(0).fill('Test Parent')
await p2.locator('.support-start input[type="email"]').fill('t@example.com')
await p2.locator('.support-start textarea').fill('Saved anyway')
await p2.locator('.support-start button[type="submit"]').click()
await p2.waitForTimeout(3000)
ok(await p2.locator('.support-start').count()===0, 'a failed email does not block the conversation opening')
ok((await p2.locator('.support-error').innerText().catch(()=>'')) === '', 'no scary error shown to the parent')
ok(errs2.length===0, 'no JS errors when the email fails')
await p2.close()

ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
