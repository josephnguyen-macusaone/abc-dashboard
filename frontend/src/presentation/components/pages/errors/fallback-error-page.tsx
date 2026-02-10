"use client";

import { useRouter } from 'next/navigation';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Typography } from '@/presentation/components/atoms';
import { AlertTriangle } from 'lucide-react';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';

interface ErrorFallbackProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onHome?: () => void;
}

export function ErrorFallbackPage({
  title = "Unexpected Error",
  message = "Something went wrong. You can try again or go back home.",
  onRetry,
  onHome
}: ErrorFallbackProps) {
  const router = useRouter();

  const handleHome = () => {
    if (onHome) {
      onHome();
    } else {
      router.push('/');
    }
  };

  return (
    <AuthTemplate>
      <Card className="text-center max-w-md mx-auto">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-6">
              <AlertTriangle className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </div>
          </div>

          <CardTitle className="text-title-m">{title}</CardTitle>

          <CardDescription className="text-body-s text-muted-foreground">
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-row gap-3 justify-center pb-2">
            {onRetry && (
              <Button variant="default" onClick={onRetry}>
                <Typography variant="button-s">Try again</Typography>
              </Button>
            )}
            <Button variant="outline" onClick={handleHome}>
              <Typography variant="button-s">Go home</Typography>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthTemplate>
  );
}
