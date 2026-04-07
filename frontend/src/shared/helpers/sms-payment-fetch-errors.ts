import { ApiExceptionDto } from '@/application/dto/api-dto';
import { getErrorMessage } from '@/infrastructure/api/core/errors';

/**
 * SMS / MaPi list errors that mean "no data" or unknown external license — same UX as an empty list
 * (My Licenses empty state), not a red alert banner.
 */
const BENIGN_SMS_PAYMENT_MESSAGE_PATTERNS: RegExp[] = [
  /license not found/i,
  /\bHTTP\s+404\b/i,
  /\bstatus\s*404\b/i,
  /no (sms )?payments?\s+found/i,
  /no\s+records?\s+found/i,
  /could not find (the )?license/i,
  /unknown\s+(appid|license)/i,
  /resource (was )?not found/i,
  /unable to (locate|find) (the )?license/i,
];

export function isBenignSmsPaymentFetchError(error: unknown): boolean {
  if (error instanceof ApiExceptionDto) {
    if (error.status === 404) return true;
  }

  const err = error as { status?: number };
  if (typeof err?.status === 'number' && err.status === 404) return true;

  const message = getErrorMessage(error);
  if (!message.trim()) return false;

  return BENIGN_SMS_PAYMENT_MESSAGE_PATTERNS.some((re) => re.test(message));
}
