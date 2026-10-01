# 📦 Tech Stack

Complete breakdown of technologies, libraries, and tools used in the Education Platform, with justification for each choice.

---

## Core Technologies

### Frontend Framework

**Next.js 16.0**
- **Website:** https://nextjs.org
- **License:** MIT
- **Why:** Industry-standard React framework with server-side rendering, App Router, and built-in optimizations

**React 19**
- **Website:** https://react.dev
- **License:** MIT
- **Why:** Leading UI library with Server Components, Suspense, and rich ecosystem

---

### Language

**TypeScript 5.3+**
- **Website:** https://www.typescriptlang.org
- **License:** Apache 2.0
- **Why:** Type safety prevents bugs, better IDE support, self-documenting code

---

### Database

**PostgreSQL 14+**
- **Website:** https://www.postgresql.org
- **License:** PostgreSQL License (similar to MIT)
- **Why:** Robust relational database, ACID compliant, excellent for structured data with relationships

**Prisma ORM 5.0+**
- **Website:** https://www.prisma.io
- **License:** Apache 2.0
- **Why:** Type-safe database client, migration management, visual database browser (Studio)

---

## Styling & UI

**Tailwind CSS 3.4+**
- **Website:** https://tailwindcss.com
- **License:** MIT
- **Why:** Utility-first CSS, rapid development, consistent design, small bundle size

**shadcn/ui**
- **Website:** https://ui.shadcn.com
- **License:** MIT
- **Why:** Beautiful, accessible components built on Radix UI, copy-paste approach (no package dependency)

**Radix UI**
- **Website:** https://www.radix-ui.com
- **License:** MIT
- **Why:** Unstyled, accessible component primitives (used by shadcn/ui)

---

## Authentication & Authorization

**NextAuth.js 5.0 (Auth.js)**
- **Website:** https://authjs.dev
- **License:** ISC
- **Why:** Complete authentication solution, supports OAuth providers, JWT/database sessions, CSRF protection

**bcryptjs**
- **Package:** bcryptjs
- **License:** MIT
- **Why:** Password hashing, secure and widely trusted

---

## Form Handling & Validation

**React Hook Form 7.0+**
- **Website:** https://react-hook-form.com
- **License:** MIT
- **Why:** Performant form library, minimal re-renders, excellent TypeScript support

**Zod 3.0+**
- **Website:** https://zod.dev
- **License:** MIT
- **Why:** TypeScript-first schema validation, runtime type checking, integrates with React Hook Form

---

## AI & Machine Learning

**Google Generative AI SDK (Gemini)**
- **Package:** @google/generative-ai
- **License:** Apache 2.0
- **Why:** Google's Gemini 1.5 Pro model, JSON mode for structured output, cost-effective ($0.001/request)

---

## Document Processing

**Mammoth.js**
- **Package:** mammoth
- **License:** BSD 2-Clause
- **Why:** Extract text from DOCX files, lightweight, works in Node.js

**docx**
- **Package:** docx
- **License:** MIT
- **Why:** Generate Word documents programmatically, rich formatting support

---

## Utilities

**date-fns**
- **Website:** https://date-fns.org
- **License:** MIT
- **Why:** Modern date utility library, tree-shakeable, immutable

**clsx**
- **Package:** clsx
- **License:** MIT
- **Why:** Conditional CSS class names, tiny (228B)

**tailwind-merge**
- **Package:** tailwind-merge
- **License:** MIT
- **Why:** Merge Tailwind classes without conflicts

---

## Data Visualization

**Recharts 2.0+**
- **Website:** https://recharts.org
- **License:** MIT
- **Why:** React chart library, composable, customizable, supports all common chart types

---

## Development Tools

### Code Quality

**ESLint 8.0+**
- **Website:** https://eslint.org
- **License:** MIT
- **Why:** JavaScript/TypeScript linting, catch errors early

**Prettier 3.0+**
- **Website:** https://prettier.io
- **License:** MIT
- **Why:** Code formatting, consistent style across team

**TypeScript ESLint**
- **Package:** @typescript-eslint/eslint-plugin
- **License:** MIT
- **Why:** TypeScript-specific linting rules

---

### Testing (Planned)

**Vitest**
- **Website:** https://vitest.dev
- **License:** MIT
- **Why:** Fast unit testing, Vite-powered, Jest-compatible API

**Playwright**
- **Website:** https://playwright.dev
- **License:** Apache 2.0
- **Why:** End-to-end testing, cross-browser, reliable

**Testing Library**
- **Website:** https://testing-library.com
- **License:** MIT
- **Why:** User-centric testing, best practices

---

## Infrastructure

### Development

**Node.js 18+**
- **Website:** https://nodejs.org
- **License:** MIT
- **Why:** JavaScript runtime, long-term support (LTS)

**npm / pnpm**
- **Why:** Package management, lock file for reproducible builds

---

### Production (Recommended)

**Vercel**
- **Website:** https://vercel.com
- **Why:** Zero-config deployment, edge network, serverless functions, created Next.js

**Supabase / Neon / Railway**
- **Why:** Managed PostgreSQL, connection pooling, automated backups

**Vercel Blob / AWS S3 / Cloudflare R2**
- **Why:** File storage for uploads

---

