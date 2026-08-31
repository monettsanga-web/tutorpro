import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()

// ---- PUBLIC SITE ----
{
  const p = await b.newPage({ viewport:{width:1440,height:1000} })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.waitForTimeout(1500)
  const body = await p.locator('body').innerText()
  ok(/English/.test(body) && /Maths/.test(body) && /Science/.test(body) && /ICT/.test(body), 'all four subjects appear on the homepage')
  // The eyebrow is text-transform: uppercase, so innerText comes back
  // capitalised; assert on the DOM text rather than the rendered casing.
  const eyebrow = (await p.locator('.eyebrow').first().textContent()).trim()
  ok(eyebrow === 'English · Maths · Science · ICT', 'hero eyebrow lists the subjects: '+eyebrow)
  ok(await p.locator('a[href="#programmes"]:has-text("Subjects")').count()>0, 'nav says Subjects')

  await p.locator('#programmes').scrollIntoViewIfNeeded(); await p.waitForTimeout(900)
  const cards = await p.locator('#programmes .programme-card').count()
  ok(cards===4, `four subject cards render (${cards})`)
  const titles = await p.locator('#programmes .programme-card h3').allTextContents()
  ok(JSON.stringify(titles)===JSON.stringify(['English','Maths','Science','ICT']), 'cards: '+titles.join(', '))

  // Only English may claim Cambridge/Oxford
  const meta = await p.locator('#programmes .programme-card__body > span').allTextContents()
  const claiming = meta.filter(t=>/Cambridge|Oxford/i.test(t))
  ok(claiming.length===1, `only one card claims Cambridge/Oxford (${claiming.length})`)

  // Level toggle swaps copy
  const before = await p.locator('#programmes .programme-card p').first().textContent()
  await p.locator('.level-toggle button:has-text("Secondary")').click(); await p.waitForTimeout(700)
  const after = await p.locator('#programmes .programme-card p').first().textContent()
  ok(before!==after, 'Primary/Secondary toggle changes the copy')
  ok(/Years 7–11/.test(await p.locator('#programmes .programme-card__body > span').first().textContent()), 'secondary shows Years 7–11')
  ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
  await p.locator('#programmes').screenshot({ path:'/tmp/subjects-section.png' })
  await p.close()
}

// ---- BOOKING FLOW ----
{
  const p = await b.newPage({ viewport:{width:1440,height:1000} })
  const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
  await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
  await p.evaluate(()=>{
    const id='test-student-1', tid='teach-1'
    const l={id:'l1',name:'Test Child',year:'Year 3',curriculum:'Cambridge',goal:'Speaking with confidence',accessStatus:'active',achievements:[]}
    localStorage.setItem('tutorpro_accounts_v2', JSON.stringify([
      {id,role:'student',status:'active',parentName:'Test Parent',email:'t@example.com',loginId:'t@example.com',authProvider:'email',child:l,children:[l],referralWallet:{freeLessons:0,coupons:[],coins:0,xp:0,transactions:[]},createdAt:new Date().toISOString()},
      {id:tid,role:'teacher',status:'approved',fullName:'Teacher M',email:'m@example.com',loginId:'m@example.com',authProvider:'email',
       teacher:{specialization:'Multiple subjects',experience:5,availabilitySlots:[],credentials:[],classroom:{platform:'zoom'}},createdAt:new Date().toISOString()},
    ]))
    sessionStorage.setItem('tutorpro_session_v2', id)
  })
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(2000)
  await p.locator('button.button--primary:has-text("My dashboard")').first().click(); await p.waitForTimeout(3000)
  await p.locator('text=Book a class').first().click(); await p.waitForTimeout(2500)

  const subjectSelect = p.locator('select[name="subject"]')
  ok(await subjectSelect.count()===1, 'booking form has a Subject picker')
  const opts = await subjectSelect.locator('option').allTextContents()
  ok(JSON.stringify(opts)===JSON.stringify(['English','Maths','Science','ICT']), 'subject options: '+opts.join(', '))

  // focus options must change with subject
  const englishFocus = await p.locator('select[name="focus"] option').allTextContents()
  await subjectSelect.selectOption('maths'); await p.waitForTimeout(800)
  const mathsFocus = await p.locator('select[name="focus"] option').allTextContents()
  ok(JSON.stringify(englishFocus)!==JSON.stringify(mathsFocus), 'lesson focus changes with the subject')
  ok(mathsFocus.some(f=>/Algebra/i.test(f)), 'maths focus includes Algebra: '+mathsFocus.slice(0,3).join(', '))
  const chosen = await p.locator('select[name="focus"]').inputValue()
  ok(mathsFocus.includes(chosen), 'focus auto-resets to a valid maths option: '+chosen)

  await subjectSelect.selectOption('ict'); await p.waitForTimeout(700)
  ok((await p.locator('select[name="focus"] option').allTextContents()).some(f=>/Coding/i.test(f)), 'ICT focus includes Coding')
  ok(await p.locator('select[name="teacherId"] option').count()>=1, 'a teacher is still selectable for the new subject')
  ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
  await p.screenshot({ path:'/tmp/booking-subject.png' })
  await p.close()
}
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
