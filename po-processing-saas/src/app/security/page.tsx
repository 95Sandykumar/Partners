import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Security Practices',
  description: 'Security practices and data protection measures for PO Processing',
};

export default function SecurityPage() {
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
            Security Practices
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Last updated: February 2026
          </p>
        </header>

        <div className="space-y-10">
          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              1. Data Encryption
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>
                All data transmitted between your browser and our servers is encrypted using TLS 1.2+
                (HTTPS). Database connections use TLS encryption. Uploaded PDF files are encrypted at
                rest using AES-256 in our cloud storage. Database backups are also encrypted at rest.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>TLS 1.2+ for all data in transit</li>
                <li>AES-256 encryption for all stored files</li>
                <li>Encrypted database backups with point-in-time recovery</li>
                <li>API keys and secrets are encrypted and never exposed to clients</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              2. Access Control
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>
                We implement strict multi-tenant data isolation using PostgreSQL Row-Level Security
                (RLS). Every database table is protected by RLS policies that ensure users can only
                access data belonging to their organization.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Row-Level Security (RLS) on all database tables with 28+ policies</li>
                <li>Role-based access control (Admin, Operator, Viewer)</li>
                <li>Session-based authentication with secure HTTP-only cookies</li>
                <li>API rate limiting to prevent abuse and brute-force attacks</li>
                <li>Input validation using Zod schemas on all API endpoints</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              3. Infrastructure
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>
                Our application is deployed on enterprise-grade cloud infrastructure with automatic
                scaling, redundancy, and geographic distribution.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Hosted on Vercel (frontend) and Supabase (database, auth, storage)</li>
                <li>PostgreSQL 17 with automated backups and point-in-time recovery</li>
                <li>CDN-delivered static assets for performance and DDoS mitigation</li>
                <li>Environment-based configuration with no secrets in source code</li>
                <li>Health monitoring endpoint for automated uptime checks</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              4. Compliance
            </h2>
            <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
              <p>
                We take data privacy seriously and design our systems with compliance in mind.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>SOC 2 Type II compliant infrastructure providers (Supabase, Vercel)</li>
                <li>GDPR-aware data handling practices with data residency options</li>
                <li>Data Processing Agreement (DPA) available for enterprise customers</li>
                <li>Regular security reviews and dependency audits</li>
                <li>Audit logging for all data access and modifications</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              5. Incident Response
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              In the event of a security incident, we follow a structured response process:
              identification, containment, eradication, and recovery. Affected customers will be
              notified within 72 hours of a confirmed breach, in compliance with applicable
              regulations. We maintain incident response procedures and conduct periodic tabletop
              exercises to ensure readiness.
            </p>
          </section>

          <section>
            <h2 className="text-[22px] font-semibold text-foreground mb-3">
              6. Responsible Disclosure
            </h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              We welcome security researchers to report vulnerabilities responsibly. If you discover
              a security issue, please contact us at{' '}
              <a
                href="mailto:security@poprocessing.com"
                className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
              >
                security@poprocessing.com
              </a>
              . We commit to acknowledging reports within 48 hours and providing status updates
              as we investigate. We will not take legal action against researchers who follow
              responsible disclosure practices.
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
            {' '}and{' '}
            <Link
              href="/dpa"
              className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
            >
              Data Processing Agreement
            </Link>
          </p>
        </footer>
      </div>
    </div>
  );
}
