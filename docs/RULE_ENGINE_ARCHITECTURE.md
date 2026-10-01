# Rule Engine Architecture Design

**Version**: 2.0
**Date**: 2026-07-01
**Status**: Design Phase

---

## 🎯 DESIGN PRINCIPLES

1. **Rules First, AI Second** - Rules handle 80%, AI handles 20%
2. **Template-Driven** - Every check is template-based
3. **Admin Configurable** - No hard-coded rules
4. **Modular & Extensible** - Easy to add new templates
5. **Production-Ready** - TypeScript strict, tested, optimized

---

## 🏗️ ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────┐
│                  DOCX Upload                    │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│            Text Extraction Layer                │
│  - Mammoth.js                                   │
│  - Text Normalizer                              │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│          Template Detection Layer               │
│  - Rule-based detector                          │
│  - Keyword matching                             │
│  - AI fallback (if needed)                      │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│            Parser Engine Layer                  │
│  - Keyword Parser (priority: high)              │
│  - Regex Parser (priority: medium)              │
│  - Fuzzy Parser (priority: low)                 │
│  - AI Section Detector (fallback)               │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│          Structure Validation Layer             │
│  - Order validator                              │
│  - Format validator                             │
│  - Numbering validator                          │
│  - Style validator                              │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│           Content Review Layer                  │
│  - Rule-based checks (fast)                     │
│  - Gemini review (per section, on-demand)       │
│  - Score calculator                             │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│              Fix Engine Layer                   │
│  - Template-based fixes                         │
│  - Admin-configured prompts                     │
│  - No auto-creation                             │
└──────────────────┬──────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────┐
│              Result Layer                       │
│  - Annotations                                  │
│  - Highlights                                   │
│  - Comments                                     │
│  - Score report                                 │
└─────────────────────────────────────────────────┘
```

---

## 📊 DATABASE SCHEMA

### 1. Templates Table

Represents a lesson plan template (e.g., 5512, STEM, etc.)

```prisma
model Template {
  id              String   @id @default(cuid())
  code            String   @unique // "5512", "STEM", "THCS"
  name            String
  description     String?
  category        String? // "Primary", "Secondary", "High School"
  isActive        Boolean  @default(true)
  isDefault       Boolean  @default(false)
  version         Int      @default(1)
  
  // Relations
  sections        TemplateSection[]
  parserRules     ParserRule[]
  structureRules  StructureRule[]
  reviewRules     ReviewRule[]
  fixRules        FixRule[]
  scoringRules    ScoringRule[]
  
  // Metadata
  createdBy       String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([code])
  @@index([isActive])
}
```

### 2. TemplateSection Table

Defines expected sections in a template

```prisma
model TemplateSection {
  id           String   @id @default(cuid())
  templateId   String
  template     Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  code         String   // "OBJECTIVE", "ACTIVITY", "ASSESSMENT"
  name         String   // "Mục tiêu", "Hoạt động dạy học"
  order        Int      // 1, 2, 3...
  isRequired   Boolean  @default(true)
  isRepeatable Boolean  @default(false)
  
  // Display
  numberingStyle String? // "1.", "A.", "I.", "•"
  headingLevel   Int?    // 1, 2, 3
  
  // Relations
  parserRules    ParserRule[]
  structureRules StructureRule[]
  reviewRules    ReviewRule[]
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([templateId, code])
  @@index([templateId, order])
}
```

### 3. ParserRule Table

Rules for detecting sections from text

```prisma
model ParserRule {
  id          String          @id @default(cuid())
  templateId  String
  template    Template        @relation(fields: [templateId], references: [id], onDelete: Cascade)
  sectionId   String
  section     TemplateSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  
  // Rule config
  type        String          // "KEYWORD", "REGEX", "FUZZY"
  pattern     String          // "Mục tiêu", "^I\\..*Mục tiêu"
  priority    Int             @default(100)
  
  // Matching options
  ignoreCase    Boolean @default(true)
  ignoreAccent  Boolean @default(true)
  ignoreSpace   Boolean @default(false)
  normalizeText Boolean @default(true)
  fuzzyThreshold Float?  // 0.8 = 80% similarity
  
  // Aliases
  aliases     String[] // ["Yêu cầu cần đạt", "Mục đích"]
  
  // Metadata
  isActive      Boolean  @default(true)
  confidence    Float    @default(1.0)
  learnedFromAI Boolean  @default(false)
  usageCount    Int      @default(0)
  successCount  Int      @default(0)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([templateId, type])
  @@index([sectionId])
  @@index([priority])
}
```

### 4. StructureRule Table

Rules for validating document structure

```prisma
model StructureRule {
  id          String          @id @default(cuid())
  templateId  String
  template    Template        @relation(fields: [templateId], references: [id], onDelete: Cascade)
  sectionId   String?
  section     TemplateSection? @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  
  code        String          // "HEADING_STYLE", "NUMBERING", "ORDER"
  name        String
  description String?
  
  // Rule config
  type        String          // "HEADING", "NUMBERING", "FORMAT", "ORDER"
  severity    String          // "ERROR", "WARNING", "INFO"
  
  // Validation config (JSON)
  expectedValue Json?          // { headingLevel: 1, bold: true }
  allowedValues Json?          // { numberingStyles: ["1.", "A."] }
  
  // Scoring
  penaltyScore Int @default(0) // Points to deduct
  
  // Messages
  errorMessage   String?
  suggestionText String?
  
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([templateId, type])
  @@index([severity])
}
```

### 5. ReviewRule Table

Rules for reviewing section content with AI

```prisma
model ReviewRule {
  id          String          @id @default(cuid())
  templateId  String
  template    Template        @relation(fields: [templateId], references: [id], onDelete: Cascade)
  sectionId   String
  section     TemplateSection @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  
  code        String          // "HAS_KNOWLEDGE", "HAS_COMPETENCY"
  name        String
  description String?
  
  // Review config
  checkType   String          // "PRESENCE", "QUALITY", "COMPLETENESS"
  severity    String          // "ERROR", "WARNING", "INFO"
  
  // AI Prompt
  systemPrompt String          // Base instruction for Gemini
  userPrompt   String          // Specific check instruction
  
  // Expected criteria (JSON)
  criteria    Json?           // { mustHave: ["kiến thức", "năng lực"] }
  
  // Scoring
  penaltyScore Int @default(0)
  
  // AI Config
  useAI       Boolean @default(true)
  aiModel     String  @default("gemini-2.0-flash-exp")
  maxTokens   Int?    @default(500)
  temperature Float?  @default(0.3)
  
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([templateId, sectionId])
  @@index([checkType])
}
```

### 6. FixRule Table

Rules for fixing detected issues

```prisma
model FixRule {
  id          String   @id @default(cuid())
  templateId  String
  template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  code        String   // "ADD_COMPETENCY", "FIX_HEADING"
  name        String
  description String?
  
  // What to fix
  issueType   String   // "MISSING_CONTENT", "WRONG_FORMAT"
  issueSeverity String // "ERROR", "WARNING"
  
  // How to fix
  fixType     String   // "TEMPLATE", "AI_ASSISTED", "MANUAL"
  
  // Template-based fix
  template    String?  // Pre-defined fix content
  
  // AI-assisted fix
  aiPrompt    String?  // Prompt for generating fix
  aiModel     String?  @default("gemini-2.0-flash-exp")
  
  // Manual fix
  instructions String? // Instructions for user
  
  // Auto-apply
  autoApply   Boolean @default(false)
  requiresApproval Boolean @default(true)
  
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([templateId, issueType])
}
```

### 7. ScoringRule Table

Rules for calculating scores

```prisma
model ScoringRule {
  id          String   @id @default(cuid())
  templateId  String
  template    Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
  
  code        String   // "MISSING_OBJECTIVE", "WRONG_HEADING"
  name        String
  description String?
  
  // Scoring
  issueType   String   // Matches StructureRule/ReviewRule codes
  severity    String   // "ERROR", "WARNING", "INFO"
  penalty     Int      // Points to deduct
  
  // Conditional scoring (JSON)
  conditions  Json?    // { if: "sectionCount > 5", then: 10 }
  
  isActive Boolean @default(true)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@index([templateId, issueType])
  @@index([severity])
}
```

### 8. RuleVersion Table

Track rule changes over time

```prisma
model RuleVersion {
  id          String   @id @default(cuid())
  
  ruleType    String   // "PARSER", "STRUCTURE", "REVIEW", "FIX", "SCORING"
  ruleId      String   // Original rule ID
  version     Int
  
  // Snapshot
  data        Json     // Full rule data at this version
  
  // Change tracking
  changedBy   String?
  changeNote  String?
  
  createdAt   DateTime @default(now())
  
  @@index([ruleType, ruleId])
  @@index([version])
}
```

### 9. RuleHistory Table

Track rule usage and learning

```prisma
model RuleHistory {
  id          String   @id @default(cuid())
  
  ruleType    String   // "PARSER", "STRUCTURE", "REVIEW"
  ruleId      String
  
  // Execution
  lessonPlanId String
  sectionId    String?
  
  // Result
  matched      Boolean
  confidence   Float?
  aiUsed       Boolean  @default(false)
  
  // Performance
  executionTime Int?    // milliseconds
  
  // Learning
  userFeedback String? // "CORRECT", "INCORRECT", "IMPROVED"
  improvedRuleId String? // New rule created from this
  
  createdAt    DateTime @default(now())
  
  @@index([ruleId, matched])
  @@index([lessonPlanId])
  @@index([aiUsed])
}
```

---

## 🔧 CORE TYPES

```typescript
// src/core/rules/types.ts

