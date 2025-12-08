import { cn } from "@/shared/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, HTMLAttributes } from "react";
import type { JSX } from "react";

/**
 * MAC USA ONE Typography System
 *
 * Typography variants following the design system:
 * - Display: Hero sections, landing pages (Archivo font)
 * - Title: Page headings, section headers (Inter font)
 * - Body: Paragraphs, readable content (Inter font)
 * - Label: Form fields, UI components (Inter font)
 * - Caption: Image descriptions, notes (Inter font)
 * - Button: Action buttons, CTAs (Inter font)
 */

const typographyVariants = cva("", {
  variants: {
    variant: {
      // Display variants (Archivo font) - Hero sections, marketing
      "display-xl": "text-display-xl",
      "display-l": "text-display-l",
      "display-m": "text-display-m",

      // Title variants (Inter font) - Headings, sections
      "title-xl": "text-title-xl",
      "title-l": "text-title-l",
      "title-m": "text-title-m",
      "title-s": "text-title-s",
      "title-xs": "text-title-xs",

      // Body variants (Inter font) - Paragraphs, content
      "body-m": "text-body-m",
      "body-s": "text-body-s",
      "body-xs": "text-body-xs",

      // Label variants (Inter font) - Form labels, UI
      "label-l": "text-label-l",
      "label-m": "text-label-m",
      "label-s": "text-label-s",

      // Caption variant (Inter font) - Captions, notes
      "caption": "text-caption",

      // Button variants (Inter font) - Buttons, CTAs
      "button-l": "text-button-l",
      "button-m": "text-button-m",
      "button-s": "text-button-s",
    },
    color: {
      // Theme-aware colors (adapt to light/dark theme)
      default: "text-foreground",
      muted: "text-muted-foreground",
      inverse: "text-background", // White text on colored backgrounds
      "inverse-muted": "text-muted", // Muted text on colored backgrounds

      // Semantic colors (theme-aware)
      primary: "text-primary",
      secondary: "text-secondary",
      success: "text-success",
      warning: "text-warning",
      error: "text-error",
      info: "text-info",

      // Extended semantic colors
      destructive: "text-destructive",
      accent: "text-accent-foreground",

      // Neutral scale colors
      neutral: {
        50: "text-neutral-50",
        100: "text-neutral-100",
        200: "text-neutral-200",
        300: "text-neutral-300",
        400: "text-neutral-400",
        500: "text-neutral-500",
        600: "text-neutral-600",
        700: "text-neutral-700",
        800: "text-neutral-800",
        900: "text-neutral-900",
      },

      // Theme scale colors
      slate: {
        50: "text-slate-50",
        100: "text-slate-100",
        200: "text-slate-200",
        300: "text-slate-300",
        400: "text-slate-400",
        500: "text-slate-500",
        600: "text-slate-600",
        700: "text-slate-700",
        800: "text-slate-800",
        900: "text-slate-900",
      },

      // Brand colors
      brand: {
        primary: "text-brand",
        secondary: "text-brand-secondary",
        typography: "text-brand-typography",
      },

      // Utility colors
      white: "text-white",
      black: "text-black",
      transparent: "text-transparent",
      current: "text-current",
      inherit: "text-inherit",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
      justify: "text-justify",
    },
    weight: {
      thin: "font-thin",
      extralight: "font-extralight",
      light: "font-light",
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
      extrabold: "font-extrabold",
      black: "font-black",
    },
    decoration: {
      none: "no-underline",
      underline: "underline",
      "line-through": "line-through",
      "underline-line-through": "underline line-through",
    },
    "letter-spacing": {
      tighter: "tracking-tighter",
      tight: "tracking-tight",
      normal: "tracking-normal",
      wide: "tracking-wide",
      wider: "tracking-wider",
      widest: "tracking-widest",
    },
    "line-height": {
      none: "leading-none",
      tight: "leading-tight",
      snug: "leading-snug",
      normal: "leading-normal",
      relaxed: "leading-relaxed",
      loose: "leading-loose",
    },
  },
  defaultVariants: {
    variant: "body-m",
    color: "default",
  },
});

