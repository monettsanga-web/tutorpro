/**
 * Direct message delivery + email alert checks.
 *
 * The behaviour that matters most here is ORDER: a message must be saved to
 * the database BEFORE any email is attempted. The reverse would let TutorPro
 * email a parent about a message that was never actually delivered — worse
 * than sending no email at all.
 *
 * The second thing under test is honesty: when the email fails but the
 * message saved, the caller must be told exactly that, so the UI can say
 * "Sent" without claiming an email that never went.
 */

import assert from 'node:assert/strict'

let passed = 0
const check = async (name, fn) => {
  try { await fn(); passed += 1; console.log(`  ok  ${name}`) }
  catch (error) { console.error(`FAIL  ${name}\n      ${error.message}`); process.exitCode = 1 }
}

// supabase-js builds a realtime client on import and wants a global WebSocket.
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class { constructor() { throw new Error('sockets unused in these tests') } }
}

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
}
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {}, localStorage: globalThis.localStorage }
// Node 20 exposes crypto as a getter-only property, so it cannot be assigned.
if (typeof globalThis.crypto?.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => `id-${Math.random().toString(36).slice(2)}` },
    configurable: true,
  })
}

const mod = await import('../src/directMessages.js')
const { conversationKey, mergeThread, readLocalThread, sendDirectMessage } = mod

console.log('\nConversation identity')

await check('the key is the same from either side', () => {
  assert.equal(conversationKey('a', 'b'), conversationKey('b', 'a'))
})

await check('different pairs never collide', () => {
  assert.notEqual(conversationKey('a', 'b'), conversationKey('a', 'c'))
})

console.log('\nMerging, without losing anything')

await check('a new message is appended', () => {
  store.clear()
  mergeThread('a', 'b', [{ id: '1', senderId: 'a', body: 'hi', createdAt: '2026-01-01T00:00:00Z' }])
  assert.equal(readLocalThread('a', 'b').length, 1)
})

await check('the same message arriving twice is not duplicated', () => {
  store.clear()
  const message = { id: '1', senderId: 'a', body: 'hi', createdAt: '2026-01-01T00:00:00Z' }
  mergeThread('a', 'b', [message])
  mergeThread('a', 'b', [message])
  assert.equal(readLocalThread('a', 'b').length, 1, 'echo from the server must not duplicate')
})

await check('messages are ordered oldest first', () => {
  store.clear()
  mergeThread('a', 'b', [
    { id: '2', body: 'second', createdAt: '2026-01-02T00:00:00Z' },
    { id: '1', body: 'first', createdAt: '2026-01-01T00:00:00Z' },
  ])
  assert.deepEqual(readLocalThread('a', 'b').map((m) => m.body), ['first', 'second'])
})

await check('an existing local message is updated, not replaced', () => {
  store.clear()
  mergeThread('a', 'b', [{ id: '1', body: 'hi', createdAt: '2026-01-01T00:00:00Z', pending: true }])
  mergeThread('a', 'b', [{ id: '1', body: 'hi', createdAt: '2026-01-01T00:00:00Z', cloud: true }])
  const [message] = readLocalThread('a', 'b')
  assert.equal(message.cloud, true)
  assert.equal(readLocalThread('a', 'b').length, 1)
})

await check('corrupt storage does not throw', () => {
  store.set('tutorpro_direct_messages_v1', '{not json')
  assert.deepEqual(readLocalThread('a', 'b'), [])
})

console.log('\nSending: validation')

await check('an empty message is refused', async () => {
  await assert.rejects(
    () => sendDirectMessage({ senderId: 'a', recipientId: 'b', body: '   ' }),
    /Type a message first/,
  )
})

await check('an over-long message is refused', async () => {
  await assert.rejects(
    () => sendDirectMessage({ senderId: 'a', recipientId: 'b', body: 'x'.repeat(4001) }),
    /under 4000/,
  )
})

await check('a missing participant is refused', async () => {
  await assert.rejects(
    () => sendDirectMessage({ senderId: 'a', recipientId: '', body: 'hello' }),
    /missing a participant/,
  )
})

console.log('\nSending: order of operations')

/**
 * A fake Supabase that records the order of calls, so the test can prove the
 * insert happens before the email.
 */
function fakeSupabase({ insertFails = false, emailFails = false, emailResult } = {}) {
  const calls = []
  return {
    calls,
    client: {
      from() {
        return {
          insert() { return this },
          select() { return this },
          async single() {
            calls.push('insert')
            if (insertFails) return { data: null, error: { message: 'row-level security' } }
            return {
              data: {
                id: 'msg-1', sender_id: 'a', recipient_id: 'b',
                body: 'hello', read_at: null, created_at: '2026-01-01T00:00:00Z',
              },
              error: null,
            }
          },
        }
      },
      functions: {
        async invoke(name) {
          calls.push(`invoke:${name}`)
          if (emailFails) return { data: null, error: { message: 'provider down' } }
          return { data: emailResult ?? { delivered: true }, error: null }
        },
      },
    },
  }
}

