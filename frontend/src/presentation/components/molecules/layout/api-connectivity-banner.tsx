'use client';

import { AlertTriangle, X } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
} from '@/presentation/components/atoms';
import { LOGIN_SERVER_UNREACHABLE_MESSAGE } from '@/infrastructure/api/core/errors';
import { useApiConnectivityStore } from '@/infrastructure/stores/api-connectivity-store';

export function ApiConnectivityBanner() {
  const isUnreachable = useApiConnectivityStore((s) => s.isUnreachable);
  const detailMessage = useApiConnectivityStore((s) => s.detailMessage);
  const userDismissed = useApiConnectivityStore((s) => s.userDismissed);
  const dismissBanner = useApiConnectivityStore((s) => s.dismissBanner);

  if (!isUnreachable || userDismissed) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex justify-center p-3 pointer-events-none"
      aria-live="polite"
    >
      <Alert
        variant="warning"
        className="pointer-events-auto relative max-w-2xl w-full shadow-lg pr-10"
      >
        <AlertTriangle className="size-4" aria-hidden />
        <AlertTitle>Can&apos;t reach the API server</AlertTitle>
        <AlertDescription className="text-foreground/90">
          <p>{LOGIN_SERVER_UNREACHABLE_MESSAGE}</p>
          {detailMessage ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground break-all">
              {detailMessage}
            </p>
          ) : null}
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 size-8 shrink-0 text-foreground/70 hover:text-foreground"
          onClick={dismissBanner}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </Button>
      </Alert>
    </div>
  );
}
