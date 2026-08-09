import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:1000} })
await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p.evaluate(()=>{
  const id='test-student-1'
  const learner={id:'l1',name:'Test Child',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([{id,role:'student',status:'active',parentName:'Test Parent',email:'t@example.com',loginId:'t@example.com',authProvider:'email',child:learner,children:[learner],referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]},createdAt:new Date().toISOString()}]))
  sessionStorage.setItem('tutorpro_session_v2', id)
})
await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(2000)
await p.locator('button.button--primary:has-text("My dashboard")').first().click()
await p.waitForTimeout(3000)
const calls=[]
p.on('response', async r=>{ const u=r.url(); if(!u.includes('supabase.co'))return; let l=0; try{l=(await r.body()).length}catch{}; calls.push({u:u.replace(/.*supabase\.co/,'').split('?')[0],l}) })
console.log('--- 60s IDLE on the student dashboard ---')
await p.waitForTimeout(60000)
const by={}; calls.forEach(c=>{by[c.u]=by[c.u]||{n:0,b:0}; by[c.u].n++; by[c.u].b+=c.l})
console.log('requests:', calls.length, '| bytes:', calls.reduce((a,c)=>a+c.l,0))
Object.entries(by).sort((a,b)=>b[1].n-a[1].n).forEach(([k,v])=>console.log(`  ${String(v.n).padStart(3)}x ${String(v.b).padStart(8)}b  ${k}`))
await b.close()
