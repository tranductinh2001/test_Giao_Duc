# Developer Guide

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL database
- Git

### Setup

1. **Clone repository**
```bash
git clone <repository-url>
cd education-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Setup database**
```bash
npx prisma generate
npx prisma db push
```

5. **Run development server**
```bash
npm run dev
```

---

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages
│   ├── admin/             # Admin pages
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard pages
│   └── lesson-plans/     # Lesson plan pages
│
├── core/                   # Business logic
│   ├── annotations/
│   ├── ai-review/
│   ├── document-adapters/
│   ├── knowledge-mapping/
│   ├── textbook/
│   └── workflow/
│
├── components/             # React components
│   ├── ui/
│   ├── admin/
│   ├── dashboard/
│   └── landing/
│
├── lib/                    # Utilities
│   ├── prisma.ts
│   ├── auth.ts
│   └── workflow-service.ts
│
└── types/                 # TypeScript types
```

---

## Key Files

### Authentication
- `src/auth.config.ts` - Auth.js configuration
- `src/lib/auth.ts` - Auth utilities
- `src/app/api/auth/[...nextauth]/route.ts` - Auth handler

### Database
- `src/lib/prisma.ts` - Prisma client
- `prisma/schema.prisma` - Database schema
- `prisma/schema-additions.prisma` - Additional models

### Workflow
- `src/lib/workflow-service.ts` - Workflow management
- `src/core/workflow/WorkflowOrchestrator.ts` - Orchestration
- `src/app/api/workflow/stream/route.ts` - Workflow API

### Document Processing
- `src/core/document-adapters/BrightOneAdapter.ts` - PDF/Image parsing
- `src/core/document-adapters/DocxAdapter.ts` - DOCX parsing

---

## Common Tasks

### Create New API Endpoint

1. Create route file:
```typescript
// src/app/api/resource/route.ts
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET() {
  const session = await getServerSession(authConfig);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Your logic here

  return NextResponse.json({ success: true, data: [] });
}
```

2. Add validation (optional):
```typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
});
```

### Create New Component

```typescript
// src/components/ui/NewComponent.tsx
interface Props {
  title: string;
  onClick?: () => void;
}

export function NewComponent({ title, onClick }: Props) {
  return (
    <div className="new-component">
      <h2>{title}</h2>
      <button onClick={onClick}>Action</button>
    </div>
  );
}
```

### Add Database Model

1. Edit `prisma/schema.prisma`:
```prisma
model NewModel {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}
```

2. Run migration:
```bash
npx prisma migrate dev --name add_new_model
```

3. Generate client:
```bash
npx prisma generate
```

---

## Testing

### Run Tests
```bash
npm run test
```

### Build Check
```bash
npm run build
```

### Type Check
```bash
npx tsc --noEmit
```

---

## Code Style

### ESLint
```bash
npm run lint
```

### Prettier
Code is formatted with Prettier automatically on save.

### TypeScript
- Strict mode enabled
- No `any` types
- Explicit return types for functions

---

## Git Workflow

1. Create branch:
```bash
git checkout -b feature/my-feature
```

2. Make changes and commit:
```bash
git add .
git commit -m "Add my feature"
```

3. Push and create PR:
```bash
git push -u origin feature/my-feature
```

---

## Debugging

### API Routes
```typescript
// Add logging
console.log('Debug:', { data });

// Check request
console.log('Headers:', req.headers);
```

### Database
```typescript
// Prisma query logging in development
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});
```

### Client
```typescript
// React DevTools
// Browser console logs
```

---

## Performance Tips

1. Use React Server Components where possible
2. Implement proper caching strategies
3. Optimize database queries with indexes
4. Lazy load heavy components
5. Use images with Next.js Image component

---

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [NextAuth.js](https://next-auth.js.org)
