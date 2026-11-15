import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
//
// Demo / API mode is decided at BUILD time from VITE_API_BASE_URL (the
// backend host, without "/api/v1"; see .env.example and src/config/api.js):
//   - set   -> API mode: __PLAYVO_API_ENABLED__ is the literal `true`, so
//              every demo branch in the services is removed from the bundle
//              together with the mock data it loads (src/mocks, authMock.js
//              and the demo photos);
//   - empty -> demo mode: the mocks are loaded on demand (their own chunks).
// The value is normalised exactly like src/config/api.js does (trimmed,
// trailing slashes removed), so the flag and API_BASE_URL always agree.
//
// In API builds the demo modules (src/mocks/* and src/services/authMock.js)
// are also replaced by empty modules (excludeDemoData below), so their data
// and the demo photos they import never enter the build, not even as unused
// files in dist/assets. They are only reachable from demo branches, which the
// flag above already removes.
//
// Build guard: on Vercel (VERCEL is set on every Vercel build, production and
// preview) a build without VITE_API_BASE_URL stops with an error instead of
// publishing the demo app (mock sign-in). Local builds and `npm run dev`
// without it still run in demo mode.

// Demo-only modules: every file in src/mocks and the mock sign-in.
const isDemoModule = (id) => {
  const file = id.split('?')[0].replace(/\\/g, '/')
  return file.includes('/src/mocks/') || file.endsWith('/src/services/authMock.js')
}

function excludeDemoData() {
  return {
    name: 'playvo-exclude-demo-data',
    enforce: 'pre',
    load(id) {
      return isDemoModule(id) ? 'export {}' : null
    },
  }
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiBaseUrl = String(env.VITE_API_BASE_URL ?? '')
    .trim()
    .replace(/\/+$/, '')

  if (command === 'build' && process.env.VERCEL && apiBaseUrl === '') {
    throw new Error(
      'VITE_API_BASE_URL is not set for this Vercel build. Set it in the Vercel project settings ' +
        '(Environment Variables, for Production and Preview) to the backend host without "/api/v1", ' +
        'e.g. https://playvo-backend.onrender.com — otherwise the site would be published in demo mode.',
    )
  }

  const isApiBuild = apiBaseUrl !== ''

  return {
    plugins: [react(), ...(command === 'build' && isApiBuild ? [excludeDemoData()] : [])],
    define: {
      __PLAYVO_API_ENABLED__: JSON.stringify(isApiBuild),
    },
  }
})
