-- CreateEnum
CREATE TYPE "CollaboratorRole" AS ENUM ('VIEWER', 'EDITOR');

-- CreateTable
CREATE TABLE "LessonPlanCollaborator" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "CollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "addedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlanCollaborator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonPlanCollaborator_lessonPlanId_idx" ON "LessonPlanCollaborator"("lessonPlanId");

-- CreateIndex
CREATE INDEX "LessonPlanCollaborator_userId_idx" ON "LessonPlanCollaborator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlanCollaborator_lessonPlanId_userId_key" ON "LessonPlanCollaborator"("lessonPlanId", "userId");

-- AddForeignKey
ALTER TABLE "LessonPlanCollaborator" ADD CONSTRAINT "LessonPlanCollaborator_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanCollaborator" ADD CONSTRAINT "LessonPlanCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanCollaborator" ADD CONSTRAINT "LessonPlanCollaborator_addedBy_fkey" FOREIGN KEY ("addedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
