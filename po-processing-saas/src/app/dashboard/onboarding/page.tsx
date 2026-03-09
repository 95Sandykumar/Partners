'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Upload,
  ClipboardCheck,
  Package,
  FileText,
  Loader2,
  CheckCircle2,
  Database,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Rocket,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 4;

const STEP_LABELS = ['Welcome', 'Sample Data', 'Quick Tour', 'Ready'];

const tourItems = [
  {
    icon: Upload,
    title: 'Upload POs',
    description:
      'Drag and drop PDF purchase orders for instant AI extraction.',
  },
  {
    icon: ClipboardCheck,
    title: 'Review Queue',
    description:
      'Review and approve extracted data with a side-by-side PDF viewer.',
  },
  {
    icon: Package,
    title: 'Products Catalog',
    description:
      'Manage your product SKUs and let the system auto-match vendor parts.',
  },
  {
    icon: FileText,
    title: 'Vendor Templates',
    description:
      "Configure extraction templates for each vendor's unique PO format.",
  },
];

const quickStartActions = [
  {
    icon: Upload,
    title: 'Upload your first PO',
    description: 'Drop a PDF to see AI extraction in action',
    href: '/dashboard/upload',
    primary: true,
  },
  {
    icon: Package,
    title: 'Add your products',
    description: 'Import your catalog for automatic part matching',
    href: '/dashboard/products',
    primary: false,
  },
  {
    icon: LayoutDashboard,
    title: 'Explore the dashboard',
    description: 'View your workflow overview and stats',
    href: '/dashboard',
    primary: false,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedComplete, setSeedComplete] = useState(false);
  // Incrementing this key forces re-mount of the animated wrapper on step change
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', user.id)
        .single();

      if (profile) {
        const org = profile.organization as Record<string, unknown>;
        if (org) {
          setOrgName(org.name as string);
        }
      }
      setLoading(false);
    }

    loadProfile();
  }, [supabase, router]);

  // Keyboard: Enter advances the step (except seed step where user must choose explicitly)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      // Don't intercept if focus is on a button or interactive element
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'INPUT' ||
        target.tagName === 'A'
      ) {
        return;
      }
      if (e.key === 'Enter' && !seeding && step !== 1 && step < TOTAL_STEPS - 1) {
        setStep((s) => s + 1);
        setAnimKey((k) => k + 1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [seeding, step]);

  function goTo(next: number) {
    setStep(next);
    setAnimKey((k) => k + 1);
  }

  function handleNext() {
    if (step < TOTAL_STEPS - 1) goTo(step + 1);
  }

  function handleBack() {
    if (step > 0) goTo(step - 1);
  }

  function handleSkipSeed() {
    goTo(step + 1);
  }

  async function handleSeedData() {
    setSeeding(true);
    try {
      const response = await fetch('/api/seed', { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed demo data');
      }

      setSeedComplete(true);
      toast.success('Demo data added successfully!');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Seed failed';
      toast.error(message);
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)] py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        {/* Progress indicator */}
        <div className="mb-8 space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-semibold text-foreground">
              {STEP_LABELS[step]}
            </span>
            <span className="text-[12px] text-muted-foreground">
              Step {step + 1} of {TOTAL_STEPS}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full flex-1 transition-all duration-500',
                  i <= step ? 'bg-primary' : 'bg-muted-foreground/15'
                )}
              />
            ))}
          </div>
        </div>

        {/* Step content card */}
        <Card className="border-border/60 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="pt-8 pb-8 px-6 sm:px-8">
            {/* key forces re-mount for enter animation on each step change */}
            <div
              key={animKey}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              {/* ── Step 0: Welcome ── */}
              {step === 0 && (
                <div className="text-center space-y-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>

                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight">
                      Welcome to POFlow!
                    </h1>
                    {orgName && (
                      <p className="text-base text-primary font-medium">
                        {orgName}
                      </p>
                    )}
                  </div>

                  <p className="text-[14px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Automate your purchase order workflow with AI-powered
                    extraction, intelligent part matching, and streamlined
                    review. Save up to 85% of manual data entry time.
                  </p>

                  <div className="space-y-2">
                    <Button
                      onClick={handleNext}
                      className="h-11 px-8 rounded-xl text-[14px] font-medium shadow-sm"
                    >
                      Get Started
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    <p className="text-[11px] text-muted-foreground/60">
                      Press Enter to continue
                    </p>
                  </div>
                </div>
              )}

              {/* ── Step 1: Seed Demo Data ── */}
              {step === 1 && (
                <div className="text-center space-y-6">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40">
                    <Database className="h-8 w-8 text-primary" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      Want to explore with sample data?
                    </h2>
                    <p className="text-[14px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      We&apos;ll add vendors, products, part mappings, and
                      sample purchase orders so you can see the system in
                      action right away.
                    </p>
                  </div>

                  {/* Seeding progress */}
                  {seeding && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center gap-2 text-primary">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-[14px] font-medium">
                          Seeding demo data...
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden max-w-[200px] mx-auto">
                        <div className="h-full bg-primary rounded-full w-2/3 animate-pulse" />
                      </div>
                      <p className="text-[12px] text-muted-foreground">
                        Adding vendors, products, and sample POs...
                      </p>
                    </div>
                  )}

                  {/* Seed complete */}
                  {!seeding && seedComplete && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-[14px] font-medium">
                          Demo data added!
                        </span>
                      </div>
                      <Button
                        onClick={handleNext}
                        className="h-11 px-8 rounded-xl text-[14px] font-medium shadow-sm"
                      >
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Seed options */}
                  {!seeding && !seedComplete && (
                    <div className="flex flex-col items-center gap-3">
                      <Button
                        onClick={handleSeedData}
                        className="h-11 px-8 rounded-xl text-[14px] font-medium shadow-sm"
                      >
                        <Database className="mr-2 h-4 w-4" />
                        Yes, add sample data
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleSkipSeed}
                        className="text-[13px] text-muted-foreground hover:text-foreground"
                      >
                        Skip, I&apos;ll start fresh
                      </Button>
                    </div>
                  )}

                  {!seeding && (
                    <div className="flex justify-center pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleBack}
                        className="text-[13px] text-muted-foreground"
                      >
                        <ArrowLeft className="mr-1 h-3 w-3" />
                        Back
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2: Quick Tour ── */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center space-y-2">
                    <h2 className="text-xl font-semibold tracking-tight">
                      Here&apos;s what you can do
                    </h2>
                    <p className="text-[13px] text-muted-foreground">
                      Four key areas to streamline your PO workflow.
                    </p>
                  </div>

                  <div className="grid gap-2.5">
                    {tourItems.map((item, i) => (
                      <div
                        key={item.title}
                        className="flex items-start gap-4 rounded-xl border border-border/60 p-4 transition-colors hover:bg-muted/50"
                        style={{ animationDelay: `${i * 50}ms` }}
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-[14px] font-medium">{item.title}</p>
                          <p className="text-[12px] text-muted-foreground leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="text-[13px] text-muted-foreground"
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      className="h-10 px-6 rounded-xl text-[14px] font-medium shadow-sm"
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Ready! ── */}
              {step === 3 && (
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-950/40">
                      <Rocket className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold tracking-tight">
                        You&apos;re all set!
                      </h2>
                      <p className="text-[14px] text-muted-foreground leading-relaxed">
                        Your workspace is ready. Here&apos;s where to start:
                      </p>
                    </div>
                  </div>

                  {/* Quick-start action cards */}
                  <div className="grid gap-2.5">
                    {quickStartActions.map((action) => (
                      <Link
                        key={action.title}
                        href={action.href}
                        className={cn(
                          'flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-muted/50',
                          action.primary
                            ? 'border-primary/40 bg-primary/5'
                            : 'border-border/60'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                            action.primary ? 'bg-primary' : 'bg-muted'
                          )}
                        >
                          <action.icon
                            className={cn(
                              'h-4 w-4',
                              action.primary
                                ? 'text-white'
                                : 'text-muted-foreground'
                            )}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-medium">
                            {action.title}
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            {action.description}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </Link>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBack}
                      className="text-[13px] text-muted-foreground"
                    >
                      <ArrowLeft className="mr-1 h-3 w-3" />
                      Back
                    </Button>
                    <Button
                      onClick={() => router.push('/dashboard')}
                      className="h-10 px-6 rounded-xl text-[14px] font-medium shadow-sm"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
