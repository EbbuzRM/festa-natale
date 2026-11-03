import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { StoreProvider } from './lib/store'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root mancante')

createRoot(root).render(
  <StrictMode>
    <StoreProvider>
      <App />
    </StoreProvider>
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      /* offline non disponibile: l'app funziona lo stesso */
    })
  })
}
