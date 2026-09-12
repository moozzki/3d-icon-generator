# Audora Design System

> **Source:** `app/globals.css` · `components/ui/*` · `app/layout.tsx`
> **Stack:** Next.js · Tailwind CSS v4 · shadcn/ui (re-ui fork) · CVA · Radix UI

---

## 1. Typography

### Fonts (Google Fonts via `next/font`)

| Token | Font Family | CSS Variable | Usage |
|---|---|---|---|
| `font-sans` | **Inter** | `--font-sans` | Body text, UI labels, paragraphs |
| `font-heading` | **Space Grotesk** | `--font-heading` | All headings (`h1`–`h6`), card titles |
| `font-mono` | Geist Mono | `--font-geist-mono` | Code, monospace |

**Base rules:**
```css
html    { font-family: var(--font-sans); }
h1–h6   { font-family: var(--font-heading); letter-spacing: -0.025em; }
body    { @apply bg-background text-foreground; }
```

### Type Scale (Tailwind defaults)

| Class | Size | Typical Usage |
|---|---|---|
| `text-xs` | 12px | Labels, captions, badges |
| `text-sm` | 14px | Body text, UI descriptions |
| `text-base` | 16px | Default paragraph text |
| `text-lg` | 18px | Section intro text |
| `text-xl` | 20px | Sub-section headings |
| `text-2xl` | 24px | Card titles |
| `text-3xl` | 30px | Section headings |
| `text-4xl` | 36px | Page headings |

---

## 2. Color Tokens

All tokens are CSS custom properties in `:root` (light) and `.dark`. Mapped to Tailwind via `@theme inline`.

### 2.1 Core Palette

| Token | Light | Dark | Tailwind |
|---|---|---|---|
| `--primary` | `#4949FF` | `#4949FF` | `bg-primary` / `text-primary` |
| `--primary-foreground` | `#ffffff` | `#ffffff` | `text-primary-foreground` |
| `--secondary` | `#CCCCFF` | `#c2c2f5` | `bg-secondary` / `text-secondary` |
| `--secondary-foreground` | `#09090b` | `#16173f` | `text-secondary-foreground` |
| `--accent` | `#CCCCFF` | `#222222` | `bg-accent` / `text-accent` |
| `--accent-foreground` | `#09090b` | `#f3f3f3` | `text-accent-foreground` |

### 2.2 Surface / Background

| Token | Light | Dark | Tailwind |
|---|---|---|---|
| `--background` | `#FAFAFA` | `#0d0d0d` | `bg-background` |
| `--foreground` | `#09090b` | `#f3f3f3` | `text-foreground` |
| `--card` | `#ffffff` | `#121212` | `bg-card` |
| `--card-foreground` | `#09090b` | `#f3f3f3` | `text-card-foreground` |
| `--popover` | `#ffffff` | `#121212` | `bg-popover` |
| `--popover-foreground` | `#09090b` | `#f3f3f3` | `text-popover-foreground` |
| `--muted` | `#f4f4f5` | `#222222` | `bg-muted` |
| `--muted-foreground` | `#71717a` | `#c6c4d9` | `text-muted-foreground` |

### 2.3 Border / Input / Ring

| Token | Light | Dark | Tailwind |
|---|---|---|---|
| `--border` | `#e4e4e7` | `#454556` | `border-border` |
| `--input` | `#e4e4e7` | `#454556` | `border-input` |
| `--ring` | `#4949FF` | `#4949ff` | `ring-ring` |

### 2.4 Semantic Colors

| Token | Value | Tailwind |
|---|---|---|
| `--destructive` | `#ef4444` (light) / `#7f1d1d` (dark) | `text-destructive` / `bg-destructive` |
| `--success` | `emerald-500` | `text-success` / `bg-success` |
| `--success-foreground` | `emerald-900` | `text-success-foreground` |
| `--warning` | `yellow-500` | `text-warning` / `bg-warning` |
| `--warning-foreground` | `yellow-900` | `text-warning-foreground` |
| `--info` | `violet-500` | `text-info` / `bg-info` |
| `--info-foreground` | `violet-900` | `text-info-foreground` |
| `--invert` | `zinc-900` | `bg-invert` |
| `--invert-foreground` | `zinc-50` | `text-invert-foreground` |

### 2.5 Custom Audora Surface Tokens (Dark only)

Extra surface-hierarchy tokens for layered UI depth, defined in `.dark`:

