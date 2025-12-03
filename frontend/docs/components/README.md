# Component Documentation

This section covers the UI component architecture, patterns, and implementation details for the ABC Dashboard frontend.

## 📚 Component Documents

| Document | Description | Key Topics |
|----------|-------------|------------|
| **[Atomic Design](./atomic-design.md)** | Component hierarchy and organization | Atoms, Molecules, Organisms, Pages, Templates |
| **[Patterns](./patterns.md)** | Component patterns and best practices | Composition, reusability, prop patterns |
| **[Styling](./styling.md)** | Styling approach and design system | Tailwind CSS, theming, responsive design |

## 🧬 Atomic Design Structure

The application follows **Atomic Design** principles for organizing UI components:

```
Templates (Page Layouts)
├── AuthTemplate, DashboardTemplate
│
Pages (Route Components)
├── LoginPage, DashboardPage, ProfilePage
│
Organisms (Complex Components)
├── LoginForm, UserTable, Sidebar, Dashboard
│
Molecules (Composite Components)
├── FormField, NavigationButton, StatsCard
│
Atoms (Basic Elements)
├── Button, Input, Typography, Card
```

## 🎨 Component Categories

### Layout Components
- **Templates**: Page-level layouts with navigation and structure
- **Organisms**: Complex layout components like Sidebar, Header

### Form Components
- **Form Organisms**: Complete forms (LoginForm, RegisterForm)
- **Form Molecules**: Form fields and controls
- **Form Atoms**: Individual inputs and form elements

### Data Display Components
- **Data Tables**: UserTable, sortable and filterable
- **Charts**: Dashboard charts and metrics visualization
- **Cards**: StatsCard, InfoCard for displaying information

### Navigation Components
- **Menus**: UserMenu, DropdownMenu
- **Navigation**: SidebarNavigation, Breadcrumbs
- **Buttons**: NavigationButton, ActionButton

## 🔧 Component Patterns

### Props Interface Pattern
```typescript
interface ComponentProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}
```

### Composition Pattern
```typescript
// Instead of large prop interfaces, use composition
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Render Props Pattern
```typescript
<DataTable
  data={users}
  renderRow={(user) => (
    <TableRow key={user.id}>
      <TableCell>{user.name}</TableCell>
      <TableCell>{user.email}</TableCell>
    </TableRow>
  )}
/>
```

## 🎯 Component Guidelines

### Naming Conventions
- **PascalCase** for component names
- **kebab-case** for file names
- **Props** suffix for interface names
- **Descriptive** names that indicate purpose

### File Organization
```
components/
├── atoms/
│   ├── button.tsx
│   ├── input.tsx
│   └── index.ts
├── molecules/
│   ├── form-field.tsx
│   ├── navigation-button.tsx
│   └── index.ts
├── organisms/
│   ├── login-form.tsx
│   ├── sidebar.tsx
│   └── index.ts
├── pages/
│   ├── login-page.tsx
│   ├── dashboard-page.tsx
│   └── index.ts
└── templates/
    ├── auth-template.tsx
    ├── dashboard-template.tsx
    └── index.ts
```

### Prop Patterns
- Use **interface extension** for HTML attributes
- **Optional props** with sensible defaults
- **Discriminated unions** for variant props
- **Generic constraints** for flexible components

### State Management
- **Local state** for UI-only concerns
- **Context** for component tree state
- **Zustand** for global application state
- **React Hook Form** for form state

## 📖 Reading Order

1. **[Atomic Design](./atomic-design.md)** - Understand the component hierarchy
2. **[Patterns](./patterns.md)** - Learn component composition patterns
3. **[Styling](./styling.md)** - See how styling is implemented
4. **[State Management](../infrastructure/state-management.md)** - Understand state management integration

## 🔗 Related Documentation

- **[Architecture](../architecture/)** - System architecture and patterns
- **[Features](../features/)** - Feature-specific component usage
- **[Infrastructure](../infrastructure/)** - External integrations
- **[Getting Started](../getting-started/)** - Quick setup and concepts
