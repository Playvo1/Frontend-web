import { createContext } from 'react'

// Kept in its own file (separate from AuthProvider.jsx) so the provider file
// only exports a component — required for React Fast Refresh.
export const AuthContext = createContext(null)
