-- Add performance indexes for frequently queried fields

-- ExamAttempt: Query by user + status frequently in getUserAttempts
CREATE INDEX IF NOT EXISTS "ExamAttempt_userId_status_idx" ON "ExamAttempt"("userId", "status");

-- ExamAttempt: Query by createdAt for time-based filtering
CREATE INDEX IF NOT EXISTS "ExamAttempt_startedAt_idx" ON "ExamAttempt"("startedAt");

-- Bookmark: Query all bookmarks for a user (already has unique constraint but index helps)
CREATE INDEX IF NOT EXISTS "Bookmark_userId_idx" ON "Bookmark"("userId");

-- UserWrongAnswer: Query by userId + wrongCount for review priority
CREATE INDEX IF NOT EXISTS "UserWrongAnswer_userId_wrongCount_idx" ON "UserWrongAnswer"("userId", "wrongCount");

-- Question: Composite index for category + difficulty filtering
CREATE INDEX IF NOT EXISTS "Question_categoryId_difficulty_idx" ON "Question"("categoryId", "difficulty");

-- Category: Query by parentId for hierarchy navigation
CREATE INDEX IF NOT EXISTS "Category_parentId_idx" ON "Category"("parentId");

-- Exam: Query published exams by category
CREATE INDEX IF NOT EXISTS "Exam_isPublished_categoryId_idx" ON "Exam"("isPublished", "categoryId");

-- Exam: Query custom exams by user
CREATE INDEX IF NOT EXISTS "Exam_userId_isCustom_idx" ON "Exam"("userId", "isCustom");
