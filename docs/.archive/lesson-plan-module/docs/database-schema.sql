-- ============================================================================
-- Lesson Plan Review Module - Database Schema
-- ============================================================================
-- Version: 1.0
-- Database: MySQL 8.0+
-- Description: Complete schema for AI-powered lesson plan review system
-- ============================================================================

-- ============================================================================
-- 1. LESSON PLAN MANAGEMENT
-- ============================================================================

-- Main lesson plan entity
CREATE TABLE lesson_plans (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    grade_level VARCHAR(50),
    school_year VARCHAR(20),
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status ENUM('UPLOADED', 'PARSING', 'PARSED', 'REVIEWING', 'REVIEWED', 'EDITING', 'COMPLETED', 'FAILED') NOT NULL DEFAULT 'UPLOADED',
    current_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,

    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_deleted_at (deleted_at),

    CONSTRAINT fk_lesson_plans_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Version history for lesson plans
CREATE TABLE lesson_plan_versions (
    id CHAR(36) PRIMARY KEY,
    lesson_plan_id CHAR(36) NOT NULL,
    version_number INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    change_summary TEXT,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE KEY uk_lesson_plan_version (lesson_plan_id, version_number),
    INDEX idx_lesson_plan_id (lesson_plan_id),

    CONSTRAINT fk_versions_lesson_plan FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_versions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Parsed sections from document
CREATE TABLE lesson_plan_sections (
    id CHAR(36) PRIMARY KEY,
    lesson_plan_id CHAR(36) NOT NULL,
    version_number INT NOT NULL,
    section_type VARCHAR(100) NOT NULL, -- 'HEADER', 'OBJECTIVES', 'PREPARATION', 'TEACHING_PROCESS', 'EVALUATION', 'APPENDIX'
    section_title VARCHAR(255),
    section_order INT NOT NULL,
    content_type ENUM('TEXT', 'TABLE', 'LIST', 'IMAGE') NOT NULL DEFAULT 'TEXT',
    raw_content MEDIUMTEXT NOT NULL,
    parsed_content JSON, -- Structured content for easier processing
    word_count INT,
    char_count INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_lesson_plan_id (lesson_plan_id),
    INDEX idx_section_type (section_type),
    INDEX idx_section_order (section_order),

    CONSTRAINT fk_sections_lesson_plan FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. REVIEW RULES MANAGEMENT
-- ============================================================================

-- Review rule sets (e.g., Công văn 5512, 958, custom)
CREATE TABLE review_rule_sets (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    code VARCHAR(100) UNIQUE NOT NULL, -- 'CV5512', 'CV958', 'CUSTOM_01'
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    scope VARCHAR(255), -- 'GENERAL', 'PRIMARY', 'SECONDARY', 'HIGH_SCHOOL'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_by CHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_code (code),
    INDEX idx_is_active (is_active),
    INDEX idx_is_default (is_default),

    CONSTRAINT fk_rule_sets_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Individual review rules
CREATE TABLE review_rules (
    id CHAR(36) PRIMARY KEY,
    rule_set_id CHAR(36) NOT NULL,
    rule_code VARCHAR(100) NOT NULL,
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'STRUCTURE', 'CONTENT', 'FORMAT', 'PEDAGOGY', 'ASSESSMENT'
    severity ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL DEFAULT 'WARNING',
    priority INT NOT NULL DEFAULT 0,
    applicable_sections JSON, -- Array of section types this rule applies to
    ai_prompt TEXT NOT NULL, -- Prompt for Gemini to check this rule
    validation_criteria JSON, -- Structured criteria for validation
    correct_examples TEXT, -- Examples of correct implementation
    incorrect_examples TEXT, -- Examples of violations
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uk_rule_code (rule_set_id, rule_code),
    INDEX idx_rule_set_id (rule_set_id),
    INDEX idx_category (category),
    INDEX idx_severity (severity),
    INDEX idx_priority (priority),
    INDEX idx_is_active (is_active),

    CONSTRAINT fk_rules_rule_set FOREIGN KEY (rule_set_id) REFERENCES review_rule_sets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. AI PROCESSING
-- ============================================================================

-- AI review requests log
CREATE TABLE ai_requests (
    id CHAR(36) PRIMARY KEY,
    lesson_plan_id CHAR(36) NOT NULL,
    section_id CHAR(36),
    rule_set_id CHAR(36) NOT NULL,
    request_type ENUM('PARSE', 'REVIEW', 'ANNOTATE', 'SUGGEST') NOT NULL,
    prompt TEXT NOT NULL,
    input_tokens INT,
    model_name VARCHAR(100) NOT NULL DEFAULT 'gemini-1.5-pro',
    status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CACHED') NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    cache_key VARCHAR(64), -- MD5 hash for caching
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,

    INDEX idx_lesson_plan_id (lesson_plan_id),
    INDEX idx_section_id (section_id),
    INDEX idx_status (status),
    INDEX idx_cache_key (cache_key),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_ai_requests_lesson_plan FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_requests_section FOREIGN KEY (section_id) REFERENCES lesson_plan_sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_ai_requests_rule_set FOREIGN KEY (rule_set_id) REFERENCES review_rule_sets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- AI responses
CREATE TABLE ai_responses (
    id CHAR(36) PRIMARY KEY,
    request_id CHAR(36) NOT NULL,
    response_data JSON NOT NULL, -- Structured AI response
    output_tokens INT,
    processing_time_ms INT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_request_id (request_id),

    CONSTRAINT fk_ai_responses_request FOREIGN KEY (request_id) REFERENCES ai_requests(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. REVIEW RESULTS
-- ============================================================================

-- Overall review results per lesson plan
CREATE TABLE review_results (
    id CHAR(36) PRIMARY KEY,
    lesson_plan_id CHAR(36) NOT NULL,
    rule_set_id CHAR(36) NOT NULL,
    overall_score DECIMAL(5,2), -- 0-100
    total_issues INT NOT NULL DEFAULT 0,
    critical_issues INT NOT NULL DEFAULT 0,
    error_issues INT NOT NULL DEFAULT 0,
    warning_issues INT NOT NULL DEFAULT 0,
    info_issues INT NOT NULL DEFAULT 0,
    strengths JSON, -- Array of strength descriptions
    weaknesses JSON, -- Array of weakness descriptions
    missing_content JSON, -- Array of missing content items
    suggestions JSON, -- Array of improvement suggestions
    status ENUM('DRAFT', 'COMPLETED', 'ACCEPTED', 'REJECTED') NOT NULL DEFAULT 'DRAFT',
    reviewed_by CHAR(36),
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_lesson_plan_id (lesson_plan_id),
    INDEX idx_rule_set_id (rule_set_id),
    INDEX idx_status (status),
    INDEX idx_overall_score (overall_score),

    CONSTRAINT fk_review_results_lesson_plan FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_results_rule_set FOREIGN KEY (rule_set_id) REFERENCES review_rule_sets(id) ON DELETE CASCADE,
    CONSTRAINT fk_review_results_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Detailed annotations/comments on specific parts
CREATE TABLE annotations (
    id CHAR(36) PRIMARY KEY,
    review_result_id CHAR(36) NOT NULL,
    section_id CHAR(36) NOT NULL,
    rule_id CHAR(36),
    annotation_type ENUM('COMMENT', 'WARNING', 'SUGGESTION', 'ERROR', 'IMPROVEMENT') NOT NULL,
    severity ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    start_position INT NOT NULL, -- Character position in section content
    end_position INT NOT NULL,
    highlighted_text TEXT, -- The specific text being annotated
    message TEXT NOT NULL,
    explanation TEXT,
    suggestion TEXT, -- Suggested correction/improvement
    proposed_content TEXT, -- AI-generated replacement content
    status ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'RESOLVED') NOT NULL DEFAULT 'PENDING',
    resolved_by CHAR(36),
    resolved_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_review_result_id (review_result_id),
    INDEX idx_section_id (section_id),
    INDEX idx_rule_id (rule_id),
    INDEX idx_annotation_type (annotation_type),
    INDEX idx_severity (severity),
    INDEX idx_status (status),

    CONSTRAINT fk_annotations_review_result FOREIGN KEY (review_result_id) REFERENCES review_results(id) ON DELETE CASCADE,
    CONSTRAINT fk_annotations_section FOREIGN KEY (section_id) REFERENCES lesson_plan_sections(id) ON DELETE CASCADE,
    CONSTRAINT fk_annotations_rule FOREIGN KEY (rule_id) REFERENCES review_rules(id) ON DELETE SET NULL,
    CONSTRAINT fk_annotations_resolved_by FOREIGN KEY (resolved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. EXPORT & HISTORY
-- ============================================================================

-- Export history
CREATE TABLE export_history (
    id CHAR(36) PRIMARY KEY,
    lesson_plan_id CHAR(36) NOT NULL,
    review_result_id CHAR(36),
    export_format ENUM('DOCX', 'PDF') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    include_annotations BOOLEAN NOT NULL DEFAULT TRUE,
    include_track_changes BOOLEAN NOT NULL DEFAULT TRUE,
    exported_by CHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_lesson_plan_id (lesson_plan_id),
    INDEX idx_review_result_id (review_result_id),
    INDEX idx_exported_by (exported_by),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_export_lesson_plan FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_export_review_result FOREIGN KEY (review_result_id) REFERENCES review_results(id) ON DELETE SET NULL,
    CONSTRAINT fk_export_exported_by FOREIGN KEY (exported_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review activity history
CREATE TABLE review_history (
    id CHAR(36) PRIMARY KEY,
    lesson_plan_id CHAR(36) NOT NULL,
    review_result_id CHAR(36),
    action_type ENUM('CREATED', 'PARSED', 'REVIEWED', 'EDITED', 'ANNOTATION_ADDED', 'ANNOTATION_ACCEPTED', 'ANNOTATION_REJECTED', 'EXPORTED', 'COMPLETED') NOT NULL,
    action_data JSON, -- Additional context about the action
    performed_by CHAR(36) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_lesson_plan_id (lesson_plan_id),
    INDEX idx_review_result_id (review_result_id),
    INDEX idx_action_type (action_type),
    INDEX idx_performed_by (performed_by),
    INDEX idx_created_at (created_at),

    CONSTRAINT fk_history_lesson_plan FOREIGN KEY (lesson_plan_id) REFERENCES lesson_plans(id) ON DELETE CASCADE,
    CONSTRAINT fk_history_review_result FOREIGN KEY (review_result_id) REFERENCES review_results(id) ON DELETE SET NULL,
    CONSTRAINT fk_history_performed_by FOREIGN KEY (performed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. SEED DATA
-- ============================================================================

-- Insert default rule set (Công văn 5512)
INSERT INTO review_rule_sets (id, name, description, code, version, scope, is_active, is_default, created_by)
VALUES (
    UUID(),
    'Công văn 5512/BGDĐT-GDTrH',
    'Hướng dẫn soạn giáo án môn học theo Chương trình Giáo dục phổ thông 2018',
    'CV5512',
    '1.0',
    'GENERAL',
    TRUE,
    TRUE,
    (SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1)
);

-- Note: Actual review rules would be inserted separately via admin interface or migration scripts
-- This ensures flexibility and avoids hardcoding specific pedagogical criteria

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
