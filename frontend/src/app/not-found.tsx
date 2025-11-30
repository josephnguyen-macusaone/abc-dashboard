'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Home, ArrowLeft, FileQuestion } from 'lucide-react';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { logger } from '@/shared/utils';
import { Typography } from '@/presentation/components/atoms';

export default function NotFoundPage() {
  const router = useRouter();

  const handleGoHome = () => {
    logger.user('User navigated to home from 404 page');
    router.push('/');
  };

  const handleGoBack = () => {
    logger.user('User navigated back from 404 page');
    router.back();
  };

  return (
    <AuthTemplate>
      <Card className="text-center max-w-md mx-auto">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-6">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>

          <CardTitle className="text-title-l">Page Not Found</CardTitle>

          <CardDescription className="text-body-m">
            Sorry, we couldn't find the page you're looking for.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-row gap-3 justify-center pb-4">
            <Button onClick={handleGoHome} className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              <Typography variant="button-s" className="pt-0.5">Go to Homepage</Typography>
            </Button>

            <Button onClick={handleGoBack} variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <Typography variant="button-s" color="muted" className="pt-0.5">Go Back</Typography>
            </Button>
          </div>

          <div>
            <Typography variant="body-xs" color="muted">
              Need help?{' '}
              <button
                onClick={() => {
                  logger.user('User clicked contact support from 404 page');
                  alert('Support contact would open here');
                }}
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