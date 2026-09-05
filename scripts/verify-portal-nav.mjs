import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const seed = (role) => `
  const id='u1';
  const l={id:'l1',name:'Child',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]};
  const base={id,status:'active',email:'a@b.com',loginId:'a@b.com',authProvider:'email',createdAt:new Date().toISOString()};
  const acc = '${role}'==='admin' ? {...base,role:'admin',fullName:'TutorPro Online English user',parentName:'TutorPro Online English user'}
    : '${role}'==='teacher' ? {...base,role:'teacher',status:'approved',fullName:'Teacher M',teacher:{specialization:'Both Curricula',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}}}
    : {...base,role:'student',parentName:'Test Parent',child:l,children:[l],referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]}};
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
  sessionStorage.setItem('tutorpro_session_v2', id);`

for (const role of ['admin','teacher','student']) {
  for (const [w,h] of [[1440,900],[1280,800]]) {
    const p = await b.newPage({ viewport:{width:w,height:h} })
    const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
    await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
    await p.evaluate(seed(role))
    await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(2000)
    const btn=p.locator('button.button--primary:has-text("My dashboard")').first()
    if (await btn.count()) { await btn.click(); await p.waitForTimeout(3000) }
    const r = await p.evaluate(()=>{
      const bar=document.querySelector('.portal-sidebar'); if(!bar) return null
      const nav=document.querySelector('.portal-nav')
      return { barH:Math.round(bar.getBoundingClientRect().height), pct:Math.round(bar.getBoundingClientRect().height/innerHeight*100),
               oneRow:getComputedStyle(bar).flexWrap==='nowrap', navScrolls:nav.scrollWidth>nav.clientWidth,
               overflowX:getComputedStyle(nav).overflowX,
               pageOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth }
    })
    if (!r) { ok(false, `${role} @${w}: portal did not open`); await p.close(); continue }
    ok(r.barH<=95, `${role} @${w}: bar is ${r.barH}px (${r.pct}% of screen) — was 290px/36%`)
    ok(r.oneRow, `${role} @${w}: brand·nav·account on one row`)
    ok(r.pageOverflow<=2, `${role} @${w}: no page-wide sideways scroll (${r.pageOverflow}px)`)
    if (r.navScrolls) ok(r.overflowX==='auto', `${role} @${w}: overflowing nav scrolls instead of wrapping`)
    ok(errs.length===0, `${role} @${w}: no JS errors`)
    await p.close()
  }
}
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
