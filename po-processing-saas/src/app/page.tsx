import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BILLING_PLANS } from '@/lib/stripe/plans';
import {
  FileText,
  Upload,
  CheckCircle,
  Zap,
  Shield,
  BarChart3,
  ArrowRight,
  Sparkles,
  Search,
  Users,
  Clock,
  Check,
} from 'lucide-react';

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const plans = Object.values(BILLING_PLANS);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ------------------------------------------------------------------ */}
      {/* Navigation                                                         */}
      {/* ------------------------------------------------------------------ */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/72 dark:bg-gray-950/72 backdrop-blur-xl border-b border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#007AFF]">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <span className="text-[17px] font-semibold tracking-tight">
                PO Processing
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-8">
              <a
                href="#features"
                className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
              >
                How It Works
              </a>
              <a
                href="#pricing"
                className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
            </div>

            {/* Auth buttons */}
            <div className="flex items-center gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-2 text-[15px] font-medium text-white shadow-sm hover:bg-[#0071E3] transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:inline-flex text-[15px] font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-2 rounded-full bg-[#007AFF] px-5 py-2 text-[15px] font-medium text-white shadow-sm hover:bg-[#0071E3] transition-colors"
                  >
                    Get Started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                               */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[#007AFF]/8 via-[#5856D6]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-[#007AFF]/8 px-4 py-1.5 mb-8">
            <Sparkles className="h-4 w-4 text-[#007AFF]" />
            <span className="text-[13px] font-medium text-[#007AFF]">
              Powered by AI
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.05] max-w-4xl mx-auto">
            Purchase orders,{' '}
            <span className="text-[#007AFF]">processed intelligently.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload PDF purchase orders. AI extracts every line item, matches
            vendor part numbers to your product catalog, and routes for approval
            &mdash; in seconds, not hours.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full bg-[#007AFF] px-8 py-3.5 text-[17px] font-medium text-white shadow-lg shadow-[#007AFF]/25 hover:bg-[#0071E3] hover:shadow-[#007AFF]/30 transition-all"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm px-8 py-3.5 text-[17px] font-medium text-foreground hover:bg-white dark:hover:bg-gray-900 transition-all"
            >
              See How It Works
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { value: '98%', label: 'Extraction accuracy' },
              { value: '<10s', label: 'Per document' },
              { value: '4x', label: 'Faster processing' },
              { value: '0', label: 'Manual data entry' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-semibold tracking-tight">
                  {stat.value}
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Features                                                           */}
      {/* ------------------------------------------------------------------ */}
      <section id="features" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Everything you need to process POs
            </h2>
            <p className="mt-4 text-[17px] text-muted-foreground max-w-2xl mx-auto">
              From upload to approval, every step is automated. Focus on
              exceptions, not data entry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Sparkles,
                title: 'AI Extraction',
                description:
                  'Claude Vision reads every PDF page and extracts PO numbers, line items, quantities, and prices with near-perfect accuracy.',
                color: '#007AFF',
              },
              {
                icon: Search,
                title: 'Smart Part Matching',
                description:
                  'Four-stage matching engine maps vendor part numbers to your catalog using exact, prefix-normalized, and fuzzy matching.',
                color: '#34C759',
              },
              {
                icon: Shield,
                title: 'Confidence Routing',
                description:
                  'High-confidence extractions auto-approve. Low-confidence items route to a review queue for human verification.',
                color: '#5856D6',
              },
              {
                icon: BarChart3,
                title: 'Real-Time Analytics',
                description:
                  'Track PO volume, extraction confidence, match rates, and vendor breakdown from a unified dashboard.',
                color: '#FF9500',
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl bg-card p-8 shadow-sm border border-border hover:shadow-md transition-all duration-300"
              >
                <div
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl mb-5"
                  style={{ backgroundColor: `${feature.color}12` }}
                >
                  <feature.icon
                    className="h-6 w-6"
                    style={{ color: feature.color }}
                  />
                </div>
                <h3 className="text-lg font-semibold tracking-tight mb-2">
                  {feature.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* How It Works                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section id="how-it-works" className="py-24 sm:py-32 bg-card">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Three steps. Zero friction.
            </h2>
            <p className="mt-4 text-[17px] text-muted-foreground max-w-2xl mx-auto">
              Go from PDF to approved purchase order in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-20">
            {[
              {
                step: '01',
                icon: Upload,
                title: 'Upload',
                description:
                  'Drag and drop PO documents in any format. We support multi-page PDFs from any vendor with batch processing.',
              },
              {
                step: '02',
                icon: Zap,
                title: 'Extract & Match',
                description:
                  'AI reads every page, extracts line items, and matches vendor part numbers to your product catalog automatically.',
              },
              {
                step: '03',
                icon: CheckCircle,
                title: 'Review & Approve',
                description:
                  'Review flagged items side-by-side with the original PDF. High-confidence orders auto-approve instantly.',
              },
            ].map((step) => (
              <div key={step.step} className="text-center">
                <div className="relative inline-flex mb-8">
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                    <step.icon className="h-9 w-9 text-[#007AFF]" />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#007AFF] text-white text-[13px] font-semibold">
                    {step.step.replace('0', '')}
                  </div>
                </div>
                <h3 className="text-xl font-semibold tracking-tight mb-3">
                  {step.title}
                </h3>
                <p className="text-[15px] leading-relaxed text-muted-foreground max-w-sm mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Social Proof / Trust Strip                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-16 border-y border-border">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: Clock,
                stat: '85% less time',
                text: 'spent on PO processing',
              },
              {
                icon: Users,
                stat: 'Multi-tenant',
                text: 'built for teams & organizations',
              },
              {
                icon: Shield,
                stat: 'SOC 2 ready',
                text: 'enterprise-grade security',
              },
            ].map((item) => (
              <div
                key={item.stat}
                className="flex flex-col items-center gap-3"
              >
                <item.icon className="h-6 w-6 text-[#007AFF]" />
                <div className="text-xl font-semibold tracking-tight">
                  {item.stat}
                </div>
                <div className="text-[15px] text-muted-foreground">{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Pricing                                                            */}
      {/* ------------------------------------------------------------------ */}
      <section id="pricing" className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-[17px] text-muted-foreground max-w-2xl mx-auto">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {plans.map((plan) => {
              const isPopular = plan.tier === 'professional';
              const isEnterprise = plan.tier === 'enterprise';
              const isFree = plan.tier === 'free';

              return (
                <div
                  key={plan.tier}
                  className={`relative rounded-2xl p-8 flex flex-col ${
                    isPopular
                      ? 'bg-[#007AFF] text-white shadow-xl shadow-[#007AFF]/20 ring-1 ring-[#007AFF] scale-[1.02] lg:scale-105'
                      : 'bg-card border border-border shadow-sm'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[13px] font-semibold text-[#007AFF] shadow-sm">
                      Most Popular
                    </div>
                  )}

                  <div className="mb-6">
                    <h3
                      className={`text-lg font-semibold tracking-tight ${
                        isPopular ? 'text-white' : ''
                      }`}
                    >
                      {plan.name}
                    </h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span
                        className={`text-4xl font-semibold tracking-tight ${
                          isPopular ? 'text-white' : ''
                        }`}
                      >
                        {isFree ? 'Free' : `$${plan.price}`}
                      </span>
                      {!isFree && (
                        <span
                          className={`text-[15px] ${
                            isPopular ? 'text-white/70' : 'text-muted-foreground'
                          }`}
                        >
                          /mo
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-2 text-[13px] ${
                        isPopular ? 'text-white/70' : 'text-muted-foreground'
                      }`}
                    >
                      {plan.poLimit === -1
                        ? 'Unlimited POs'
                        : `Up to ${plan.poLimit} POs/month`}
                      {' \u00B7 '}
                      {plan.userLimit === -1
                        ? 'Unlimited users'
                        : `${plan.userLimit} user${plan.userLimit > 1 ? 's' : ''}`}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check
                          className={`h-4 w-4 mt-0.5 shrink-0 ${
                            isPopular ? 'text-white/90' : 'text-[#34C759]'
                          }`}
                        />
                        <span
                          className={`text-[15px] leading-snug ${
                            isPopular ? 'text-white/90' : 'text-muted-foreground'
                          }`}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={isFree ? '/signup' : '/signup'}
                    className={`block text-center rounded-full px-6 py-3 text-[15px] font-medium transition-all ${
                      isPopular
                        ? 'bg-white text-[#007AFF] hover:bg-white/90'
                        : 'bg-[#007AFF] text-white hover:bg-[#0071E3]'
                    }`}
                  >
                    {isFree
                      ? 'Get Started Free'
                      : isEnterprise
                        ? 'Contact Sales'
                        : 'Start Free Trial'}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Capabilities Grid                                                  */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 sm:py-32 bg-card">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Built for industrial distributors
            </h2>
            <p className="mt-4 text-[17px] text-muted-foreground max-w-2xl mx-auto">
              Purpose-built features for companies that process vendor POs at
              scale.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {[
              {
                icon: FileText,
                title: 'Vendor Templates',
                text: 'Custom extraction templates per vendor. Teach the system your vendors\u2019 specific PO formats once, get perfect extractions every time.',
              },
              {
                icon: Zap,
                title: 'Prefix Normalization',
                text: 'Automatically strips CMI-, BER-, LIN-, CMUC, and CMD prefixes to match vendor part numbers to your catalog SKUs.',
              },
              {
                icon: BarChart3,
                title: 'Dashboard & Analytics',
                text: 'Real-time metrics: PO volume, extraction confidence, vendor breakdown, and match-rate trends at a glance.',
              },
              {
                icon: Users,
                title: 'Multi-Tenant Teams',
                text: 'Organization-scoped data with row-level security. Every team member sees only their organization\u2019s data.',
              },
              {
                icon: Shield,
                title: 'Audit Trail',
                text: 'Every extraction, match, and approval is logged with timestamps, confidence scores, and the reviewing user.',
              },
              {
                icon: Upload,
                title: 'Batch Processing',
                text: 'Upload dozens of POs at once. Each document is processed in parallel with individual progress tracking.',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-[#007AFF]/8">
                  <item.icon className="h-5 w-5 text-[#007AFF]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold tracking-tight mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[15px] leading-relaxed text-muted-foreground">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Final CTA                                                          */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-[#007AFF] px-8 py-20 sm:px-16 text-center">
            {/* Decorative gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#007AFF] via-[#0071E3] to-[#5856D6] opacity-100" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />

            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-white max-w-2xl mx-auto leading-tight">
                Stop typing. Start processing.
              </h2>
              <p className="mt-6 text-lg text-white/80 max-w-xl mx-auto">
                Join companies that have eliminated manual PO data entry. Start
                with 50 free POs per month &mdash; no credit card required.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-[17px] font-medium text-[#007AFF] shadow-lg hover:bg-white/90 transition-all"
                >
                  Create Free Account
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <a
                  href="#pricing"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-8 py-3.5 text-[17px] font-medium text-white hover:bg-white/10 transition-all"
                >
                  View Pricing
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                             */}
      {/* ------------------------------------------------------------------ */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#007AFF]">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                <span className="text-[17px] font-semibold tracking-tight">
                  PO Processing
                </span>
              </div>
              <p className="text-[15px] text-muted-foreground leading-relaxed max-w-xs">
                AI-powered purchase order processing for industrial
                distributors.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Product
              </h4>
              <ul className="space-y-3">
                {[
                  { label: 'Features', href: '#features' },
                  { label: 'Pricing', href: '#pricing' },
                  { label: 'How It Works', href: '#how-it-works' },
                ].map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Company
              </h4>
              <ul className="space-y-3">
                {[
                  { label: 'Sign In', href: '/login' },
                  { label: 'Sign Up', href: '/signup' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[13px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Legal
              </h4>
              <ul className="space-y-3">
                {[
                  { label: 'Terms of Service', href: '/terms' },
                  { label: 'Privacy Policy', href: '/privacy' },
                ].map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[15px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[13px] text-muted-foreground">
              &copy; {new Date().getFullYear()} PO Processing. All rights
              reserved.
            </p>
            <p className="text-[13px] text-muted-foreground">
              Built for CM Industries
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
