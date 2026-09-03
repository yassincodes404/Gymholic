/* eslint react/no-unescaped-entities: off */
/*!  GymHolic Privacy Policy — Used for Google Cloud OAuth verification and public site compliance. This page is publicly accessible without authentication. */

import Link from "next/link";
import Layout from "@/app/layout";

export default function PrivacyPage() {
  return (
    <Layout>
      <main className="prose lg:prose-xl max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          Privacy Policy
        </h1>
        <p className="mb-6">
          Last updated: September 3, 2026
        </p>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            What GymHolic is
          </h2>
          <p className="mb-6">
            GymHolic is a gym consulting and booking platform: gym owners and
            trainers book one-on-one consultation sessions, and purchase
            digital blueprints and Academy memberships. This policy explains
            what data we collect, why, how it is stored, and how you can
            remove it.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            GymHolic and Google Services
          </h2>
          <p className="mb-6">
            GymHolic offers experts (the professionals whose calendars power
            the booking system) the ability to connect their Google Calendar,
            so confirmed consultations appear on their calendar with a Google
            Meet link attached.
          </p>
          <h3 className="text-xl font-medium mb-3">
            What we access, and why
          </h3>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              <strong>Google Calendar — events only</strong> (scope{" "}
              <code>https://www.googleapis.com/auth/calendar.events</code>):
              GymHolic creates, updates and deletes the consultation events it
              books on the connected expert&apos;s primary calendar, and
              attaches a Google Meet conference link to those events. GymHolic
              does not read, list or modify any calendar events outside the
              ones it created.
            </li>
            <li>
              <strong>Your email address</strong> (scope{" "}
              <code>https://www.googleapis.com/auth/userinfo.email</code>):
              read once, at connection time, so GymHolic can show you which
              Google account is connected.
            </li>
          </ul>
          <h3 className="text-xl font-medium mb-3">
            How that data is stored and protected
          </h3>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              The Google OAuth refresh token is stored encrypted (AES-256-GCM)
              in GymHolic&apos;s PostgreSQL database, tied to the expert&apos;s
              account. The connected account&apos;s email address and Google
              account ID are stored alongside it.
            </li>
            <li>
              Tokens are never displayed, logged, or shared. All Google API
              communication happens server-to-server over HTTPS.
            </li>
            <li>
              Consultation events created by GymHolic remain on your calendar
              even if you disconnect; you can delete them like any other
              calendar event.
            </li>
            <li>
              We keep Google connection data only while the connection is
              active. Disconnecting (see below) or deleting your account
              deletes the stored token immediately.
            </li>
          </ul>
          <h3 className="text-xl font-medium mb-3">
            What we never do with Google user data
          </h3>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              We do not sell, rent or share Google user data with third
              parties, and we do not use it for advertising or marketing.
            </li>
            <li>
              We do not allow humans to read Google user data, except with
              your consent, to provide or repair the calendar feature itself,
              or when required by law.
            </li>
            <li>
              We do not transfer Google user data for any purpose other than
              providing the booking feature described above. GymHolic&apos;s
              use of information received from Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </li>
          </ul>
          <h3 className="text-xl font-medium mb-3">
            Disconnecting and revoking access
          </h3>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              Experts can disconnect their Google Calendar at any time from
              GymHolic&apos;s integration settings; this immediately deletes
              the stored refresh token and stops all Google API calls.
            </li>
            <li>
              You can also revoke GymHolic&apos;s access directly from your
              Google account at{" "}
              <a
                href="https://myaccount.google.com/permissions"
                target="_blank"
                rel="noopener noreferrer"
              >
                myaccount.google.com/permissions
              </a>
              .
            </li>
            <li>
              Clients who book consultations never grant GymHolic any Google
              access; their data stays within GymHolic as described below.
            </li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Booking &amp; Payment Data
          </h2>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              For each booking we store your name, email, session details and
              meeting notes so the consultation can be delivered, reminded and
              rescheduled.
            </li>
            <li>
              Accounts store a phone number only after you confirm a code we
              text you; the SMS verification code itself is stored hashed and
              expires within minutes. We never see or store your full card
              number.
            </li>
            <li>
              Payments are processed by Paymob on their secure checkout page.
              We keep a payment record (amount in USD, status, provider name
              and a transaction reference) which powers the payment history on
              your account page.
            </li>
            <li>
              If a session is marked as missed, we generate a single-use,
              expiring reschedule link that is emailed only to you.
            </li>
            <li>
              Emails (confirmations, receipts, reminders and reschedule links)
              are sent to the address you provide at booking.
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
              consultation events and Google Meet conference links, as
              described above. Google&apos;s privacy policy applies:{" "}
              <a href="https://policies.google.com/privacy"
                target="_blank" rel="noopener noreferrer"
                >policies.google.com/privacy</a>
            </li>
            <li>
              <strong>Brevo:</strong> Transactional email (confirmations,
              receipts, reminders) and the SMS one-time codes used for
              phone-number verification. Brevo&apos;s privacy policy applies.
            </li>
            <li>
              <strong>Paymob:</strong> For processing payment transactions.
              Paymob&apos;s privacy policy applies.
            </li>
            <li>
              <strong>Upstash Redis:</strong> For shared storage of booked
              slots and orders. Upstash&apos;s privacy policy applies.
            </li>
            <li>
              <strong>Twilio:</strong> Optional SMS/WhatsApp session
              notifications, only when configured by GymHolic. Twilio&apos;s
              privacy policy applies.
            </li>
          </ul>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Your controls
          </h2>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              You can view, correct and delete most of your data yourself from
              your GymHolic account page (profile, bookings, payments,
              library), or disconnect the Google Calendar integration from the
              integrations settings.
            </li>
            <li>
              You can delete your account from Account → Security; this
              anonymises your profile and removes stored credentials,
              including any Google connection.
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Contact
          </h2>
          <p className="mb-6">
            If you have questions about this Privacy Policy or our data
            practices, contact us at{" "}
            <a href="mailto:yassint.codes@gmail.com">yassint.codes@gmail.com</a>{" "}
            or through the form on our{" "}
            <Link href="/contact">contact page</Link>.
          </p>
        </section>
      </main>
    </Layout>
  );
}
