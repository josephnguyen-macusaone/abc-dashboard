'use client';

import * as React from 'react';
import { LicensesDataTable } from '@/presentation/components/molecules/domain/dashboard';
import { mockLicenses } from '@/shared/mock/license-mock-data';

export interface LicenseTableSectionProps {
  /**
   * Optional title for the section
   */
  title?: string;
  /**
   * Optional description
   */
  description?: string;
  /**
   * Maximum height for internal table scrolling (e.g., '400px', '60vh')
   */
  maxTableHeight?: string;
  /**
   * Additional class names
   */
  className?: string;
}

export function LicenseTableSection({
  title = 'License Management',
  description = 'Manage license records and subscriptions',
  maxTableHeight = '500px',
  className,
}: LicenseTableSectionProps) {
  return (
    <LicensesDataTable
      data={mockLicenses}
      pageCount={Math.ceil(mockLicenses.length / 10)}
      title={title}
      description={description}
      className={className}
    />
  );
}

