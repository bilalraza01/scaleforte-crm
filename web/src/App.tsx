import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { AuthProvider } from "@/auth/AuthProvider"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { RequireWorkspace } from "@/auth/RequireWorkspace"
import { HomeRedirect } from "@/auth/HomeRedirect"
import { LoginPage } from "@/pages/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { AcceptInvitationPage } from "@/pages/AcceptInvitationPage"
import { UsersPage } from "@/pages/UsersPage"
import { InviteUserPage } from "@/pages/InviteUserPage"
import { EditUserPage } from "@/pages/EditUserPage"
import { CategoriesPage } from "@/pages/CategoriesPage"
import { CampaignsPage } from "@/pages/CampaignsPage"
import { WorklistPage } from "@/pages/WorklistPage"
import { BrandEditPage } from "@/pages/BrandEditPage"
import { ReviewPage } from "@/pages/ReviewPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { RepliesPage } from "@/pages/RepliesPage"
import { PushPage, PushDetailPage } from "@/pages/PushPage"
import { AuditLogPage } from "@/pages/AuditLogPage"
import { OnboardingPlaceholderPage } from "@/pages/OnboardingPlaceholderPage"
import { RetentionPlaceholderPage } from "@/pages/RetentionPlaceholderPage"
import { InvoicingPlaceholderPage } from "@/pages/InvoicingPlaceholderPage"
import { ProfilePage } from "@/pages/ProfilePage"
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

// Tiny helper for legacy `/brands/:id` and `/push/:id` redirects so we can
// preserve the URL parameter while changing the prefix.
function ParamRedirect({ to }: { to: (id: string) => string }) {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={to(id ?? "")} replace />
}

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
              {/* Acquisition workspace */}
              <Route path="/acquisition" element={<RequireWorkspace ws="acquisition" />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="worklist"  element={<WorklistPage />} />
                <Route path="brands/:id" element={<BrandEditPage />} />
                <Route
                  path="review"
                  element={
                    <ProtectedRoute roles={["admin", "manager"]}>
                      <ReviewPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="replies"
                  element={
                    <ProtectedRoute roles={["admin", "manager"]}>
                      <RepliesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="push"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <PushPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="push/:id"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <PushDetailPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Placeholder workspaces */}
              <Route path="/onboarding" element={<RequireWorkspace ws="onboarding" />}>
                <Route index element={<OnboardingPlaceholderPage />} />
              </Route>
              <Route path="/retention" element={<RequireWorkspace ws="retention" />}>
                <Route index element={<RetentionPlaceholderPage />} />
              </Route>
              <Route path="/invoicing" element={<RequireWorkspace ws="invoicing" />}>
                <Route index element={<InvoicingPlaceholderPage />} />
              </Route>

              {/* Settings — admin-y everything */}
              <Route path="/settings" element={<RequireWorkspace ws="settings" />}>
                <Route index element={<Navigate to="users" replace />} />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute roles={["admin", "manager"]}>
                      <UsersPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users/new"
                  element={
                    <ProtectedRoute roles={["admin", "manager"]}>
                      <InviteUserPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="users/:id/edit"
                  element={
                    <ProtectedRoute roles={["admin", "manager"]}>
                      <EditUserPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="categories"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <CategoriesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="campaigns"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <CampaignsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="audit-log"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <AuditLogPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="system"
                  element={
                    <ProtectedRoute roles={["admin"]}>
                      <SettingsPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Profile — top-level so users without `settings` access (sdr,
                  onboarder, accountant) can still reach their own page. */}
              <Route path="/profile" element={<ProfilePage />} />

              {/* Backwards-compat redirects from the pre-workspace flat URLs */}
              <Route path="/dashboard"    element={<Navigate to="/acquisition/dashboard" replace />} />
              <Route path="/worklist"     element={<Navigate to="/acquisition/worklist" replace />} />
              <Route path="/review"       element={<Navigate to="/acquisition/review" replace />} />
              <Route path="/replies"      element={<Navigate to="/acquisition/replies" replace />} />
              <Route path="/push"         element={<Navigate to="/acquisition/push" replace />} />
              <Route path="/push/:id"     element={<ParamRedirect to={(id) => `/acquisition/push/${id}`} />} />
              <Route path="/brands/:id"   element={<ParamRedirect to={(id) => `/acquisition/brands/${id}`} />} />
              <Route path="/users"        element={<Navigate to="/settings/users" replace />} />
              <Route path="/users/invite" element={<Navigate to="/settings/users/new" replace />} />
              <Route path="/categories"   element={<Navigate to="/settings/categories" replace />} />
              <Route path="/campaigns"    element={<Navigate to="/settings/campaigns" replace />} />
              <Route path="/audit-log"    element={<Navigate to="/settings/audit-log" replace />} />
            </Route>

            <Route path="/" element={<HomeRedirect />} />
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}

export default App
