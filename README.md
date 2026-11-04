# Festa di Natale — organizer contatti

App per organizzare la festa di Natale: rubrica fornitori (artisti, materiali, servizi),
calendario dei giorni dell'evento e controllo del budget. Stessa app su telefono e
computer, installabile sul telefono e funzionante offline.

## Cosa fa

- **Contatti** — nome, cognome, compagnia, categoria (Artisti / Materiali / Servizi), tipo di
  servizio, telefono, WhatsApp, email, prezzo richiesto, **chi ha fornito il contatto**, provenienza,
  stato (da contattare / contattato / confermato / scartato), note e **periodi di indisponibilità**.
- **Inserimento rapido** — obbligatorio solo il nome: il resto si completa dopo.
- **Regia (dashboard)** — budget disponibile, quanto è impegnato dai confermati, previsione con i
  contattati, residuo, conteggi per categoria e stato, cose da sistemare.
- **Calendario** — tabellone a griglia: righe = postazioni, colonne = mattina / pomeriggio / sera.
  La casella vuota è l'inserimento: un tocco e si sceglie solo la persona, perché posto e fascia sono
  già decisi. Più persone nella stessa casella sono normali. Sotto, l'indice di tutti i giorni
  dell'evento (settimane vere, giorni di chiusura tratteggiati) per saltare a una data.
  I contatti **scartati** restano solo in rubrica: non compaiono qui né nelle liste di scelta. Chi ha
  segnato di non esserci in un giorno è scritto sotto il tabellone, segnato accanto all'appuntamento e
  non si può scegliere nella lista di quel giorno.
- **Intrattenimento** — contatore degli slot da riempire (default 30) con quanto manca, e per ogni
  appuntamento la **postazione** (limonaia, serra, palco…): il conto si spezza per postazione.
- **Cose da fare** — lista di attività con spunta, salvata insieme all'evento.
- **Excel** — export con tre fogli (Contatti, Calendario, Budget) e re-import senza doppioni.
- **Backup JSON** completo.

## Veste grafica

Il sistema visivo è scritto in [`DESIGN.md`](DESIGN.md) (con i token anche in
`.impeccable/design.json`) e il contesto di prodotto in [`PRODUCT.md`](PRODUCT.md).
In breve: foglio avorio, guscio verde bosco, ottone per la provenienza dei contatti,
mattonella per i soldi negativi; cifre in Spectral, testo in Archivo; importi allineati
a destra con i puntini di guida; niente pillole, gradienti decorativi o timbri ruotati.

I font sono **self-hosted** in `public/fonts/` (niente Google Fonts: l'app deve
tipografare correttamente anche offline) e il service worker li mette in cache.
Le icone sono SVG disegnati in `src/components/icons.tsx`.

## Avvio

```bash
npm install
npm run dev        # http://localhost:5173
```

Build di produzione: `npm run build` (esce in `dist/`), anteprima con `npm run preview`.

## Database (facoltativo ma consigliato)

Senza database i dati vivono solo nel browser del dispositivo (con export/backup manuale).
Con un progetto Supabase gratuito i dati sono al sicuro e uguali su telefono e computer.

1. Crea un progetto su supabase.com (piano gratuito).
2. Apri **SQL Editor**, incolla il contenuto di [`supabase/schema.sql`](supabase/schema.sql) e premi Run.
3. **Authentication → Users → Add user**: email e password, con *Auto Confirm User* attivo.
4. Collega l'app in uno dei due modi:
   - **consigliato**: variabili di build `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, così il sito
     è già collegato su ogni dispositivo;
   - a mano: **Impostazioni → Database (configurazione avanzata)**, incolla URL e chiave, *Collega*,
     poi *Entra* con l'email e la password create al punto 3.

Lo stesso schema è copiabile dall'app col pulsante «Copia schema SQL».

> Sicurezza: le tre tabelle hanno RLS con policy `to authenticated`. Senza login la chiave
> publishable non legge e non scrive niente (verificato: 0 righe in lettura, insert respinto).
> Chi ha l'account vede e modifica tutto: la password è l'unica protezione, tienila privata.

## Deploy su GitHub Pages

È un sito statico: il workflow in `.github/workflows/deploy.yml` compila e pubblica a ogni push
su `main`. Su GitHub: **Settings → Pages → Source: GitHub Actions**, e due secret in
**Settings → Secrets and variables → Actions**:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Istruzioni complete in [`DEPLOY.md`](DEPLOY.md). L'app finisce sotto `/<nome-repo>/` e il
workflow passa `VITE_BASE` di conseguenza; `index.html`, manifest e service worker usano
percorsi relativi, quindi non serve altro.

In locale `npm run build` (base `/`) e `npm run preview` funzionano come sempre.

## Verifiche

```bash
npm run typecheck  # TypeScript
npm run lint       # oxlint
npm test           # 48 test su budget, intrattenimento, merge, formati, Excel, schema SQL, config
npm run e2e        # smoke test nel Chrome installato (serve `npm run preview` attivo)
```

`tools/e2e.mjs` guida l'app vera: inserisce contatti, imposta il budget, crea un appuntamento,
ricarica la pagina, scarica e rilegge il file Excel, e controlla che con credenziali database
sbagliate l'app avvisi invece di fingere che sia andato tutto bene. Screenshot in
`tools/screenshots/`.

## Struttura

```
src/lib/types.ts      modelli e etichette
src/lib/format.ts     date italiane, soldi, giorni di default
src/lib/budget.ts     calcoli di budget e calendario (puri, testati)
src/lib/entertainment.ts  contatore degli slot e ripartizione per postazione
src/lib/merge.ts      unione contatti senza doppioni
src/lib/excel.ts      export/import .xlsx (xlsx caricato on demand)
src/lib/repo.ts       localStorage + Supabase, schema SQL
src/lib/store.tsx     stato dell'app, local-first con sincronizzazione
src/components/       dashboard, contatti, calendario, impostazioni
```

## Limiti noti

- Niente OCR delle foto dei volantini (rimandato, come concordato).
- Un solo account condiviso: chi entra vede tutto. Non ci sono permessi per persona.
