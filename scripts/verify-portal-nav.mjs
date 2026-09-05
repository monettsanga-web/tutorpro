import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const seed = (role) => `
  const id='u1';
  const l={id:'l1',name:'Child',year:'Year 3',curriculum:'Cambridge',accessStatus:'active',achievements:[]};
  const base={id,status:'active',email:'monettsanga@yahoo.com',loginId:'monettsanga@yahoo.com',authProvider:'email',createdAt:new Date().toISOString()};
  const acc='${role}'==='admin'?{...base,role:'admin',fullName:'TutorPro Online English user',parentName:'TutorPro Online English user'}
   :'${role}'==='teacher'?{...base,role:'teacher',status:'approved',fullName:'Teacher M',teacher:{specialization:'Both Curricula',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}}}
   :{...base,role:'student',parentName:'Test Parent',child:l,children:[l],referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]}};
  localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([acc]));
  sessionStorage.setItem('tutorpro_session_v2', id);`

for (const role of ['admin','teacher','student']) {
  for (const [w,h] of [[1440,900],[1280,800]]) {
    const p = await b.newPage({ viewport:{width:w,height:h} })
    const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
    await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
    await p.evaluate(seed(role))
    await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(2200)
    await p.locator('button.button--primary:has-text("My dashboard")').first().click()
    await p.waitForSelector('.portal-nav', { timeout:15000 }); await p.waitForTimeout(2200)
    const r = await p.evaluate(()=>{
      const nav=document.querySelector('.portal-nav'), bar=document.querySelector('.portal-sidebar')
      const main=document.querySelector('.portal-main')
      const items=[...nav.querySelectorAll('button')]
      const br=bar.getBoundingClientRect()
      // every item must be reachable (in the DOM and inside the scroll area)
      const reachable=items.every(x=>x.offsetParent!==null)
      // account block must not overlap the list
      const foot=document.querySelector('.portal-sidebar__foot').getBoundingClientRect()
      const nr=nav.getBoundingClientRect()
      return { groups: nav.querySelectorAll('.portal-nav__group').length,
        items: items.length, reachable,
        overlap: Math.max(0, Math.round(nr.bottom-foot.top)),
        contentClearsSidebar: Math.round(main.getBoundingClientRect().left) >= Math.round(br.right)-1,
        pageOverflow: document.documentElement.scrollWidth-document.documentElement.clientWidth,
        activeCount: nav.querySelectorAll('button.active').length }
    })
    ok(r.groups>=3, `${role} @${w}: nav is grouped into ${r.groups} sections`)
    ok(r.reachable, `${role} @${w}: all ${r.items} items reachable`)
    ok(r.overlap<=1, `${role} @${w}: account block does not overlap the list (${r.overlap}px)`)
    ok(r.contentClearsSidebar, `${role} @${w}: content clears the sidebar`)
    ok(r.pageOverflow<=2, `${role} @${w}: no sideways page scroll (${r.pageOverflow}px)`)
    ok(r.activeCount===1, `${role} @${w}: exactly one active item`)
    ok(errs.length===0, `${role} @${w}: no JS errors`)
    await p.close()
  }
}
// mobile drawer must be untouched
const m = await b.newPage({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true })
await m.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await m.evaluate(seed('admin'))
await m.reload({ waitUntil:'networkidle' }); await m.waitForTimeout(2500)
const mr = await m.evaluate(()=>({ over: document.documentElement.scrollWidth-document.documentElement.clientWidth }))
ok(mr.over<=2, `mobile: no sideways scroll (${mr.over}px)`)
await m.close()
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
