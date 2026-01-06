import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { AuthProvider } from "@/auth/AuthProvider"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { AcceptInvitationPage } from "@/pages/AcceptInvitationPage"
import { UsersPage } from "@/pages/UsersPage"
import { InviteUserPage } from "@/pages/InviteUserPage"
import { CategoriesPage } from "@/pages/CategoriesPage"
import { CampaignsPage } from "@/pages/CampaignsPage"
import { WorklistPage } from "@/pages/WorklistPage"
import { BrandEditPage } from "@/pages/BrandEditPage"
import { ReviewPage } from "@/pages/ReviewPage"
import { AppShell } from "@/components/AppShell"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/worklist" element={<WorklistPage />} />
              <Route path="/brands/:id" element={<BrandEditPage />} />
              <Route
                path="/review"
                element={
                  <ProtectedRoute roles={["admin", "manager"]}>
                    <ReviewPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute roles={["admin", "manager"]}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users/invite"
                element={
                  <ProtectedRoute roles={["admin", "manager"]}>
                    <InviteUserPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/categories"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <CategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns"
                element={
                  <ProtectedRoute roles={["admin"]}>
                    <CampaignsPage />
                  </ProtectedRoute>
                }
              />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