// HTML element mapping based on semantic meaning
const variantElementMap: Record<string, keyof JSX.IntrinsicElements> = {
  // Display - use h1 for main hero, h2 for secondary
  "display-xl": "h1",
  "display-l": "h1",
  "display-m": "h2",

  // Titles - semantic heading levels
  "title-xl": "h1",
  "title-l": "h2",
  "title-m": "h3",
  "title-s": "h4",
  "title-xs": "h5",

  // Body - paragraphs
  "body-m": "p",
  "body-s": "p",
  "body-xs": "p",

  // Labels - spans (typically paired with form elements)
  "label-l": "span",
  "label-m": "span",
  "label-s": "span",

  // Caption - small or figcaption
  "caption": "span",

  // Button text - spans
  "button-l": "span",
  "button-m": "span",
  "button-s": "span",
};

export interface TypographyProps
  extends Omit<HTMLAttributes<HTMLElement>, "color"> {
  /** Typography variant */
  variant?: "display-xl" | "display-l" | "display-m" | "title-xl" | "title-l" | "title-m" | "title-s" | "title-xs" | "body-m" | "body-s" | "body-xs" | "label-l" | "label-m" | "label-s" | "caption" | "button-l" | "button-m" | "button-s";
  /** Text color */
  color?: string;
  /** Text alignment */
  align?: "left" | "center" | "right" | "justify";
  /** Font weight */
  weight?: "thin" | "extralight" | "light" | "normal" | "medium" | "semibold" | "bold" | "extrabold" | "black";
  /** Text decoration */
  decoration?: "none" | "underline" | "line-through" | "underline-line-through";
  /** Letter spacing */
  letterSpacing?: "tighter" | "tight" | "normal" | "wide" | "wider" | "widest";
  /** Line height */
  lineHeight?: "none" | "tight" | "snug" | "normal" | "relaxed" | "loose";
  /** Custom font size override */
  fontSize?: string;
  /** Override the default HTML element */
  as?: keyof JSX.IntrinsicElements;
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Limit text to specific number of lines */
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Transform text case */
  transform?: "uppercase" | "lowercase" | "capitalize" | "normal-case";
}

/**
 * Typography Component
 *
 * Enhanced typography system with comprehensive styling options
 *
 * @example
 * // Basic usage
 * <Typography variant="display-xl">Welcome to MAC USA ONE</Typography>
 * <Typography variant="title-xl">Dashboard</Typography>
 * <Typography variant="body-m">This is a paragraph of text.</Typography>
 *
 * // Color variants
 * <Typography variant="title-m" color="primary">Primary colored text</Typography>
 * <Typography variant="body-m" color="inverse">White text for dark backgrounds</Typography>
 * <Typography variant="caption" color="neutral.400">Neutral gray text</Typography>
 * <Typography variant="label-m" color="brand.primary">Brand colored text</Typography>
 *
 * // Font weight control
 * <Typography variant="body-m" weight="bold">Bold text</Typography>
 * <Typography variant="title-s" weight="semibold">Semibold title</Typography>
 *
 * // Text decoration
 * <Typography variant="body-m" decoration="underline">Underlined text</Typography>
 * <Typography variant="body-m" decoration="line-through">Strikethrough text</Typography>
 *
 * // Typography adjustments
 * <Typography variant="body-m" letterSpacing="wide">Widely spaced text</Typography>
 * <Typography variant="body-m" lineHeight="loose">Loosely spaced text</Typography>
 *
 * // Text transformations
 * <Typography variant="label-m" transform="uppercase">UPPERCASE LABEL</Typography>
 * <Typography variant="button-m" transform="capitalize">Capitalized Button</Typography>
 *
 * // Custom font size
 * <Typography variant="body-m" fontSize="2rem">Custom sized text</Typography>
 * <Typography variant="body-m" fontSize="18px">18px text</Typography>
 *
 * // Text truncation
 * <Typography variant="body-m" truncate>Long text that will be truncated...</Typography>
 * <Typography variant="body-m" lineClamp={2}>Long text that will be clamped to 2 lines...</Typography>
 *
 * // Custom element
 * <Typography variant="title-m" as="label">Form Label</Typography>
 */
