"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/atoms/primitives/dialog";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-3">
        <DialogHeader>
          <DialogTitle>Activity</DialogTitle>
          <DialogDescription className="truncate" title={licenseLabel}>
            {licenseLabel}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-body-s text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-body-s text-destructive">{error}</p>
        ) : !data?.events.length ? (
          <p className="text-body-s text-muted-foreground">No recorded activity for this license yet.</p>
        ) : (
          <>
            <p className="text-body-s text-muted-foreground">
              Showing {data.events.length} of {data.total} event{data.total === 1 ? "" : "s"}.
            </p>
            <ScrollArea className="h-[min(360px,50vh)] pr-3">
              <ul className="flex flex-col gap-3">
                {data.events.map((ev: LicenseAuditEventDto) => (
                  <li
                    key={ev.id}
                    className="rounded-md border border-border bg-muted/30 px-3 py-2 text-left"
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
      </DialogContent>
    </Dialog>
  );
}
