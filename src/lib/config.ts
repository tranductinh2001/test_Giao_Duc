/**
 * Unified Configuration - Single Source of Truth
 *
 * All configuration should be imported from this file.
 * DO NOT use process.env directly in other files.
 */

import { z } from 'zod';

// ====================
// Environment Schemas
// ====================

const aiSchema = z.object({
  provider: z.string().default('beeknoee'),
  model: z.string().default('gemini-3.1-flash-lite'),
  apiKey: z.string().default(''),
  baseUrl: z.string().default('https://platform.beeknoee.com'),
  visionModel: z.string().default('google/gemini-2.5-flash-lite'),
  timeout: z.coerce.number().default(120000),
});

const dbSchema = z.object({
  url: z.string().default(''),
  log: z.array(z.string()).default(['error']),
});

const uploadSchema = z.object({
  maxDocSize: z.coerce.number().default(10 * 1024 * 1024),
  maxPdfSize: z.coerce.number().default(10 * 1024 * 1024),
  maxImageSize: z.coerce.number().default(5 * 1024 * 1024),
  maxImportSize: z.coerce.number().default(50 * 1024 * 1024),
  allowedTypes: z.array(z.string()).default([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/webp',
  ]),
});

const authSchema = z.object({
  url: z.string().default('http://localhost:3001'),
  secret: z.string().default(''),
  googleClientId: z.string().default(''),
  googleClientSecret: z.string().default(''),
});

const emailSchema = z.object({
  apiKey: z.string().default(''),
  from: z.string().default('noreply@example.com'),
});

const rateLimitSchema = z.object({
  redisUrl: z.string().default(''),
  redisToken: z.string().default(''),
  workflowLimit: z.coerce.number().default(10),
  workflowWindow: z.coerce.number().default(60),
  uploadLimit: z.coerce.number().default(5),
  uploadWindow: z.coerce.number().default(60),
  apiLimit: z.coerce.number().default(100),
  apiWindow: z.coerce.number().default(60),
});

// ====================
// Config Factory
// ====================

function createConfig() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  return {
    ai: aiSchema.parse({
      provider: process.env.AI_PROVIDER,
      model: process.env.AI_MODEL,
      apiKey: process.env.BEE_API_KEY || process.env.GEMINI_API_KEY || '',
      baseUrl: process.env.BEE_BASE_URL,
      visionModel: process.env.BRIGHTONE_VISION_MODEL,
      timeout: process.env.AI_TIMEOUT,
    }),

    db: dbSchema.parse({
      url: process.env.DATABASE_URL,
      log: nodeEnv === 'development' ? ['error', 'warn'] : ['error'],
    }),

    upload: uploadSchema.parse({
      maxDocSize: process.env.MAX_DOC_SIZE_MB ? parseInt(process.env.MAX_DOC_SIZE_MB) * 1024 * 1024 : undefined,
      maxPdfSize: process.env.MAX_PDF_SIZE_MB ? parseInt(process.env.MAX_PDF_SIZE_MB) * 1024 * 1024 : undefined,
      maxImageSize: process.env.MAX_IMAGE_SIZE_MB ? parseInt(process.env.MAX_IMAGE_SIZE_MB) * 1024 * 1024 : undefined,
      maxImportSize: process.env.MAX_IMPORT_SIZE_MB ? parseInt(process.env.MAX_IMPORT_SIZE_MB) * 1024 * 1024 : undefined,
    }),

    auth: authSchema.parse({
      url: process.env.NEXTAUTH_URL,
      secret: process.env.NEXTAUTH_SECRET,
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    email: emailSchema.parse({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    }),

    rateLimit: rateLimitSchema.parse({
      redisUrl: process.env.UPSTASH_REDIS_REST_URL,
      redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
      workflowLimit: process.env.RATE_LIMIT_WORKFLOW,
      workflowWindow: process.env.RATE_LIMIT_WORKFLOW_WINDOW,
      uploadLimit: process.env.RATE_LIMIT_UPLOAD,
      uploadWindow: process.env.RATE_LIMIT_UPLOAD_WINDOW,
      apiLimit: process.env.RATE_LIMIT_API,
      apiWindow: process.env.RATE_LIMIT_API_WINDOW,
    }),

    env: nodeEnv,
    isProduction: nodeEnv === 'production',
    isDevelopment: nodeEnv === 'development',
  };
}

// ====================
// Singleton
// ====================

export const config = createConfig();

export type Config = typeof config;
export type AIConfig = z.infer<typeof aiSchema>;
export type DBConfig = z.infer<typeof dbSchema>;
export type UploadConfig = z.infer<typeof uploadSchema>;
export type AuthConfig = z.infer<typeof authSchema>;
export type EmailConfig = z.infer<typeof emailSchema>;
export type RateLimitConfig = z.infer<typeof rateLimitSchema>;

// ====================
// Convenience Exports
// ====================

export const aiConfig = config.ai;
export const dbConfig = config.db;
export const uploadConfig = config.upload;
export const authConfig = config.auth;
export const emailConfig = config.email;
export const rateLimitConfig = config.rateLimit;

export const isProduction = config.isProduction;
export const isDevelopment = config.isDevelopment;

export type AIConfigSettings = {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  visionModel: string;
  timeout: number;
};

export function getAIConfig(): AIConfigSettings {
  const apiKey =
    process.env.BEE_API_KEY ||
    process.env.BEEKNOEE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    '';

  const baseUrl =
    process.env.BEE_BASE_URL ||
    process.env.BEEKNOEE_BASE_URL ||
    'https://platform.beeknoee.com/api/v1';

  const model = process.env.AI_MODEL || 'gemini-2.5-flash-lite';
  const visionModel = process.env.VISION_MODEL || process.env.BRIGHTONE_VISION_MODEL || 'google/gemini-2.5-flash-lite';
  const timeout = parseInt(process.env.AI_TIMEOUT || '120000', 10);

  return {
    provider: 'beeknoee',
    apiKey,
    baseUrl,
    model,
    visionModel,
    timeout,
  };
}
