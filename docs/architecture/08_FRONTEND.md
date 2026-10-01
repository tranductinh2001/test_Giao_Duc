# Frontend

## Tech Stack

- **Framework**: Next.js 16.2.9 (App Router)
- **React**: 19.2.4
- **Styling**: Tailwind CSS 3.4.19
- **Icons**: Lucide React 1.21.0
- **Animations**: Framer Motion 12.42.0, GSAP 3.15.0
- **Document Editor**: Syncfusion DocumentEditor 34.1.30

---

## Component Structure

### UI Components

**Location:** `src/components/ui/`

| Component | File | Description |
|-----------|------|-------------|
| Button | `button.tsx` | Reusable button with variants |
| Input | `input.tsx` | Text input with validation |
| Select | `select.tsx` | Dropdown select |
| Card | `card.tsx` | Container card |
| Badge | `badge.tsx` | Status badge |
| Dialog | `dialog.tsx` | Modal dialog |
| Accordion | `accordion.tsx` | Collapsible sections |
| ScrollArea | `scroll-area.tsx` | Scrollable container |
| Skeleton | `skeleton.tsx` | Loading placeholder |
| LoadingSkeleton | `LoadingSkeleton.tsx` | Loading state |
| EmptyState | `EmptyState.tsx` | Empty state display |
| FormField | `form-field.tsx` | Form field wrapper |

### Landing Components

**Location:** `src/components/landing/`

| Component | File | Description |
|-----------|------|-------------|
| Hero | `modern-hero.tsx` | Landing page hero |
| Navbar | `modern-navbar.tsx` | Navigation bar |
| Categories | `modern-categories.tsx` | Category display |
| Features | `modern-features.tsx` | Feature showcase |
| Pricing | `modern-pricing.tsx` | Pricing plans |
| FAQ | `modern-faq.tsx` | FAQ accordion |
| Footer | `modern-footer.tsx` | Footer section |
| Stats | `modern-stats.tsx` | Statistics display |
| CTA | `modern-cta.tsx` | Call to action |
| FeaturedExams | `modern-featured-exams.tsx` | Featured exams |

### Dashboard Components

**Location:** `src/components/dashboard/`

| Component | File | Description |
|-----------|------|-------------|
| HeroCard | `HeroCard.tsx` | Dashboard hero card |
| NotificationTicker | `NotificationTicker.tsx` | Notification display |
| ExamsClient | `ExamsClient.tsx` | Exam list client |

### Admin Components

**Location:** `src/components/admin/`

| Component | File | Description |
|-----------|------|-------------|
| ThemeSettingsPanel | `ThemeSettingsPanel.tsx` | Theme customization |

### Editor Components

**Location:** `src/components/editor-v2/`

| Component | File | Description |
|-----------|------|-------------|
| TextNode | `nodes/TextNode.tsx` | Text editing node |

---

## Page Structure

### Public Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/app/page.tsx` | Landing page |
| `/login` | `src/app/(auth)/login/page.tsx` | Login page |
| `/register` | `src/app/(auth)/register/page.tsx` | Registration page |
| `/faq` | `src/app/faq/page.tsx` | FAQ page |

### Auth Pages

| Route | File | Description |
|-------|------|-------------|
| `/forgot-password` | `src/app/auth/forgot-password/page.tsx` | Forgot password |
| `/reset-password` | `src/app/auth/reset-password/page.tsx` | Reset password |

### Dashboard Pages

| Route | File | Description |
|-------|------|-------------|
| `/dashboard` | `src/app/dashboard/page.tsx` | Teacher dashboard |
| `/dashboard/exams` | `src/app/dashboard/exams/page.tsx` | Exam history |
| `/dashboard/exams/custom` | `src/app/dashboard/exams/custom/page.tsx` | Custom exams |
| `/dashboard/exams/history` | `src/app/dashboard/exams/history/page.tsx` | Exam history |
| `/dashboard/insights` | `src/app/dashboard/insights/page.tsx` | Analytics |

### Admin Pages

| Route | File | Description |
|-------|------|-------------|
| `/admin` | `src/app/admin/layout.tsx` | Admin layout |
| `/admin/categories` | `src/app/admin/categories/page.tsx` | Category management |
| `/admin/section-rules` | `src/app/admin/section-rules/page.tsx` | Rule studio |
| `/admin/settings` | `src/app/admin/settings/page.tsx` | System settings |

### Lesson Plan Pages

