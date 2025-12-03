// Loading components
export { Loading, LoadingSpinner, LoadingCard, LoadingTable } from './loading';
export { LoadingOverlay } from './loading-overlay';

// Display components
export { Logo } from './logo';

// Typography System - MAC USA ONE Design System
export {
  // Main component
  Typography,
  typographyVariants,

  // Display components (Archivo font)
  DisplayXL,
  DisplayL,
  DisplayM,

  // Title components (Inter font)
  TitleXL,
  TitleL,
  TitleM,
  TitleS,
  TitleXS,

  // Body components (Inter font)
  BodyM,
  BodyS,
  BodyXS,

  // Label components (Inter font)
  LabelL,
  LabelM,
  LabelS,

  // Caption component (Inter font)
  Caption,

  // Button text components (Inter font)
  ButtonTextL,
  ButtonTextM,
  ButtonTextS,

  // Composition utilities
  PageHeader,
  SectionHeader,
  Lead,
  Quote,
  Code,
  Highlight,
  ErrorText,
  SuccessText,
  MutedLink,

  // Truncation utilities
  Truncate,
  TruncateText,
  TruncateLines,
} from './typography';

// Types
export type {
  TypographyProps,
  TypographyVariant,
  DisplayProps,
  TitleProps,
  BodyProps,
  LabelTextProps,
  CaptionProps,
  ButtonTextProps,
  TruncateProps,
} from './typography';
