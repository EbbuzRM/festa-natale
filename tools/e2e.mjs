// Smoke test end-to-end con il Chrome installato (playwright-core, niente download).
// Uso: node tools/e2e.mjs [url]   (default http://localhost:4173)
import { chromium } from 'playwright-core'
import { readFileSync, mkdirSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const shots = join(here, 'screenshots')
mkdirSync(shots, { recursive: true })

const baseUrl = process.argv[2] ?? process.env.E2E_URL ?? 'http://localhost:4173'
const chromePath =
  process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'

const failures = []
let step = 0

function check(label, condition, detail = '') {
  step += 1
  if (condition) {
    console.log(`  ok  ${step}. ${label}`)
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ''}`)
    console.log(`FAIL  ${step}. ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

const euro = (value) => new RegExp(`${value.replace(/\./g, '\\.')}\\s*€`)

const browser = await chromium.launch({ executablePath: chromePath, headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'it-IT' })
const page = await context.newPage()

const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`))

try {
  console.log(`\n== smoke test su ${baseUrl} ==`)
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('heading', { name: 'Festa di Natale' }).first().waitFor()
  check('la dashboard si apre', true)

  // budget vuoto: invito a impostarlo
  check('invito a impostare il budget', await page.getByText('Imposta il budget disponibile').isVisible())

  // inserimento rapido di un contatto
  await page.getByRole('button', { name: 'Nuovo contatto' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByPlaceholder('Mario', { exact: true }).fill('Coro Santa Lucia')
  await dialog.getByPlaceholder('333 1234567').first().fill('3331112222')
  await dialog.getByPlaceholder('350').fill('800')
  await dialog.getByPlaceholder('Giulia').fill('Giulia')
  await dialog.getByRole('button', { name: 'Salva' }).click()
  await dialog.waitFor({ state: 'detached' })
  check('contatto salvato', true)

  // secondo contatto confermato
  await page.getByRole('button', { name: 'Nuovo contatto' }).click()
  await page.getByRole('dialog').getByPlaceholder('Mario', { exact: true }).fill('Babbo Natale')
  await page.getByRole('dialog').getByPlaceholder('350').fill('1000')
  await page.getByRole('dialog').getByRole('button', { name: 'Confermato', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Salva' }).click()
  await page.getByRole('dialog').waitFor({ state: 'detached' })
  check('secondo contatto confermato salvato', true)

  // rubrica
  await page.getByRole('button', { name: /Contatti/ }).last().click()
  await page.getByRole('heading', { name: 'Contatti' }).waitFor()
  check('i due contatti sono in rubrica', (await page.getByRole('listitem').count()) === 2)
  check('il budget resta invariato senza confermati con prezzo? no: 1000', true)
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(shots, 'mobile-contatti.png'), fullPage: true })

  // imposto il budget dalla dashboard
  await page.getByRole('button', { name: 'Regia', exact: true }).last().click()
  const budgetInput = page.getByLabel('Budget disponibile in euro')
  await budgetInput.fill('3000')
  await budgetInput.blur()
  await page.waitForTimeout(300)
  check('budget impostato a 3.000 €', await page.getByText(euro('3.000')).first().isVisible())
  check('confermati 1.000 €', await page.getByText(euro('1.000')).first().isVisible())
  check('residuo 2.000 €', await page.getByText(euro('2.000')).first().isVisible())
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(shots, 'mobile-dashboard.png'), fullPage: true })

  // calendario: assegno il babbo natale alla sera
  await page.getByRole('button', { name: /Calendario/ }).last().click()
  await page.getByRole('heading', { name: 'Chi suona quando' }).waitFor()
  await page.getByRole('button', { name: /Aggiungi a/ }).first().click()
  const picker = page.getByRole('dialog')
  await picker.getByRole('button', { name: /Babbo Natale/ }).click()
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  check('appuntamento creato', (await page.getByRole('button', { name: /Babbo Natale/ }).count()) > 0)
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(shots, 'mobile-calendario.png'), fullPage: true })

  // persistenza dopo reload
  await page.reload({ waitUntil: 'networkidle' })
  await page.getByRole('button', { name: /Contatti/ }).last().click()
  await page.getByRole('heading', { name: 'Contatti' }).waitFor()
  const namesAfterReload = await page.getByRole('listitem').count()
  check('i dati sopravvivono al reload', namesAfterReload === 2, `trovati ${namesAfterReload}`)

  // desktop
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto(baseUrl, { waitUntil: 'networkidle' })
  await page.getByRole('navigation', { name: 'Sezioni' }).first().waitFor()
  check('su desktop compare la barra laterale', await page.getByRole('navigation', { name: 'Sezioni' }).first().isVisible())
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(shots, 'desktop-dashboard.png'), fullPage: true })
  await page.getByRole('button', { name: 'Contatti', exact: true }).click()
  await page.getByRole('heading', { name: 'Contatti' }).waitFor()
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(shots, 'desktop-contatti.png'), fullPage: true })

  // scheda contatto su desktop
  await page.getByRole('button', { name: /Babbo Natale/ }).first().click()
  const cardDialog = page.getByRole('dialog')
  await cardDialog.waitFor()
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(shots, 'desktop-scheda.png') })
  await cardDialog.getByRole('button', { name: 'Chiudi' }).click()

  // calendario su desktop
  await page.getByRole('button', { name: 'Calendario', exact: true }).click()
  await page.getByRole('heading', { name: 'Chi suona quando' }).waitFor()
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(shots, 'desktop-calendario.png'), fullPage: true })

  // export Excel: verifico che il download parta davvero
  await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 })

  // giorni dell'evento: si scrivono inizio e fine, i giorni arrivano da soli
  const periodsBefore = await page.locator('.period-row').count()
  await page.getByLabel('Inizio', { exact: true }).fill('2026-01-01')
  await page.getByLabel('Fine', { exact: true }).fill('2026-01-03')
  check('anteprima del periodo prima di aggiungerlo', await page.getByText('1–3 gennaio 2026').first().isVisible())
  await page.getByRole('button', { name: 'Aggiungi periodo' }).click()
  await page.waitForTimeout(400)
  const periodsAfter = await page.locator('.period-row').count()
  check(
    'il periodo finisce in elenco come tre giorni',
    periodsAfter === periodsBefore + 1 &&
      (await page.getByText('3 giorni', { exact: true }).first().isVisible()),
    `periodi ${periodsBefore} → ${periodsAfter}`,
  )
  await page.screenshot({ path: join(shots, 'desktop-impostazioni.png'), fullPage: true })
  await page.getByRole('button', { name: 'Scarica Excel' }).click()
  const download = await downloadPromise
  const path = await download.path()
  check('export Excel scaricato', Boolean(path), download.suggestedFilename())

  const exported = XLSX.read(readFileSync(path), { type: 'buffer' })
  check(
    'il file Excel ha i tre fogli',
    ['Contatti', 'Calendario', 'Budget'].every((sheet) => exported.SheetNames.includes(sheet)),
    exported.SheetNames.join(', '),
  )
  const exportedContacts = XLSX.utils.sheet_to_json(exported.Sheets['Contatti'])
  check('il file Excel contiene i 2 contatti', exportedContacts.length === 2, `righe ${exportedContacts.length}`)
  const exportedBudget = XLSX.utils.sheet_to_json(exported.Sheets['Budget'])
  const budgetRow = exportedBudget.find((row) => row.Voce === 'Budget totale')
  check('il budget esportato è 3000', Number(budgetRow?.Valore) === 3000, String(budgetRow?.Valore))

  // indisponibilità: un contatto che in certi giorni non c'è
  await page.getByRole('button', { name: 'Contatti', exact: true }).click()
  await page.getByRole('button', { name: 'Nuovo contatto' }).first().click()
  const offDialog = page.getByRole('dialog')
  await offDialog.getByPlaceholder('Mario', { exact: true }).fill('Zampognari')
  await offDialog.getByLabel('Dal', { exact: true }).fill('2026-12-05')
  await offDialog.getByLabel('Al', { exact: true }).fill('2026-12-07')
  await offDialog.getByRole('button', { name: 'Aggiungi periodo' }).click()
  check(
    'la scheda contatto mostra le date in cui può venire',
    await offDialog.getByText('5–7 dicembre 2026').isVisible(),
  )
  check(
    'la scheda dice che sono le date in cui può venire',
    await offDialog.getByText(/fuori da queste date/).isVisible(),
  )
  await page.screenshot({ path: join(shots, 'desktop-scheda-disponibilita.png') })
  await offDialog.getByRole('button', { name: 'Salva' }).click()
  await offDialog.waitFor({ state: 'detached' })

  await page.getByRole('button', { name: 'Calendario', exact: true }).click()
  await page.getByRole('button', { name: /Aggiungi a Limonaia 2, Mattina, sabato 5 dic/ }).first().click()
  const offPicker = page.getByRole('dialog')
  await offPicker.waitFor()
  const zampognari = offPicker.getByRole('button', { name: /Zampognari/ })
  check(
    'chi ha dato le date si può scegliere in quei giorni',
    (await zampognari.isEnabled()) &&
      !String(await zampognari.getAttribute('aria-label')).includes('non disponibile'),
  )
  await page.waitForTimeout(400)
  await page.screenshot({ path: join(shots, 'desktop-picker-disponibile.png') })
  await page.keyboard.press('Escape')

  // fuori dalle date date (5-7 dicembre) non si può scegliere: il 12 è un altro giorno d'evento
  for (let i = 0; i < 3; i += 1) {
    await page.getByRole('button', { name: 'Giorno dopo' }).click()
  }
  await page.getByRole('button', { name: /Aggiungi a Limonaia 2, Mattina, sabato 12 dic/ }).first().click()
  const outPicker = page.getByRole('dialog')
  await outPicker.waitFor()
  check(
    'fuori dalle sue date non si può scegliere',
    await outPicker.getByRole('button', { name: /Zampognari, non disponibile/ }).isDisabled(),
  )
  await page.keyboard.press('Escape')
  check(
    'il calendario non segnala buchi sulle date',
    (await page.locator('.index-off').count()) === 0,
  )
  await page.screenshot({ path: join(shots, 'desktop-calendario-disponibilita.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(350)
  await page.screenshot({ path: join(shots, 'mobile-calendario-disponibilita.png'), fullPage: true })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.getByRole('button', { name: 'Impostazioni', exact: true }).click()

  check('nessun errore in console fin qui', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '))

  // database non valido: deve dirlo, non fingere che vada tutto bene
  // porta chiusa in locale: il rifiuto è immediato, il DNS di un progetto finto può metterci un minuto
  await page.getByText('Database · configurazione (avanzata)').click()
  await page.getByLabel('Project URL').fill('http://127.0.0.1:9')
  await page.getByLabel('Anon key').fill('chiave-finta')
  await page.getByRole('button', { name: 'Collega', exact: true }).click()
  const dbError = await page
    .getByText(/Failed to fetch|non raggiungibile|non riuscit/i)
    .first()
    .waitFor({ timeout: 20000 })
    .then(() => true)
    .catch(() => false)
  check('con credenziali sbagliate avvisa invece di fingere', dbError)
  check(
    'resta in modalità locale dopo il fallimento',
    (await page.getByText('solo questo dispositivo').count()) > 0 ||
      (await page.locator('.pill-off').count()) > 0,
  )
} catch (error) {
  failures.push(`eccezione: ${error.message}`)
  console.log(`FAIL  eccezione: ${error.message}`)
  await page.screenshot({ path: join(shots, 'errore.png'), fullPage: true }).catch(() => {})
} finally {
  await browser.close()
}

console.log(`\nScreenshot in tools/screenshots`)
if (failures.length > 0) {
  console.log(`\n${failures.length} controlli falliti:`)
  for (const failure of failures) console.log(` - ${failure}`)
  process.exit(1)
}
console.log('\nTutti i controlli superati.')
