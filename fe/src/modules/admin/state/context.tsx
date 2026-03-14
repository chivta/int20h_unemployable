import { createContext, useContext, useReducer } from 'react'
import type { ReactNode } from 'react'
import { reducer, initialState } from './reducer'
import type { FullState } from './reducer'
import type { Action } from './actions'

interface AppContextValue {
  state: FullState
  dispatch: React.Dispatch<Action>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppContext must be used within AppProvider')
  return ctx
}
