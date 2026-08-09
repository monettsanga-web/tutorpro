import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:900} })
const errs=[]; p.on('pageerror',e=>errs.push(String(e)))
const supa=[], local=[]
p.on('response', r=>{ const u=r.url()
  if(u.includes('supabase.co') && /\.(mp4|webm)/i.test(u)) supa.push(u)
  if(u.includes('tutorpro-class.mp4')) local.push({u:u.replace('http://localhost:4173',''), s:r.status()})
})
await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p.locator('#see-a-class').scrollIntoViewIfNeeded()
await p.waitForTimeout(4000)

ok(supa.length===0, `no video is fetched from Supabase any more (${supa.length})`)
ok(local.length>0, `video served from our own domain (${local.length} request(s), status ${local[0]?.s})`)
ok(local.every(x=>[200,206].includes(x.s)), 'video responds 200/206 (range requests fine)')

/*
 * This sandbox's Chromium is built WITHOUT an H.264 decoder:
 *   canPlayType('video/mp4; codecs="avc1.42E01E"') === ''
 * so any H.264 file fails here with MEDIA_ERR_SRC_NOT_SUPPORTED, and the
 * component correctly falls back to its Bilibili link. Verified that the
 * ORIGINAL Supabase-hosted file fails identically in this same browser, so
 * this is the environment, not the change. Real browsers all decode H.264.
 *
 * What IS verifiable here: the correct URL is requested, from our own domain,
 * and it serves the real file. Decodability is proven separately with ffmpeg.
 */
const canH264 = await p.evaluate(()=>document.createElement('video').canPlayType('video/mp4; codecs="avc1.42E01E"') !== '')
console.log('       (this browser can decode H.264:', canH264, ')')
ok(local[0]?.u === '/assets/tutorpro-class.mp4', 'requests the bundled file path: '+local[0]?.u)
ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))
await p.close(); await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
