import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1000} })
const errs=[]; p.on('pageerror',e=>errs.push(String(e)))

// capture what the app sends to Supabase
const posts=[]
await p.route('**/rest/v1/direct_messages*', async (route) => {
  const req = route.request()
  posts.push({ method: req.method(), body: req.postData() })
  await route.fulfill({ status:201, contentType:'application/json',
    headers:{'access-control-allow-origin':'*'},
    body: JSON.stringify({ id:'msg-1', sender_id:'test-teacher-1', recipient_id:'test-student-1',
      body: JSON.parse(req.postData()||'{}').body || 'hi', read_at:null, created_at:new Date().toISOString() }) })
})
let emailCalled = null
await p.route('**/functions/v1/message-notification', async (route) => {
  emailCalled = JSON.parse(route.request().postData()||'{}')
  await route.fulfill({ status:200, contentType:'application/json',
    headers:{'access-control-allow-origin':'*'}, body: JSON.stringify({ delivered:true, to:'parent@example.com' }) })
})

await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p.evaluate(()=>{
  const tid='test-teacher-1', sid='test-student-1'
  const l={id:'l1',name:'Test Child',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([
    {id:tid,role:'teacher',status:'approved',fullName:'Teacher M',email:'m@example.com',loginId:'m@example.com',authProvider:'email',
     teacher:{specialization:'Both Curricula',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}},createdAt:new Date().toISOString()},
    {id:sid,role:'student',status:'active',parentName:'Test Parent',email:'p@example.com',loginId:'p@example.com',authProvider:'email',
     child:l,children:[l],referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]},createdAt:new Date().toISOString()},
  ]))
  sessionStorage.setItem('tutorpro_session_v2', tid)
  localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([{id:'b1',studentId:sid,teacherId:tid,teacherName:'Teacher M',
    learnerName:'Test Child',learnerId:'l1',date:'2026-09-20',time:'10:00',duration:25,status:'pending',focus:'Reading comprehension',
    createdAt:new Date().toISOString()}]))
})
await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(2500)
await p.locator('button.button--primary:has-text("My dashboard")').first().click(); await p.waitForTimeout(3500)

// open a chat from a booking card
const chatBtn = p.locator('button:has-text("Message"), button[title*="hat" i], .booking-chat-button').first()
const opened = await chatBtn.count()
if (opened) { await chatBtn.click({force:true}); await p.waitForTimeout(1500) }
ok(await p.locator('.direct-chat-dialog').count()===1, 'chat dialog opens')
const dialogText = await p.locator('.direct-chat-dialog').innerText()
const hasMessages = !dialogText.includes('No messages yet')
ok(hasMessages || dialogText.includes('emailed whenever you send'),
   hasMessages ? 'thread already has messages (empty-state hint not applicable)'
               : 'the dialog tells you the recipient gets an email')

await p.locator('.direct-chat-dialog input[type="text"]').fill('Hello, quick note about the lesson.')
await p.locator('.direct-chat-dialog button[type="submit"]').click()
await p.waitForTimeout(2500)

ok(posts.some(x=>x.method==='POST'), `message saved to the database (${posts.length} write(s))`)
ok(posts.some(x=>(x.body||'').includes('Hello, quick note')), 'the real text is what gets saved')
ok(emailCalled && emailCalled.messageId, 'email function called with a messageId: '+JSON.stringify(emailCalled))
ok(!JSON.stringify(emailCalled||{}).includes('Hello, quick note'),
   'the email call sends only an id, never the raw text (no spam relay)')
const notice = await p.locator('.direct-chat-dialog [role="status"]').innerText().catch(()=>'')
ok(/emailed/i.test(notice), 'sender is told the email went: '+JSON.stringify(notice))
ok((await p.locator('.direct-chat-dialog').innerText()).includes('Hello, quick note'), 'message appears in the thread')
ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
await p.locator('.direct-chat-dialog').screenshot({ path:'/tmp/dm.png' })
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