export const Typography = forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = "body-m",
      color = "default",
      align,
      weight,
      decoration,
      letterSpacing,
      lineHeight,
      fontSize,
      as,
      truncate = false,
      lineClamp,
      transform,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Determine the HTML element to render
    const Component = (as || variantElementMap[variant || "body-m"] || "p") as React.ElementType;

    const lineClampClass = lineClamp ? `line-clamp-${lineClamp}` : "";
    const transformClass = transform ? transform.replace("-", " ") : "";

    // Parse color for nested variants (e.g., "neutral.50" -> color: "neutral", neutral: 50)
    const parseColor = (colorValue: string) => {
      if (colorValue.includes('.')) {
        const [parent, child] = colorValue.split('.');
        return {
          color: parent as "default" | "muted" | "inverse" | "inverse-muted" | "primary" | "secondary" | "success" | "warning" | "error" | "info" | "destructive" | "accent" | "neutral" | "slate" | "brand" | "white" | "black" | "transparent" | "current" | "inherit",
          [parent]: parseInt(child) || child
        };
      }
      return {
        color: colorValue as "default" | "muted" | "inverse" | "inverse-muted" | "primary" | "secondary" | "success" | "warning" | "error" | "info" | "destructive" | "accent" | "neutral" | "slate" | "brand" | "white" | "black" | "transparent" | "current" | "inherit"
      };
    };

    const colorProps = parseColor(color);

    // Define font size mappings for inline styles as fallback
    const fontSizeMap: Record<string, string> = {
      "display-xl": "4.5rem",
      "display-l": "3.5rem",
      "display-m": "2.75rem",
      "title-xl": "2.25rem",
      "title-l": "1.75rem",
      "title-m": "1.5rem",
      "title-s": "1.25rem",
      "title-xs": "1.125rem",
      "body-m": "1rem",
      "body-s": "0.875rem",
      "body-xs": "0.75rem",
      "label-l": "1rem",
      "label-m": "0.875rem",
      "label-s": "0.75rem",
      "caption": "0.75rem",
      "button-l": "1rem",
      "button-m": "0.875rem",
      "button-s": "0.75rem",
    };

    // Get font size from variant or use custom fontSize
    const computedFontSize = fontSize || (variant ? fontSizeMap[variant] : undefined);

    return (
      <Component
        ref={ref}
        className={cn(
          typographyVariants({
            variant: variant!,
            align,
            weight,
            decoration,
            "letter-spacing": letterSpacing,
            "line-height": lineHeight,
            ...colorProps,
          }),
          truncate && "truncate",
          lineClampClass,
          transformClass,
          className
        )}
        style={{
          fontSize: computedFontSize,
          ...props.style
        }}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Typography.displayName = "Typography";

// ============================================
// Convenience Components - Display (Archivo)
// ============================================

export type DisplayProps = Omit<TypographyProps, "variant">;

/** Display XL - 72px, for main hero headlines */
export const DisplayXL = forwardRef<HTMLElement, DisplayProps>((props, ref) => (
  <Typography ref={ref} variant="display-xl" {...props} />
));
DisplayXL.displayName = "DisplayXL";

/** Display L - 56px, for secondary hero headlines */
export const DisplayL = forwardRef<HTMLElement, DisplayProps>((props, ref) => (
  <Typography ref={ref} variant="display-l" {...props} />
));
DisplayL.displayName = "DisplayL";

/** Display M - 44px, for marketing highlights */
export const DisplayM = forwardRef<HTMLElement, DisplayProps>((props, ref) => (
  <Typography ref={ref} variant="display-m" {...props} />
));
DisplayM.displayName = "DisplayM";

// ============================================
// Convenience Components - Title (Inter)
// ============================================

export type TitleProps = Omit<TypographyProps, "variant">;

/** Title XL - 36px, primary page headings */
export const TitleXL = forwardRef<HTMLElement, TitleProps>((props, ref) => (
  <Typography ref={ref} variant="title-xl" {...props} />
));
TitleXL.displayName = "TitleXL";

/** Title L - 28px, section headers */
export const TitleL = forwardRef<HTMLElement, TitleProps>((props, ref) => (
  <Typography ref={ref} variant="title-l" {...props} />
));
TitleL.displayName = "TitleL";

/** Title M - 24px, card titles, module headers */
export const TitleM = forwardRef<HTMLElement, TitleProps>((props, ref) => (
  <Typography ref={ref} variant="title-m" {...props} />
));
TitleM.displayName = "TitleM";

/** Title S - 20px, subtitles */
export const TitleS = forwardRef<HTMLElement, TitleProps>((props, ref) => (
  <Typography ref={ref} variant="title-s" {...props} />
));
TitleS.displayName = "TitleS";

/** Title XS - 18px, small headers */
export const TitleXS = forwardRef<HTMLElement, TitleProps>((props, ref) => (
  <Typography ref={ref} variant="title-xs" {...props} />
));
TitleXS.displayName = "TitleXS";

// ============================================
// Convenience Components - Body (Inter)
// ============================================

export type BodyProps = Omit<TypographyProps, "variant">;

/** Body M - 16px, standard paragraphs */
export const BodyM = forwardRef<HTMLElement, BodyProps>((props, ref) => (
  <Typography ref={ref} variant="body-m" {...props} />
));
BodyM.displayName = "BodyM";

/** Body S - 14px, secondary text */
export const BodyS = forwardRef<HTMLElement, BodyProps>((props, ref) => (
  <Typography ref={ref} variant="body-s" {...props} />
));
BodyS.displayName = "BodyS";

/** Body XS - 12px, metadata, small text */
export const BodyXS = forwardRef<HTMLElement, BodyProps>((props, ref) => (
  <Typography ref={ref} variant="body-xs" {...props} />
));
BodyXS.displayName = "BodyXS";

// ============================================
// Convenience Components - Label (Inter)
// ============================================

export type LabelTextProps = Omit<TypographyProps, "variant">;

/** Label L - 16px, key form fields */
export const LabelL = forwardRef<HTMLElement, LabelTextProps>((props, ref) => (
  <Typography ref={ref} variant="label-l" as="span" {...props} />
));
LabelL.displayName = "LabelL";

/** Label M - 14px, standard form labels */
export const LabelM = forwardRef<HTMLElement, LabelTextProps>((props, ref) => (
  <Typography ref={ref} variant="label-m" as="span" {...props} />
));
LabelM.displayName = "LabelM";

/** Label S - 12px, badges, tags */
export const LabelS = forwardRef<HTMLElement, LabelTextProps>((props, ref) => (
  <Typography ref={ref} variant="label-s" as="span" {...props} />
));
LabelS.displayName = "LabelS";

// ============================================
// Convenience Components - Caption (Inter)
// ============================================

export type CaptionProps = Omit<TypographyProps, "variant">;

/** Caption - 12px, image descriptions, notes */
export const Caption = forwardRef<HTMLElement, CaptionProps>((props, ref) => (
  <Typography ref={ref} variant="caption" as="span" {...props} />
));
Caption.displayName = "Caption";

// ============================================
// Convenience Components - Button Text (Inter)
// ============================================

export type ButtonTextProps = Omit<TypographyProps, "variant">;

/** Button L - 16px, large action buttons */
export const ButtonTextL = forwardRef<HTMLElement, ButtonTextProps>((props, ref) => (
  <Typography ref={ref} variant="button-l" as="span" {...props} />
));
ButtonTextL.displayName = "ButtonTextL";

/** Button M - 14px, default buttons */
export const ButtonTextM = forwardRef<HTMLElement, ButtonTextProps>((props, ref) => (
  <Typography ref={ref} variant="button-m" as="span" {...props} />
));
ButtonTextM.displayName = "ButtonTextM";

/** Button S - 12px, compact buttons */
export const ButtonTextS = forwardRef<HTMLElement, ButtonTextProps>((props, ref) => (
  <Typography ref={ref} variant="button-s" as="span" {...props} />
));
ButtonTextS.displayName = "ButtonTextS";


// ============================================
// Typography Composition Utilities
// Pre-configured combinations for common use cases
// ============================================

/**
 * Page Header - Large title with specific styling for page headers
 */
export const PageHeader = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="title-xl"
    weight="semibold"
    letterSpacing="tight"
    lineHeight="tight"
    {...props}
  />
));
PageHeader.displayName = "PageHeader";

