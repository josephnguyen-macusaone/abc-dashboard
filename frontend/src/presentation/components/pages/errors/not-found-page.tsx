'use client';

import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { Typography } from '@/presentation/components/atoms';

interface NotFoundPageProps {
  title?: string;
  message?: string;
  showGoHomeButton?: boolean;
  showGoBackButton?: boolean;
  onGoHome?: () => void;
  onGoBack?: () => void;
  onContactSupport?: () => void;
}

export function NotFoundPage({
  title = "Page Not Found",
  message = "Sorry, we couldn't find the page you're looking for.",
  showGoHomeButton = true,
  showGoBackButton = true,
  onGoHome,
  onGoBack,
  onContactSupport
}: NotFoundPageProps = {}) {
  const router = useRouter();

  const handleGoHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      router.push('/');
    }
  };

  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      router.back();
    }
  };

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      alert('Support contact would open here');
    }
  };

  return (
    <AuthTemplate>
      <Card className="text-center max-w-md mx-auto mt-8">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-6">
              <FileQuestion className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </div>
          </div>

          <CardTitle className="text-title-m">{title}</CardTitle>

          <CardDescription className="text-body-s text-muted-foreground">
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-row gap-3 justify-center pb-4">
            {showGoBackButton && (
              <Button variant="outline" onClick={handleGoBack}>
                <Typography variant="button-s">Go Back</Typography>
              </Button>
            )}

            {showGoHomeButton && (
              <Button variant="default" onClick={handleGoHome}>
                <Typography variant="button-s">Go to Homepage</Typography>
              </Button>
            )}
          </div>

          <div>
            <Typography variant="body-xs" color="muted">
              Need help?{' '}
              <button
                onClick={handleContactSupport}
                className="text-primary hover:underline"
              >
                Contact our support team
              </button>
            </Typography>
          </div>
        </CardContent>
      </Card>
    </AuthTemplate>
  );
}
