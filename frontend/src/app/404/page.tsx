'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/presentation/components/atoms/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/ui/card';
import { Home, ArrowLeft, Search, FileQuestion } from 'lucide-react';
import { AuthTemplate } from '@/presentation/components/templates/auth-template';
import { logger } from '@/shared/utils';

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
    <AuthTemplate
      title="Page Not Found"
      subtitle="The page you're looking for doesn't exist or has been moved."
    >
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-6">
              <FileQuestion className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">404 - Page Not Found</CardTitle>
          <CardDescription className="text-base">
            Sorry, we couldn't find the page you're looking for. It might have been moved, deleted, or you might have mistyped the URL.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>What you can try:</strong>
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
            <p className="text-xs text-muted-foreground">
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
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthTemplate>
  );
}
