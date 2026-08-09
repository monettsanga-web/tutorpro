import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1000} })
const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
const calls=[]
p.on('response', r=>{ const u=r.url(); if(u.includes('supabase.co')) calls.push(u.replace(/.*supabase\.co/,'').split('?')[0]) })

await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p.evaluate(()=>{
  const id='test-student-1'
  const learner={id:'l1',name:'Test Child',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([{id,role:'student',status:'active',parentName:'Test Parent',email:'t@example.com',loginId:'t@example.com',authProvider:'email',child:learner,children:[learner],referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]},createdAt:new Date().toISOString()}]))
  sessionStorage.setItem('tutorpro_session_v2', id)
  localStorage.setItem('tutorpro_bookings_v1', JSON.stringify([{id:'b1',studentId:id,teacherId:'t1',teacherName:'Teacher M',learnerName:'Test Child',date:'2026-08-20',time:'10:00',duration:25,status:'confirmed',createdAt:new Date().toISOString()}]))
})
await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(2000)
await p.locator('button.button--primary:has-text("My dashboard")').first().click()
await p.waitForTimeout(5000)

ok(await p.locator('[class*="portal"]').count()>0, 'student dashboard opens')
ok(calls.some(u=>u.includes('get_public_teachers')), 'teacher directory IS still fetched on dashboard open (booking still possible)')
ok(calls.filter(u=>u==='/rest/v1/profiles').length>=1, 'profiles still sync on open')
ok(calls.filter(u=>u==='/rest/v1/bookings').length>=1, 'bookings still sync on open')

const txt = await p.locator('body').innerText()
ok(txt.includes('Test Child'), 'learner data renders')

// booking list still shows the lesson
await p.locator('text=My lessons').first().click(); await p.waitForTimeout(2500)
ok((await p.locator('body').innerText()).includes('Teacher M'), 'booking still visible in My lessons')
ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