export type RuleType = 'PARSER' | 'STRUCTURE' | 'REVIEW' | 'FIX' | 'SCORING';

export type Severity = 'ERROR' | 'WARNING' | 'INFO';

export type ParserType = 'KEYWORD' | 'REGEX' | 'FUZZY';

export type StructureType = 'HEADING' | 'NUMBERING' | 'FORMAT' | 'ORDER';

export type ReviewType = 'PRESENCE' | 'QUALITY' | 'COMPLETENESS';

export type FixType = 'TEMPLATE' | 'AI_ASSISTED' | 'MANUAL';

// Parser Result
export interface ParserResult {
  sectionCode: string;
  sectionName: string;
  startIndex: number;
  endIndex: number;
  confidence: float;
  matchedBy: {
    ruleId: string;
    ruleType: ParserType;
    pattern: string;
  };
  aiUsed: boolean;
}

// Structure Issue
export interface StructureIssue {
  ruleId: string;
  ruleCode: string;
  severity: Severity;
  message: string;
  suggestion: string | null;
  position: {
    sectionId: string;
    line?: number;
  };
  penaltyScore: number;
}

// Review Issue
export interface ReviewIssue {
  ruleId: string;
  ruleCode: string;
  severity: Severity;
  message: string;
  explanation: string | null;
  suggestion: string | null;
  position: {
    sectionId: string;
    startOffset?: number;
    endOffset?: number;
  };
  penaltyScore: number;
  aiGenerated: boolean;
}

