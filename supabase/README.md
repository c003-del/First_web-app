# Supabase setup

This app uses Supabase for Auth (email + password + TOTP MFA), Postgres, and
private Storage. RLS enforces access — see `migrations/0001_init.sql`.

## 1. Create a project

Create a project at https://supabase.com, then copy the API values into
`.env.local` (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; never expose to the browser)

## 2. Apply the migration

**Option A — SQL editor:** paste the contents of
`migrations/0001_init.sql` into the Supabase SQL editor and run it.

**Option B — Supabase CLI:**

```bash
supabase link --project-ref <your-ref>
supabase db push
```

This creates the schema, enables RLS on every table, defines the read/write
policies, creates the private `private-media` storage bucket with its policies,
and installs a trigger that provisions a `profiles` row on signup.

## 3. Enforce MFA

1. In **Authentication → Providers**, disable public sign-ups (invite-only).
2. In **Authentication → MFA**, enable **TOTP**.
3. Optionally set the project's AAL policy so sensitive actions require AAL2.

The app already gates all content behind AAL2 in middleware and RLS
(`has_aal2()`), so a password-only (AAL1) session can authenticate but cannot
read any archive data until MFA is completed.

## 4. Promote the first owner

New users are created as `viewer`. After the first user signs up and enrolls
MFA, promote them:

```sql
update public.profiles set role = 'owner' where id = '<auth-user-uuid>';
```

That user can then manage everyone else from `/admin`.

## 5. Redirect URLs

In **Authentication → URL Configuration**, add your local, preview, and
production URLs (e.g. `http://localhost:3000`, your Vercel preview domains, and
your Gabia production domain) so auth redirects resolve correctly.
