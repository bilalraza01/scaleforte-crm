import { http } from "@/lib/http"
import type { User } from "@/types/user"

export async function signIn(input: { email: string; password: string }): Promise<User> {
  const { data } = await http.post<User>("/api/v1/auth/sign_in", { user: input })
  return data
}

export async function signOut(): Promise<void> {
  await http.delete("/api/v1/auth/sign_out")
}

export async function fetchMe(): Promise<User> {
  const { data } = await http.get<User>("/api/v1/me")
  return data
}

export async function acceptInvitation(input: {
  invitation_token: string
  password: string
  password_confirmation: string
  name?: string
}): Promise<User> {
  const { data } = await http.put<User>("/api/v1/auth/invitation", { user: input })
  return data
}

export async function previewInvitation(token: string): Promise<User> {
  const { data } = await http.get<User>(`/api/v1/auth/invitations/${token}`)
  return data
}
