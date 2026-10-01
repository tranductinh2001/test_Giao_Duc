# CRUD Operations for Lesson Plans, Licenses & Exams

## 📚 1. Lesson Plans (Giáo án)

### API Endpoints Cần Tạo

#### A. Basic CRUD (`/api/lesson-plans/[id]/route.ts`)

```typescript
// GET /api/lesson-plans/[id] - Get lesson plan details
// - Include: user, versions, sections, reviewResults
// - Permission: Owner or Admin

// PATCH /api/lesson-plans/[id] - Update metadata
// Body: { title, subject, gradeLevel, schoolYear }
// - Log to ReviewHistory
// - Permission: Owner or Admin

// DELETE /api/lesson-plans/[id] - Soft delete
// - Set deletedAt timestamp
// - Permission: Owner or Admin
```

#### B. List Lesson Plans (`/api/lesson-plans/route.ts`)

```typescript
// GET /api/lesson-plans - List user's lesson plans
// Query params:
// - page, limit (pagination)
// - status: UPLOADED, PARSING, PARSED, REVIEWING, REVIEWED
// - search: title/subject
// Returns: { items, meta: { total, page, limit, totalPages } }

// POST /api/lesson-plans - Already exists (upload)
```

#### C. Admin Management (`/api/admin/lesson-plans/route.ts`)

```typescript
// GET /api/admin/lesson-plans - List all lesson plans
// Query params:
// - userId: filter by user
// - status: filter by status
// - dateFrom, dateTo: filter by createdAt
// - page, limit

// PATCH /api/admin/lesson-plans/[id]/status
// Body: { status: "UPLOADED" | "PARSED" | "REVIEWED" | "COMPLETED" }
// - Admin can change any status

// DELETE /api/admin/lesson-plans/[id]
// - Hard delete (permanent removal)
// - Cascade delete: sections, versions, reviewResults
```

### Frontend Pages Cần Tạo

**User Pages:**
- `/lesson-plans` - List user's lesson plans
  - Upload button
  - Status filter
  - Edit/Delete buttons
  - View details link

- `/lesson-plans/[id]/edit` - Edit lesson plan metadata
  - Title, Subject, Grade Level, School Year
  - Back button
  - Save button

**Admin Pages:**
- `/admin/lesson-plans` - Manage all lesson plans
  - Back button ← Quay lại
  - Filter by user, status, date
  - Search
  - View/Edit/Delete actions
  - Stats cards: Total, By Status

---

## 🎫 2. Licenses (License Keys)

### API Endpoints Cần Tạo

#### A. License CRUD (`/api/admin/licenses/route.ts`)

```typescript
// GET /api/admin/licenses - List all licenses
// Query params:
// - status: UNUSED, ACTIVATED, EXPIRED, REVOKED
// - search: code
// - page, limit
// Returns: licenses with activatedBy user info

// POST /api/admin/licenses - Generate licenses
// Body: {
//   count: number,  // Generate multiple at once
//   durationDays: number,  // 30, 90, 365
//   prefix?: string  // Optional code prefix
// }
// Returns: generated license codes

// PATCH /api/admin/licenses/[id]
// Body: { status: "REVOKED", durationDays: 90 }
// - Update license

// DELETE /api/admin/licenses/[id]
// - Delete license (unused only)
```

#### B. License Activation (`/api/licenses/activate/route.ts`)

```typescript
// POST /api/licenses/activate
// Body: { code: string }
// - Validate code exists & unused
// - Check if user already has active license
// - Activate license
// - Update user.licenseExpiresAt
// Returns: { success, expiresAt }
```

#### C. License Check (`/api/licenses/check/route.ts`)

```typescript
// GET /api/licenses/check
// - Check current user's license status
// - Returns: { hasLicense, expiresAt, daysRemaining, isExpired }
```

### Frontend Pages

**User Pages:**
- `/licenses/activate` - Activate license key
  - Input field for code
  - Validate button
  - Show expiry date after activation

- `/profile` - Add license section
  - Current license status
  - Expiry date
  - Activate new license button

**Admin Pages:**
- `/admin/licenses` - License management
  - Back button ← Quay lại
  - Generate licenses button
  - Bulk generate modal (count, duration)
  - Filter by status
  - Search by code
  - Stats: Total, Unused, Activated, Expired
  - Actions: Revoke, Delete, View user

- `/admin/licenses/generate` - Bulk generator
  - Form: quantity, duration, prefix
  - Generate button
  - Download CSV of generated codes
  - Copy all codes

---

## 📝 3. Exams (Đề thi)

### API Endpoints Cần Tạo

#### A. Exam CRUD (`/api/admin/exams/route.ts`)

```typescript
// GET /api/admin/exams - List all exams
// Query params:
// - isPublished: true/false
// - categoryId: filter by category
// - search: title
// - page, limit

// POST /api/admin/exams
// Body: {
//   title: string,
//   description?: string,
//   categoryId?: string,
//   timeLimit: number,  // seconds
//   isPublished: boolean,
//   matrix?: Json,  // Auto-generate structure
//   questionIds?: string[]  // Manual selection
// }

// PATCH /api/admin/exams/[id]
// Body: { title, description, timeLimit, isPublished, categoryId }

// DELETE /api/admin/exams/[id]
// - Check if has attempts
// - If has attempts: soft delete or prevent
// - Cascade delete ExamQuestion relations
```

#### B. Exam Questions (`/api/admin/exams/[id]/questions/route.ts`)

```typescript
// GET /api/admin/exams/[id]/questions
// - Get all questions in exam with order

// POST /api/admin/exams/[id]/questions
// Body: { questionIds: string[] }
// - Add questions to exam
// - Auto-assign sortOrder

// PATCH /api/admin/exams/[id]/questions/reorder
// Body: { questionOrders: [{ questionId, sortOrder }] }
// - Reorder questions

// DELETE /api/admin/exams/[id]/questions/[questionId]
// - Remove question from exam
```

