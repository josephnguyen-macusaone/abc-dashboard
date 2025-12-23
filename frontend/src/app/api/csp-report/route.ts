import { NextRequest, NextResponse } from 'next/server';
import logger from '@/shared/helpers/logger';

/**
 * CSP Violation Report Handler
 * Logs Content Security Policy violations for security monitoring
 * Only active in development environment
 */
export async function POST(request: NextRequest) {
  try {
    // Only process reports in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const report = await request.json();

    // Log CSP violation for security monitoring
    logger.security('CSP Violation Detected', {
      component: 'CSP-Report',
      violation: {
        documentUri: report['csp-report']?.['document-uri'],
        violatedDirective: report['csp-report']?.['violated-directive'],
        effectiveDirective: report['csp-report']?.['effective-directive'],
        originalPolicy: report['csp-report']?.['original-policy'],
        blockedUri: report['csp-report']?.['blocked-uri'],
        statusCode: report['csp-report']?.['status-code'],
        sourceFile: report['csp-report']?.['source-file'],
        lineNumber: report['csp-report']?.['line-number'],
        columnNumber: report['csp-report']?.['column-number']
      }
    });

    return NextResponse.json({ received: true });

  } catch (error) {
    logger.error('Failed to process CSP report', {
      component: 'CSP-Report',
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
