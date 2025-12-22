# Skeleton Components - Atomic Design Implementation

## Overview

This document outlines the atomic design implementation for skeleton loading components in the ABC Dashboard application. The skeleton system follows atomic design principles, organizing components by their hierarchical complexity level.

## Atomic Design Hierarchy

### 🧱 Atoms (Basic Building Blocks)
Located in `/presentation/components/atoms/`

#### TextSkeleton
```tsx
<TextSkeleton
  variant="body" | "heading" | "caption" | "button"
  lines={1}
  width="24"
/>
```
- **Purpose**: Consistent text placeholder styling
- **Variants**: Different text sizes (heading, body, caption, button)
- **Features**: Multi-line support, configurable width

#### ShapeSkeleton
```tsx
<ShapeSkeleton
  variant="rectangle" | "circle" | "rounded" | "pill"
  width="full"
  height="4"
/>
```
- **Purpose**: Basic shape placeholders
- **Variants**: Rectangle, circle, rounded, pill shapes
- **Features**: Configurable dimensions

#### IconSkeleton
```tsx
<IconSkeleton
  size="md"
  variant="circle"
/>
```
- **Purpose**: Icon placeholder styling
- **Sizes**: sm, md, lg, xl
- **Variants**: Square or circle

### 🧬 Molecules (Atom Combinations)
Located in `/presentation/components/molecules/`

#### CardSkeleton
```tsx
<CardSkeleton
  showIcon={true}
  showTrend={false}
  variant="default"
/>
```
- **Purpose**: Stat/metric card placeholders
- **Features**: Icon, trend indicator, configurable layout

#### ButtonSkeleton
```tsx
<ButtonSkeleton
  variant="default"
  size="md"
  showText={true}
/>
```
- **Purpose**: Button loading states
- **Variants**: Default, outline, ghost, icon-only

#### InputSkeleton
```tsx
<InputSkeleton
  size="md"
  showLabel={true}
/>
```
- **Purpose**: Form input placeholders
- **Features**: Optional labels

#### AvatarSkeleton
```tsx
<AvatarSkeleton
  size="md"
  showText={true}
/>
```
- **Purpose**: User avatar placeholders
- **Features**: Optional accompanying text

### 🏗️ Organisms (Complex Layouts)
Located in `/presentation/components/organisms/`

#### LicenseDataTableSkeleton
```tsx
<LicenseDataTableSkeleton
  title="License Management"
  description="Manage licenses"
/>
```
- **Purpose**: Complete data table section skeleton
- **Features**: Header, toolbar, table, pagination

#### LicenseMetricsSkeleton
```tsx
<LicenseMetricsSkeleton
  columns={4}
/>
```
- **Purpose**: Metrics dashboard skeleton
- **Features**: Date filter + stat cards grid

#### LicensesDataGridSkeleton
```tsx
<LicensesDataGridSkeleton
  rowCount={20}
/>
```
- **Purpose**: Complex editable data grid skeleton
- **Features**: Advanced toolbar, 15-column table

## Usage Examples

### Basic Atomic Usage
```tsx
import { TextSkeleton, ShapeSkeleton } from '@/presentation/components/skeletons';

// Simple text placeholder
<TextSkeleton variant="body" width="32" />

// Rounded shape placeholder
<ShapeSkeleton variant="rounded" width="24" height="8" />
```

### Molecular Composition
```tsx
import { CardSkeleton, ButtonSkeleton } from '@/presentation/components/skeletons';

// Stat card using card molecule
<CardSkeleton showIcon showTrend />

// Action button using button molecule
<ButtonSkeleton variant="primary" showText />
```

### Organism Implementation
```tsx
import { LicenseDataTableSkeleton } from '@/presentation/components/skeletons';

// Complete section skeleton
<LicenseDataTableSkeleton
  title="My Data"
  description="Manage your data"
/>
```

## Benefits

### 🎯 **Consistency**
- Standardized skeleton components across the application
- Consistent styling and behavior
- Reusable building blocks

### 🔧 **Maintainability**
- Hierarchical organization makes components easy to find
- Atomic building blocks reduce duplication
- Easy to extend and modify

### 🚀 **Performance**
- Tree-shakable imports
- Only load what you need
- Optimized bundle size

### 🎨 **Developer Experience**
- Clear component hierarchy
- Intuitive naming conventions
- Comprehensive TypeScript support

## Implementation Guidelines

### Creating New Skeletons

1. **Identify the level**: Is it atomic, molecular, or organism?
2. **Use existing atoms**: Build molecules from atoms when possible
3. **Match real components**: Skeletons should mirror actual component structure
4. **Provide customization**: Allow configuration through props
5. **Document usage**: Add JSDoc comments and examples

### Naming Conventions

- **Atoms**: `[Purpose]Skeleton` (TextSkeleton, ShapeSkeleton)
- **Molecules**: `[Component]Skeleton` (CardSkeleton, ButtonSkeleton)
- **Organisms**: `[Feature][Component]Skeleton` (LicenseDataTableSkeleton)

### Styling Guidelines

- Use consistent gradient backgrounds
- Match actual component dimensions
- Include hover states where appropriate
- Support responsive design

## Migration Guide

### From Old Structure
```tsx
// Old: Domain-based imports
import { LicenseDataTableSkeleton } from '@/presentation/components/skeletons/dashboard';

// New: Atomic design imports
import { LicenseDataTableSkeleton } from '@/presentation/components/skeletons';
```

### Backwards Compatibility
All existing imports continue to work through barrel exports in the main index file.

## File Structure

Skeleton components are integrated into the main component hierarchy following atomic design principles:

```
📁 components/
├── 📁 atoms/           # 🧱 Basic building blocks (including skeletons)
│   ├── text-skeleton.tsx
│   ├── shape-skeleton.tsx
│   └── icon-skeleton.tsx
├── 📁 molecules/       # 🧬 Atom combinations (including skeletons)
│   ├── card-skeleton.tsx
│   ├── button-skeleton.tsx
│   ├── input-skeleton.tsx
│   └── avatar-skeleton.tsx
├── 📁 organisms/       # 🏗️ Complex layouts (including skeletons)
│   ├── license-data-table-skeleton.tsx
│   ├── license-metrics-skeleton.tsx
│   └── licenses-data-grid-skeleton.tsx
└── index.ts           # Barrel exports with atomic design
```

This atomic design approach ensures our skeleton components are scalable, maintainable, and consistent across the entire application.