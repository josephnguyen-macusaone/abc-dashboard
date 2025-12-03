'use client';

import { AlertTriangle } from 'lucide-react';
import { Typography } from '@/presentation/components/atoms/display/typography';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { Card, CardContent } from '@/presentation/components/atoms/primitives/card';
import { useRouter } from 'next/navigation';

export interface AccessDeniedCardProps {
  title?: string;
  message?: string;
}

export function AccessDeniedCard({
  title = "Access Denied",
  message = "You don't have permission to access this area.",
}: AccessDeniedCardProps) {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  return (
    <Card className="text-center">
      <CardContent>
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-red-600 pb-0.5" aria-hidden="true" />
        </div>
        <Typography variant="title-m" className="mb-2" align="center">{title}</Typography>
        <Typography variant="body-s" className="mb-6" color="muted" align="center">
          {message}
        </Typography>
        <Button variant="default" onClick={handleGoBack}>
          <Typography variant="button-s">Go Back</Typography>
        </Button>
      </CardContent>
    </Card>
  );
}
