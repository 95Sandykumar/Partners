'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Database, RotateCcw, CheckCircle2, CreditCard, Sparkles } from 'lucide-react';
import { BILLING_PLANS } from '@/lib/stripe/plans';

interface SeedResult {
  success: boolean;
  reset: { purchase_orders_deleted: number; vendors_deleted: number } | null;
  seeded: {
    vendors: number;
    vendor_templates: number;
    products: number;
    vendor_mappings: number;
    purchase_orders: number;
    line_items: number;
    review_queue_items: number;
  };
  details: {
    sample_pos: {
      po_number: string;
      vendor: string;
      confidence: number;
      line_items: number;
      matched: number;
      unmatched: number;
    }[];
  };
}

export default function SettingsPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<SeedResult | null>(null);
  const [userProfile, setUserProfile] = useState({
    email: '',
    full_name: '',
    role: '',
  });
  const [orgInfo, setOrgInfo] = useState({
    name: '',
    slug: '',
    subscription_tier: '',
    monthly_po_limit: 0,
    subscription_status: '',
    stripe_customer_id: '',
  });
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('users')
        .select('*, organization:organizations(*)')
        .eq('id', user.id)
        .single();

      if (profile) {
        setUserProfile({
          email: profile.email,
          full_name: profile.full_name,
          role: profile.role,
        });
        const org = profile.organization as Record<string, unknown>;
        if (org) {
          setOrgInfo({
            name: org.name as string,
            slug: org.slug as string,
            subscription_tier: org.subscription_tier as string,
            monthly_po_limit: org.monthly_po_limit as number,
            subscription_status: (org.subscription_status as string) || 'inactive',
            stripe_customer_id: (org.stripe_customer_id as string) || '',
          });
        }
      }
      setLoading(false);
    }

    loadProfile();
  }, [supabase]);

  async function handleSaveProfile() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      await supabase
        .from('users')
        .update({ full_name: userProfile.full_name })
        .eq('id', user.id);

      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpgrade(tier: string) {
    setUpgrading(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.href = data.sessionUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upgrade failed';
      toast.error(message);
      setUpgrading(false);
    }
  }

  async function handleManageBilling() {
    setUpgrading(true);
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.location.href = data.portalUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to open billing portal';
      toast.error(message);
      setUpgrading(false);
    }
  }

  async function handleSeedData(reset: boolean) {
    setSeeding(true);
    setSeedResult(null);
    try {
      const url = reset ? '/api/seed?reset=true' : '/api/seed';
      const response = await fetch(url, { method: 'POST' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Seed failed');
      }

      setSeedResult(data);
      toast.success(
        reset
          ? 'Data reset and re-seeded successfully'
          : 'Demo data seeded successfully'
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Seed failed';
      toast.error(message);
    } finally {
      setSeeding(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and organization settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your personal account settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={userProfile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={userProfile.full_name}
              onChange={(e) =>
                setUserProfile({ ...userProfile, full_name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={userProfile.role} disabled />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>Your organization details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            <Input value={orgInfo.name} disabled />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={orgInfo.slug} disabled />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subscription Tier</Label>
              <Input value={orgInfo.subscription_tier} disabled className="capitalize" />
            </div>
            <div className="space-y-2">
              <Label>Monthly PO Limit</Label>
              <Input value={orgInfo.monthly_po_limit} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      {userProfile.role === 'admin' && (
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Billing &amp; Subscription
            </CardTitle>
            <CardDescription>Manage your subscription plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
              <div>
                <p className="text-[13px] text-muted-foreground">Current Plan</p>
                <p className="text-lg font-semibold capitalize">{orgInfo.subscription_tier}</p>
                <p className="text-[12px] text-muted-foreground">
                  {orgInfo.monthly_po_limit === 999999
                    ? 'Unlimited POs/month'
                    : `${orgInfo.monthly_po_limit} POs/month`}
                </p>
              </div>
              <Badge
                variant={orgInfo.subscription_status === 'active' ? 'default' : 'secondary'}
                className="capitalize"
              >
                {orgInfo.subscription_status === 'inactive' && orgInfo.subscription_tier === 'free'
                  ? 'Free'
                  : orgInfo.subscription_status.replace('_', ' ')}
              </Badge>
            </div>

            {orgInfo.subscription_tier === 'free' ? (
              <>
                <Separator />
                <p className="text-[13px] text-muted-foreground">
                  Upgrade to process more POs and unlock premium features.
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {(['starter', 'professional', 'enterprise'] as const).map((tier) => {
                    const plan = BILLING_PLANS[tier];
                    return (
                      <div key={tier} className="rounded-xl border border-border/60 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-[14px]">{plan.name}</p>
                          <p className="text-[14px] font-semibold">
                            ${plan.price}<span className="text-[11px] text-muted-foreground font-normal">/mo</span>
                          </p>
                        </div>
                        <ul className="space-y-1">
                          {plan.features.map((f) => (
                            <li key={f} className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                              <Sparkles className="h-3 w-3 text-primary" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <Button
                          size="sm"
                          className="w-full mt-2 rounded-lg text-[13px]"
                          variant={tier === 'professional' ? 'default' : 'outline'}
                          disabled={upgrading}
                          onClick={() => handleUpgrade(tier)}
                        >
                          {upgrading ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : null}
                          {tier === 'professional' ? 'Recommended' : `Choose ${plan.name}`}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <Button
                variant="outline"
                className="rounded-xl"
                disabled={upgrading}
                onClick={handleManageBilling}
              >
                {upgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Manage Billing
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {userProfile.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Demo Data
            </CardTitle>
            <CardDescription>
              Seed your organization with realistic demo data for testing.
              Includes 4 vendors with templates, 20 products, 15 vendor mappings,
              and 3 sample purchase orders at different confidence levels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button
                onClick={() => handleSeedData(false)}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Database className="mr-2 h-4 w-4" />
                )}
                Seed Demo Data
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSeedData(true)}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Reset &amp; Re-seed
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              &quot;Seed Demo Data&quot; adds data without removing existing records.
              &quot;Reset &amp; Re-seed&quot; clears all organization data first.
            </p>

            {seedResult && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4" />
                    Seed completed successfully
                  </div>

                  {seedResult.reset && (
                    <p className="text-xs text-muted-foreground">
                      Reset: removed {seedResult.reset.purchase_orders_deleted} POs,{' '}
                      {seedResult.reset.vendors_deleted} vendors
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendors</span>
                      <Badge variant="secondary">{seedResult.seeded.vendors}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Templates</span>
                      <Badge variant="secondary">{seedResult.seeded.vendor_templates}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Products</span>
                      <Badge variant="secondary">{seedResult.seeded.products}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Mappings</span>
                      <Badge variant="secondary">{seedResult.seeded.vendor_mappings}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purchase Orders</span>
                      <Badge variant="secondary">{seedResult.seeded.purchase_orders}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Line Items</span>
                      <Badge variant="secondary">{seedResult.seeded.line_items}</Badge>
                    </div>
                  </div>

                  {seedResult.details.sample_pos.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-xs font-medium">Sample POs in Review Queue:</p>
                        {seedResult.details.sample_pos.map((po) => (
                          <div
                            key={po.po_number}
                            className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
                          >
                            <div>
                              <span className="font-mono font-medium">{po.po_number}</span>
                              <span className="ml-2 text-muted-foreground capitalize">
                                ({po.vendor})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground">
                                {po.matched}/{po.line_items} matched
                              </span>
                              <Badge
                                variant={
                                  po.confidence >= 85
                                    ? 'default'
                                    : po.confidence >= 70
                                      ? 'secondary'
                                      : 'destructive'
                                }
                              >
                                {po.confidence}%
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
