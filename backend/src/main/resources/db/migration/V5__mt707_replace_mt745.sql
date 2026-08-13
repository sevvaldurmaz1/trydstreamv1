-- ─────────────────────────────────────────────────────────────────
-- Vesaik Kontrol – MT745'i MT707 (Akreditif Değişiklik Bildirimi) ile değiştir
-- V5__mt707_replace_mt745.sql
-- ─────────────────────────────────────────────────────────────────

DROP TABLE IF EXISTS mt745_claims;

-- MT 707: Akreditif değişiklik bildirimi (amendment)
CREATE TABLE mt707_amendments (
    id                      BIGSERIAL PRIMARY KEY,
    user_id                 BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt700_id                BIGINT REFERENCES mt_messages(id) ON DELETE SET NULL,
    reference_number        VARCHAR(100),
    related_reference       VARCHAR(100),
    raw_text                TEXT NOT NULL,
    amendment_number        VARCHAR(50),
    amendment_date          DATE,
    new_expiry_date         DATE,
    currency                VARCHAR(10),
    amount_increase         DECIMAL(18,2),
    amount_decrease         DECIMAL(18,2),
    new_amount              DECIMAL(18,2),
    new_latest_shipment_date DATE,
    narrative               TEXT,
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mt707_user  ON mt707_amendments(user_id);
CREATE INDEX idx_mt707_mt700 ON mt707_amendments(mt700_id);