/**
 * Section Header - Medium title for section headers
 */
export const SectionHeader = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="title-l"
    weight="medium"
    letterSpacing="tight"
    {...props}
  />
));
SectionHeader.displayName = "SectionHeader";

/**
 * Card Title - Title for card components
 */
export const CardTitle = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="title-m"
    weight="semibold"
    lineHeight="snug"
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

/**
 * Lead Text - Larger body text for introductory content
 */
export const Lead = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="body-m"
    weight="normal"
    lineHeight="relaxed"
    color="muted"
    {...props}
  />
));
Lead.displayName = "Lead";

/**
 * Quote - Styled blockquote text
 */
export const Quote = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="body-m"
    weight="medium"
    lineHeight="relaxed"
    decoration="none"
    letterSpacing="normal"
    as="blockquote"
    {...props}
  />
));
Quote.displayName = "Quote";

/**
 * Code Text - Monospace text for code snippets
 */
export const Code = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="body-s"
    weight="normal"
    letterSpacing="wide"
    as="code"
    className="font-mono bg-muted px-1.5 py-0.5 rounded"
    {...props}
  />
));
Code.displayName = "Code";

/**
 * Highlight - Emphasized text with background
 */
export const Highlight = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="body-m"
    weight="medium"
    color="primary"
    className="bg-primary/10 px-1 rounded"
    {...props}
  />
));
Highlight.displayName = "Highlight";

