# Playvo Web

Playvo is a sports facility booking and management platform, starting with
football venues in Gaza.

This repository contains the platform's **web interfaces**:

- **Venue Owner dashboard** — venue profile and photos, time slots, bookings,
  ratings, analytics, profile and notifications.
- **Admin dashboard** — platform statistics, notifications and the admin profile.

The player experience is a separate Flutter mobile app, and the API is a
separate Laravel project. This app only consumes that API.

## Tech stack

| Area                    | Library                                                                                 |
| ----------------------- | --------------------------------------------------------------------------------------- |
| UI                      | React 19                                                                                |
| Build tool / dev server | Vite 7 (`@vitejs/plugin-react`)                                                         |
| Routing                 | React Router 7 (`react-router-dom`)                                                     |
| Internationalization    | i18next + react-i18next (Arabic / English)                                              |
| Icons                   | lucide-react                                                                            |
| Fonts                   | `@fontsource/cairo`, `@fontsource/poppins` (self-hosted); Baloo (local file, logo only) |
| Linting                 | oxlint                                                                                  |
| Styling                 | Plain CSS per component, design tokens in `src/index.css`                               |

## Requirements

- **Node.js** `^20.19.0` or `>=22.12.0` (required by Vite 7)
- **npm** (`package-lock.json` is committed)

## Getting started

```bash
git clone https://github.com/Playvo1/Frontend-web.git
cd Frontend-web
npm ci
```

`npm ci` installs the exact versions from `package-lock.json`.

Create your local environment file from the example:

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env.local
```

```bash
# Linux / macOS
cp .env.example .env.local
```

To use the backend, set `VITE_API_BASE_URL` in `.env.local` (see [Backend configuration](#backend-configuration)).
Leave it empty to run the app in demo mode.

Then start the dev server:

```bash
npm run dev
```

The dev server prints the local URL (Vite's default is `http://localhost:5173`).

## Scripts

| Command           | Description                        |
| ----------------- | ---------------------------------- |
| `npm run dev`     | Start the Vite dev server          |
| `npm run build`   | Production build into `dist/`      |
| `npm run preview` | Serve the production build locally |
| `npm run lint`    | Run oxlint                         |

## Backend configuration

| Variable            | Description                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | Backend **host only**, without `/api/v1`. The app adds the `/api/v1` prefix to every request. |

Put the value in `.env.local` (git-ignored) and restart the dev server after
changing it. Ask the backend team for the host of the environment you need.
On a hosting platform, set the variable in the project's environment settings
before building.

### Demo mode

When `VITE_API_BASE_URL` is empty, the app runs in **demo mode**. It is meant
for UI development and design review only; nothing shown in demo mode is real
data.

- No network request is sent (`src/services/apiClient.js` refuses requests
  while the URL is empty).
- Sign-in and password reset use local mock accounts (`src/services/authMock.js`).
- The Venue Owner dashboard, bookings and booking details, time slots, venue
  page, reviews, analytics and notifications, and the Admin dashboard and
  notifications, read local mock data from `src/mocks/`.
- The profile pages show the details of the signed-in demo session.
- Most actions are not saved:
  - Saving the profile and saving the venue cover photo report that this is
    not available in demo mode.
  - Deleting a time slot is disabled, and the "create slot" dialog saves
    nothing.
  - Venue edits, photo removal and "mark as read" only change the open page
    and are lost on reload.

Demo mode is never used as a fallback when `VITE_API_BASE_URL` is set.

### How API calls work

- Requests go through `src/services/apiClient.js`, which expects the backend's
  response shape `{ success, data, message, errors }` and throws an `ApiError`
  with the HTTP status (`0` for network failures) and any field errors (422).
- Each page uses its own service in `src/services/`. Values the API does not
  return are shown as "not available" instead of being invented.
- Authenticated requests send `Authorization: Bearer <token>` (Laravel
  Sanctum). A `401` response signs the user out. Pages show loading, empty and
  error states, with a retry where it makes sense.
- The session is kept in `localStorage` (`playvo_session`) and tagged with the
  auth mode, so a demo-mode session is never reused against the API.

## Pages and backend integration

Status legend:

- **Connected** — implemented against the API and checked with real API responses.
- **Implemented – Unverified** — calls the documented endpoint and passed local
  checks against a stubbed API during development (those checks are not part of
  this repository), but has not been verified end-to-end against a backend
  environment yet.
- **Partial** — some of the page's features work with the API, others do not
  (details in the notes).
- **Not Connected** — the screen exists, but the feature makes no API call.

### Authentication

| Route                                                                           | Status                   | Notes                                                                           |
| ------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| `/login`                                                                        | Connected                | Venue Owner sign-in (`POST /auth/login`). Sign-out uses `POST /auth/logout`.    |
| `/admin/login`                                                                  | Implemented – Unverified | Admin sign-in (`POST /auth/login`).                                             |
| `/forgot-password`, `/admin/forgot-password`, `/verify-code`, `/reset-password` | Implemented – Unverified | `POST /auth/forgot-password`, `/auth/verify-reset-otp`, `/auth/reset-password`. |