| Token | Dark Value | Usage |
|---|---|---|
| `--surface` | `#121212` | Base surface layer |
| `--surface-container-lowest` | `#080808` | Deepest recessed surfaces |
| `--surface-container-low` | `#1a1c1c` | Low-emphasis containers |
| `--surface-container` | `#222222` | Standard containers |
| `--surface-container-high` | `#2f3131` | Elevated / selected states |
| `--on-surface` | `#f3f3f3` | Text on any surface |
| `--on-surface-variant` | `#c6c4d9` | Subdued text / icons |
| `--outline` | `#767588` | Borders with emphasis |
| `--outline-variant` | `#454556` | Subtle dividers |
| `--primary-container` | `#4949ff` | Primary-tinted containers |
| `--secondary-container` | `#42436d` | Secondary-tinted containers |
| `--secondary-fixed` | `#e1e0ff` | Fixed secondary surface |
| `--on-secondary-fixed` | `#16173f` | Text on secondary-fixed |

### 2.6 Sidebar Tokens

| Token | Light | Dark |
|---|---|---|
| `--sidebar` | `#ffffff` | `#0d0d0d` |
| `--sidebar-foreground` | `#09090b` | `#f3f3f3` |
| `--sidebar-primary` | `#4949FF` | `#4949ff` |
| `--sidebar-primary-foreground` | `#ffffff` | `#ffffff` |
| `--sidebar-accent` | `#f4f4f5` | `#1a1c1c` |
| `--sidebar-accent-foreground` | `#09090b` | `#f3f3f3` |
| `--sidebar-border` | `#e4e4e7` | `#454556` |
| `--sidebar-ring` | `#4949FF` | `#4949ff` |

### 2.7 Chart Colors

| Token | Value | Tailwind |
|---|---|---|
| `--chart-1` | `#4949FF` | `text-chart-1` |
| `--chart-2` | `#CCCCFF` | `text-chart-2` |
| `--chart-3` | `oklch(0.439 0 0)` | `text-chart-3` |
| `--chart-4` | `oklch(0.371 0 0)` | `text-chart-4` |
| `--chart-5` | `oklch(0.269 0 0)` | `text-chart-5` |

---

## 3. Border Radius Scale

Base: `--radius: 0.625rem` (10px). All others scale from it.

| Token | Formula | ~Value | Tailwind |
|---|---|---|---|
| `--radius-sm` | `radius × 0.6` | 6px | `rounded-sm` |
| `--radius-md` | `radius × 0.8` | 8px | `rounded-md` |
| `--radius-lg` | `radius × 1` | 10px | `rounded-lg` |
| `--radius-xl` | `radius × 1.4` | 14px | `rounded-xl` |
| `--radius-2xl` | `radius × 1.8` | 18px | `rounded-2xl` |
| `--radius-3xl` | `radius × 2.2` | 22px | `rounded-3xl` |
| `--radius-4xl` | `radius × 2.6` | 26px | `rounded-4xl` |

> **Pattern:** Cards → `rounded-xl` · Dialogs/Sheets → `rounded-2xl` · Badges → `rounded-4xl` (pill)

---

## 4. Components

### 4.1 Button

`components/ui/button.tsx` — CVA + Radix Slot

#### Variants