// Fix Suggestion
export interface FixSuggestion {
  fixRuleId: string;
  issueId: string;
  fixType: FixType;
  content: string | null;
  instructions: string | null;
  autoApply: boolean;
  requiresApproval: boolean;
}

// Score Report
export interface ScoreReport {
  totalScore: number;
  maxScore: number;
  percentage: number;
  breakdown: {
    structure: number;
    content: number;
    format: number;
  };
  issuesSummary: {
    errors: number;
    warnings: number;
    info: number;
  };
  penaltiesApplied: Array<{
    ruleCode: string;
    penalty: number;
    count: number;
  }>;
}
```

---

## 🔄 WORKFLOW

```typescript
// Simplified workflow
async function processLessonPlan(docxBuffer: ArrayBuffer) {
  // 1. Extract text
  const extracted = await extractText(docxBuffer);
  
  // 2. Detect template
  const template = await detectTemplate(extracted);
  
  // 3. Parse sections
  const sections = await parseSections(extracted, template);
  
  // 4. Validate structure
  const structureIssues = await validateStructure(sections, template);
  
  // 5. Review content (on-demand per section)
  const reviewIssues = await reviewContent(sections, template);
  
  // 6. Calculate score
  const score = calculateScore(structureIssues, reviewIssues, template);
  
  // 7. Generate fixes
  const fixes = await generateFixes(structureIssues, reviewIssues, template);
  
  return {
    sections,
    issues: [...structureIssues, ...reviewIssues],
    score,
    fixes,
  };
}
```

---

**Next Steps**: 
1. Create Prisma schema
2. Generate types
3. Implement parsers
4. Build rule engine

**Status**: ✅ Design Complete - Ready for Implementation
