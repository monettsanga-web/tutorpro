/**
 * Tests for src/iceServers.js — the WebRTC relay configuration.
 *
 * This code decides whether a lesson can connect at all on a restrictive
 * network, and a malformed entry here breaks every call, so it is worth
 * covering properly. import.meta.env is stubbed by rewriting the lookup.
 *
 * Run: node scripts/test-ice-servers.mjs
 */
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const source = fs.readFileSync(resolve(here, '..', 'src', 'iceServers.js'), 'utf8')
const tmpDir = resolve(here, '..', '.ice-test-tmp')

let passed = 0
let failed = 0
const check = (name, condition, extra = '') => {
  if (condition) passed += 1
  else failed += 1
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`)
}

async function load(env) {
  const shim = source.replace(/import\.meta\.env\?\.\[key\]/g, '(globalThis.__ENV || {})[key]')
  fs.mkdirSync(tmpDir, { recursive: true })
  const file = resolve(tmpDir, `mod-${Math.random().toString(16).slice(2)}.mjs`)
  fs.writeFileSync(file, shim)
  globalThis.__ENV = env
  const mod = await import(`file://${file}`)
  fs.unlinkSync(file)
  return mod
}

// --- No TURN configured: the situation before this change ---
{
  const m = await load({})
  check('no TURN -> hasTurnRelay false', m.hasTurnRelay() === false)
  const cfg = m.buildRtcConfiguration()
  check('no TURN -> STUN still present', cfg.iceServers.length === 4)
  check('no TURN -> no relay entry', !cfg.iceServers.some((s) => /turn/.test(JSON.stringify(s.urls))))
  check('no TURN -> no iceTransportPolicy', cfg.iceTransportPolicy === undefined)
  const advice = m.connectionFailureAdvice({ bothPresent: true })
  check('no TURN -> explains the real cause', /relay/i.test(advice.detail))
  check('no TURN -> tells admin the fix', /VITE_CLASSROOM_TURN_URL/.test(advice.adminHint))
}

// --- TURN configured ---
{
  const m = await load({
    VITE_CLASSROOM_TURN_URL: 'turn:relay.example.com:3478',
    VITE_CLASSROOM_TURN_USERNAME: 'user1',
    VITE_CLASSROOM_TURN_CREDENTIAL: 'pass1',
  })
  check('TURN -> hasTurnRelay true', m.hasTurnRelay() === true)
  const cfg = m.buildRtcConfiguration()
  check('TURN -> appended after STUN', cfg.iceServers.length === 5)
  const turn = cfg.iceServers[4]
  check('TURN -> credentials passed through', turn.username === 'user1' && turn.credential === 'pass1')
  check('TURN -> url normalised to array', Array.isArray(turn.urls) && turn.urls[0] === 'turn:relay.example.com:3478')
  const advice = m.connectionFailureAdvice({ bothPresent: true })
  check('TURN -> no admin warning', advice.adminHint === '')
  check('TURN -> reports reconnecting', /reconnect/i.test(advice.title))
}

// --- Several URLs, including a TLS fallback for strict firewalls ---
{
  const m = await load({
    VITE_CLASSROOM_TURN_URL: 'turn:h:3478, turn:h:80?transport=tcp ,turns:h:443?transport=tcp',
    VITE_CLASSROOM_TURN_USERNAME: 'u',
    VITE_CLASSROOM_TURN_CREDENTIAL: 'c',
  })
  const turn = m.buildRtcConfiguration().iceServers.at(-1)
  check('multiple URLs parsed', turn.urls.length === 3, JSON.stringify(turn.urls))
  check('surrounding whitespace trimmed', turn.urls[1] === 'turn:h:80?transport=tcp')
  check('turns: TLS entry preserved', turn.urls[2].startsWith('turns:'))
}

// --- Malformed values must never reach the browser ---
{
  const m = await load({ VITE_CLASSROOM_TURN_URL: 'https://not-a-turn-url.com, ,garbage' })
  check('invalid URLs rejected', m.hasTurnRelay() === false)
  check('invalid -> config still usable', m.buildRtcConfiguration().iceServers.length === 4)
}
{
  const m = await load({ VITE_CLASSROOM_TURN_URL: '   ' })
  check('whitespace-only treated as unset', m.hasTurnRelay() === false)
}
{
  const m = await load({
    VITE_CLASSROOM_TURN_URL: 'turn:good:3478,http://bad',
    VITE_CLASSROOM_TURN_USERNAME: 'u',
    VITE_CLASSROOM_TURN_CREDENTIAL: 'c',
  })
  const turn = m.buildRtcConfiguration().iceServers.at(-1)
  check('junk filtered, valid kept', turn.urls.length === 1 && turn.urls[0] === 'turn:good:3478')
}

// --- Relay-only mode, used to prove the relay actually works ---
{
  const m = await load({
    VITE_CLASSROOM_TURN_URL: 'turn:h:3478',
    VITE_CLASSROOM_TURN_USERNAME: 'u',
    VITE_CLASSROOM_TURN_CREDENTIAL: 'c',
  })
  check('relayOnly forces relay policy', m.buildRtcConfiguration({ relayOnly: true }).iceTransportPolicy === 'relay')
  const none = await load({})
  check('relayOnly ignored without TURN', none.buildRtcConfiguration({ relayOnly: true }).iceTransportPolicy === undefined)
}

// --- Wording when nobody else has joined yet ---
{
  const m = await load({})
  const advice = m.connectionFailureAdvice({ bothPresent: false })
  check('alone -> waiting message', /waiting for the other/i.test(advice.detail))
}

fs.rmSync(tmpDir, { recursive: true, force: true })
console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
