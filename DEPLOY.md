# Deploy su GitHub Pages

Il sito è statico e i dati stanno su Supabase: l'hosting serve solo i file.

## 1. Utente e login su Supabase

1. Supabase → **Authentication → Users → Add user**: email e password, con *Auto Confirm User* attivo.
2. Con quella email e password entri nell'app da qualunque dispositivo.

Lo schema `supabase/schema.sql` crea le policy `to authenticated`: senza login, la chiave publishable
non legge e non scrive niente. Va eseguito una volta (o rieseguito: è idempotente).

## 2. Repository GitHub

Il repo deve contenere la cartella dell'app (questo progetto). Il workflow in
`.github/workflows/deploy.yml` compila e pubblica da solo a ogni push su `main`.

In **Settings → Secrets and variables → Actions** aggiungi due secret:

- `VITE_SUPABASE_URL` = `https://<project-ref>.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = la chiave `sb_publishable_…` (o la anon JWT)

Finiscono nel bundle: è normale e innocuo, perché senza login il database non risponde.

In **Settings → Pages → Build and deployment** scegli **GitHub Actions** come sorgente.

## 3. Percorsi

GitHub Pages serve il progetto da `https://<utente>.github.io/<repo>/`. Il workflow passa
`VITE_BASE=/<repo>/`, che Vite usa per gli asset; `index.html`, manifest e service worker usano
percorsi relativi e ricavano lo scope da lì, quindi non serve altro.

Con un dominio personalizzato (`festa.example.it`) il sito sta in radice: togli `VITE_BASE`
dal workflow e lascia il default `/`.

## 4. Dopo il primo deploy

1. Apri l'URL pubblicato e fai login.
2. Sul telefono: menu del browser → *Installa app* (il service worker funziona solo in HTTPS,
   che Pages fornisce).
3. Se cambi lo schema o le policy, riesegui `supabase/schema.sql` nell'SQL Editor.

## Alternativa: Vercel

Stessa storia, con le variabili in **Project → Settings → Environment Variables** e base `/`.
Su Vercel puoi aggiungere la password protection del sito, su GitHub Pages no.
