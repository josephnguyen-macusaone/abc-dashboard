'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { LicensesDataTable } from '@/presentation/components/molecules/domain/license-management';
import { fakerLicensesSmall } from '@/shared/mock/license-faker-data';

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
  className,
}: LicenseTableSectionProps) {
  const router = useRouter();

  const onEdit = React.useCallback(() => {
    router.push('/dashboard?section=licenses');
  }, [router]);

  return (
    <LicensesDataTable
      data={fakerLicensesSmall}
      pageCount={Math.ceil(fakerLicensesSmall.length / 5)}
      title={title}
      description={description}
      showHeader={true}
      onEdit={onEdit}
      className={className}
    />
  );
}

