import { BrowserRouter, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app/AppShell";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { GuestOnlyRoute, ProtectedRoute } from "@/lib/auth/ProtectedRoute";
import { NotificationProvider } from "@/lib/notifications/NotificationProvider";
import { RequireTenantAccess } from "@/lib/subscriptions/RequireTenantAccess";
import { TenantAccessProvider } from "@/lib/subscriptions/TenantAccessProvider";
import Landing from "@/routes/Landing";
import ChooseRole from "@/routes/ChooseRole";
import SignupDetails from "@/routes/SignupDetails";
import VerifyEmail from "@/routes/VerifyEmail";
import ForgotPassword from "@/routes/ForgotPassword";
import Browse from "@/routes/Browse";
import Login from "@/routes/Login";
import LandlordDashboard from "@/routes/landlord/Dashboard";
import LandlordProperties from "@/routes/landlord/Properties";
import PropertyEditor from "@/routes/landlord/PropertyEditor";
import LandlordUnits from "@/routes/landlord/Units";
import LandlordSubscriptions from "@/routes/landlord/Subscriptions";
import LandlordPayments from "@/routes/landlord/Payments";
import LandlordNotifications from "@/routes/landlord/Notifications";
import LandlordProfile from "@/routes/landlord/Profile";
import LandlordSettings from "@/routes/landlord/Settings";
import LandlordOnboarding from "@/routes/landlord/Onboarding";
import TenantHome from "@/routes/tenant/Home";
import TenantSearch from "@/routes/tenant/Search";
import TenantPropertyDetails from "@/routes/tenant/PropertyDetails";
import TenantFavourites from "@/routes/tenant/Favorites";
import TenantChats from "@/routes/tenant/Chats";
import TenantNotifications from "@/routes/tenant/Notifications";
import TenantProfile from "@/routes/tenant/Profile";
import TenantOnboarding from "@/routes/tenant/Onboarding";
import { StubPage } from "@/routes/StubPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
        <Routes>
          <Route path="/" element={<Landing />} />

          {/* Auth screens bounce a signed-in visitor to their dashboard. */}
          <Route element={<GuestOnlyRoute />}>
            {/* /signup is always the chooser — never a form. SignupDetails
                bounces back here when it lacks a valid role. */}
            <Route path="/signup" element={<ChooseRole />} />
            <Route path="/signup/details" element={<SignupDetails />} />
            <Route path="/login" element={<Login />} />
            {/* Verification is its own route, not a step inside signup: it is
                also where a stalled login sends someone who never verified. */}
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          <Route path="/browse" element={<Browse />} />

          {/* Landlord app. `role` is pinned because a tenant here would collect
              403 INSUFFICIENT_PERMISSIONS from every call on the page.

              Onboarding sits inside the shell rather than in front of it: the
              backend's two gates (no profile, unapproved profile) are surfaced
              as banners by <VerificationNotice>, not as a redirect, so a landlord
              part-way through setup can still look around and sign out. */}
          <Route element={<ProtectedRoute role="LANDLORD" />}>
            <Route path="/landlord" element={<AppShell role="LANDLORD" />}>
              <Route index element={<LandlordDashboard />} />
              <Route path="onboarding" element={<LandlordOnboarding />} />
              <Route path="properties" element={<LandlordProperties />} />
              {/* Both point at the same editor, which switches on `propertyId`.
                  The static segment is declared as well as the dynamic one so the
                  route table reads the way the links do. */}
              <Route path="properties/new" element={<PropertyEditor />} />
              <Route path="properties/:propertyId" element={<PropertyEditor />} />
              <Route path="units" element={<LandlordUnits />} />
              <Route path="subscriptions" element={<LandlordSubscriptions />} />
              <Route path="payments" element={<LandlordPayments />} />
              <Route path="notifications" element={<LandlordNotifications />} />
              <Route path="profile" element={<LandlordProfile />} />
              <Route path="settings" element={<LandlordSettings />} />
            </Route>
          </Route>

          {/* Tenant app. Pinned to TENANT for the same reason as the landlord
              tree: `GET /properties` answers a landlord with *their own*
              properties, so a landlord here would see a search page listing only
              their listings — <Browse> sends them to their dashboard instead.

              Onboarding is inside the shell because it is skippable: a tenant
              profile gates nothing, so there is no state where the app must stop
              them from looking around. */}
          <Route element={<ProtectedRoute role="TENANT" />}>
            {/* The browsing pass is fetched once here, not per screen. Scoped to
                the tenant tree rather than hoisted to <AuthProvider> so a
                landlord never spends a request being told they're exempt. */}
            <Route
              element={
                <TenantAccessProvider>
                  <Outlet />
                </TenantAccessProvider>
              }
            >
              <Route path="/tenant" element={<AppShell role="TENANT" />}>
                {/* Outside the pass gate, deliberately: someone's own account
                    details — and the sign-out button in this shell — must not be
                    locked behind a payment. Chats are excluded too, because a
                    conversation already started belongs to the tenant, and the
                    backend does not gate it either. */}
                <Route path="onboarding" element={<TenantOnboarding />} />
                <Route path="chats" element={<TenantChats />} />
                <Route path="notifications" element={<TenantNotifications />} />
                <Route path="profile" element={<TenantProfile />} />

                {/* The catalogue. These four are exactly what
                    `requireTenantAccess` guards on the backend, so the gate here
                    and the middleware there cover the same ground. */}
                <Route element={<RequireTenantAccess />}>
                  <Route index element={<TenantHome />} />
                  <Route path="search" element={<TenantSearch />} />
                  <Route path="properties/:propertyId" element={<TenantPropertyDetails />} />
                  <Route path="favorites" element={<TenantFavourites />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route
            path="*"
            element={
              <StubPage
                title="Page not found"
                body="That page doesn't exist yet. It may be part of a milestone still in progress."
              />
            }
          />
        </Routes>
        </NotificationProvider>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
