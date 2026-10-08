# Player accounts

Players can make a free account on the Profile page so their streak, badges, name and puzzle history follow them to any device. Guests keep playing exactly as before; signing in carries everything already saved in the browser into the account.

## How it fits together

- **Supabase** (free plan) handles sign-in and stores one row per player. The site stays static.
- `js/account-config.js` holds the Supabase Project URL and publishable key. Empty means guest mode, and nothing extra is downloaded.
- `js/account.js` loads `vendor/supabase.min.js` (supabase-js 2.58.0, MIT) only when keys are set, hooks the game's own saves, and draws the Account card on the Profile page.
- `supabase/schema.sql` creates the tables, the row-level security policies, and two functions:
  - `save_progress` merges this browser's results with the account's. A day the server already has keeps its first official result; new days are added. Two devices can never wipe each other.
  - `delete_my_account` removes the login and every row that belongs to it.
- `entitlements` holds Traversle +. Players can read their own row but not write it, so only a future payment webhook (using the secret key on a server) can grant Plus. When it says Plus is active, the browser unlocks the archive.

## Setup (one time)

1. Create a project on supabase.com (free plan). Save the database password somewhere safe.
2. SQL Editor → New query → paste `supabase/schema.sql` → Run. It is safe to run again.
3. Project Settings → API: copy the Project URL and the publishable ("anon public") key into `js/account-config.js`. Never use the secret / service_role key in the site.
4. Authentication → URL Configuration: set Site URL to the live address (for example `https://traversledaily.com`) and add it, plus any preview address, under Redirect URLs.

## Before launch

- **Email sending.** Supabase's built-in email is for testing and only sends a few sign-in emails an hour. Connect a free email sender (for example Resend's free tier) under Authentication → Emails → SMTP, sending from the site's domain.
- **Email wording.** Authentication → Emails → Magic Link: change the subject to something like "Your TraversleDaily sign-in link".
- **Google sign-in (optional).** In Google Cloud Console create an OAuth client (Web application) with the redirect URI Supabase shows under Authentication → Providers → Google, paste the client ID and secret into that Supabase screen, then set `google: true` in `js/account-config.js`.
- Remove `TEST_RESET` from `js/traverse.js`: a signed-in player's server copy keeps the first result for a day, so "Reset today's puzzle" only resets this browser.

## What we store

Email address (for sign-in), display name, and puzzle results. No real names, no tracking. Players can delete their account from the Profile page at any time.
