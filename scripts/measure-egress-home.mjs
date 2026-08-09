import { chromium } from '/home/user/.npm/_npx/eedcb85d74ea43ba/node_modules/playwright-core/index.mjs'
const b = await chromium.launch()
const p = await b.newPage({ viewport:{width:1440,height:900} })
const calls=[]
p.on('response', async r=>{
  const u=r.url()
  if(!u.includes('supabase.co')) return
  let len=0; try{ len=(await r.body()).length }catch{}
  calls.push({u:u.replace('https://losmkvvwzijipqrlelyt.supabase.co',''), s:r.status(), len})
})
let ws=0; p.on('websocket',()=>ws++)
await p.goto('http://localhost:4173/', { waitUntil:'networkidle' })
console.log('--- measuring 60s of an IDLE anonymous visitor sitting on the homepage ---')
await p.waitForTimeout(60000)
const total = calls.reduce((a,c)=>a+c.len,0)
const byEndpoint={}
calls.forEach(c=>{ const k=c.u.split('?')[0]; byEndpoint[k]=byEndpoint[k]||{n:0,b:0}; byEndpoint[k].n++; byEndpoint[k].b+=c.len })
console.log('websockets opened:', ws)
console.log('total supabase requests in 60s:', calls.length, '| bytes:', total)
console.log('\nby endpoint (calls / bytes):')
Object.entries(byEndpoint).sort((a,b)=>b[1].n-a[1].n).forEach(([k,v])=>console.log(`  ${v.n.toString().padStart(3)}x ${v.b.toString().padStart(7)}b  ${k}`))
await b.close()
