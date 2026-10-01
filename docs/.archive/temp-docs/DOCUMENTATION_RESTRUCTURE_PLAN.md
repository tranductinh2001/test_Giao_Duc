# 📚 Documentation Structure Plan

## Current State Analysis

**Total .md files found:** 74 files
**Problems identified:**
1. Files scattered across multiple locations (root, /docs, /modules, /.claude)
2. Inconsistent naming (some English, some Vietnamese)
3. Duplicate content (multiple summaries, reports)
4. No clear hierarchy or reading order
5. Temporary files mixed with permanent documentation
6. No central index or navigation

## Proposed New Structure

```
/docs
├── README.md                           # Documentation hub & navigation
│
├── 01-getting-started/
│   ├── README.md                       # Quick start guide
│   ├── 01-prerequisites.md
│   ├── 02-installation.md
│   ├── 03-configuration.md
│   └── 04-first-run.md
│
├── 02-architecture/
│   ├── README.md                       # Architecture overview
│   ├── 01-system-overview.md
│   ├── 02-tech-stack.md
│   ├── 03-folder-structure.md
│   ├── 04-design-patterns.md
│   └── 05-security-architecture.md
│
├── 03-database/
│   ├── README.md                       # Database documentation
│   ├── 01-schema-overview.md
│   ├── 02-core-entities.md
│   ├── 03-relationships.md
│   ├── 04-migrations.md
│   └── 05-data-seeding.md
│
├── 04-api/
│   ├── README.md                       # API documentation
│   ├── 01-api-overview.md
│   ├── 02-authentication.md
│   ├── 03-endpoints-reference.md
│   ├── 04-request-response.md
│   └── 05-error-handling.md
│
├── 05-features/
│   ├── README.md                       # Features documentation
│   ├── 01-authentication-system.md
│   ├── 02-license-system.md
│   ├── 03-question-bank.md
│   ├── 04-exam-engine.md
│   ├── 05-scoring-system.md
│   ├── 06-statistics-analytics.md
│   ├── 07-import-word-excel.md
│   ├── 08-gamification.md
│   └── 09-lesson-plan-review/         # New module
│       ├── README.md
│       ├── 01-overview.md
│       ├── 02-docx-parser.md
│       ├── 03-gemini-integration.md
│       ├── 04-review-interface.md
│       ├── 05-export-system.md
│       └── 06-admin-rules.md
│
├── 06-frontend/
│   ├── README.md                       # Frontend documentation
│   ├── 01-ui-design-system.md
│   ├── 02-components.md
│   ├── 03-pages-routing.md
│   ├── 04-state-management.md
│   └── 05-styling.md
│
├── 07-development/
│   ├── README.md                       # Development guide
│   ├── 01-coding-standards.md
│   ├── 02-git-workflow.md
│   ├── 03-testing.md
│   ├── 04-debugging.md
│   └── 05-troubleshooting.md
│
├── 08-deployment/
│   ├── README.md                       # Deployment guide
│   ├── 01-environment-setup.md
│   ├── 02-build-process.md
│   ├── 03-production-deployment.md
│   └── 04-monitoring.md
│
├── 09-maintenance/
│   ├── README.md                       # Maintenance guide
│   ├── 01-database-backups.md
│   ├── 02-security-updates.md
│   ├── 03-performance-optimization.md
│   └── 04-changelog.md
│
└── 10-references/
    ├── README.md                       # References & resources
    ├── 01-product-requirements.md
    ├── 02-user-flows.md
    ├── 03-api-reference.md
    ├── 04-database-schema.md
    └── 05-glossary.md
```

## Migration Plan

### Phase 1: Create Structure
1. Create new folder structure
2. Create README.md files for each section
3. Set up navigation links

### Phase 2: Consolidate Content
1. Identify unique content from existing files
2. Merge duplicate information
3. Update and refine content
4. Remove outdated information

### Phase 3: Organize by Category
1. Move content to appropriate sections
2. Split large files into logical parts
3. Create cross-references

### Phase 4: Archive & Cleanup
1. Move temporary/session files to /docs/.archive
2. Keep only essential docs in root
3. Update all links

### Phase 5: Create Master Index
1. Create main README.md hub
2. Add reading order guide
3. Create quick reference cards

## File Mapping (Old → New)

### Root Level (Keep minimal)
- README.md → Enhanced with better structure
- CLAUDE.md → Keep (project instructions)
- AGENTS.md → Keep (agent instructions)

### Archive (Move to /docs/.archive)
- All *_SUMMARY.md files
- All *_REPORT.md files
- All *_COMPLETE.md files
- COMPREHENSIVE_SESSION_SUMMARY.md
- FINAL_SESSION_SUMMARY.md
- IMPLEMENTATION_*.md
- UI_*.md
- REDESIGN_*.md

### Consolidate into New Structure
- /docs/*.md → Reorganize into categories
- /modules/lesson-plan-review/*.md → /docs/05-features/09-lesson-plan-review/

## Success Criteria

✅ **Clear hierarchy:** 10 main sections, numbered for reading order
✅ **No duplication:** Single source of truth for each topic
✅ **Complete coverage:** Everything needed to rebuild from scratch
✅ **Easy navigation:** README.md at every level with links
✅ **Consistent naming:** English, lowercase, hyphens
✅ **Logical grouping:** Related content together
✅ **Clean root:** Only essential files
✅ **Archive old content:** Preserve history without clutter
