/* Player accounts settings. Empty url and key put the game in guest mode, saving only in this browser.
   Fill them from Supabase → Project Settings → API: the Project URL and the publishable ("anon public") key.
   Both are public by design; the database's row-level security is what keeps each player's data private.
   Never put the secret / service_role key here. Set google to true once Google sign-in is switched on in Supabase. */
window.TRAVERSE_ACCOUNT = { url: 'https://rcanetacieqdhsrxhgka.supabase.co', key: 'sb_publishable_axi5fmUU1H7pJmsPjUGhMg_mcSfn6PK', google: false };
