// MOCK DATA — development only. Remove once authService talks to the real
// Laravel endpoint (POST /api/v1/auth/login).
//
// Accounts are pre-created here because Playvo has no self-registration for
// Admin / Venue Owner (SRS FR-18, FR-32). Passwords are plain text ONLY
// because this is a local mock; the real backend stores password_hash.
export const MOCK_USERS = [
  {
    id: 1,
    name: 'Playvo Admin',
    email: 'admin@playvo.com',
    password: 'Admin@123',
    roles: ['admin'],
    status: 'active',
  },
  {
    id: 2,
    name: 'أحمد علي',
    email: 'owner@playvo.com',
    password: 'Owner@123',
    roles: ['venue_owner'],
    status: 'active',
  },
  {
    // Simulates the documented lockout state (Guidelines §2.4) so the
    // "account locked" error can be seen in the UI.
    id: 3,
    name: 'Locked Owner',
    email: 'locked@playvo.com',
    password: 'Locked@123',
    roles: ['venue_owner'],
    status: 'locked',
  },
  {
    // A mobile-app player: valid credentials, but no web dashboard access.
    id: 4,
    name: 'Player',
    email: 'player@playvo.com',
    password: 'Player@123',
    roles: ['player'],
    status: 'active',
  },
]
