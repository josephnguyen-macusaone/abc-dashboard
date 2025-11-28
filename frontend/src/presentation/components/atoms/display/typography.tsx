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
      default: "text-foreground",
      muted: "text-muted-foreground",
      primary: "text-primary",
      secondary: "text-secondary",
      success: "text-success",
      warning: "text-warning",
      error: "text-error",
      info: "text-info",
      inherit: "text-inherit",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
      justify: "text-justify",
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
  extends Omit<HTMLAttributes<HTMLElement>, "color">,
    VariantProps<typeof typographyVariants> {
  /** Override the default HTML element */
  as?: keyof JSX.IntrinsicElements;
  /** Truncate text with ellipsis */
  truncate?: boolean;
  /** Limit text to specific number of lines */
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6;
}

/**
 * Typography Component
 *
 * @example
 * Display heading for hero section
 * <Typography variant="display-xl">Welcome to MAC USA ONE</Typography>
 *
 * Page title
 * <Typography variant="title-xl">Dashboard</Typography>
 *
 * Body text
 * <Typography variant="body-m">This is a paragraph of text.</Typography>
 *
 * Muted caption
 * <Typography variant="caption" color="muted">Last updated: Today</Typography>
 *
 * Custom element
 * <Typography variant="title-m" as="label">Form Label</Typography>
 */
export const Typography = forwardRef<HTMLElement, TypographyProps>(
  (
    {
      variant = "body-m",
      color = "default",
      align,
      as,
      truncate = false,
      lineClamp,
      className,
      children,
      ...props
    },
    ref
  ) => {
    // Determine the HTML element to render
    const Component = (as || variantElementMap[variant || "body-m"] || "p") as React.ElementType;

    const lineClampClass = lineClamp ? `line-clamp-${lineClamp}` : "";

    return (
      <Component
        ref={ref}
        className={cn(
          typographyVariants({ variant: variant!, color: color!, align }),
          truncate && "truncate",
          lineClampClass,
          className
        )}
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


// Export variant types for external use
export { typographyVariants };
export type TypographyVariant = VariantProps<typeof typographyVariants>["variant"];