| Route | File | Description |
|-------|------|-------------|
| `/lesson-plans` | `src/app/lesson-plans/page.tsx` | List all |
| `/lesson-plans/upload` | `src/app/lesson-plans/upload/page.tsx` | Upload new |
| `/lesson-plans/[id]` | `src/app/lesson-plans/[id]/page.tsx` | View details |
| `/lesson-plans/[id]/quick-view` | `src/app/lesson-plans/[id]/quick-view/page.tsx` | Quick preview |
| `/lesson-plans/[id]/review` | `src/app/lesson-plans/[id]/review/page.tsx` | Review interface |
| `/lesson-plans/[id]/word-review` | `src/app/lesson-plans/[id]/word-review/page.tsx` | Word review |

---

## Layout Structure

### Root Layout

**File:** `src/app/layout.tsx`

```typescript
// Provides:
// - Theme provider (next-themes)
// - Auth provider (NextAuth)
// - Global CSS (globals.css)
// - Font configuration
// - Metadata
```

### Auth Layout

**File:** `src/app/(auth)/layout.tsx`

```typescript
// Provides:
// - No sidebar
// - Centered content
// - Background styling
```

### Admin Layout

**File:** `src/app/admin/layout.tsx`

```typescript
// Provides:
// - Admin sidebar navigation
// - Header with user menu
// - Theme toggle
// - Protected routes
```

---

## State Management

### Local State
```typescript
const [state, setState] = useState(initialValue);
const [state, dispatch] = useReducer(reducer, initialState);
```

### Server State
- React Server Components fetch directly
- Client components use SWR or fetch

### Auth State
```typescript
// Using NextAuth.js
const { data: session } = useSession();
```

### Theme State
```typescript
// Using next-themes
const { theme, setTheme } = useTheme();
```

---

## API Communication

### Fetch Wrapper

```typescript
// Standard fetch pattern
const response = await fetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});
const result = await response.json();
```

### Form Submissions

```typescript
// Using FormData for file uploads
const formData = new FormData();
formData.append('file', file);
const response = await fetch('/api/lesson-plans/upload', {
  method: 'POST',
  body: formData,
});
```

---

## Styling

### Global Styles

**File:** `src/app/globals.css`

- Tailwind directives
- Custom CSS variables
- Theme-specific styles

### Tailwind Configuration

**File:** `tailwind.config.ts`

- Custom colors
- Typography settings
- Animation durations

### Responsive Breakpoints

```css
/* Mobile: < 640px */
/* Tablet: 640px - 1024px */
/* Desktop: > 1024px */
```

---

## Error Handling

### Error Boundary

**File:** `src/components/error-boundary.tsx`

```typescript
// Catches React errors
// Shows fallback UI
// Reports errors
```

### API Error Display

```typescript
// Parse error response
if (!result.success) {
  toast.error(result.message);
}
```

---

## Loading States

### Skeleton Loading

```typescript
// Using LoadingSkeleton component
<LoadingSkeleton lines={3} />
```

### Button Loading

```typescript
// Button with loading state
<Button isLoading={isLoading}>Submit</Button>
```

---

## Forms

### Form Validation

- Zod schemas on client and server
- Real-time validation feedback
- Error message display

### File Upload

```typescript
// Upload component
<Input
  type="file"
  accept=".docx,.pdf,.doc,.png,.jpg"
  onChange={handleFileChange}
/>
```

---

## Navigation

### Client-Side Navigation
```typescript
import Link from 'next/link';
<Link href="/dashboard">Dashboard</Link>
```

### Programmatic Navigation
```typescript
import { useRouter } from 'next/navigation';
const router = useRouter();
router.push('/lesson-plans');
```

### Dynamic Routes
```typescript
// /lesson-plans/[id]/page.tsx
const params = useParams();
const id = params.id;
```

---

## Data Fetching

### Server Components

```typescript
// Direct database access
async function getData() {
  const data = await prisma.lessonPlan.findMany();
  return data;
}
```

### Client Components

```typescript
// Using useEffect
useEffect(() => {
  fetch('/api/lesson-plans')
    .then(res => res.json())
    .then(setData);
}, []);
```

---

## Theming

### Dark/Light Mode

**Implementation:** `next-themes`

```typescript
const { theme, setTheme } = useTheme();

// Toggle
<button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  Toggle Theme
</button>
```

### CSS Variables

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
  --primary: #3b82f6;
}

.dark {
  --background: #0a0a0a;
  --foreground: #ededed;
}
```

---

## Mobile Menu

**File:** `src/components/MobileMenu.tsx`

```typescript
// Responsive navigation
// Hamburger menu
// Slide-in drawer
```

---

## Animations

### Framer Motion

```typescript
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
/>
```

### GSAP

```typescript
import { gsap } from 'gsap';

gsap.from('.element', {
  duration: 1,
  y: 20,
  opacity: 0,
});
```

---

## Build & Deployment

### Development

```bash
npm run dev
# Starts at http://localhost:3000
```

### Production Build

```bash
npm run build
# Outputs to .next/
```

### Start Production

```bash
npm start
# Starts production server
```
