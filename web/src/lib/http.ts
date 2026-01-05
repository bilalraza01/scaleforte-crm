import axios, { AxiosError } from "axios"

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3010",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
})

// 401 from a protected endpoint = session expired or token revoked.
// Trigger a hard redirect to /login so the AuthProvider can re-bootstrap.
http.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== "undefined") {
      const onLoginPage = window.location.pathname.startsWith("/login")
      const onAcceptInvitation = window.location.pathname.startsWith("/accept-invitation")
      if (!onLoginPage && !onAcceptInvitation) {
        window.location.assign("/login")
      }
    }
    return Promise.reject(err)
  }
)

export type ApiError = AxiosError<{ error?: string; errors?: Record<string, string[]> }>
