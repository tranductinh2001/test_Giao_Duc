-- Fix TextbookIndexJob missing columns
-- This script adds the missing chaptersFound column to the TextbookIndexJob table

ALTER TABLE "TextbookIndexJob" ADD COLUMN IF NOT EXISTS "chaptersFound" INTEGER DEFAULT 0;
