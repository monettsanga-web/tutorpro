import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const images = [
  ['1ENm8p2-G_glMXNyojA6e180EEWFIELYO', 'power-up'],
  ['1DR1mPyBwMFLXXPvYDX4RpGOkXS3pEf5L', 'power-up-academy'],
  ['1TZdRANL2OTg50UiTTcFIV17-E-ULyfxv', 'grammar-friends'],
  ['1IYX1WmS69ZuuKQeIwQSt0Y2qJHcjoHPC', 'family-and-friends'],
  ['1zvWowq1nDpftZLior_jOHiDLrECOXZSc', 'think'],
  ['1glUQpYaPNfGP2HGjaCJE3TWyIVlSzIgq', 'global-english'],
  ['1LVx0W1YK8TuSRLu97kQl-ydGsQBOfuvu', 'phonics-monster-asap'],
  ['1_E3DCPaqM_o-oDK9UGpEKKL7_SAGr9_I', 'best-phonics'],
  ['1Xd2aZnnrWIn-OtFoRqVadMtxG_ng7hIM', 'everybody-up'],
  ['1RCJobEvIAqmM80-9vOE8a9RrQqvD3cZq', 'lets-go'],
  ['1jycufY6vwbEwLkwp3Rl6nHAY538Fo4l3', 'phonics-monster'],
  ['1GWmHeEDtpOw1WZQ--rBLiPkAIGKWMnwX', 'ready-set-sing'],
  ['1XXrOahvCyezLd1tX8MIlP8H9-v3yxFlo', 'smart-up'],
  ['1v_U1s0cxAV3FTSXdUabk6LxvFQe8fDRj', 'wonderful-world'],
]

const assetsDirectory = resolve('public/assets/curriculum')
await mkdir(assetsDirectory, { recursive: true })

async function download(id, name) {
  const target = resolve(assetsDirectory, `${name}-drive.jpg`)
  const fallback = resolve(assetsDirectory, `${name}.jpg`)
  const sources = [
    `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1600`,
  ]

  for (const source of sources) {
    try {
      const response = await fetch(source, {
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'User-Agent': 'Mozilla/5.0 TutorPro-English-EdgeOne-Build' },
      })
      const contentType = response.headers.get('content-type') || ''
      if (!response.ok || !contentType.startsWith('image/')) continue
      const data = Buffer.from(await response.arrayBuffer())
      if (data.length < 1500) continue
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, data)
      return { name, source: 'Google Drive', size: data.length }
    } catch {
      // Try the next Google Drive public-image URL.
    }
  }

  await copyFile(fallback, target)
  return { name, source: 'local fallback', size: 0 }
}

const results = await Promise.all(images.map(([id, name]) => download(id, name)))
const driveCount = results.filter((result) => result.source === 'Google Drive').length
process.stdout.write(`TutorPro curriculum images: ${driveCount}/${results.length} downloaded from Google Drive; local fallbacks kept for the rest.\n`)
