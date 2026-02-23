import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Processing Agreement',
  description: 'Data Processing Agreement (DPA) for PO Processing',
};

export default function DPAPage() {
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
            Data Processing Agreement
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: February 2026
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              1. Scope and Purpose
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              This Data Processing Agreement (&quot;DPA&quot;) forms part of the Terms of Service
              between PO Processing (&quot;Processor&quot;) and the Customer (&quot;Controller&quot;).
              It governs the processing of personal data by the Processor on behalf of the Controller
              in connection with the provision of the PO Processing service. The Processor processes
              personal data only as necessary to provide the service and in accordance with the
              Controller&apos;s documented instructions.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              2. Types of Data Processed
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>The following categories of data may be processed:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>User account information (email addresses, names, roles)</li>
                <li>Purchase order documents (PDFs uploaded by the Controller)</li>
                <li>Extracted data from purchase orders (part numbers, quantities, prices, vendor information)</li>
                <li>Usage data (processing logs, API call metadata, extraction confidence scores)</li>
                <li>Billing information (processed by Stripe as a sub-processor)</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              3. Data Processing Obligations
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>The Processor agrees to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Process personal data only on documented instructions from the Controller.</li>
                <li>Ensure that persons authorized to process personal data are bound by confidentiality obligations.</li>
                <li>Implement appropriate technical and organizational measures to ensure data security.</li>
                <li>Not engage sub-processors without prior written authorization from the Controller.</li>
                <li>Assist the Controller in responding to data subject access requests.</li>
                <li>Delete or return all personal data upon termination of the service, at the Controller&apos;s choice.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              4. Sub-Processors
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>
                The Processor currently uses the following sub-processors:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Supabase Inc.</strong> - Database hosting, authentication, and file storage (US region)</li>
                <li><strong>Vercel Inc.</strong> - Application hosting and content delivery</li>
                <li><strong>Anthropic PBC</strong> - AI-powered document extraction (data sent for processing only, not stored)</li>
                <li><strong>Stripe Inc.</strong> - Payment processing and billing management</li>
              </ul>
              <p>
                The Controller will be notified at least 30 days before any new sub-processor is
                engaged, and may object to the addition of a new sub-processor.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              5. Data Security Measures
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>The Processor implements the following security measures:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of data in transit (TLS 1.2+) and at rest (AES-256)</li>
                <li>Multi-tenant data isolation using PostgreSQL Row-Level Security</li>
                <li>Role-based access control with principle of least privilege</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Automated backup with point-in-time recovery capability</li>
                <li>Input validation and sanitization on all API endpoints</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              6. Data Breach Notification
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              The Processor will notify the Controller without undue delay, and in any event within
              72 hours, after becoming aware of a personal data breach. The notification will include
              the nature of the breach, categories and approximate number of affected data subjects,
              likely consequences, and measures taken or proposed to address the breach.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              7. Data Retention and Deletion
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Upon termination of the service agreement, the Processor will, at the Controller&apos;s
              choice, delete or return all personal data within 30 days. The Controller may export
              their data at any time through the service&apos;s export functionality. Backup copies
              will be deleted within 90 days of the termination date in accordance with the
              Processor&apos;s backup retention schedule.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              8. Contact
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              For questions about this DPA or to request a signed copy, contact us at{' '}
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
            {' '}and{' '}
            <Link
              href="/security"
              className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
            >
              Security Practices
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
