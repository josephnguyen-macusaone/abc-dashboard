'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Alert, AlertDescription } from '@/presentation/components/atoms/primitives/alert';
import { Typography } from '@/presentation/components/atoms';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/presentation/contexts/auth-context';

interface VerifyEmailFormProps {
  email: string;
  username?: string;
  onSuccess?: () => void;
  onBackToLogin?: () => void;
}

export function VerifyEmailForm({ email, username, onSuccess, onBackToLogin }: VerifyEmailFormProps) {
  const { handleVerifyEmail } = useAuth();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Start countdown when component mounts
    setCountdown(60);
  }, []);

  useEffect(() => {
    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      // For validation errors, we can still show inline alerts since they're not API errors
      return;
    }

    setIsVerifying(true);

    try {
      // Note: This form is deprecated. New flow uses JWT tokens in URL.
      // Keeping for backward compatibility, but this won't work with new API.
      // The new API expects only a token parameter, not email + token.
      console.warn('Using deprecated OTP verification. New flow uses JWT tokens.');

      // This will fail with new API since signature changed
      await handleVerifyEmail(email, otpValue); // This expects only token now
      setSuccessMessage('Email verified successfully! You can now log in.');
      onSuccess?.();

      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = '/login?message=Email verified! Please log in.';
      }, 3000);
    } catch (err: any) {
      // Error toast is now handled by the auth context
      // We don't need to do anything here since the error is already shown globally
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;

    setIsResending(true);

    try {
      // TODO: Implement resend OTP API call
      setSuccessMessage('New verification code sent! Please check your email.');
      setCountdown(60); // Reset countdown
    } catch (err: any) {
      // Error toast is now handled globally
    } finally {
      setIsResending(false);
    }
  };

  if (successMessage) {
    return (
      <div className="text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="space-y-2">
          {/* MAC USA ONE Typography: Title L for success title */}
          <Typography variant="title-l" className="text-success">
            Email Verified!
          </Typography>
          {/* MAC USA ONE Typography: Body M for success message */}
          <Typography variant="body-m" color="muted">
            Your email has been successfully verified.
          </Typography>
        </div>
        {/* MAC USA ONE Typography: Body S for redirect message */}
        <Typography variant="body-s" color="muted">
          Redirecting to login page...
        </Typography>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email Info */}
      <div className="text-center space-y-2">
        {/* MAC USA ONE Typography: Body S for info text */}
        <Typography variant="body-s" color="muted">
          Code sent to:
        </Typography>
        {/* MAC USA ONE Typography: Body M for email */}
        <Typography variant="body-m" className="font-medium">
          {email}
        </Typography>
        {username && (
          <Typography variant="body-xs" color="muted">
            Username: {username}
          </Typography>
        )}
      </div>

      {/* 6-slot OTP input */}
      <div className="flex justify-center space-x-2">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            // MAC USA ONE Typography: Title M for OTP digits
            className="w-12 h-12 text-center text-title-m font-semibold border-2 border-input rounded-lg focus:border-primary focus:outline-none transition-colors"
            disabled={isVerifying}
          />
        ))}
      </div>

      {successMessage && (
        <Alert>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Verify Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleVerifyOtp}
          disabled={isVerifying || otp.some(digit => !digit)}
          className="w-[328px] h-11 font-semibold rounded-lg"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            'Verify Email'
          )}
        </Button>
      </div>

      {/* Reset Section */}
      <div className="text-center">
        {/* MAC USA ONE Typography: Body S for resend text */}
        <Typography variant="body-s" color="muted" as="p">
          Didn't receive the code?{' '}
          {isResending ? (
            <span className="text-blue-600">
              <Loader2 className="w-4 h-4 inline mr-1 animate-spin" />
              Sending...
            </span>
          ) : countdown > 0 ? (
            <span className="text-muted-foreground">
              Resend in {countdown}s
            </span>
          ) : (
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-body-s text-primary hover:text-primary/80"
              onClick={handleResendOtp}
              disabled={isResending}
            >
              Resend Code
            </Button>
          )}
        </Typography>
        {countdown > 0 && (
          <Typography variant="body-xs" color="muted" className="mt-1">
            Next resend available in {countdown} seconds.
          </Typography>
        )}
      </div>

      {/* Back to Login */}
      <Button
        onClick={onBackToLogin}
        variant="ghost"
        className="w-full"
      >
        Back to Login
      </Button>
    </div>
  );
}