#### C. Exam Publishing (`/api/admin/exams/[id]/publish/route.ts`)

```typescript
// POST /api/admin/exams/[id]/publish
// - Validate: has questions, has title, has timeLimit
// - Set isPublished = true
// - Returns: { success, exam }

// POST /api/admin/exams/[id]/unpublish
// - Set isPublished = false
```

#### D. User Exam List (`/api/exams/route.ts`) - Already exists?

```typescript
// GET /api/exams - List published exams for users
// - Only isPublished = true
// - Include: category, question count
// - Filter by category
```

### Frontend Pages

**User Pages:**
- `/exams` - List available exams (already exists?)
  - Filter by category
  - Show: title, questions count, time limit
  - Start exam button

**Admin Pages:**
- `/admin/exams` - Exam management
  - Back button ← Quay lại
  - Create exam button
  - Filter: Published/Draft/All
  - Search by title
  - Stats: Total, Published, Draft, Total Attempts
  - Actions: Edit, Publish/Unpublish, Questions, Delete
  - Table: Title, Category, Questions, Time, Status, Attempts

- `/admin/exams/create` - Create new exam
  - Back button
  - Form: Title, Description, Category, Time Limit
  - Question selection:
    - Option 1: Auto-generate from matrix
    - Option 2: Manual select from question bank
  - Preview questions
  - Save as draft or Publish

- `/admin/exams/[id]/edit` - Edit exam
  - Back button
  - Same form as create
  - Can't edit if has attempts (show warning)

- `/admin/exams/[id]/questions` - Manage exam questions
  - Back button
  - Drag-drop reorder questions
  - Add questions button (open selector modal)
  - Remove question button
  - Preview each question
  - Save order button

---

## 🎯 Summary: APIs to Create

### Lesson Plans:
- ✅ Upload already exists
- ❌ GET /api/lesson-plans - List
- ❌ GET /api/lesson-plans/[id] - Details
- ❌ PATCH /api/lesson-plans/[id] - Update
- ❌ DELETE /api/lesson-plans/[id] - Delete
- ❌ GET /api/admin/lesson-plans - Admin list
- ❌ DELETE /api/admin/lesson-plans/[id] - Hard delete

### Licenses:
- ❌ GET /api/admin/licenses - List
- ❌ POST /api/admin/licenses - Generate
- ❌ PATCH /api/admin/licenses/[id] - Update
- ❌ DELETE /api/admin/licenses/[id] - Delete
- ❌ POST /api/licenses/activate - User activation
- ❌ GET /api/licenses/check - Check status

### Exams:
- ❌ GET /api/admin/exams - Admin list
- ❌ POST /api/admin/exams - Create
- ❌ PATCH /api/admin/exams/[id] - Update
- ❌ DELETE /api/admin/exams/[id] - Delete
- ❌ GET /api/admin/exams/[id]/questions - Question management
- ❌ POST /api/admin/exams/[id]/questions - Add questions
- ❌ PATCH /api/admin/exams/[id]/questions/reorder - Reorder
- ❌ DELETE /api/admin/exams/[id]/questions/[questionId] - Remove
- ❌ POST /api/admin/exams/[id]/publish - Publish
- ❌ POST /api/admin/exams/[id]/unpublish - Unpublish

---

## 🎨 UI Components Cần Tạo

### Common Components:
1. **DataTable** - Reusable table với:
   - Pagination
   - Search
   - Filters
   - Actions column
   - Sort
   - Selection (for bulk actions)

2. **ConfirmDialog** - Confirmation modal:
   - Title, message
   - Yes/No buttons
   - Danger variant (for delete)

3. **BackButton** - Consistent back button:
   ```tsx
   <button onClick={() => router.back()}>
     ← Quay lại
   </button>
   ```

4. **StatsCard** - Reusable stats display:
   - Label, value, icon
   - Trend indicator (optional)
   - Color variants

5. **FormModal** - Modal với form:
   - Title, form fields
   - Submit/Cancel buttons
   - Loading state
   - Error display

---

## 📋 Implementation Priority

### High Priority:
1. **License Management** (Admin needs this)
   - Generate licenses
   - User activation
   - Check status

2. **Lesson Plan CRUD** (Core feature)
   - List, Edit, Delete for users
   - Admin management

### Medium Priority:
3. **Exam Management** (If being used)
   - Admin CRUD
   - Question management
   - Publish/Unpublish

### Low Priority:
4. **Advanced Features**
   - Bulk operations
   - Export CSV
   - Analytics dashboards

---

## 🔒 Permission Matrix

| Resource | User Actions | Admin Actions |
|----------|-------------|---------------|
| Lesson Plans | Upload, View Own, Edit Own, Delete Own | View All, Edit All, Delete All (hard) |
| Licenses | Activate, Check Own | Generate, List All, Revoke, Delete |
| Exams | View Published, Take Exam | CRUD All, Manage Questions, Publish |
| Questions | View in Exam | CRUD All, Categorize |
| Categories | View All | CRUD All |

---

## 💡 Next Steps

1. Create common UI components (DataTable, ConfirmDialog, etc.)
2. Implement License management first (high value, low complexity)
3. Add Lesson Plan CRUD (already have upload, just need list/edit/delete)
4. Implement Exam management (if needed by client)
5. Add bulk operations and advanced features

**Total estimated effort**: 
- Licenses: 4-6 hours
- Lesson Plans CRUD: 3-4 hours  
- Exams Management: 6-8 hours
- UI Components: 2-3 hours

**Total: ~15-21 hours** for complete CRUD on all three modules.
