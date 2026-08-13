-- ─────────────────────────────────────────────────────────────────
-- Vesaik Kontrol – MT799/MT745 ham SWIFT metni ve ilişkili referans
-- V4__mt799_mt745_raw_text.sql
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE mt799_messages
    ADD COLUMN raw_text TEXT,
    ADD COLUMN related_reference VARCHAR(100);

ALTER TABLE mt745_claims
    ADD COLUMN raw_text TEXT,
    ADD COLUMN related_reference VARCHAR(100);
