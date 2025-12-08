'use client';

import { ReactNode } from 'react';
import { Button } from '@/presentation/components/atoms/primitives/button';
import { ArrowLeft } from 'lucide-react';

interface UserFormTemplateProps {
  children: ReactNode;
  onBack: () => void;
}

export function UserFormTemplate({ children, onBack }: UserFormTemplateProps) {
  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="p-2 h-9 w-9 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="sr-only">Go back</span>
        </Button>
      </div>

      {/* Form Content */}
      {children}
    </div>
  );
}