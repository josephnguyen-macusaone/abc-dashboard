'use client';

import { Typography } from '@/presentation/components/atoms';
import {
  DisplayXL, DisplayL, DisplayM,
  TitleXL, TitleL, TitleM, TitleS, TitleXS,
  BodyM, BodyS, BodyXS,
  LabelL, LabelM, LabelS,
  Caption,
  ButtonTextL, ButtonTextM, ButtonTextS
} from '@/presentation/components/atoms';

export default function TypographyTestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Page Header */}
        <div className="text-center mb-12">
          <Typography variant="title-xl" className="text-foreground mb-4">
            Fluid Typography Test Page
          </Typography>
          <Typography variant="body-m" color="muted" className="text-muted-foreground">
            Resize your browser window to see the fluid scaling in action
          </Typography>
        </div>

        {/* Display Sizes */}
        <section className="space-y-4">
          <Typography variant="title-l" className="text-foreground border-b pb-2">
            Display Sizes (Fluid Scaling)
          </Typography>
          <div className="space-y-6 p-6 bg-muted/20 rounded-lg">
            <DisplayXL className="text-primary">Display XL - Hero Headlines</DisplayXL>
            <DisplayL className="text-primary">Display L - Secondary Headlines</DisplayL>
            <DisplayM className="text-primary">Display M - Marketing Highlights</DisplayM>
          </div>
        </section>

        {/* Title Sizes */}
        <section className="space-y-4">
          <Typography variant="title-l" className="text-foreground border-b pb-2">
            Title Sizes (Fluid Scaling)
          </Typography>
          <div className="space-y-4 p-6 bg-muted/20 rounded-lg">
            <TitleXL>Title XL - Page Headers</TitleXL>
            <TitleL>Title L - Section Headers</TitleL>
            <TitleM>Title M - Card Titles</TitleM>
            <TitleS>Title S - Subtitles</TitleS>
            <TitleXS>Title XS - Small Headers</TitleXS>
          </div>
        </section>

        {/* Body Sizes */}
        <section className="space-y-4">
          <Typography variant="title-l" className="text-foreground border-b pb-2">
            Body Sizes (Semi-Fluid Scaling)
          </Typography>
          <div className="space-y-4 p-6 bg-muted/20 rounded-lg">
            <BodyM>
              Body M - Standard paragraphs with comfortable line height. This text demonstrates
              how body text scales subtly across different screen sizes for optimal readability.
            </BodyM>
            <BodyS>
              Body S - Secondary text content that provides supporting information and details.
              Used for less prominent but still important content areas.
            </BodyS>
            <BodyXS>
              Body XS - Metadata and small descriptive text. Fixed size for consistency across devices.
            </BodyXS>
          </div>
        </section>

        {/* Label Sizes */}
        <section className="space-y-4">
          <Typography variant="title-l" className="text-foreground border-b pb-2">
            Label Sizes (Fixed for UI Consistency)
          </Typography>
          <div className="space-y-4 p-6 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-4">
              <LabelL>Label L</LabelL>
              <Typography variant="body-s" color="muted">Form labels, primary UI elements</Typography>
            </div>
            <div className="flex items-center gap-4">
              <LabelM>Label M</LabelM>
              <Typography variant="body-s" color="muted">Standard form labels</Typography>
            </div>
            <div className="flex items-center gap-4">
              <LabelS>Label S</LabelS>
              <Typography variant="body-s" color="muted">Badges, tags, small UI elements</Typography>
            </div>
          </div>
        </section>

        {/* Button Text Sizes */}
        <section className="space-y-4">
          <Typography variant="title-l" className="text-foreground border-b pb-2">
            Button Text Sizes (Semi-Fluid Scaling)
          </Typography>
          <div className="space-y-4 p-6 bg-muted/20 rounded-lg">
            <div className="flex items-center gap-4">
              <ButtonTextL className="px-4 py-2 bg-primary text-primary-foreground rounded">Button L</ButtonTextL>
              <Typography variant="body-s" color="muted">Large action buttons</Typography>
            </div>
            <div className="flex items-center gap-4">
              <ButtonTextM className="px-3 py-2 bg-secondary text-secondary-foreground rounded">Button M</ButtonTextM>
              <Typography variant="body-s" color="muted">Default buttons</Typography>
            </div>
            <div className="flex items-center gap-4">
              <ButtonTextS className="px-2 py-1 bg-muted text-muted-foreground rounded">Button S</ButtonTextS>
              <Typography variant="body-s" color="muted">Compact buttons</Typography>
            </div>
          </div>
        </section>

        {/* Caption */}
        <section className="space-y-4">
          <Typography variant="title-l" className="text-foreground border-b pb-2">
            Caption (Fixed Size)
          </Typography>
          <div className="space-y-4 p-6 bg-muted/20 rounded-lg">
            <Caption>
              Caption text for image descriptions, chart notes, and supportive information.
              Fixed size ensures consistent metadata display across all devices.
            </Caption>
          </div>
        </section>

        {/* Stats Cards Demo */}
        <section className="space-y-4">
          <Typography variant="title-l" className="text-foreground border-b pb-2">
            Stats Cards Demo (Display-M Scaling)
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <Typography variant="label-s" color="muted" className="block mb-2">
                Total Users
              </Typography>
              <Typography variant="display-m" weight="bold" className="text-primary">
                1,234
              </Typography>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <Typography variant="label-s" color="muted" className="block mb-2">
                Active Licenses
              </Typography>
              <Typography variant="display-m" weight="bold" className="text-success">
                567
              </Typography>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 text-center">
              <Typography variant="label-s" color="muted" className="block mb-2">
                Revenue
              </Typography>
              <Typography variant="display-m" weight="bold" className="text-warning">
                $89.2K
              </Typography>
            </div>
          </div>
        </section>

        {/* Responsive Info */}
        <section className="mt-12 p-6 bg-muted/10 border border-muted rounded-lg">
          <Typography variant="title-m" className="text-foreground mb-4">
            Responsive Scaling Information
          </Typography>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Typography variant="label-m" className="font-semibold">Mobile (320px - 767px)</Typography>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Display XL: ~48px minimum</li>
                <li>• Title XL: ~28px minimum</li>
                <li>• Body M: ~15px minimum</li>
              </ul>
            </div>
            <div>
              <Typography variant="label-m" className="font-semibold">Desktop (1024px+)</Typography>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Display XL: ~72px maximum</li>
                <li>• Title XL: ~36px maximum</li>
                <li>• Body M: ~16px maximum</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}