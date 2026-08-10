# Kakao login and cloud session setup

## Product behavior

- Guests can finish onboarding without creating an account.
- Guest data remains in `localStorage`.
- Kakao login is offered after onboarding and from Profile as an optional “save my record” action.
- After login, an empty cloud account imports the local session automatically.
- If both the browser and account contain data, the user chooses which session to keep.
- Local data is removed only after the cloud write succeeds or the user explicitly chooses the cloud copy.

## 1. Create the Supabase project

Create a Supabase project in the desired production region. Copy only these public values into local/Vercel configuration:

```env
NEXT_PUBLIC_DATA_MODE=hybrid
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

For server-side account deletion, add the secret key only to server environments:

```env
SUPABASE_SECRET_KEY=<secret-key>
```

Never expose `SUPABASE_SECRET_KEY` through a `NEXT_PUBLIC_` variable or commit it to Git.

## 2. Apply the database migration

Apply `supabase/migrations/202608100001_recovery_sessions.sql` with the Supabase CLI or SQL editor. Verify that RLS is enabled and that authenticated users can only access a row whose `user_id` equals `auth.uid()`.

## 3. Configure Kakao

1. Create a Kakao Developers application.
2. Enable Kakao Login and create/activate the client secret.
3. Add the Supabase Auth callback URL shown in the Supabase Kakao provider settings to Kakao's allowed redirect URIs.
4. In Supabase Authentication → Providers → Kakao, enter the Kakao REST API key and client secret.
5. Convert the Kakao application to a Biz App. Individual developers without a business registration number can do this with identity verification and the Kakao Business terms.
6. In Kakao Login → Consent Items, enable nickname, profile image, and email as optional consent items. Supabase's native Kakao provider requests these three scopes by default.
7. Enable “Allow users without an email” in Supabase so users can skip the optional email consent.
8. Do not request friend, message, or other unrelated Kakao scopes.

Kakao secrets belong in the Kakao/Supabase dashboards, not in this repository or Vercel public variables.

## 4. Configure redirect URLs

In Supabase Authentication URL Configuration:

- Set the production Site URL to the stable production domain.
- Add `https://<production-domain>/auth/callback**` to allow the callback's safe `next` query parameter.
- Add `http://localhost:3000/**` for local testing.
- For Vercel previews, add `https://*-<team-or-account-slug>.vercel.app/**` as recommended by Supabase.
- Keep the production rule scoped to the callback path; do not use a production-wide wildcard.

## 5. Vercel rollout

Add the public Supabase values to Preview first and deploy with `NEXT_PUBLIC_DATA_MODE=hybrid`. Test the full flow before copying the same configuration to Production.

Required checks:

- guest onboarding still works
- Kakao cancel returns a useful error and preserves local data
- login creates a cookie-backed session
- local-only data imports once
- a returning account loads cloud data on another browser
- a conflict never overwrites either side automatically
- logout removes the auth session
- account deletion removes the Auth user and cascades the recovery session
- user A cannot select, update, or delete user B's row
