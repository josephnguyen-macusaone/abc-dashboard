'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/presentation/components/atoms/primitives/card';

export interface DashboardRoleIntroProps {
  title: string;
  description: string;
  className?: string;
}

export function DashboardRoleIntro({ title, description, className }: DashboardRoleIntroProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription className="text-base leading-relaxed">{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
