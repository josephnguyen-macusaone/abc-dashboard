// Skeleton components following Atomic Design principles

// Atoms - Basic building blocks
export * from './atoms';

// Molecules - Combinations of atoms
export * from './molecules';

// Organisms - Complex layouts combining molecules
export * from './organisms';

// Backwards compatibility - re-export from skeletons
export { LicenseDataTableSkeleton } from './organisms/skeletons';
export { LicenseMetricsSkeleton } from './organisms/skeletons';
export { LicensesDataGridSkeleton } from './organisms/skeletons';