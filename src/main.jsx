import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './i18n/i18n.js'

// Font decision: Cairo for Arabic text, Poppins for English text — both
// self-hosted via @fontsource instead of a Google Fonts CDN link, so the
// page never depends on reaching an external font host at runtime. Inter
// is not used anywhere in this app.
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/500.css'
import '@fontsource/cairo/600.css'
import '@fontsource/cairo/700.css'
import '@fontsource/cairo/800.css'

// Poppins weights loaded: only the ones actually used by an element that
// renders in Poppins (checked via `grep -rn "font-weight" src`) —
// 400 (default/regular weight for untouched English body text), 600
// (Login button, language switcher toggle), 700 (welcome title), 800 (the
// "PLAYVO" mention in the footer note).
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/600.css'
import '@fontsource/poppins/700.css'
import '@fontsource/poppins/800.css'

// Baloo — used ONLY for the PLAYVO logo wordmark (.login-wordmark in
// Login.css, .auth-hero-logo-text in AuthLayout.css and .dashboard-wordmark
// in DashboardLayout.css), never for normal
// UI text. It is loaded from the local file
// src/assets/fonts/Baloo-Regular.ttf via @font-face in index.css, not from
// an npm package.

import './index.css'
import App from './App.jsx'
import AuthProvider from './context/AuthProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
