import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { fetchMe, signIn as apiSignIn, signOut as apiSignOut } from "@/api/auth"
import type { User } from "@/types/user"

type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User }

interface AuthContextValue {
  state: AuthState
  user: User | null
  signIn: (email: string, password: string) => Promise<User>
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" })

  const refresh = async () => {
    try {
      const user = await fetchMe()
      setState({ status: "authenticated", user })
    } catch {
      setState({ status: "anonymous" })
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  const signIn = async (email: string, password: string) => {
    const user = await apiSignIn({ email, password })
    setState({ status: "authenticated", user })
    return user
  }

  const signOut = async () => {
    try {
      await apiSignOut()
    } finally {
      setState({ status: "anonymous" })
    }
  }

  const user = state.status === "authenticated" ? state.user : null

  return (
    <AuthContext.Provider value={{ state, user, signIn, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>")
  return ctx
}
