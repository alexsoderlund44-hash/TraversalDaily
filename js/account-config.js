/* Player accounts settings. Leave url and key empty and the game runs in guest mode, saving only in this browser.
   Fill them from Supabase → Project Settings → API: the Project URL and the publishable ("anon public") key.
   Both are public by design; the database's row-level security is what keeps each player's data private.
   Never put the secret / service_role key here. Set google to true once Google sign-in is switched on in Supabase. */
window.TRAVERSE_ACCOUNT = { url: '', key: '', google: false };
