# Rule: never create accounts on the live database

## What went wrong

While diagnosing the PayPal button I needed a signed-in user, because the
checkout API refuses anonymous requests. I created throwaway signups against
the **live** Supabase project — about a dozen of them across several rounds
of testing.

A trigger in `supabase/schema.sql` then did exactly what it is designed to do:

```sql
create trigger on_tutorpro_user_created
  after insert or update of raw_user_meta_data on auth.users
  for each row execute procedure public.handle_tutorpro_user();
```

Every new auth user automatically becomes a `profiles` row with
`role = 'student'`. So each diagnostic appeared in the owner's Students list
as a registered family. Not harmful, but wrong: the owner should be able to
trust that list.

**To clean up:** run `supabase/cleanup_test_accounts.sql`.

## The rule going forward

**Diagnostics must never write to the live database.** In order of preference:

1. **Don't sign up at all.** Assert against the API's *unauthenticated*
   response. `POST /api/paypal/create-order` with no token returns
   `"Please log in again before starting payment."` — that already proves the
   endpoint is deployed and its auth check works.

2. **Stub the browser session.** The committed browser tests do this and
   create nothing:
   ```js
   sessionStorage.setItem('tutorpro-supabase-auth', JSON.stringify({
     access_token: 'test-access-token', /* … */
   }))
   ```
   Note the storage key is `tutorpro-supabase-auth` in **sessionStorage**
   (set via `storageKey` in `src/supabaseClient.js`), not the Supabase default.

3. **Intercept the network.** `page.route('**/api/paypal/create-order', …)`
   returns the exact production error with no server involved. This is how
   `verify-payment-failure.mjs` reproduces `PAYEE_ACCOUNT_RESTRICTED`.

4. **If a real signup is genuinely unavoidable** — e.g. confirming a live
   server-side failure that only reproduces end to end — then it must be:
   - `@example.com` (reserved by RFC 2606, can never be a real person), and
   - **deleted in the same session**, not left behind.

## Status of the committed tests

All committed test scripts are clean and create nothing:

| Script | Live signups |
|---|---|
| `verify-payment-failure.mjs` | none — stubs the session, routes the API |
| `verify-dashboard-no-crash.mjs` | none — localStorage only |
| `test-payment-errors.mjs` | none — pure unit checks |

Only the ad-hoc `/tmp` scripts written during diagnosis created users, and
those are not part of the repository.