// The client is passed in rather than monkey-patched: ES module exports are
// immutable, so the earlier approach threw "Cannot redefine property".
const withSupabase = (fake, fn) => fn(fake)

await check('the message is SAVED BEFORE the email is attempted', async () => {
  store.clear()
  const fake = fakeSupabase()
  await withSupabase(fake.client, (client) => sendDirectMessage({
    senderId: 'a', senderRole: 'admin', recipientId: 'b', body: 'hello', client
  }))
  assert.deepEqual(fake.calls, ['insert', 'invoke:message-notification'],
    'emailing before saving could announce a message that was never delivered')
})

await check('a saved message reports emailed:true', async () => {
  store.clear()
  const fake = fakeSupabase()
  const result = await withSupabase(fake.client, (client) => sendDirectMessage({
    senderId: 'a', recipientId: 'b', body: 'hello', client
  }))
  assert.equal(result.emailed, true)
  assert.equal(result.message.body, 'hello')
})

await check('a failed EMAIL still counts as a sent MESSAGE', async () => {
  store.clear()
  const fake = fakeSupabase({ emailFails: true })
  const result = await withSupabase(fake.client, (client) => sendDirectMessage({
    senderId: 'a', recipientId: 'b', body: 'hello', client
  }))
  // The message is delivered in-app; only the alert failed.
  assert.equal(result.emailed, false)
  assert.match(result.emailError, /provider down/)
  assert.equal(readLocalThread('a', 'b').length, 1, 'the message must still be in the thread')
})

await check('a recipient with no email address is reported honestly', async () => {
  store.clear()
  const fake = fakeSupabase({ emailResult: { delivered: false, reason: 'Recipient has no email address' } })
  const result = await withSupabase(fake.client, (client) => sendDirectMessage({
    senderId: 'a', recipientId: 'b', body: 'hello', client
  }))
  assert.equal(result.emailed, false)
  assert.match(result.emailError, /no email address/)
})

await check('a failed SAVE throws and does not email', async () => {
  store.clear()
  const fake = fakeSupabase({ insertFails: true })
  await assert.rejects(
    () => withSupabase(fake.client, (client) => sendDirectMessage({
      senderId: 'a', recipientId: 'b', body: 'hello', client,
    })),
    /could not be sent/,
  )
  assert.ok(!fake.calls.includes('invoke:message-notification'),
    'no email may be sent for a message that failed to save')
})

await check('a failed save still keeps the text locally', async () => {
  store.clear()
  const fake = fakeSupabase({ insertFails: true })
  await withSupabase(fake.client, (client) => sendDirectMessage({
    senderId: 'a', recipientId: 'b', body: 'important words', client
  })).catch(() => {})
  const [message] = readLocalThread('a', 'b')
  assert.equal(message.body, 'important words', 'the typed message must not be lost')
  assert.equal(message.failed, true)
})

console.log('\nThe Edge Function contract')

const fn = await import('node:fs').then((fs) => fs.readFileSync('supabase/functions/message-notification/index.ts', 'utf8'))

await check('the function reads the message itself rather than trusting the caller', () => {
  assert.match(fn, /from\('direct_messages'\)/)
  assert.ok(!/body\s*:\s*messageBody/.test(fn),
    'accepting body text from the browser would make this an open spam relay')
})

await check('only the sender may trigger the notification', () => {
  assert.match(fn, /message\.sender_id !== user\.id/)
})

await check('an already-emailed message is not emailed again', () => {
  assert.match(fn, /message\.emailed_at/)
})

await check('emailed_at is stamped only after a successful send', () => {
  const sendIndex = fn.indexOf('api.resend.com')
  const stampIndex = fn.indexOf('emailed_at: new Date()')
  assert.ok(sendIndex > 0 && stampIndex > sendIndex,
    'stamping before sending would permanently suppress a retry')
})

await check('message text is HTML-escaped in the email', () => {
  assert.match(fn, /escapeHtml\(preview\(message\.body\)\)/)
})

console.log('\nThe SQL')

const sql = await import('node:fs').then((fs) => fs.readFileSync('supabase/direct_messages.sql', 'utf8'))

await check('row-level security is enabled', () => {
  assert.match(sql, /alter table public\.direct_messages enable row level security/)
})

await check('you can only read your own conversations', () => {
  assert.match(sql, /auth\.uid\(\) = sender_id or auth\.uid\(\) = recipient_id/)
})

await check('you cannot forge a message from someone else', () => {
  assert.match(sql, /for insert with check \(auth\.uid\(\) = sender_id\)/)
})

await check('nothing destructive is in the migration', () => {
  assert.ok(!/drop table|truncate|delete from/i.test(sql), 'this migration must only create')
})

console.log(`\n${passed} checks passed.`)
