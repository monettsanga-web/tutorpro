import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1000} })
const errs=[]; p.on('pageerror', e=>errs.push(String(e)))
const media=[]
await p.addInitScript(()=>{ window.__media=[]
  const n=navigator.mediaDevices; if(n){ n.getUserMedia=()=>{window.__media.push('gum');return Promise.reject(new Error('x'))}; n.getDisplayMedia=()=>{window.__media.push('gdm');return Promise.reject(new Error('x'))} }
})

// Seed a local student account with a confirmed booking, so the dashboard
// renders a BookingCard — that is where the classroom button used to live.
await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p.evaluate(()=>{
  const id='test-student-1'
  const learner={id:'l1',name:'Test Child',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([{
    id, role:'student', status:'active', parentName:'Test Parent', email:'t@example.com',
    loginId:'t@example.com', authProvider:'email', child:learner, children:[learner],
    referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]}, createdAt:new Date().toISOString(),
  }]))
  sessionStorage.setItem('tutorpro_session_v2', id)
  localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([{
    id:'b1', studentId:id, teacherId:'teach1', teacherName:'Teacher M', learnerName:'Test Child',
    date:'2026-08-20', time:'10:00', duration:25, status:'confirmed', createdAt:new Date().toISOString(),
    classroomRecordings:[{id:'r1', storagePath:'x/y.webm', size:1000, duration:60}],
  }]))
})
await p.reload({ waitUntil:'networkidle' })
await p.waitForTimeout(2500)
// Session restores to the marketing homepage; the dashboard opens from the
// account menu, exactly as a real parent would reach it.
await p.locator('button.button--primary:has-text("My dashboard")').first().click()
await p.waitForTimeout(3500)

const inPortal = await p.locator('.portal-shell, .portal-main, [class*="portal"]').count()
ok(inPortal>0, 'student dashboard renders after login')

const bodyText = await p.locator('body').innerText()
ok(bodyText.includes('Classroom Coming Soon'), 'shows "Classroom Coming Soon" where the button was')
ok(!bodyText.includes('Enter private classroom'), 'old "Enter private classroom" button is gone')
ok(await p.locator('.tutorpro-classroom-link').count()===0, 'no clickable classroom link rendered')
ok(await p.locator('.booking-recordings').count()===0, 'recording player not rendered (no Storage download)')

const m = await p.evaluate(()=>window.__media||[])
ok(m.length===0, 'no camera/mic requested in the dashboard: '+JSON.stringify(m))
ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,3)))
await p.screenshot({ path:'/tmp/dash-coming-soon.png', fullPage:false })
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
