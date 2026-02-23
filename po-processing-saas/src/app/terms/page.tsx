import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for PO Processing - AI-Powered Purchase Order Management',
};

export default function TermsOfService() {
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: February 2026
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              1. Acceptance of Terms
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              By accessing or using PO Processing (&quot;the Service&quot;), you agree to be bound
              by these Terms of Service. If you are using the Service on behalf of an
              organization, you represent that you have the authority to bind that
              organization to these terms. If you do not agree, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              2. Description of Service
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              PO Processing is an AI-powered purchase order management platform. The Service
              allows users to upload PDF purchase orders, automatically extract structured
              data using artificial intelligence, match extracted line items to an internal
              product catalog, and review, approve, or reject processed orders. The Service
              is provided as a multi-tenant software-as-a-service (SaaS) application.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              3. User Accounts
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              To use the Service, you must register for an account by providing a valid email
              address and password. Each account is associated with an organization, and all
              data within the Service is scoped to your organization. Account administrators
              may invite additional users and manage roles within their organization. You are
              responsible for maintaining the confidentiality of your account credentials and
              for all activity that occurs under your account.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              4. Subscription &amp; Billing
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              The Service is offered on a subscription basis with tiered pricing plans. Billing
              is processed monthly through Stripe. Each plan includes limits on the number of
              purchase orders processed, users, and storage. Subscriptions automatically renew
              at the end of each billing period unless cancelled. You may cancel your subscription
              at any time, and access will continue through the end of the current billing period.
              We reserve the right to modify pricing with 30 days&apos; notice.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              5. Acceptable Use
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Upload or process any content that is illegal, fraudulent, or violates the rights of others.</li>
                <li>Attempt to reverse engineer, decompile, or disassemble any part of the Service.</li>
                <li>Use automated tools to scrape, crawl, or extract data from the Service beyond its intended API.</li>
                <li>Interfere with the security, integrity, or performance of the Service.</li>
                <li>Share your account credentials or allow unauthorized access to your organization&apos;s data.</li>
                <li>Use the Service to process documents you do not have the legal right to access.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              6. Data &amp; Privacy
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Your use of the Service is also governed by our{' '}
              <Link href="/privacy" className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors">
                Privacy Policy
              </Link>
              , which describes how we collect, use, and protect your information. By using the
              Service, you consent to the data practices described in the Privacy Policy. All
              uploaded documents and extracted data remain your property and are stored in
              organization-scoped environments with row-level security.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              7. AI-Processed Data
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>
                The Service uses artificial intelligence to extract data from uploaded purchase
                order documents. You acknowledge and agree that:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI extraction is assistive in nature and is not guaranteed to be 100% accurate.</li>
                <li>You are responsible for reviewing and approving all AI-extracted data before it is acted upon.</li>
                <li>The Service provides confidence scores to help you assess extraction quality, but these scores are estimates.</li>
                <li>We do not guarantee the accuracy, completeness, or reliability of any AI-generated output.</li>
                <li>You should not rely solely on AI extraction for critical business decisions without human review.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              8. Intellectual Property
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              The Service, including its software, design, documentation, and all related
              intellectual property, is owned by PO Processing and its licensors. You retain
              all rights to the documents you upload and the data extracted from them. Your use
              of the Service does not grant you any ownership interest in the Service itself.
              You may not copy, modify, or distribute any part of the Service without prior
              written consent.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              9. Limitation of Liability
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              To the maximum extent permitted by law, PO Processing and its affiliates,
              officers, employees, and agents shall not be liable for any indirect, incidental,
              special, consequential, or punitive damages, including loss of profits, data, or
              business opportunities, arising out of or related to your use of the Service. Our
              total liability for any claim arising from these terms or the Service shall not
              exceed the amount you paid for the Service during the twelve (12) months
              preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              10. Termination
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              We may suspend or terminate your access to the Service at any time if you
              violate these terms or engage in conduct that we determine, in our sole
              discretion, to be harmful to the Service or other users. You may terminate your
              account at any time through the account settings. Upon termination, your right to
              use the Service ceases immediately, and we may delete your data in accordance
              with our data retention policy described in the Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              11. Changes to Terms
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              We reserve the right to update these Terms of Service at any time. If we make
              material changes, we will notify you by email or through a notice within the
              Service at least 30 days before the changes take effect. Your continued use of
              the Service after the effective date constitutes acceptance of the revised terms.
              We encourage you to review these terms periodically.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              12. Contact Information
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a
                href="mailto:support@poprocessing.com"
                className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
              >
                support@poprocessing.com
              </a>
              .
            </p>
          </section>
        </div>

        <footer className="mt-16 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground">
            See also our{' '}
            <Link
              href="/privacy"
              className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
            >
              Privacy Policy
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
