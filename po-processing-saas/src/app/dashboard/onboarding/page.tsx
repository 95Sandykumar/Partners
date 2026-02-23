'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';

const TOTAL_STEPS = 4;

const tourItems = [
  {
    icon: Upload,
    title: 'Upload POs',
    description: 'Drag and drop PDF purchase orders for instant AI extraction.',
  },
  {
    icon: ClipboardCheck,
    title: 'Review Queue',
    description: 'Review and approve extracted data with a side-by-side PDF viewer.',
  },
  {
    icon: Package,
    title: 'Products Catalog',
    description: 'Manage your product SKUs and let the system auto-match vendor parts.',
  },
  {
    icon: FileText,
    title: 'Vendor Templates',
    description: 'Configure extraction templates for each vendor\'s unique PO format.',
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

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
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

  function handleNext() {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  function handleSkipSeed() {
    setStep(step + 1);
  }

  function handleGoToDashboard() {
    router.push('/dashboard');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <div className="w-full max-w-lg mx-auto">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? 'w-8 bg-primary'
                  : i < step
                    ? 'w-2 bg-primary/40'
                    : 'w-2 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <Card className="border-border/60 shadow-lg backdrop-blur-xl rounded-2xl overflow-hidden">
          <CardContent className="pt-8 pb-8 px-8">
            {/* Step 0: Welcome */}
            {step === 0 && (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Welcome to PO Processing!
                  </h1>
                  {orgName && (
                    <p className="text-lg text-primary font-medium">
                      {orgName}
                    </p>
                  )}
                </div>
                <p className="text-[14px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
                  Automate your purchase order workflow with AI-powered extraction,
                  intelligent part matching, and streamlined review.
                </p>
                <p className="text-[13px] text-muted-foreground/80">
                  Let&apos;s get you set up in 3 quick steps.
                </p>
                <Button
                  onClick={handleNext}
                  className="h-11 px-8 rounded-xl text-[14px] font-medium shadow-sm"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Step 1: Seed Demo Data */}
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
                    We can seed your account with realistic demo data including vendors,
                    products, part mappings, and sample purchase orders so you can see the
                    system in action.
                  </p>
                </div>

                {seedComplete ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-[14px] font-medium">Demo data added!</span>
                    </div>
                    <Button
                      onClick={handleNext}
                      className="h-11 px-8 rounded-xl text-[14px] font-medium shadow-sm"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <Button
                      onClick={handleSeedData}
                      disabled={seeding}
                      className="h-11 px-8 rounded-xl text-[14px] font-medium shadow-sm"
                    >
                      {seeding ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Database className="mr-2 h-4 w-4" />
                      )}
                      Yes, add demo data
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleSkipSeed}
                      disabled={seeding}
                      className="text-[13px] text-muted-foreground hover:text-foreground"
                    >
                      Skip, I&apos;ll add my own
                    </Button>
                  </div>
                )}

                <div className="flex justify-center pt-2">
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
              </div>
            )}

            {/* Step 2: Quick Tour */}
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

                <div className="grid gap-3">
                  {tourItems.map((item) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 rounded-xl border border-border/60 p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium">{item.title}</p>
                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
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

            {/* Step 3: Ready! */}
            {step === 3 && (
              <div className="text-center space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 dark:bg-green-950/40">
                  <Rocket className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight">
                    You&apos;re all set!
                  </h2>
                  <p className="text-[14px] text-muted-foreground leading-relaxed max-w-sm mx-auto">
                    Your workspace is ready. Start by uploading your first purchase order
                    or explore the dashboard to see your data.
                  </p>
                </div>
                <Button
                  onClick={handleGoToDashboard}
                  className="h-11 px-8 rounded-xl text-[14px] font-medium shadow-sm"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <div className="flex justify-center">
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
