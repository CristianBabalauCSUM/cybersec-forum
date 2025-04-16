// components/ClientSessionProvider.tsx
'use client'
import { createContext, useContext, ReactNode } from 'react'

// Define proper types for your session
type SessionUser = {
  name?: string | null
  email?: string | null
  image?: string | null
  id?: string | null
}

type SessionType = {
  user?: SessionUser | null
} | null

const SessionContext = createContext<SessionType>(null)

export function ClientSessionProvider({ 
  children, 
  session 
}: { 
  children: ReactNode, 
  session: SessionType 
}) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
}

export function useClientSession() {
  return useContext(SessionContext)
}