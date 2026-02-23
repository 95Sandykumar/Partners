'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Brain,
  Link2,
  ClipboardCheck,
  BarChart3,
  Shield,
  BookOpen,
  HelpCircle,
  PlayCircle,
} from 'lucide-react';

const features = [
  {
    icon: Upload,
    title: 'Upload POs',
    description: 'Drag and drop PDF purchase orders. Batch upload supported, up to 10MB per file.',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Brain,
    title: 'AI Extraction',
    description: 'Claude Vision reads PO data: line items, quantities, prices, and vendor info automatically.',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
  },
  {
    icon: Link2,
    title: 'Smart Matching',
    description: '4-stage cascade matches vendor part numbers to internal SKUs with confidence scoring.',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
  },
  {
    icon: ClipboardCheck,
    title: 'Review & Approve',
    description: 'Side-by-side PDF viewer and extracted data. Approve, reject, or correct line items.',
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
  },
  {
    icon: BarChart3,
    title: 'Dashboard Analytics',
    description: 'Real-time metrics: processing volume, confidence trends, match rates, and cost tracking.',
    color: 'text-cyan-500',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Shield,
    title: 'Secure & Compliant',
    description: 'Row-level security, encrypted storage, and full audit trail of every extraction and correction.',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
  },
];

const faqs = [
  {
    q: 'What PDF formats are supported?',
    a: 'Standard PDF files up to 10MB. Single or multi-page purchase orders from any vendor format.',
  },
  {
    q: 'How accurate is the AI extraction?',
    a: '85-95% accuracy using Claude Vision. Low-confidence extractions are routed to the review queue for operator verification.',
  },
  {
    q: 'Does the system learn from corrections?',
    a: 'Yes. Operator corrections feed back into vendor templates and part number mappings, improving future accuracy.',
  },
  {
    q: 'How does part number matching work?',
    a: 'A 4-stage cascade: exact vendor mapping (100%), manufacturer match (95%), prefix-normalized (85%), then fuzzy match. Each stage exits early on high confidence.',
  },
  {
    q: 'Can I import my existing product catalog?',
    a: 'Yes. The Products page supports CSV import for bulk uploading your internal SKU catalog.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is encrypted at rest and in transit. Row-level security ensures organizations only access their own data. Full audit logging is enabled.',
  },
];

const steps = [
  { step: 1, title: 'Sign up & create your organization', detail: 'Your account is created with a dedicated org. All data is isolated via row-level security.' },
  { step: 2, title: 'Import your product catalog', detail: 'Go to Products and upload your internal SKUs via CSV or add them manually.' },
  { step: 3, title: 'Add your vendors', detail: 'Register vendors with their email domains and PO format type for auto-detection.' },
  { step: 4, title: 'Upload a purchase order', detail: 'Drag and drop a PDF on the Upload page. AI extraction starts immediately.' },
  { step: 5, title: 'Review & approve', detail: 'Check the Review Queue for extracted POs. Verify data, correct if needed, then approve.' },
];

export default function GuidePage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="h-5 w-5 text-primary" />
          <Badge variant="secondary" className="text-xs">Guide</Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Getting Started</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Everything you need to know to start processing purchase orders
        </p>
      </div>

      {/* Video Section */}
      <Card className="overflow-hidden border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Product Walkthrough</CardTitle>
          </div>
          <CardDescription>
            Watch a 40-second overview of the entire platform
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative bg-slate-950 aspect-video rounded-b-lg overflow-hidden">
            <video
              controls
              playsInline
              preload="metadata"
              className="w-full h-full"
            >
              <source src="/onboarding.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        </CardContent>
      </Card>

      {/* Quick Start Steps */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Start</CardTitle>
          <CardDescription>Get up and running in 5 steps</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {steps.map((s) => (
              <div key={s.step} className="flex gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {s.step}
                </div>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Features Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="border-border/60 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className={`inline-flex p-2.5 rounded-xl ${f.bg} mb-3`}>
                  <f.icon className={`h-5 w-5 ${f.color}`} />
                </div>
                <h3 className="text-sm font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {faqs.map((faq, i) => (
              <div key={i} className="space-y-1">
                <p className="text-sm font-semibold">{faq.q}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
                {i < faqs.length - 1 && <div className="border-b border-border/40 pt-3" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
