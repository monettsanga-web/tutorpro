import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()

for (const [w,h,label] of [[390,844,'phone'],[1440,900,'desktop']]) {
  const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:w<900, hasTouch:w<900 })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.evaluate(()=>{
    const id='s1'; const l={id:'l1',name:'Test Child',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]}
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([{id,role:'student',status:'active',parentName:'Test Parent',email:'p@e.com',loginId:'p@e.com',authProvider:'email',child:l,children:[l],referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]},createdAt:new Date().toISOString()}]))
    sessionStorage.setItem('tutorpro_session_v2', id)
  })
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(1800)
  await p.locator('.support-launcher').first().click({force:true}); await p.waitForTimeout(2200)

  const r = await p.evaluate(()=>{
    const ta=document.querySelector('.support-start textarea')
    const send=[...document.querySelectorAll('.support-start button')].find(x=>x.type==='submit')
    const det=document.querySelector('.support-ai-card--collapsed')
    const panel=document.querySelector('.support-panel')
    return { ta: ta?Math.round(ta.getBoundingClientRect().top):null,
             sendVisible: send?send.getBoundingClientRect().bottom<=innerHeight:false,
             aiCollapsed: det?!det.open:false,
             panelInView: panel?panel.getBoundingClientRect().bottom<=innerHeight+1:false }
  })
  ok(r.sendVisible, `${label}: Start conversation button visible without scrolling`)
  ok(r.aiCollapsed, `${label}: AI assistant starts collapsed`)
  ok(r.panelInView, `${label}: whole panel fits on screen`)

  // the AI must still work when opened
  await p.locator('.support-ai-card--collapsed summary').click()
  await p.waitForTimeout(500)
  ok(await p.locator('.support-ai-topics button').count() > 0, `${label}: AI topics still available when expanded`)
  // and expanding it must NOT submit the outer form
  await p.locator('.support-ai-topics button').first().click()
  await p.waitForTimeout(900)
  ok(await p.locator('.support-start').count()===1, `${label}: clicking an AI topic does not accidentally start a conversation`)
  ok(await p.locator('.support-ai-answer').count()===1, `${label}: AI still answers`)
  ok(errs.length===0, `${label}: no JS errors ${JSON.stringify(errs.slice(0,2))}`)
  await p.close()
}
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
