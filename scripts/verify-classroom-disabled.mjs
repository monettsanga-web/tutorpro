import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
let pass=0, fail=0
const ok=(c,m)=>{ c?pass++:fail++; console.log((c?'  ok  ':'FAIL  ')+m) }
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:900} })

// Record EVERY request and websocket the page makes.
const reqs=[], sockets=[], errs=[]
p.on('request', r=>reqs.push(r.url()))
p.on('websocket', ws=>sockets.push(ws.url()))
p.on('pageerror', e=>errs.push(String(e)))

// Trap media permission calls so we can prove none are made.
await p.addInitScript(()=>{
  window.__media = []
  const nav = navigator.mediaDevices
  if (nav) {
    const gum = nav.getUserMedia?.bind(nav)
    const gdm = nav.getDisplayMedia?.bind(nav)
    nav.getUserMedia = (...a)=>{ window.__media.push('getUserMedia'); return gum ? gum(...a) : Promise.reject(new Error('x')) }
    nav.getDisplayMedia = (...a)=>{ window.__media.push('getDisplayMedia'); return gdm ? gdm(...a) : Promise.reject(new Error('x')) }
  }
  const RTC = window.RTCPeerConnection
  if (RTC) window.RTCPeerConnection = function(...a){ window.__media.push('RTCPeerConnection'); return new RTC(...a) }
})

await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
await p.waitForTimeout(3000)
// scroll the whole homepage to trigger any lazy work
await p.evaluate(async ()=>{ for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y); await new Promise(r=>setTimeout(r,60))} })
await p.waitForTimeout(2500)

const classroomChunk = reqs.filter(u=>/OnlineClassroom|trtc|tencentClassroom|RecordingPlayback/i.test(u))
ok(classroomChunk.length===0, `no classroom JS chunk requested (${classroomChunk.length})`)

const fnCalls = reqs.filter(u=>/functions\/v1\/(trtc-usersig|turn-credentials)/.test(u))
ok(fnCalls.length===0, `no classroom Edge Function called (${fnCalls.length})`)

const storage = reqs.filter(u=>/classroom-files|classroom-recordings/.test(u))
ok(storage.length===0, `no classroom Storage request (${storage.length})`)

const media = await p.evaluate(()=>window.__media||[])
ok(media.length===0, `no camera/mic/screen/WebRTC attempt (${JSON.stringify(media)})`)

const classroomSockets = sockets.filter(u=>/classroom/i.test(u))
ok(classroomSockets.length===0, `no classroom websocket (${classroomSockets.length})`)
console.log('       websockets opened overall:', sockets.length, sockets.map(s=>s.slice(0,60)))

ok(errs.length===0, 'no JS errors: '+JSON.stringify(errs.slice(0,2)))

// Marketing site must still work
ok(await p.locator('h1').count()>=1, 'homepage still renders')
ok(await p.locator('.panda-companion').count()===1, 'panda mascot still works')
await p.close()
await b.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail?1:0)
