"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/presentation/components/atoms/primitives/sheet";
import { ScrollArea } from "@/presentation/components/atoms/primitives/scroll-area";
import { createLicenseApiClient } from "@/infrastructure/api/licenses/api-client";
import { handleApiError } from "@/infrastructure/api/core/errors";
import { ApiExceptionDto } from "@/application/dto/api-dto";
import type { LicenseAuditEventDto, LicenseAuditEventsData } from "@/infrastructure/api/licenses/types";

const licenseApi = createLicenseApiClient();

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export interface LicenseAuditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  licenseId: string;
  licenseLabel: string;
}

export function LicenseAuditHistoryDialog({
  open,
  onOpenChange,
  licenseId,
  licenseLabel,
}: LicenseAuditHistoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LicenseAuditEventsData | null>(null);
  const activityRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !licenseId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    void (async () => {
      try {
        const result = await licenseApi.getLicenseAuditEvents(licenseId, { page: 1, limit: 50 });
        if (!cancelled) setData(result);
      } catch (e) {
        const apiErr = e instanceof ApiExceptionDto ? e : handleApiError(e);
        if (!cancelled) setError(apiErr.message || "Could not load activity");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, licenseId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="gap-4"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          activityRegionRef.current?.focus({ preventScroll: true });
        }}
      >
        <SheetHeader>
          <SheetTitle>Activity</SheetTitle>
          <SheetDescription className="truncate" title={licenseLabel}>
            {licenseLabel}
          </SheetDescription>
        </SheetHeader>

        <div
          ref={activityRegionRef}
          tabIndex={-1}
          aria-label="License activity log"
          className="flex min-h-0 flex-1 flex-col gap-3 outline-none ring-0"
        >
          <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
            Event history
          </h3>

          {loading ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2" aria-busy="true">
              <p className="text-body-s text-muted-foreground">Loading activity…</p>
              <ul className="flex min-h-[min(280px,calc(100dvh-14rem))] flex-1 flex-col gap-2" aria-hidden>
                {Array.from({ length: 8 }, (_, i) => (
                  <li
                    key={i}
                    className="h-16 shrink-0 animate-pulse rounded-lg border border-border/60 bg-muted/50"
                  />
                ))}
              </ul>
            </div>
          ) : error ? (
            <p className="text-body-s text-destructive">{error}</p>
          ) : !data?.events.length ? (
            <p className="text-body-s text-muted-foreground">No recorded activity for this license yet.</p>
          ) : (
            <>
              <p className="shrink-0 text-body-s text-muted-foreground">
                Showing {data.events.length} of {data.total} event{data.total === 1 ? "" : "s"}.
              </p>
              <ScrollArea className="min-h-[min(320px,calc(100dvh-13rem))] flex-1 pr-3">
                <ul className="flex flex-col gap-3">
                  {data.events.map((ev: LicenseAuditEventDto) => (
                    <li
                      key={ev.id}
                      className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-left shadow-sm"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-body-s font-medium text-foreground">
                          {ev.description ?? ev.type}
                        </span>
                        <time className="text-caption text-muted-foreground tabular-nums" dateTime={ev.createdAt}>
                          {formatWhen(ev.createdAt)}
                        </time>
                      </div>
                      {ev.type ? (
                        <p className="mt-0.5 font-mono text-caption text-muted-foreground">{ev.type}</p>
                      ) : null}
                      {ev.metadata && Object.keys(ev.metadata).length > 0 ? (
                        <pre className="mt-2 max-h-24 overflow-auto rounded bg-background/80 p-2 text-caption leading-snug text-muted-foreground">
                          {JSON.stringify(ev.metadata, null, 2)}
                        </pre>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
