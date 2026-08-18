# Bäst Fotbollskunskap 2026/27

Privat tävling för ett kompisgäng kring Premier League 2026/27. Gissa sluttabellen,
skyttekungarna, assistkungarna och första sparkade tränaren – plus FPL i gemensam liga.

## Stack

- **Next.js 14** (App Router, TypeScript) – all FPL-hämtning sker server-side
- **Supabase** (Postgres) – lagring, service role key i server-kod, ingen RLS
- **Tailwind** – styling, mobile-first
- **Vercel** – hosting + Cron som uppdaterar data varje timme

## Kom igång

1. **Supabase**: skapa ett projekt och kör `supabase/schema.sql` i SQL-editorn.
2. **Miljövariabler**: kopiera `.env.local.example` till `.env.local` och fyll i
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD` och `FPL_LEAGUE_ID`.
3. **Kör lokalt**:
   ```bash
   npm install
   npm run dev
   ```
4. **Hämta data första gången**: logga in på `/admin` och klicka "Uppdatera nu"
   (eller öppna `/api/refresh`).
5. **Testdata** (valfritt): `npm run seed` lägger in fyra påhittade deltagare med
   gissningar så poängmotorn går att testa direkt. Funkar även offline – då används
   en syntetisk snapshot.

## Deploy på Vercel

1. Pusha repot till GitHub och importera i Vercel.
2. Sätt samma miljövariabler som i `.env.local` (plus gärna `CRON_SECRET`).
3. `vercel.json` innehåller cron-jobbet som kör `/api/refresh` varje timme.

## Tester

```bash
npm test
```

Testerna verifierar poängmotorn, bl.a. trappan 10 / 9,75 / 9 / 7,75 / 6 / 3,75 / 1 / 0,
bonusreglerna, generös hantering av delade placeringar och tabellberäkningen från fixtures.

## Bra att veta

- Sajten läser alltid från den senaste sparade snapshoten i Supabase – FPL anropas
  aldrig vid sidladdning. Tidpunkten för senaste uppdatering visas i footern.
- Om FPL:s API är nere (vanligt vid gameweek-övergångar) failar `/api/refresh` tyst
  och förra snapshoten ligger kvar.
- Förvald lagordning i gissningsformuläret styrs av `src/lib/defaultOrder.ts` –
  uppdatera listan där när förra säsongens sluttabell är känd.
- Reglersidan renderar `regler-basta-fotbollskunskap-2026-27.md` som den är –
  byt ut filens innehåll mot originalet vid behov.
- Admin (`/admin`): deadline, ligakod/liga-ID, tränarfacit med matchningslista,
  FPL-lagkopplingar, låsa upp gissningar, logga in som deltagare (för manuell
  inmatning åt någon som missat deadline), radera användare och tvinga refresh.
