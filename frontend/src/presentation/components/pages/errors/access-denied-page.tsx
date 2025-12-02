'use client';

import { AlertTriangle } from 'lucide-react';
import { Typography } from '@/presentation/components/atoms/ui/typography';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Card, CardContent } from '@/presentation/components/atoms/ui/card';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';

interface AccessDeniedPageProps {
  title?: string;
  message?: string;
  onGoBack?: () => void;
  showGoBackButton?: boolean;
}

export function AccessDeniedPage({
  title = "Access Denied",
  message = "You don't have permission to access this area.",
  onGoBack,
  showGoBackButton = true
}: AccessDeniedPageProps = {}) {
  const handleGoBack = () => {
    if (onGoBack) {
      onGoBack();
    } else {
      window.history.back();
    }
  };

  return (
    <AuthTemplate>
      <Card className="max-w-md w-full text-center">
        <CardContent>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600 pb-0.5" aria-hidden="true" />
        </div>
        <Typography variant="title-m" className="mb-2" align="center">{title}</Typography>
        <Typography variant="body-s" className="mb-6" color="muted" align="center">
          {message}
        </Typography>
        {showGoBackButton && (
          <Button variant="default" onClick={handleGoBack}>
            <Typography variant="button-s">Go Back</Typography>
          </Button>
        )}
        </CardContent>
      </Card>
    </AuthTemplate>
  );
}
