# Rule Engine v2.0

Template-driven, rule-based lesson plan parser with AI fallback.

## 🎯 Goals

- **80%+ AI reduction** - Rules handle most cases, AI only for ambiguous
- **Template-driven** - Add new templates without code changes
- **Admin configurable** - All rules editable via UI
- **Production-ready** - TypeScript strict, tested, optimized

## 📁 Architecture

```
src/core/rule-engine-v2/
├── types/              # TypeScript interfaces
├── parsers/            # Section detection
│   ├── TextNormalizer.ts
│   ├── SectionParser.ts
│   └── AISectionDetector.ts
├── validators/         # Structure validation
│   └── StructureValidator.ts
├── reviewers/          # Content validation (AI)
│   └── ContentReviewer.ts
├── fixers/             # Fix generation
│   └── FixGenerator.ts
├── scoring/            # Score calculation
│   └── ScoreCalculator.ts
├── workflow/           # Orchestration
│   └── WorkflowOrchestrator.ts
├── seed/               # Default templates
│   └── default-template.ts
└── index.ts            # Main entry point
```

## 🚀 Quick Start

```typescript
import { WorkflowOrchestrator } from '@/core/rule-engine-v2';

// Load template from database
const template = await loadTemplate('5STEP');

// Create orchestrator
const orchestrator = new WorkflowOrchestrator(
  template,
  {
    templateId: template.id,
    skipStructureValidation: false,
    skipContentReview: false,
    aiModel: 'gemini-2.0-flash-exp',
  },
  process.env.GEMINI_API_KEY!
);

// Execute workflow
const result = await orchestrator.execute(documentText);

console.log('Score:', result.scoreReport.totalScore);
console.log('AI calls:', result.totalAiCalls);
console.log('Time:', result.totalTime, 'ms');
```

## 📊 Flow

```
Document Text
    ↓
┌─────────────────────┐
│  1. Parse Sections  │ ← Rules (Keyword/Regex/Fuzzy) + AI Fallback
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 2. Validate Structure│ ← Rules (Order/Heading/Numbering)
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 3. Review Content   │ ← AI (Section-by-section)
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 4. Generate Fixes   │ ← Template/AI/Manual
└─────────────────────┘
    ↓
┌─────────────────────┐
│ 5. Calculate Score  │ ← Rules (Penalties)
└─────────────────────┘
    ↓
   Result
```

## 🔧 Parser Rules

Rules are prioritized and tried in order:

### Keyword Matching
```typescript
{
  type: 'KEYWORD',
  pattern: 'Mục tiêu',
  aliases: ['Mục đích', 'Yêu cầu cần đạt'],
  ignoreCase: true,
  ignoreAccent: true,
  priority: 100
}
```

### Regex Matching
```typescript
{
  type: 'REGEX',
  pattern: '^[1I]\\.?\\s*Mục\\s*tiêu',
  priority: 95
}
```

### Fuzzy Matching
```typescript
{
  type: 'FUZZY',
  pattern: 'Mục tiêu bài học',
  fuzzyThreshold: 0.8,
  priority: 80
}
```

### AI Fallback
If no rule matches, AI detector is called:
- Returns section code + confidence
- Can auto-create new rule if approved

## 📐 Structure Rules

Validate document structure:

```typescript
{
  type: 'ORDER',
  severity: 'ERROR',
  expectedValue: {
    order: { OBJECTIVE: 1, PREPARATION: 2, ... }
  },
  penaltyScore: 10
}
```

Types:
- `ORDER` - Section sequence
- `HEADING` - Heading style
- `NUMBERING` - Numbering format
- `FORMAT` - Length, pattern
- `STYLE` - Bold, italic, etc.

## 🤖 Content Rules

AI reviews section content:

```typescript
{
  sectionId: 'OBJECTIVE',
  code: 'HAS_KNOWLEDGE',
  checkType: 'PRESENCE',
  severity: 'ERROR',
  systemPrompt: 'Bạn là chuyên gia đánh giá giáo án.',
  userPrompt: 'Kiểm tra xem có mục tiêu về kiến thức không?',
  criteria: {
    mustHave: ['kiến thức', 'biết', 'nhận biết']
  },
  penaltyScore: 15
}
```

Check types:
- `PRESENCE` - Check if contains something
- `QUALITY` - Assess quality
- `COMPLETENESS` - Check completeness

## 🔧 Fix Rules

Generate fixes for issues:

```typescript
{
  issueType: 'HAS_KNOWLEDGE',
  fixType: 'TEMPLATE',
  fixTemplate: '- Kiến thức: Học sinh biết...',
  autoApply: false,
  requiresApproval: true
}
```

Fix types:
- `TEMPLATE` - Pre-defined content
- `AI_ASSISTED` - AI generates fix
- `MANUAL` - Instructions only

## 📊 Scoring Rules

Rule-based penalties:

```typescript
{
  issueType: 'MISSING_KNOWLEDGE',
  severity: 'ERROR',
  penalty: 15
}
```

Score breakdown:
- Structure: 30%
- Content: 50%
- Format: 20%

## 🎨 Features

### Text Normalization
- Lowercase
- Remove Vietnamese accents
- Normalize spaces
- Remove special chars

### Fuzzy Matching
- Levenshtein distance
- Configurable threshold
- Similarity scoring

### Numbering Detection
- Extracts numbering prefix
- Supports: 1., A., I., a), 1), -, •, *

### AI Integration
- Gemini API
- Configurable prompts
- Temperature control
- Token limits

### Learning System
- AI detections → new rules
- User feedback tracking
- Rule versioning
- Usage analytics

## 📈 Performance

- Parse: ~100-500ms (depending on document size)
- Structure: ~50-100ms
- Content (AI): ~2-5s per section
- Total: ~5-15s for typical document

AI calls:
- Without fallback: 5-10 calls (content review only)
- With fallback: +1-3 calls per ambiguous section

## 🧪 Testing

```bash
# Unit tests
npm test src/core/rule-engine-v2

# Integration test
npm test src/core/rule-engine-v2/workflow
```

## 📚 Templates

### Default: 5-Step Lesson Plan

Sections:
1. Mục tiêu bài học
2. Chuẩn bị
3. Hoạt động dạy học
4. Củng cố - Dặn dò
5. Đánh giá

### Custom Templates

Create via Admin UI or programmatically:

```typescript
const template = {
  code: 'STEM',
  name: 'Giáo án STEM',
  sections: [...],
  parserRules: [...],
  structureRules: [...],
  contentRules: [...],
};
```

## 🔐 API Keys

Set in environment:

```bash
GEMINI_API_KEY=your-key-here
```

## 🚀 Deployment

1. Run migration:
```bash
npx prisma migrate deploy
```

2. Seed default template:
```bash
npm run seed:rule-engine
```

3. Start server:
```bash
npm run start
```

## 📝 License

MIT

## 👥 Credits

Built with ❤️ by Claude Code
