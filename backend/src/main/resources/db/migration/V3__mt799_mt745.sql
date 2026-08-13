-- ─────────────────────────────────────────────────────────────────
-- Vesaik Kontrol – MT 799 (Serbest Format) ve MT 745 (Rambursman) Şeması
-- V3__mt799_mt745.sql
-- ─────────────────────────────────────────────────────────────────

-- MT 799: Serbest format bankalar arası mesajlar
CREATE TABLE mt799_messages (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt700_id        BIGINT REFERENCES mt_messages(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    sender_bic      VARCHAR(20),
    receiver_bic    VARCHAR(20),
    subject         VARCHAR(255),
    message_text    TEXT NOT NULL,
    direction       VARCHAR(10) NOT NULL DEFAULT 'OUTGOING', -- INCOMING / OUTGOING
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mt799_user    ON mt799_messages(user_id);
CREATE INDEX idx_mt799_mt700   ON mt799_messages(mt700_id);

-- MT 745: Rambursman talepleri
CREATE TABLE mt745_claims (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt700_id        BIGINT REFERENCES mt_messages(id) ON DELETE SET NULL,
    reference_number VARCHAR(100),
    claiming_bank   VARCHAR(255),
    reimbursing_bank VARCHAR(255),
    currency        VARCHAR(10),
    amount          DECIMAL(18,2),
    value_date      DATE,
    status          VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING / APPROVED / REJECTED / PAID
    notes           TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mt745_user    ON mt745_claims(user_id);
CREATE INDEX idx_mt745_mt700   ON mt745_claims(mt700_id);
