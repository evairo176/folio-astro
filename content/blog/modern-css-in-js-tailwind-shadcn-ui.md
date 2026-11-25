---
title: "Modern CSS-in-JS with Tailwind CSS and shadcn/ui"
description: "A pragmatic comparison of CSS-in-JS approaches in 2026, focusing on Tailwind CSS utility-first methodology and shadcn/ui's component-driven design system."
date: "2026-06-10"
tags: ["CSS", "Tailwind", "shadcn/ui", "React", "Next.js", "UI", "Design Systems"]
lang: "en"
---

# Modern CSS-in-JS with Tailwind CSS and shadcn/ui

The CSS-in-JS landscape has evolved dramatically since the early days of Styled Components and Emotion. In 2026, we're seeing a clear shift toward utility-first CSS frameworks combined with component libraries that embrace TypeScript and developer experience. Let's examine the current state through two dominant approaches: Tailwind CSS's utility-first methodology and shadcn/ui's component-driven design system.

## The Utility-First Revolution

Tailwind CSS represents a fundamental shift in how we think about CSS. Instead of writing custom CSS classes for every component, you compose styles from a predefined set of utilities. This approach offers several advantages:

```jsx
// Traditional CSS-in-JS
const Button = styled.button`
  padding: 0.75rem 1.5rem;
  background-color: #3b82f6;
  color: white;
  border-radius: 0.375rem;
  font-weight: 500;
  &:hover {
    background-color: #2563eb;
  }
`;

// Tailwind CSS equivalent
const Button = ({ children }) => (
  <button className="px-6 py-3 bg-blue-500 text-white rounded-md font-medium hover:bg-blue-600">
    {children}
  </button>
);
```

The Tailwind approach eliminates context switching between CSS and JSX files, reduces naming overhead, and enforces design consistency through a constrained design system. However, it comes with a learning curve—developers need to memorize utility classes rather than CSS properties.

## shadcn/ui: Component-First Design Systems

shadcn/ui takes a different approach. It's not a traditional component library you install via npm. Instead, you copy components directly into your project:

```bash
npx shadcn@latest add button
```

This command copies a fully typed, customizable Button component into your `components/ui` directory:

```tsx
// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

The key innovation here is using `class-variance-authority` (CVA) to create type-safe variant APIs while leveraging Tailwind CSS under the hood. You get the best of both worlds: utility-class composition with component-level abstraction.

## Performance Considerations

CSS-in-JS runtime solutions (Styled Components, Emotion) have performance overhead at scale. They inject styles dynamically, which impacts First Contentful Paint (FCP) and Cumulative Layout Shift (CLS). 

Tailwind CSS with JIT compilation generates optimized CSS at build time:

```css
/* Generated CSS - only includes classes you actually use */
.px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
.py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
.bg-blue-500 { background-color: #3b82f6; }
/* ... */
```

For a typical production application, this results in CSS bundles under 10KB gzipped, compared to 50-100KB for traditional CSS frameworks.

shadcn/ui components are even more performant—since they're part of your codebase, tree-shaking works perfectly. You only ship the components you actually use.

## TypeScript Integration

Both approaches excel with TypeScript. Tailwind CSS offers IntelliSense through the official VS Code extension, while shadcn/ui provides full component prop typing:

```tsx
import { Button } from "@/components/ui/button"

// TypeScript knows all valid variants
<Button variant="destructive" size="lg">Delete</Button>
<Button variant="outline" size="icon">
  <SettingsIcon />
</Button>
```

The `@/components/ui` directory becomes your single source of truth for UI components, with autocomplete for all variants and props.

## Customization and Theming

Tailwind's configuration file (`tailwind.config.js`) allows deep customization:

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#1d4ed8',
        },
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
}
```

shadcn/ui builds on this with CSS variables for theming:

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  /* ... */
}
```

This variable-based approach enables seamless dark mode and theme switching without CSS-in-JS runtime overhead.

## When to Choose Each Approach

**Choose Tailwind CSS directly when:**
- Building a design system from scratch
- Need maximum flexibility and control
- Working on marketing sites or content-heavy pages
- Team is already proficient with utility classes

**Choose shadcn/ui when:**
- Building internal tools or dashboards
- Need consistent, accessible components quickly
- Want type-safe component APIs
- Prefer copying components over npm dependencies

## Migration Strategy

If you're migrating from traditional CSS-in-JS, here's a pragmatic approach:

1. **Start with Tailwind CSS** for layout and utility classes
2. **Use shadcn/ui for complex components** (dialogs, dropdowns, date pickers)
3. **Gradually replace Styled Components** with Tailwind classes
4. **Extract repeated patterns** into your own component library using CVA

```tsx
// Migration example
// Before: Styled Components
const OldCard = styled.div`
  padding: 1.5rem;
  border-radius: 0.5rem;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
`;

// After: Tailwind + shadcn/ui pattern
import { cn } from "@/lib/utils"

const cardVariants = cva(
  "rounded-lg bg-white shadow-sm",
  {
    variants: {
      padding: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      padding: "md",
    },
  }
)

interface CardProps extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof cardVariants> {}

const Card = ({ className, padding, ...props }: CardProps) => (
  <div className={cn(cardVariants({ padding }), className)} {...props} />
)
```

## Conclusion

The modern CSS-in-JS ecosystem has matured beyond runtime solutions. Tailwind CSS provides a utility-first foundation that eliminates CSS bloat, while shadcn/ui offers a component-driven layer on top with excellent TypeScript support. Together, they form a powerful stack for building maintainable, performant UIs in 2026.

The key insight: CSS-in-JS is no longer about runtime style injection. It's about leveraging build-time optimizations, type safety, and component architecture to create scalable design systems. Whether you choose raw Tailwind or shadcn/ui's curated components depends on your project's specific needs, but both represent the future of CSS in JavaScript applications.