/*!
  GymHolic Privacy Policy
  — Used for Google Cloud OAuth verification and public site compliance.
  This page is publicly accessible without authentication.
*/

import Layout from "@/app/layout";

export default function PrivacyPage() {
  return (
    <Layout>
      <main className="prose lg:prose-xl max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          Privacy Policy
        </h1>

        <p className="mb-6">
          Last updated: August 14, 2026
        </p>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            GymHolic and Google Services
          </h2>

          <p className="mb-6">
            GymHolic provides gym consulting and booking services. As part of our
            service, we offer experts the ability to connect their Google Calendar
            to streamline consultation scheduling and booking management.
          </p>

          <h3 className="text-xl font-medium mb-3">
            Google API Access
          </h3>

          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              GymHolic uses Google Calendar API to create and manage consultation
              events and Google Meet conference links for booked sessions.
            </li>
            <li>
              Access is limited to the expert's calendar data necessary for
              scheduling: event details, meeting links, and availability.
            </li>
            <li>
              GymHolic does not share expert calendar data with third parties
              except as required by Google's service terms.
            </li>
            <li>
              Booking and payment information processed by the Spring Boot
              backend is stored separately from Google Calendar data.
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-3">
            Data Storage and Protection
          </h3>

          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              Google refresh tokens obtained via OAuth are stored encrypted in
              the PostgreSQL database, associated with the expert's user account.
            </li>
            <li>
              Calendar event data (titles, times, Meet links) is stored in
              connection with the booking it supports.
            </li>
            <li>
              Experts can revoke Google Calendar access at any time from their
              GymHolic settings page, which will invalidate the stored refresh
              token and stop further API calls.
            </li>
            <li>
              All Google API communications use HTTPS and OAuth 2.0 flow with
              token rotation as recommended by Google.
            </li>
          </ul>

          <h3 className="text-xl font-medium mb-3">
            User Controls
          </h3>

          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              Experts can disconnect their Google Calendar at any time from the
              GymHolic application settings.
            </li>
            <li>
              Users booking consultations do not have direct Google API access;
              their data is confined to the booking confirmation and scheduling
              information.
            </li>
            <li>
              Any user may request deletion of their booking data by contacting
              the support team via the email listed on the site.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Third-Party Services
          </h2>

          <p className="mb-6">
            GymHolic incorporates the following third-party services that may
            process data:
          </p>

          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              <strong>Google Calendar API:</strong> For creating and managing
              consultation events and Google Meet conference links. Google's
              privacy policy applies: <a href="https://policies.google.com/privacy"
                target="_blank" rel="noopener noreferrer"
                >policies.google.com/privacy</a>
            </li>
            <li>
              <strong>Stripe:</strong> For processing payment transactions.
              Stripe's privacy policy applies.
            </li>
            <li>
              <strong>Upstash Redis:</strong> For shared storage of booked slots
              and orders. Upstash's privacy policy applies.
            </li>
            <li>
              <strong>Resend:</strong> For transactional email confirmations.
              Resend's privacy policy applies.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Contact
          </h2>

          <p className="mb-6">
            If you have questions about this Privacy Policy or data practices,
            contact us at the support email listed on the GymHolic website.
          </p>
        </section>
      </main>
    </Layout>
  );
}