## Complete Package.json

```json
{
  "dependencies": {
    "next": "^16.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.3.0",
    
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    
    "next-auth": "^5.0.0",
    "bcryptjs": "^2.4.3",
    "@auth/prisma-adapter": "^2.0.0",
    
    "react-hook-form": "^7.0.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    
    "@google/generative-ai": "^0.1.0",
    
    "mammoth": "^1.6.0",
    "docx": "^8.5.0",
    
    "tailwindcss": "^3.4.0",
    "tailwindcss-animate": "^1.0.7",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-toast": "^1.1.0",
    
    "date-fns": "^3.0.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    
    "recharts": "^2.10.0",
    
    "lucide-react": "^0.300.0",
    "class-variance-authority": "^0.7.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/bcryptjs": "^2.4.0",
    
    "eslint": "^8.56.0",
    "eslint-config-next": "^16.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.0"
  }
}
```

---

## Architecture Decisions

### Why No State Management Library?

**Decision:** No Redux, Zustand, or MobX

**Reasoning:**
- React Server Components handle most state on the server
- Client state is minimal (forms, UI toggles)
- React Context sufficient for global client state (theme, user)
- URL searchParams for filters and pagination
- Simpler codebase, fewer dependencies

---

### Why No GraphQL?

**Decision:** REST API with Next.js Route Handlers

**Reasoning:**
- REST sufficient for our use case
- Next.js Route Handlers co-located with pages
- No need for GraphQL complexity
- Prisma provides type-safe data fetching
- Can add GraphQL layer later if needed

---

### Why Not MongoDB?

**Decision:** PostgreSQL over MongoDB

**Reasoning:**
- Data is highly relational (Users → Exams → Questions)
- Need ACID transactions for exam integrity
- PostgreSQL has JSON support for flexibility
- Better for complex queries and aggregations
- Mature ecosystem and tooling

---

### Why Not Separate Backend?

**Decision:** Next.js API Routes instead of Express/Fastify

**Reasoning:**
- Single codebase, simpler deployment
- API routes co-located with pages
- Built-in middleware and validation
- Serverless-ready for scaling
- Type sharing between frontend and backend

---

## Technology Comparison

### Database

| Feature | PostgreSQL (✓) | MongoDB | MySQL |
|---------|---------------|---------|-------|
| ACID | ✓ | Limited | ✓ |
| Relations | ✓✓✓ | Manual | ✓✓ |
| JSON | ✓ | ✓✓✓ | ✓ |
| Full-text search | ✓ | ✓ | ✓ |
| Maturity | ✓✓✓ | ✓✓ | ✓✓✓ |

---

### ORM

| Feature | Prisma (✓) | TypeORM | Sequelize |
|---------|-----------|---------|-----------|
| Type safety | ✓✓✓ | ✓✓ | ✓ |
| Migrations | ✓✓✓ | ✓✓ | ✓✓ |
| Query builder | ✓✓✓ | ✓✓ | ✓✓ |
| Studio GUI | ✓✓✓ | - | - |
| Learning curve | Low | Medium | Medium |

---

### CSS Framework

| Feature | Tailwind (✓) | Bootstrap | Material UI |
|---------|-------------|-----------|-------------|
| Bundle size | Small | Large | Very Large |
| Customization | ✓✓✓ | ✓✓ | ✓ |
| Learning curve | Low | Low | Medium |
| Flexibility | ✓✓✓ | ✓✓ | ✓ |
| Design control | ✓✓✓ | ✓ | ✓ |

---

## Version Management

**Node Version:** Use `.nvmrc` file:
```
18.18.0
```

**Package Manager:** Lock file committed:
- `package-lock.json` (npm)
- `pnpm-lock.yaml` (pnpm)

**Database:** Prisma migrations track schema versions

---

## Dependency Audit

### Security

```bash
# Check for vulnerabilities
npm audit

# Fix automatically
npm audit fix
```

### Updates

```bash
# Check outdated packages
npm outdated

# Update specific package
npm update next

# Update all (careful!)
npm update
```

---

## License Compliance

All dependencies use permissive licenses:
- **MIT:** Most packages
- **Apache 2.0:** Prisma, TypeScript, Gemini SDK
- **BSD:** Mammoth.js
- **ISC:** NextAuth.js

No GPL or restrictive licenses - safe for commercial use.

---

## Bundle Size Analysis

```bash
# Install analyzer
npm install --save-dev @next/bundle-analyzer

# Run analysis
ANALYZE=true npm run build
```

**Current bundle sizes:**
- **First Load JS:** ~100KB gzipped
- **Client bundles:** ~50KB per page
- **Shared chunks:** ~40KB

---

## Performance Benchmarks

**Lighthouse scores (target):**
- Performance: 90+
- Accessibility: 100
- Best Practices: 100
- SEO: 100

---

## Further Reading

- **[Next.js Docs](https://nextjs.org/docs)** - Framework documentation
- **[Prisma Docs](https://www.prisma.io/docs)** - Database ORM guide
- **[Tailwind Docs](https://tailwindcss.com/docs)** - CSS framework
- **[NextAuth Docs](https://authjs.dev)** - Authentication guide

---

**Next:** Understand the [Folder Structure](./03-folder-structure.md) →
