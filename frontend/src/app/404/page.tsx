'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react';
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

  const handleSearch = () => {
    logger.user('User initiated search from 404 page');
    // In a real app, this might open a search modal or navigate to a search page
    router.push('/dashboard');
  };

  return (
    <AuthTemplate>
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-6">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          {/* MAC USA ONE Typography: Title L for 404 title */}
          <CardTitle className="text-title-l">404 - Page Not Found</CardTitle>
          {/* MAC USA ONE Typography: Body M for description */}
          <CardDescription className="text-body-m">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you might have mistyped the URL.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* MAC USA ONE Typography: Body S for help text */}
          <div className="text-body-s text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <Typography variant="label-s" className="font-medium" as="strong">What you can try:</Typography>
            <ul className="mt-2 space-y-1 text-left">
              <li>• Check if the URL is correct</li>
              <li>• Go back to the previous page</li>
              <li>• Visit our homepage</li>
              <li>• Contact support if you believe this is an error</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={handleGoHome}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go to Homepage
            </Button>

            <Button
              onClick={handleGoBack}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </Button>

            <Button
              onClick={handleSearch}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Browse Dashboard
            </Button>
          </div>

          <div className="pt-4 border-t">
            {/* MAC USA ONE Typography: Body XS for footer text */}
            <Typography variant="body-xs" color="muted" as="p">
              If you believe this is an error, please{' '}
              <button
                onClick={() => {
                  logger.user('User clicked contact support from 404 page');
                  // In a real app, this might open a contact form or support chat
                  alert('Support contact would open here');
                }}
                className="text-primary hover:underline"
              >
                contact our support team
              </button>
              {' '}with details about what you were trying to access.
            </Typography>
          </div>
        </CardContent>
      </Card>
    </AuthTemplate>
  );
}