There is no self-registration: accounts are created by an administrator. Each
sign-in page accepts only its own role.

### Venue Owner (`/venue-owner/...`)

| Route                 | Status    | Notes                                                                                                                                                                                                                                                                             |
| --------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dashboard`           | Partial   | Statistics (today, this week, this month, last month), today's schedule and the weekly bookings chart are connected. Daily revenue is not provided by the API, so the revenue chart shows "not available".                                                                        |
| `bookings`            | Connected | Booking list.                                                                                                                                                                                                                                                                     |
| `bookings/:bookingId` | Partial   | Booking details are connected. The payment receipt image is shown from the URL returned by the API; some stored receipt links currently return 404, in which case the page shows that the image is unavailable.                                                                   |
| `slots`               | Partial   | Listing slots is connected. Creating, editing and deleting slots are Implemented – Unverified.                                                                                                                                                                                    |
| `facility`            | Partial   | Venue details, cover photo and photos are read from the API. Editing details (only changed fields are sent), photo upload, setting the cover and deleting photos are Implemented – Unverified. Venue status is read-only for owners. Photo reordering is not available in the UI. |
| `reviews`             | Connected | Average rating, star distribution, reviews with player names, pagination.                                                                                                                                                                                                         |
| `analytics`           | Partial   | This month's occupancy, revenue and bookings are connected. The trend and peak-hours charts are Not Connected.                                                                                                                                                                    |
| `profile`             | Partial   | Account details are read from the API; saving details and the profile photo are Implemented – Unverified. Changing the password is Not Connected (no API endpoint).                                                                                                               |
| `notifications`       | Partial   | Notification list and unread count are connected. "Mark as read" is Implemented – Unverified. The API has no "mark all as read" or delete endpoint, and the page does not offer them.                                                                                             |

### Admin (`/admin/...`)

| Route                                | Status                   | Notes                                                                                                                                                                                      |
| ------------------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dashboard`                          | Implemented – Unverified | Platform statistics, most-booked venues and most-active cities (`GET /admin/dashboard`).                                                                                                   |
| `notifications` (`/unread`, `/read`) | Implemented – Unverified | Mark one as read uses `PUT /notifications/{id}/read`. "Mark all as read" sends one request per unread notification (no bulk endpoint).                                                     |
| `profile`                            | Not Connected            | Shows the details of the signed-in session. Editing the details, uploading a photo and changing the password are Not Connected. Only the top-bar avatar is read from `GET /admin/profile`. |

Admin pages for venues, venue owners, payment receipt verification and admin
accounts are not implemented yet. Unknown routes redirect to the signed-in
user's home page.

## Project structure

```

src/
assets/ images, logo and the Baloo logo font
components/ shared UI (layouts, Button, Input, Card, StatCard, charts, Toast, LanguageSwitcher)
config/ API configuration (api.js) and contact details
constants/ roles and navigation
context/ authentication (AuthProvider)
hooks/ shared hooks
i18n/ i18next setup and Arabic / English translations
mocks/ demo-mode data
pages/ one folder per page
routes/ route guards (ProtectedRoute, GuestRoute, HomeRedirect)
services/ API and demo-mode services, one per area
styles/ shared styles
utils/ helpers (validation, request errors)
public/ static files served as-is (favicons)

```

## Brand, language and layout

- **Colors:** Navy `#01213D` (structure, text) and Orange `#FC4B01` (actions
  and accents, never the dominant background), defined as tokens in
  `src/index.css` together with the neutral and status colors of the Playvo
  Brand Visual System.
- **Fonts:** Cairo for Arabic and Poppins for English, both self-hosted with
  `@fontsource`. Baloo is used **only** for the PLAYVO wordmark.
- **Logo:** use the provided logo files as they are (no redrawing, recoloring
  or distortion).
- **Languages:** Arabic (RTL, default) and English (LTR) through
  react-i18next. The page direction follows the selected language, and the
  choice is remembered in the browser (`playvo_lang`). The language switcher
  is currently available on the sign-in and password-reset screens.
- **Responsive targets:** 390, 768, 1440 and 1920 px wide.

## SPA routing configuration

This is a single-page application: React Router handles every route in the
browser. When a user refreshes or opens a deep link such as
`/venue-owner/bookings`, the server must return `index.html` instead of a 404
so the app can render that route.

`vercel.json` contains this rule (`/(.*)` → `/index.html`) for deployments
served by Vercel. Any other host needs an equivalent fallback to `index.html`.

## Contributing

- Follow the team's _Playvo Team Development & Integration Guidelines_:
  naming, the shared data model (exact entity and field names) and the unified
  API response contract.
- Run `npm run lint` and `npm run build` before opening a pull request. Passing
  both only means the code compiles and follows the lint rules; it does not
  replace testing.
- Use the existing shared components and the tokens in `src/index.css` instead
  of new colors or fonts, and check every change in both Arabic (RTL) and
  English (LTR).
- Never commit `.env.local` or any file containing secrets.
- There is no automated test suite yet: no test runner is configured, and the
  component tests and per-page integration tests required by the guidelines
  are still to be added. Continuous integration (GitHub Actions) is not
  configured in this repository yet.
