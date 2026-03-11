'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

// ---------- Password strength ----------

type StrengthLevel = 0 | 1 | 2 | 3;

interface PasswordStrength {
  level: StrengthLevel;
  label: string;
  colorClass: string;
}

function getPasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) return { level: 0, label: '', colorClass: '' };
  if (password.length < 6) {
    return { level: 1, label: 'Too short', colorClass: 'bg-destructive' };
  }

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { level: 1, label: 'Weak', colorClass: 'bg-orange-400' };
  if (score <= 2) return { level: 2, label: 'Fair', colorClass: 'bg-yellow-400' };
  return { level: 3, label: 'Strong', colorClass: 'bg-green-500' };
}

// ---------- Field validation ----------

function validateField(field: string, value: string): string {
  switch (field) {
    case 'orgName':
      return value.trim().length < 2 ? 'Organization name is required' : '';
    case 'fullName':
      return value.trim().length < 2 ? 'Full name is required' : '';
    case 'email':
      if (!value.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address';
      return '';
    case 'password':
      if (!value) return 'Password is required';
      if (value.length < 6) return 'Must be at least 6 characters';
      return '';
    default:
      return '';
  }
}

// ---------- Component ----------

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const router = useRouter();
  const supabase = createClient();

  const passwordStrength = getPasswordStrength(password);

  function getError(field: string): string {
    if (!touched[field]) return '';
    const valueMap: Record<string, string> = {
      orgName,
      fullName,
      email,
      password,
    };
    return validateField(field, valueMap[field] ?? '');
  }

  function handleBlur(field: string) {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    // Mark all fields touched to surface any errors
    setTouched({ orgName: true, fullName: true, email: true, password: true });

    const errors = [
      validateField('orgName', orgName),
      validateField('fullName', fullName),
      validateField('email', email),
      validateField('password', password),
    ].filter(Boolean);

    if (errors.length > 0) {
      setError(errors[0]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, org_name: orgName },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Signup failed — please try again');

      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: authData.user.id,
          email,
          fullName,
          orgName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to set up account');
      }

      // Redirect to email verification page
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-[420px] border-border/60 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-md">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-[22px] font-semibold tracking-tight">
            Create your account
          </CardTitle>
          <CardDescription className="text-[13px] text-muted-foreground mt-1">
            Start processing POs with AI extraction
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSignup} noValidate>
          <CardContent className="space-y-4 pt-2">
            {/* Global error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[13px] text-destructive">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Organization Name */}
            <div className="space-y-1.5">
              <Label htmlFor="orgName" className="text-[13px] font-medium">
                Organization Name
              </Label>
              <Input
                id="orgName"
                placeholder="Acme Inc."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onBlur={() => handleBlur('orgName')}
                required
                aria-invalid={!!getError('orgName')}
                className={cn(
                  'h-11 rounded-xl border-border/60 text-[14px] placeholder:text-muted-foreground/60',
                  getError('orgName') &&
                    'border-destructive focus-visible:ring-destructive'
                )}
              />
              {getError('orgName') && (
                <p className="text-[12px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {getError('orgName')}
                </p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-[13px] font-medium">
                Full Name
              </Label>
              <Input
                id="fullName"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => handleBlur('fullName')}
                required
                aria-invalid={!!getError('fullName')}
                className={cn(
                  'h-11 rounded-xl border-border/60 text-[14px] placeholder:text-muted-foreground/60',
                  getError('fullName') &&
                    'border-destructive focus-visible:ring-destructive'
                )}
              />
              {getError('fullName') && (
                <p className="text-[12px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {getError('fullName')}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium">
                Work Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                required
                aria-invalid={!!getError('email')}
                className={cn(
                  'h-11 rounded-xl border-border/60 text-[14px] placeholder:text-muted-foreground/60',
                  getError('email') &&
                    'border-destructive focus-visible:ring-destructive'
                )}
              />
              {getError('email') && (
                <p className="text-[12px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {getError('email')}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[13px] font-medium">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => handleBlur('password')}
                  required
                  minLength={6}
                  aria-invalid={!!getError('password')}
                  className={cn(
                    'h-11 rounded-xl border-border/60 text-[14px] placeholder:text-muted-foreground/60 pr-10',
                    getError('password') &&
                      'border-destructive focus-visible:ring-destructive'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Password strength bar */}
              {password.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  <div className="flex gap-1">
                    {([1, 2, 3] as StrengthLevel[]).map((lvl) => (
                      <div
                        key={lvl}
                        className={cn(
                          'flex-1 h-1 rounded-full transition-colors duration-300',
                          passwordStrength.level >= lvl
                            ? passwordStrength.colorClass
                            : 'bg-muted-foreground/15'
                        )}
                      />
                    ))}
                  </div>
                  {passwordStrength.label && (
                    <p
                      className={cn(
                        'text-[11px]',
                        passwordStrength.level === 3
                          ? 'text-green-600 dark:text-green-400'
                          : passwordStrength.level === 2
                            ? 'text-yellow-600 dark:text-yellow-400'
                            : 'text-orange-600 dark:text-orange-400'
                      )}
                    >
                      {passwordStrength.label} password
                    </p>
                  )}
                </div>
              )}

              {getError('password') && (
                <p className="text-[12px] text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  {getError('password')}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-2">
            <Button
              type="submit"
              className="w-full h-11 rounded-xl text-[14px] font-medium shadow-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
            <p className="text-[13px] text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
