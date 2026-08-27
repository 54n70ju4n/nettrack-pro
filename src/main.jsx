import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// In dev, unregister any stale service workers left from a previous production
// build. A cache-serving worker can return stale /node_modules/.vite or /src
// chunks that mismatch the live dev modules, which surfaces as
// "Cannot read properties of null (reading 'useState')" when React's hooks
// dispatcher ends up null due to duplicate/mismatched module instances.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister());
  }).catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)