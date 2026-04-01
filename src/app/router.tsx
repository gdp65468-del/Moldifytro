import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAdmin } from "@/app/RequireAdmin";
import { RequireAuth } from "@/app/RequireAuth";
import { AdminOverviewPage } from "@/pages/AdminOverviewPage";
import { AdminPaymentsPage } from "@/pages/AdminPaymentsPage";
import { AdminPlatformPage } from "@/pages/AdminPlatformPage";
import { AdminTemplatesPage } from "@/pages/AdminTemplatesPage";
import { AdminUsersPage } from "@/pages/AdminUsersPage";
import { CheckoutPage } from "@/pages/CheckoutPage";
import { CookiesPage } from "@/pages/CookiesPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { EditorPage } from "@/pages/EditorPage";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PrivacyPage } from "@/pages/PrivacyPage";
import { PublishPage } from "@/pages/PublishPage";
import { SignupPage } from "@/pages/SignupPage";
import { PlatformTemplatePublicPage } from "@/pages/PlatformTemplatePublicPage";
import { TemplatePublicPage } from "@/pages/TemplatePublicPage";
import { TermsPage } from "@/pages/TermsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "signup", element: <SignupPage /> },
      { path: "termos", element: <TermsPage /> },
      { path: "privacidade", element: <PrivacyPage /> },
      { path: "cookies", element: <CookiesPage /> },
      { path: "m/:platformTemplateId", element: <PlatformTemplatePublicPage /> },
      { path: "t/:slug", element: <TemplatePublicPage /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "dashboard", element: <DashboardPage /> },
          { path: "editor/new/frame", element: <EditorPage /> },
          { path: "editor/new/overlay", element: <EditorPage /> },
          { path: "editor/:templateId", element: <EditorPage /> },
          { path: "publish/:templateId", element: <PublishPage /> },
          { path: "checkout/:templateId", element: <CheckoutPage /> },
        ],
      },
      {
        element: <RequireAdmin />,
        children: [
          { path: "admin", element: <AdminOverviewPage /> },
          { path: "admin/templates", element: <AdminTemplatesPage /> },
          { path: "admin/payments", element: <AdminPaymentsPage /> },
          { path: "admin/users", element: <AdminUsersPage /> },
          { path: "admin/platform", element: <AdminPlatformPage /> },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
