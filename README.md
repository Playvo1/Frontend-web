# Playvo Web

Admin and Venue Owner dashboards for Playvo (React + Vite).

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — run oxlint
- `npm run preview` — preview the production build

## Current status

- `/login` — shared login for Admin and Venue Owner (no self-registration).
- `/forgot-password`, `/verify-code`, `/reset-password` — password reset flow
  (mock reset code while on mock auth: `123456`).
- `/venue-owner/dashboard` — role-protected Venue Owner dashboard (Figma),
  rendered from local **mock data** (`src/mocks/mockVenueOwnerDashboard.js`
  via `src/services/dashboardService.js`) until a backend endpoint exists.
- `/admin/dashboard` — role-protected, temporary placeholder page until the
  real Admin dashboard is built.
- Authentication runs on **mock data** by default. A real API layer for the
  Laravel backend (`src/services/apiClient.js`, `authApi.js`) is ready but
  only switches on when `VITE_API_BASE_URL` is set (see below).

## Backend API

- Configuration: `VITE_API_BASE_URL` (see `.env.example`) — the backend host
  only; requests go to `${VITE_API_BASE_URL}/api/v1/...`.
- **Empty (current):** mock auth (`src/services/authMock.js`), no network
  requests. The backend team has not confirmed a URL yet.
- **Set:** real Sanctum bearer-token auth against the confirmed endpoints
  (`/auth/login`, `/auth/logout`, `/auth/forgot-password`,
  `/auth/verify-reset-otp`, `/auth/reset-password`). Put the value in
  `.env.local` (git-ignored) and restart `npm run dev`.
- `src/services/authService.js` picks the implementation; pages don't change.

### Mock accounts (development only)

| Email               | Password     | Result                          |
| ------------------- | ------------ | ------------------------------- |
| `admin@playvo.com`  | `Admin@123`  | Admin dashboard                 |
| `owner@playvo.com`  | `Owner@123`  | Venue Owner dashboard           |
| `locked@playvo.com` | `Locked@123` | "Account locked" error          |
| `player@playvo.com` | `Player@123` | "No dashboard access" error     |

## Typography & brand

- Arabic → Cairo, English → Poppins (self-hosted via `@fontsource`).
- Baloo → PLAYVO logo wordmark only (local file `src/assets/fonts/Baloo-Regular.ttf`).
- Brand colors: Navy `#01213D`, Orange `#FC4B01` (tokens in `src/index.css`).
