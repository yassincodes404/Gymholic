/* eslint react/no-unescaped-entities: off */
/*!  GymHolic Terms & Conditions — Used for Google Cloud OAuth verification and public site compliance. This page is publicly accessible without authentication. */

import Layout from "@/app/layout";

export default function TermsPage() {
  return (
    <Layout>
      <main className="prose lg:prose-xl max-w-2xl mx-auto py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          Terms & Conditions
        </h1>
        <p className="mb-6">
          Last updated: September 2, 2026
        </p>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Overview
          </h2>
          <p className="mb-6">
            These Terms & Conditions govern the use of GymHolic, a gym consulting
            and booking platform provided by GymHolic. By accessing or otherwise
            using the GymHolic website, you agree to comply with these Terms &
            Conditions. If you disagree with any part of the terms, you may not
            access the service.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Account Registration
          </h2>
          <p className="mb-6">
            To access certain features of GymHolic, you may be required to register
            an account. When you register, you agree to provide accurate, current,
            and complete information. You are responsible for maintaining the
            security of your account and password. You agree to accept
            responsibility for all activities that occur under your account.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Booking and Consultations
          </h2>
          <p className="mb-6">
            GymHolic facilitates bookings and consultations between experts and
            clients. All bookings are subject to the expert's availability and
            terms. Clients are responsible for providing accurate information
            when making bookings.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Consultation Types
          </h3>
          <p className="mb-6">
            Consultations may be conducted online via Google Meet, on-site at the
            expert's facility, or through other agreed-upon methods. The format
            will be agreed upon between the expert and client prior to booking.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Free Time Session
          </h3>
          <p className="mb-6">
            The Free Time Session is a 3-hour online session held over Google
            Meet — you choose any available open block in the calendar, limited
            to one session per day. It is a paid session at the rate shown at
            booking, and it may be rescheduled or cancelled under the policy
            above.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Reminders
          </h3>
          <p className="mb-6">
            You will receive an email reminder approximately 24 hours and again
            1 hour before each confirmed session, together with your Google
            Meet link and calendar invitation.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Payments
          </h2>
          <p className="mb-6">
            GymHolic processes payments through Paymob (Stripe support is
            planned). Card details are entered on the payment provider's own
            secure checkout page — GymHolic never sees or stores your full
            card number. Only a payment record (amount, currency, status and a
            provider transaction reference) is retained, and you can review
            every charge in the payment history on your account page.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Pricing &amp; Currency
          </h3>
          <p className="mb-6">
            All prices are displayed and charged in US Dollars (USD). The price
            shown at the time of booking is the price you pay. Prices are set
            by GymHolic and may be updated at any time; updates do not affect
            bookings already paid for.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Acceptance of These Terms
          </h3>
          <p className="mb-6">
            Before completing any payment you must tick the acceptance box
            confirming that you have read and agree to these Terms &amp;
            Conditions, the Privacy Policy, and the cancellation and
            missed-session policies below.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Cancellations &amp; Rescheduling
          </h2>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              <strong>Cancel 12 hours or more before the session:</strong> you
              may cancel free of charge from your account and the payment is
              refunded to your original payment method.
            </li>
            <li>
              <strong>Cancel less than 12 hours before the session:</strong>{" "}
              the booking may be cancelled, but the payment is retained as
              credit towards a future session.
            </li>
            <li>
              <strong>Move a session:</strong> you can ask to reschedule at any
              time; the new time is subject to the expert's availability.
            </li>
          </ul>
          <p className="mb-6">
            The free-cancellation window shown at checkout (currently 12
            hours) is the enforced policy. Refunds are issued through the
            original payment method; depending on your bank, they can take a
            few business days to appear on your statement.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Digital Products (Blueprints, PDFs &amp; Library Content)
          </h2>
          <p className="mb-6">
            Gymholic sells digital products — including downloadable training
            and business Blueprints (PDF documents), Academy library content,
            and Academy membership access (together, "Digital Products").
            This section governs those purchases and applies in addition to
            the payment terms above.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Delivery &amp; Access
          </h3>
          <p className="mb-6">
            Digital Products are delivered electronically: immediately after
            your payment is confirmed, the product is unlocked in your
            Gymholic account under{" "}
            <strong>Account → Library</strong>, and a receipt is emailed to
            you. Nothing is shipped physically. You can stream or view your
            purchased content by signing in; Blueprint PDFs are viewed in the
            in-app reader.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Licence
          </h3>
          <p className="mb-6">
            On payment, you are granted a personal, non-exclusive,
            non-transferable licence to use the Digital Product for your own
            business or personal development. You may not resell, redistribute,
            share, publicly post, or claim ownership of the content — it
            remains the intellectual property of Gymholic and its authors.
            Accounts that redistribute content may lose access without a
            refund.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Cancellation &amp; Refunds for Digital Products
          </h3>
          <p className="mb-6">
            Digital Products are delivered instantly and cannot be
            "returned". Consistent with the norm for digital goods:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              <strong>Before accessing the product:</strong> if you have not
              yet opened or downloaded the purchase, contact us within 14
              days for a full refund.
            </li>
            <li>
              <strong>After accessing:</strong> purchases are final and
              non-refundable, because the content is consumed on delivery.
              This does not affect your statutory rights.
            </li>
            <li>
              <strong>Faulty or misdescribed content:</strong> if a file is
              corrupted, incomplete, or materially different from its
              description, tell us — we will fix it or refund it in full,
              your choice.
            </li>
            <li>
              <strong>Duplicate or accidental purchases:</strong> contact us
              within 48 hours and we will refund the duplicate or, with your
              consent, credit it towards another product.
            </li>
            <li>
              <strong>Academy membership:</strong> cancellations follow the
              membership terms shown at purchase; access continues until the
              end of the settled period and the seat refund is reviewed by
              our team.
            </li>
          </ul>
          <p className="mb-6">
            By completing a Digital Product purchase you confirm that you
            accept these Terms, and that you consent to immediate delivery of
            digital content and acknowledge that, once delivery starts, the
            cancellation rights described above apply instead of a general
            right of withdrawal.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Missed Sessions (No-Show Policy)
          </h2>
          <p className="mb-6">
            Sessions are held at the scheduled time over Google Meet. If a
            client does not join, the following policy applies:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              <strong>If you miss a paid session that the expert attended:</strong>{" "}
              the session counts as delivered, your payment is kept as credit,
              and we email you a personal, one-time link to choose a new time
              (valid for 14 days). If you prefer a refund instead, reply to
              that email and we will assist you.
            </li>
            <li>
              <strong>If the expert misses the session:</strong> that is on us —
              you are offered, at your choice, a full refund or a free
              rebooking using the same emailed link.
            </li>
            <li>
              <strong>If both parties miss the session:</strong> contact us and
              we will arrange either a refund or a new time.
            </li>
          </ul>
          <p className="mb-6">
            Expired reschedule links cannot be reused; contact us and we will
            make it right.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Google Services
          </h2>
          <p className="mb-6">
            GymHolic integrates with Google services to enable expert calendar
            connectivity and consultation scheduling. By using Google services
            through GymHolic, you agree to Google's applicable terms and
            privacy policies. GymHolic acts as an intermediary; Google's
            directly-applicable terms and policies govern the relationship between
            you and Google.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Google Calendar Connection
          </h3>
          <p className="mb-6">
            Experts who connect their Google Calendar grant GymHolic permission
            to create and manage calendar events on their behalf for scheduled
            consultations. This access is limited to the minimum scope necessary
            for booking functionality and can be revoked at any time through the
            expert's GymHolic settings.
          </p>
          <h3 className="text-xl font-medium mb-3">
            Google Meet Integration
          </h3>
          <p className="mb-6">
            Consultations may include Google Meet conference links generated by
            GymHolic on behalf of the expert. Google Meet terms and privacy
            policies apply to the use of video conferencing features.
          </p>
        </section>
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">
            Liability
          </h2>
          <p className="mb-6">
            GymHolic provides platform facilitation only and does not guarantee
            specific outcomes from consultations. Experts are independent
            contractors responsible for their own services. GymHolic is not
            liable for any direct, indirect, incidental, special, consequential,
            or punitive damages, including without limitation loss of data,
            lost profits, incurred costs, or other damages, whether in an action
            in contract, tort, or otherwise.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Third-Party Services
          </h2>
          <p className="mb-6">
            GymHolic incorporates the following third-party services:
          </p>
          <ul className="list-disc list-inside mb-6 space-y-2">
            <li>
              <strong>Paymob:</strong> For payment processing. Paymob's
              Terms of Service apply: <a href="https://accept.paymob.com"
                target="_blank" rel="noopener noreferrer"
                >accept.paymob.com</a>
            </li>
            <li>
              <strong>Brevo:</strong> For transactional email delivery.
            </li>
            <li>
              <strong>Twilio:</strong> For SMS/WhatsApp booking notifications
              when enabled.
            </li>
            <li>
              <strong>Google Calendar/Meet:</strong> For calendar connectivity
              and video conferencing. Google's Terms of Service apply:
              <a href="https://policies.google.com/terms"
                target="_blank" rel="noopener noreferrer"
                >policies.google.com/terms</a>
            </li>
          </ul>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Modifications
          </h2>
          <p className="mb-6">
            GymHolic reserves the right to modify these Terms & Conditions at
            any time. We will attempt to provide notice of such modifications,
            but users are encouraged to review this page periodically. Your
            continued use of GymHolic after any such modifications constitutes
            your acceptance of the modified terms.
          </p>
        </section>
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            Governing Law
          </h2>
          <p className="mb-6">
            These Terms & Conditions shall be governed by and construed in
            accordance with the laws of the United Arab Emirates, without
            regard to its conflict of law principles.
          </p>
        </section>
      </main>
    </Layout>
  );
}