| Variant | Description | Key Classes |
|---|---|---|
| `default` | Primary CTA | `bg-primary text-primary-foreground hover:bg-primary/80` |
| `outline` | Bordered, transparent bg | `border-border bg-background hover:bg-muted` |
| `secondary` | Soft secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` |
| `ghost` | No bg, hover muted | `hover:bg-muted hover:text-foreground` |
| `destructive` | Danger action | `bg-destructive/10 text-destructive hover:bg-destructive/20` |
| `link` | Text link | `text-primary underline-offset-4 hover:underline` |

#### Sizes

| Size | Height | Notes |
|---|---|---|
| `xs` | `h-6` | `text-xs`, icon 12px |
| `sm` | `h-8` | Compact |
| `default` | `h-9` | Standard |
| `lg` | `h-10` | Prominent |
| `icon` | `size-9` | Square icon button |
| `icon-xs` | `size-6` | Tiny icon |
| `icon-sm` | `size-8` | Small icon |
| `icon-lg` | `size-10` | Large icon |

Base: `inline-flex items-center rounded-md border border-transparent text-sm font-medium transition-all` · Focus: `ring-3 ring-ring/50` · Disabled: `opacity-50 pointer-events-none`

---

### 4.2 Badge

`components/ui/badge.tsx` — CVA

Base: `inline-flex h-5 rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium`

| Variant | Key Classes |
|---|---|
| `default` | `bg-primary text-primary-foreground` |
| `secondary` | `bg-secondary text-secondary-foreground` |
| `destructive` | `bg-destructive/10 text-destructive` |
| `outline` | `border-border text-foreground` |
| `ghost` | `hover:bg-muted hover:text-muted-foreground` |
| `link` | `text-primary underline-offset-4 hover:underline` |

---

### 4.3 Card

`components/ui/card.tsx`

**Anatomy:** `Card` > `CardHeader` > `CardTitle` + `CardDescription` + `CardAction` > `CardContent` > `CardFooter`

| Part | Key Classes |
|---|---|
| `Card` | `rounded-xl bg-card shadow-xs ring-1 ring-foreground/10 py-6 gap-6` |
| `CardHeader` | `px-6 grid auto-rows-min gap-1` |
| `CardTitle` | `font-heading text-base font-medium` |
| `CardDescription` | `text-sm text-muted-foreground` |
| `CardContent` | `px-6` |
| `CardFooter` | `flex items-center rounded-b-xl px-6` |

Size `sm` reduces all padding to `px-4 py-4 gap-4`.

---

### 4.4 All Available UI Components

| Component | File |
|---|---|
| Accordion | `accordion.tsx` |
| Alert | `alert.tsx` |
| Alert Dialog | `alert-dialog.tsx` |
| Avatar | `avatar.tsx` |
| Badge | `badge.tsx` |
| Breadcrumb | `breadcrumb.tsx` |
| Button | `button.tsx` |
| Button Group | `button-group.tsx` |
| Calendar | `calendar.tsx` |
| Card | `card.tsx` |
| Carousel | `carousel.tsx` |
| Chart | `chart.tsx` |
| Checkbox | `checkbox.tsx` |
| Collapsible | `collapsible.tsx` |
| Combobox | `combobox.tsx` |
| Command | `command.tsx` |
| Context Menu | `context-menu.tsx` |
| Dialog | `dialog.tsx` |
| Drawer | `drawer.tsx` |
| Dropdown Menu | `dropdown-menu.tsx` |
| Empty | `empty.tsx` |
| Field | `field.tsx` |
| Hover Card | `hover-card.tsx` |
| Input | `input.tsx` |
| Input Group | `input-group.tsx` |
| Input OTP | `input-otp.tsx` |
| Item | `item.tsx` |
| Kbd | `kbd.tsx` |
| Label | `label.tsx` |
| Menubar | `menubar.tsx` |
| Native Select | `native-select.tsx` |
| Navigation Menu | `navigation-menu.tsx` |
| Pagination | `pagination.tsx` |
| Popover | `popover.tsx` |
| Progress | `progress.tsx` |
| Radio Group | `radio-group.tsx` |
| Resizable | `resizable.tsx` |
| Scroll Area | `scroll-area.tsx` |
| Select | `select.tsx` |
| Separator | `separator.tsx` |
| Sheet | `sheet.tsx` |
| Sidebar | `sidebar.tsx` |
| Skeleton | `skeleton.tsx` |
| Slider | `slider.tsx` |
| Sonner (Toast) | `sonner.tsx` |
| Spinner | `spinner.tsx` |
| Switch | `switch.tsx` |
| Table | `table.tsx` |
| Tabs | `tabs.tsx` |
| Textarea | `textarea.tsx` |
| Toggle | `toggle.tsx` |
| Toggle Group | `toggle-group.tsx` |
| Tooltip | `tooltip.tsx` |

---

## 5. Utility Classes

### Dot Grid Canvas Background
```css
.dot-canvas {
  background-image: radial-gradient(circle, var(--border) 1px, transparent 1px);
  background-size: 22px 22px;
}
```
Used on the icon generation workspace/canvas.

### Scrollbar Utilities
```css
/* Minimal 5px scrollbar */
::-webkit-scrollbar        { width: 5px; height: 5px; }
::-webkit-scrollbar-track  { background: transparent; }
::-webkit-scrollbar-thumb  { background: var(--border); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: var(--muted-foreground); }

/* Hide scrollbar completely */
.no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
.no-scrollbar::-webkit-scrollbar { display: none; }
```

---

## 6. Theming

| Setting | Value |
|---|---|
| Library | `next-themes` |
| Toggle mechanism | Class attribute (`.dark`) on `<html>` |
| Default theme | `system` |
| Enable system | Yes |
| Flash prevention | `disableTransitionOnChange: true` |

---

## 7. Animation

| Library | Usage |
|---|---|
| `tw-animate-css` | Utility animation classes via Tailwind |
| `framer-motion` | Studio UI, page transitions, panel reveals, skeleton animations |

---

## 8. Key Design Decisions

| Decision | Detail |
|---|---|
| **Brand color** | `#4949FF` — primary, ring, sidebar-primary, chart-1 |
| **Dark background** | `#0d0d0d` background + `#121212` card — near-black, not pure black |
| **Surface hierarchy** | 5-level depth stack in dark mode (lowest → high) instead of using shadows |
| **Border radius** | 10px base, proportionally scaled. Cards=`xl`, dialogs=`2xl`, badges=`4xl` |
| **Font pairing** | Inter (body) + Space Grotesk (headings) |
| **Component library** | shadcn/ui re-ui fork — all components are fully local, no CDN runtime deps |
| **PWA** | Service worker registered at boot; `manifest.webmanifest` included |
