import type { LucideIcon } from 'lucide-react';

/** Sidebar / dashboard nav entry — lives in `shared` so routing helpers avoid importing presentation. */
export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
  userOnly?: boolean;
}
