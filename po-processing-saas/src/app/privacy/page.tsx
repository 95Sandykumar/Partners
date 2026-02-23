import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for PO Processing - AI-Powered Purchase Order Management',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <nav className="mb-12">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to Home
          </Link>
        </nav>

        <header className="mb-12">
          <h1 className="text-[32px] font-bold tracking-tight text-foreground">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: February 2026
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              1. Information We Collect
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>We collect the following types of information when you use PO Processing:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Account information</strong> &mdash; your name,
                  email address, password, and role within your organization.
                </li>
                <li>
                  <strong className="text-foreground">Organization data</strong> &mdash; your
                  organization name, settings, and configuration preferences.
                </li>
                <li>
                  <strong className="text-foreground">Uploaded documents</strong> &mdash; PDF purchase
                  orders and any associated metadata you provide.
                </li>
                <li>
                  <strong className="text-foreground">Extracted data</strong> &mdash; structured data
                  produced by AI extraction from your uploaded documents, including line items,
                  vendor details, and part numbers.
                </li>
                <li>
                  <strong className="text-foreground">Usage data</strong> &mdash; information about how
                  you interact with the Service, including pages visited, features used, and
                  timestamps of activity.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              2. How We Use Information
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>We use your information to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve the Service.</li>
                <li>Process uploaded purchase orders using AI extraction and part matching.</li>
                <li>Generate analytics and reporting within your organization&apos;s dashboard.</li>
                <li>Process subscription billing and manage your account.</li>
                <li>Communicate with you about your account, updates, and support requests.</li>
                <li>Ensure the security and integrity of the Service.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              3. Data Storage &amp; Security
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>
                Your data is stored in Supabase, a hosted PostgreSQL database service, with
                row-level security (RLS) policies that enforce strict organization-scoped data
                isolation. This means your organization&apos;s data is logically separated from
                all other tenants at the database level.
              </p>
              <p>
                All data is encrypted at rest and in transit. Uploaded PDF files are stored in
                private, organization-scoped storage buckets with their own RLS policies.
                We implement industry-standard security practices including secure
                authentication, session management, and access controls.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              4. Third-Party Services
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>We use the following third-party services to operate the platform:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Supabase</strong> &mdash; database hosting,
                  authentication, and file storage. Your account data, extracted records, and
                  uploaded files are stored in Supabase infrastructure.
                </li>
                <li>
                  <strong className="text-foreground">Anthropic (Claude API)</strong> &mdash; AI-powered
                  data extraction. Uploaded purchase order documents are sent to the Claude API
                  for processing. See Section 5 for details on AI data handling.
                </li>
                <li>
                  <strong className="text-foreground">Stripe</strong> &mdash; payment processing and
                  subscription management. Stripe processes your payment information directly;
                  we do not store your full credit card details on our servers.
                </li>
              </ul>
              <p>
                Each third-party service operates under its own privacy policy and data
                handling practices. We encourage you to review their respective policies.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              5. AI Data Processing
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>
                When you upload a purchase order, the document is sent to the Anthropic Claude
                API for AI-powered data extraction. Important details about this process:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Documents are transmitted securely to the Claude API and processed in
                  real-time to extract structured data.
                </li>
                <li>
                  Your documents are not used by Anthropic for model training or improvement
                  purposes under our commercial API agreement.
                </li>
                <li>
                  Anthropic does not persistently store the content of your documents after
                  processing is complete.
                </li>
                <li>
                  Extracted data is returned to our Service and stored within your
                  organization&apos;s database scope.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              6. Data Retention
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>We retain your data according to the following policies:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Active accounts</strong> &mdash; all data is
                  retained for the duration of your active subscription.
                </li>
                <li>
                  <strong className="text-foreground">Deleted accounts</strong> &mdash; account data
                  and associated records are retained for 30 days after account deletion to
                  allow for recovery, then permanently deleted.
                </li>
                <li>
                  <strong className="text-foreground">Uploaded PDFs</strong> &mdash; retention of
                  uploaded documents is configurable through your organization&apos;s settings.
                  You may delete individual documents or configure automatic retention periods.
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              7. Your Rights
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>You have the following rights regarding your data:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong className="text-foreground">Access</strong> &mdash; you may request a copy of
                  all personal data we hold about you.
                </li>
                <li>
                  <strong className="text-foreground">Export</strong> &mdash; you may export your
                  purchase orders, extracted data, and product catalog at any time through the
                  Service&apos;s built-in CSV export functionality.
                </li>
                <li>
                  <strong className="text-foreground">Deletion</strong> &mdash; you may request deletion
                  of your account and all associated data.
                </li>
                <li>
                  <strong className="text-foreground">Data portability</strong> &mdash; you may request
                  your data in a standard, machine-readable format.
                </li>
              </ul>
              <p>
                To exercise any of these rights, contact us at{' '}
                <a
                  href="mailto:privacy@poprocessing.com"
                  className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
                >
                  privacy@poprocessing.com
                </a>
                .
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              8. Cookies &amp; Tracking
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              The Service uses session cookies strictly for authentication and maintaining your
              logged-in state. We do not use third-party tracking cookies, advertising pixels,
              or analytics services that track you across other websites. No personally
              identifiable information is shared with advertising networks or data brokers.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              9. Children&apos;s Privacy
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              PO Processing is a business-to-business service and is not designed for or
              directed at individuals under the age of 18. We do not knowingly collect personal
              information from children. If we become aware that a user is under 18, we will
              take steps to delete their account and associated data.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              10. International Data
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              The Service is hosted and operated in the United States. If you access the
              Service from outside the United States, your data will be transferred to and
              processed in the United States. By using the Service, you consent to this
              transfer. We take appropriate measures to ensure your data is treated securely
              and in accordance with this Privacy Policy regardless of where it is processed.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              11. Changes to Policy
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              We may update this Privacy Policy from time to time to reflect changes in our
              practices, technology, or legal requirements. If we make material changes, we
              will notify you by email or through a prominent notice within the Service at
              least 30 days before the changes take effect. We encourage you to review this
              policy periodically. Your continued use of the Service after changes are posted
              constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              12. Contact
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              If you have any questions or concerns about this Privacy Policy or our data
              practices, please contact us at{' '}
              <a
                href="mailto:privacy@poprocessing.com"
                className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
              >
                privacy@poprocessing.com
              </a>
              .
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            See also our{' '}
            <Link
              href="/terms"
              className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
            >
              Terms of Service
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
