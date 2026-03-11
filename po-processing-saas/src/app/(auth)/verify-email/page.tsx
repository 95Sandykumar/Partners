'use client';

import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FileText, Loader2, AlertCircle, Mail, RefreshCw } from 'lucide-react';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const email = searchParams.get('email') || '';

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Start with a cooldown (user just signed up, email was just sent)
  useEffect(() => {
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }, []);

  // Auto-focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(index: number, value: string) {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    setError('');

    // Auto-advance to next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    // Focus the next empty input or the last one
    const nextEmptyIndex = newOtp.findIndex((d) => !d);
    const focusIndex = nextEmptyIndex === -1 ? OTP_LENGTH - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  }

  const handleVerify = useCallback(async () => {
    const token = otp.join('');
    if (token.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code');
      return;
    }

    if (!email) {
      setError('Email address is missing. Please go back to sign up.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (verifyError) {
      setError(verifyError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    router.push('/dashboard/onboarding');
    router.refresh();
  }, [otp, email, supabase.auth, router]);

  // Auto-submit when all digits entered
  useEffect(() => {
    const token = otp.join('');
    if (token.length === OTP_LENGTH && !loading && !success) {
      handleVerify();
    }
  }, [otp, loading, success, handleVerify]);

  async function handleResend() {
    if (resendCooldown > 0 || resending || !email) return;

    setResending(true);
    setError('');

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    }
    setResending(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-[420px] border-border/60 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-md">
            <FileText className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-[22px] font-semibold tracking-tight">
            Verify your email
          </CardTitle>
          <CardDescription className="text-[13px] text-muted-foreground mt-1">
            {email ? (
              <>
                We sent a 6-digit code to{' '}
                <span className="font-medium text-foreground">{email}</span>
              </>
            ) : (
              'Enter the 6-digit code sent to your email'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-[13px] text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* OTP Input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading || success}
                className="h-14 w-12 rounded-xl border-border/60 text-center text-xl font-semibold
                  focus-visible:ring-primary focus-visible:ring-2"
                aria-label={`Digit ${index + 1}`}
              />
            ))}
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            className="w-full h-11 rounded-xl text-[14px] font-medium shadow-sm"
            disabled={loading || success || otp.join('').length !== OTP_LENGTH}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : success ? (
              'Verified!'
            ) : (
              'Verify Email'
            )}
          </Button>

          {/* Resend */}
          <div className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
            <Mail className="h-4 w-4" />
            <span>Didn&apos;t receive the code?</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || resending}
              className="text-primary font-medium hover:underline disabled:text-muted-foreground disabled:no-underline disabled:cursor-not-allowed inline-flex items-center gap-1"
            >
              {resending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : resendCooldown > 0 ? (
                <>
                  <RefreshCw className="h-3 w-3" />
                  Resend in {resendCooldown}s
                </>
              ) : (
                'Resend code'
              )}
            </button>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 pt-0">
          <p className="text-[13px] text-muted-foreground">
            Wrong email?{' '}
            <Link href="/signup" className="text-primary font-medium hover:underline">
              Sign up again
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
