/*!
  GymHolic Admin Panel
  — Protected admin section for business owners and consultants.
  Requires authentication via Spring Security ROLE_ADMIN.
  This is a protected route — access control is enforced on the backend.
*/

import Layout from "@/app/layout";

export default function AdminPage() {
  return (
    <Layout>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          Admin Panel
        </h1>
        <p className="mb-6">
          Welcome to the GymHolic admin panel. This section is protected
          and requires admin authentication.
        </p>
        <div className="prose lg:prose-xl max-w-2xl mx-auto py-12">
          <p>
            Admin routes are available at:
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <strong>/admin</strong> — Dashboard
            </li>
            <li>
              <strong>/admin/calendar</strong> — Calendar view
            </li>
            <li>
              <strong>/admin/bookings</strong> — Manage bookings
            </li>
            <li>
              <strong>/admin/assessments</strong> — View assessments
            </li>
            <li>
              <strong>/admin/customers</strong> — Customer profiles
            </li>
            <li>
              <strong>/admin/revenue</strong> — Revenue reports
            </li>
            <li>
              <strong>/admin/availability</strong> — Working hours settings
            </li>
            <li>
              <strong>/admin/settings</strong> — Business settings
            </li>
          </ul>
          <p className="mt-6">
            For the full admin experience, please ensure you have
            <code>ROLE_ADMIN</code> access through Spring Security
            authentication.
          </p>
        </div>
      </main>
    </Layout>
  );
}