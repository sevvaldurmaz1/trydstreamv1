-- ─────────────────────────────────────────────────────────────────
-- Traydstream – Initial Database Schema
-- V1__init.sql
-- ─────────────────────────────────────────────────────────────────

-- ── Roles ──────────────────────────────────────────────────────
CREATE TABLE roles (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Users ──────────────────────────────────────────────────────
CREATE TABLE users (
    id           BIGSERIAL PRIMARY KEY,
    email        VARCHAR(255) NOT NULL UNIQUE,
    password     VARCHAR(255) NOT NULL,
    first_name   VARCHAR(100) NOT NULL,
    last_name    VARCHAR(100) NOT NULL,
    role         VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ── Document Types ─────────────────────────────────────────────
CREATE TABLE document_types (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    code        VARCHAR(20) NOT NULL UNIQUE,
    description VARCHAR(500),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── Documents ──────────────────────────────────────────────────
CREATE TABLE documents (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type_id     BIGINT REFERENCES document_types(id),
    file_name            VARCHAR(500) NOT NULL,
    file_path            VARCHAR(1000) NOT NULL,
    file_size            BIGINT NOT NULL,
    mime_type            VARCHAR(100) NOT NULL,
    status               VARCHAR(50) NOT NULL DEFAULT 'UPLOADED',
    extracted_field_count INT DEFAULT 0,
    uploaded_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at         TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_documents_user_id   ON documents(user_id);
CREATE INDEX idx_documents_status    ON documents(status);
CREATE INDEX idx_documents_uploaded  ON documents(uploaded_at DESC);

-- ── Extracted Fields ───────────────────────────────────────────
CREATE TABLE extracted_fields (
    id               BIGSERIAL PRIMARY KEY,
    document_id      BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    field_name       VARCHAR(100) NOT NULL,
    field_value      TEXT,
    confidence_score DECIMAL(5,4) DEFAULT 0,
    is_validated     BOOLEAN DEFAULT FALSE,
    is_corrected     BOOLEAN DEFAULT FALSE,
    corrected_value  TEXT,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_extracted_fields_document_id ON extracted_fields(document_id);

-- ── Validation Results ─────────────────────────────────────────
CREATE TABLE validation_results (
    id               BIGSERIAL PRIMARY KEY,
    document_id      BIGINT NOT NULL UNIQUE REFERENCES documents(id) ON DELETE CASCADE,
    overall_status   VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    confidence_score INTEGER DEFAULT 0,
    validated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes            TEXT
);

-- ── Validation Issues ──────────────────────────────────────────
CREATE TABLE validation_issues (
    id                   BIGSERIAL PRIMARY KEY,
    validation_result_id BIGINT NOT NULL REFERENCES validation_results(id) ON DELETE CASCADE,
    issue_type           VARCHAR(100) NOT NULL,
    severity             VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    field_name           VARCHAR(100),
    description          TEXT NOT NULL,
    is_resolved          BOOLEAN DEFAULT FALSE,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_validation_issues_result_id ON validation_issues(validation_result_id);

-- ── Audit Logs ─────────────────────────────────────────────────
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id),
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id   BIGINT,
    old_value   TEXT,
    new_value   TEXT,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ── Notifications ──────────────────────────────────────────────
CREATE TABLE notifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    type       VARCHAR(50) NOT NULL DEFAULT 'INFO',
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id  ON notifications(user_id);
CREATE INDEX idx_notifications_is_read  ON notifications(is_read);

-- ── Seed Data ──────────────────────────────────────────────────

-- Document Types
INSERT INTO document_types (name, code, description) VALUES
    ('Bill of Lading',       'BOL',  'Shipping document issued by carrier'),
    ('Commercial Invoice',   'CI',   'Invoice for international trade'),
    ('Letter of Credit',     'LC',   'Bank guarantee for payment'),
    ('Packing List',         'PL',   'Detailed list of shipped goods'),
    ('Certificate of Origin','COO',  'Document certifying country of production'),
    ('Insurance Certificate','INS',  'Cargo insurance documentation'),
    ('Airway Bill',          'AWB',  'Air freight shipping document');

-- Default Roles
INSERT INTO roles (name, description) VALUES
    ('ADMIN',        'Full system access'),
    ('BANK_OFFICER', 'Bank operations and document processing'),
    ('REVIEWER',     'Document review and validation'),
    ('CUSTOMER',     'Document upload and tracking');

-- Seed Users (passwords are BCrypt of 'Admin123!' and 'Officer123!')
INSERT INTO users (email, password, first_name, last_name, role) VALUES
    ('admin@traydstream.com',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxA6pnCe',
     'System', 'Admin', 'ADMIN'),
    ('officer@traydstream.com',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxA6pnCe',
     'Bank', 'Officer', 'BANK_OFFICER'),
    ('reviewer@traydstream.com',
     '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6hsxA6pnCe',
     'Doc', 'Reviewer', 'REVIEWER');