/**
 * Error Text - Red error text
 */
export const ErrorText = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="body-s"
    color="error"
    weight="medium"
    {...props}
  />
));
ErrorText.displayName = "ErrorText";

/**
 * Success Text - Green success text
 */
export const SuccessText = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="body-s"
    color="success"
    weight="medium"
    {...props}
  />
));
SuccessText.displayName = "SuccessText";

/**
 * Muted Link - Subtle link styling
 */
export const MutedLink = forwardRef<HTMLElement, Omit<TypographyProps, "variant">>((props, ref) => (
  <Typography
    ref={ref}
    variant="body-s"
    color="muted"
    decoration="underline"
    className="hover:text-foreground transition-colors"
    as="a"
    {...props}
  />
));
MutedLink.displayName = "MutedLink";

// ============================================
// Advanced Truncation Utilities
// ============================================

export interface TruncateProps extends Omit<TypographyProps, "truncate" | "lineClamp"> {
  /** Maximum number of lines before truncation */
  maxLines?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Show ellipsis after truncation */
  showEllipsis?: boolean;
  /** Custom ellipsis text */
  ellipsis?: string;
  /** Enable word break for long words */
  wordBreak?: boolean;
}

/**
 * Advanced truncation component with customizable options
 */
export const Truncate = forwardRef<HTMLElement, TruncateProps>(
  (
    {
      maxLines = 1,
      showEllipsis = true,
      ellipsis = "...",
      wordBreak = false,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const truncationClass = maxLines === 1 ? "truncate" : `line-clamp-${maxLines}`;
    const ellipsisClass = showEllipsis && maxLines > 1 ? "after:content-['" + ellipsis + "']" : "";

    return (
      <Typography
        ref={ref}
        lineClamp={maxLines > 1 ? maxLines : undefined}
        truncate={maxLines === 1}
        className={cn(
          wordBreak && "wrap-break-words",
          ellipsisClass,
          className
        )}
        {...props}
      >
        {children}
      </Typography>
    );
  }
);
Truncate.displayName = "Truncate";

/**
 * Single line truncation utility
 */
export const TruncateText = forwardRef<HTMLElement, Omit<TruncateProps, "maxLines">>((props, ref) => (
  <Truncate ref={ref} maxLines={1} {...props} />
));
TruncateText.displayName = "TruncateText";

/**
 * Multi-line truncation utilities
 */
export const TruncateLines = {
  2: forwardRef<HTMLElement, Omit<TruncateProps, "maxLines">>((props, ref) => (
    <Truncate ref={ref} maxLines={2} {...props} />
  )),
  3: forwardRef<HTMLElement, Omit<TruncateProps, "maxLines">>((props, ref) => (
    <Truncate ref={ref} maxLines={3} {...props} />
  )),
  4: forwardRef<HTMLElement, Omit<TruncateProps, "maxLines">>((props, ref) => (
    <Truncate ref={ref} maxLines={4} {...props} />
  )),
};

// Set display names
TruncateLines[2].displayName = "TruncateLines2";
TruncateLines[3].displayName = "TruncateLines3";
TruncateLines[4].displayName = "TruncateLines4";

// Export variant types for external use
export { typographyVariants };
export type TypographyVariant = VariantProps<typeof typographyVariants>["variant"];
