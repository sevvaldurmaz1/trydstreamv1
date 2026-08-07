-- ─────────────────────────────────────────────────────────────────
-- Vesaik Kontrol – MT Mesajı ve Aykırılık Raporlama Şeması
-- V2__mt_discrepancy.sql
-- ─────────────────────────────────────────────────────────────────

-- ── Ek Belge Tipleri ──────────────────────────────────────────────
INSERT INTO document_types (name, code, description) VALUES
    ('SWIFT MT 700', 'MT700', 'Akreditif açılış SWIFT mesajı'),
    ('Konşimento', 'BL', 'Deniz taşımacılığı konşimentosu'),
    ('Hava Konşimentosu', 'AWB', 'Hava kargo taşıma belgesi'),
    ('CMR Belgesi', 'CMR', 'Karayolu taşımacılığı belgesi'),
    ('Sigorta Sertifikası', 'INS_CERT', 'Yük sigorta sertifikası / poliçesi'),
    ('Menşei Şehadetnamesi', 'COO_CERT', 'Menşei ülkesi belgesi'),
    ('Koli Listesi', 'PACK_LIST', 'Paketleme/koli listesi'),
    ('Çeki Listesi', 'WEIGHT_LIST', 'Ağırlık listesi'),
    ('ATR Belgesi', 'ATR', 'ATR dolaşım belgesi'),
    ('EUR1 Belgesi', 'EUR1', 'EUR.1 dolaşım sertifikası'),
    ('Bitki Sağlık Sertifikası', 'PHYTO', 'Fitosaniter sertifikası'),
    ('Analiz Sertifikası', 'ANALYSIS', 'Analiz/muayene sertifikası'),
    ('Kalite Sertifikası', 'QUALITY', 'Kalite sertifikası'),
    ('Form A', 'FORM_A', 'GSP menşe formu A'),
    ('İhracatçı Kayıt Formu', 'REX', 'Kayıtlı ihracatçı formu')
ON CONFLICT (code) DO NOTHING;

-- ── MT Mesajları ──────────────────────────────────────────────────
CREATE TABLE mt_messages (
    id                       BIGSERIAL PRIMARY KEY,
    user_id                  BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt_type                  VARCHAR(10) NOT NULL DEFAULT 'MT700',
    reference_number         VARCHAR(100),
    raw_text                 TEXT NOT NULL,
    parsed_fields            JSONB,
    -- Ana LC alanları (hızlı sorgulama için)
    lc_expiry_date           DATE,
    lc_amount                DECIMAL(18,2),
    lc_currency              VARCHAR(10),
    applicant                TEXT,
    beneficiary              TEXT,
    goods_description        TEXT,
    documents_required       TEXT,
    latest_shipment_date     DATE,
    presentation_period_days INTEGER,
    partial_shipments        VARCHAR(20),  -- ALLOWED / NOT ALLOWED / NOT PERMITTED
    transhipment             VARCHAR(20),
    port_of_loading          VARCHAR(255),
    port_of_discharge        VARCHAR(255),
    tolerance_positive       DECIMAL(5,2),
    tolerance_negative       DECIMAL(5,2),
    applicable_rules         VARCHAR(100), -- UCP LATEST VERSION
    created_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mt_messages_user_id    ON mt_messages(user_id);
CREATE INDEX idx_mt_messages_reference  ON mt_messages(reference_number);
CREATE INDEX idx_mt_messages_created    ON mt_messages(created_at DESC);

-- ── Doğrulama Kural Kodları ───────────────────────────────────────
CREATE TABLE validation_rule_codes (
    id              BIGSERIAL PRIMARY KEY,
    code            VARCHAR(20) NOT NULL UNIQUE,
    rule_type       CHAR(1) NOT NULL CHECK (rule_type IN ('R','O')),
    condition_key   VARCHAR(10),
    document_type   VARCHAR(100),
    description_tr  TEXT NOT NULL,
    description_en  TEXT,
    severity        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    isbp_reference  VARCHAR(100),
    ucp_reference   VARCHAR(100)
);

-- ── Aykırılık Raporları ───────────────────────────────────────────
CREATE TABLE discrepancy_reports (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mt_message_id       BIGINT NOT NULL REFERENCES mt_messages(id) ON DELETE CASCADE,
    document_id         BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    overall_result      VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    total_findings      INTEGER DEFAULT 0,
    mandatory_findings  INTEGER DEFAULT 0,
    optional_findings   INTEGER DEFAULT 0,
    checked_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes               TEXT
);

CREATE INDEX idx_disc_reports_mt_id  ON discrepancy_reports(mt_message_id);
CREATE INDEX idx_disc_reports_doc_id ON discrepancy_reports(document_id);
CREATE INDEX idx_disc_reports_user   ON discrepancy_reports(user_id);

-- ── Aykırılık Bulgular ────────────────────────────────────────────
CREATE TABLE discrepancy_findings (
    id              BIGSERIAL PRIMARY KEY,
    report_id       BIGINT NOT NULL REFERENCES discrepancy_reports(id) ON DELETE CASCADE,
    rule_code       VARCHAR(20) NOT NULL,
    finding_type    CHAR(1) NOT NULL CHECK (finding_type IN ('R','O')),
    severity        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    field_name      VARCHAR(100),
    mt_value        TEXT,
    document_value  TEXT,
    description     TEXT NOT NULL,
    ai_explanation  TEXT,
    isbp_reference  VARCHAR(200),
    ucp_reference   VARCHAR(200),
    is_waived       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_disc_findings_report_id ON discrepancy_findings(report_id);

-- ── Kural Kodları Seed Verisi ─────────────────────────────────────
-- R Kodları (Zorunlu)
INSERT INTO validation_rule_codes (code, rule_type, condition_key, document_type, description_tr, description_en, severity, isbp_reference, ucp_reference) VALUES
('R1','R','K1','TUMU','Akreditif vade tarihi geçirildi','LC expiry date exceeded','HIGH','A14','UCP600 Art.6'),
('R2','R','K2','TUMU','Son yükleme tarihi geçirildi','Latest date of shipment exceeded','HIGH','B14','UCP600 Art.14'),
('R3','R','K3','TUMU','Akreditif tutarı aşıldı','LC amount exceeded','HIGH','','UCP600 Art.18'),
('R4','R','K4','TUMU','İbraz süresi aşıldı','Presentation period exceeded','HIGH','A29','UCP600 Art.14'),
('R5','R','K5','TUMU','Eksik sevkiyat tespit edildi','Under-shipment detected','HIGH','','UCP600 Art.14'),
('R6','R','K6','TUMU','Fazla sevkiyat tespit edildi','Over-shipment detected','HIGH','','UCP600 Art.14'),
('R7','R','K7','TUMU','Kısmi sevkiyata izin verilmemektedir','Partial shipment not allowed','HIGH','','UCP600 Art.31');

-- O Kodları – Genel
INSERT INTO validation_rule_codes (code, rule_type, document_type, description_tr, description_en, severity, isbp_reference, ucp_reference) VALUES
('O1','O','TUMU','Döviz birimi tutarsızlığı','Currency code mismatch','HIGH','','UCP600 Art.18'),
('O2','O','TUMU','Tarih formatı geçersiz','Invalid date format','MEDIUM','A11',''),
('O3','O','TUMU','İmza eksik veya geçersiz','Missing or invalid signature','HIGH','A35',''),
('O4','O','TUMU','Aslı belge sayısı yetersiz','Insufficient originals','HIGH','A27','UCP600 Art.17'),
('O5','O','TUMU','Belge başlığı tutarsız','Inconsistent document title','LOW','A39',''),
('O6','O','TUMU','Dil tutarsızlığı','Language inconsistency','LOW','A21',''),
('O7','O','TUMU','Düzeltme/silinti onaysız','Unauthenticated correction','MEDIUM','A7',''),
('O8','O','TUMU','Yazım hatası anlam değiştirir','Spelling error alters meaning','MEDIUM','A23','');

-- O Kodları – Fatura (Commercial Invoice)
INSERT INTO validation_rule_codes (code, rule_type, document_type, description_tr, description_en, severity, isbp_reference, ucp_reference) VALUES
('O72','O','FATURA','Mal tanımı akreditif koşullarıyla örtüşmüyor','Goods description does not match LC','HIGH','C1','UCP600 Art.18'),
('O73','O','FATURA','Fatura düzenleyicisi lehtar değil','Invoice not issued by beneficiary','HIGH','C2','UCP600 Art.18'),
('O74','O','FATURA','Fatura imzalanmamış/mühürlenmemiş','Invoice not signed/stamped as required','MEDIUM','C3',''),
('O75','O','FATURA','Ticaret odası onayı eksik','Chamber of commerce endorsement missing','MEDIUM','C4',''),
('O76','O','FATURA','Lehtar beyanı eksik','Beneficiary declaration missing','HIGH','C5',''),
('O77','O','FATURA','INCOTERMS teslim koşulu uyumsuz','INCOTERMS delivery condition mismatch','HIGH','C6','UCP600 Art.18'),
('O78','O','FATURA','Navlun tutarı ayrı gösterilmemiş','Freight not separately stated','MEDIUM','C7',''),
('O79','O','FATURA','Tutar tolerans dışında','Amount outside tolerance','HIGH','C8','UCP600 Art.18 / Art.30'),
('O80','O','FATURA','Birim fiyat gösterilmemiş','Unit price not stated','MEDIUM','C9',''),
('O81','O','FATURA','Miktar uyumsuz','Quantity mismatch','HIGH','C10',''),
('O82','O','FATURA','Sevkiyat dönemi tarihleri çakışıyor','Shipment period dates conflict','HIGH','C11',''),
('O83','O','FATURA','Sevkiyat kayıtları arasında çelişki','Conflict between shipment records','HIGH','C12',''),
('O84','O','FATURA','Başvuru sahibi adı uyumsuz','Applicant name mismatch','HIGH','C13','UCP600 Art.18'),
('O85','O','FATURA','Döviz kodu uyumsuz','Currency code mismatch with LC','HIGH','C14','UCP600 Art.18'),
('O86','O','FATURA','Ön ödeme koşulu belirtilmemiş','Prepayment condition not stated','LOW','C15',''),
('O87','O','FATURA','İskonto koşulu belirtilmemiş','Discount condition not stated','LOW','C16',''),
('O88','O','FATURA','Konsolosluk onayı eksik','Consular approval missing','MEDIUM','C17',''),
('O89','O','FATURA','Lehtar adı uyumsuz','Beneficiary name mismatch','HIGH','C18','UCP600 Art.18');

-- O Kodları – Konşimento (Bill of Lading)
INSERT INTO validation_rule_codes (code, rule_type, document_type, description_tr, description_en, severity, isbp_reference, ucp_reference) VALUES
('O40','O','KONSIMENTO','Konşimento türü uyumsuz','B/L type not as specified','HIGH','E1','UCP600 Art.20'),
('O41','O','KONSIMENTO','Yükleme limanı uyumsuz','Port of loading mismatch','HIGH','E2','UCP600 Art.20'),
('O42','O','KONSIMENTO','Tahliye limanı uyumsuz','Port of discharge mismatch','HIGH','E3','UCP600 Art.20'),
('O43','O','KONSIMENTO','Yükleme tarihi son yükleme tarihinden sonra','Shipment date after latest shipment date','HIGH','E4','UCP600 Art.20'),
('O44','O','KONSIMENTO','Taşıyıcı imzası eksik','Carrier signature missing','HIGH','E5','UCP600 Art.20'),
('O45','O','KONSIMENTO','Temiz konşimento şartı sağlanmıyor','Clean B/L condition not met','HIGH','E6','UCP600 Art.27'),
('O46','O','KONSIMENTO','Konşimento emre yazılı değil','B/L not made to order','MEDIUM','E7',''),
('O47','O','KONSIMENTO','Aktarma yasağına rağmen aktarma var','Transhipment despite prohibition','HIGH','E8','UCP600 Art.20'),
('O48','O','KONSIMENTO','Mal miktarı fatura ile uyumsuz','Goods quantity does not match invoice','HIGH','E9',''),
('O49','O','KONSIMENTO','Navlun ödeme koşulu belirtilmemiş','Freight payment condition not stated','MEDIUM','E10','UCP600 Art.20'),
('O50','O','KONSIMENTO','Notify party eksik/yanlış','Notify party missing or incorrect','MEDIUM','E11','');

-- O Kodları – Hava Konşimentosu (AWB)
INSERT INTO validation_rule_codes (code, rule_type, document_type, description_tr, description_en, severity, isbp_reference, ucp_reference) VALUES
('O60','O','AWB','Kalkış havalimanı uyumsuz','Airport of departure mismatch','HIGH','F1','UCP600 Art.23'),
('O61','O','AWB','Varış havalimanı uyumsuz','Airport of destination mismatch','HIGH','F2','UCP600 Art.23'),
('O62','O','AWB','Fiili uçuş tarihi son yükleme tarihinden sonra','Flight date after latest shipment date','HIGH','F3','UCP600 Art.23'),
('O63','O','AWB','Havayolu şirketi imzası eksik','Carrier/agent signature missing','HIGH','F4','UCP600 Art.23'),
('O64','O','AWB','Brüt ağırlık eksik','Gross weight not stated','LOW','F5','');

-- O Kodları – Sigorta (Insurance)
INSERT INTO validation_rule_codes (code, rule_type, document_type, description_tr, description_en, severity, isbp_reference, ucp_reference) VALUES
('O90','O','SIGORTA','Sigorta tutarı asgari değerin altında','Insurance amount below minimum','HIGH','I1','UCP600 Art.28'),
('O91','O','SIGORTA','Riziko kapsamı akreditif koşuluyla uyumsuz','Risk coverage does not match LC requirement','HIGH','I2','UCP600 Art.28'),
('O92','O','SIGORTA','Sigorta başlangıç tarihi yükleme tarihinden sonra','Insurance effective date after shipment date','HIGH','I3','UCP600 Art.28'),
('O93','O','SIGORTA','Döviz birimi fatura ile uyumsuz','Currency does not match invoice','HIGH','I4','UCP600 Art.28'),
('O94','O','SIGORTA','Ciro eksik (emre yazılıysa)','Endorsement missing if required','MEDIUM','I5','');

-- O Kodları – Menşei Şehadetnamesi (COO)
INSERT INTO validation_rule_codes (code, rule_type, document_type, description_tr, description_en, severity, isbp_reference, ucp_reference) VALUES
('O100','O','MENSEI','İhracatçı adı fatura ile uyumsuz','Exporter name does not match invoice','HIGH','J1',''),
('O101','O','MENSEI','Menşei ülkesi akreditif koşuluyla uyumsuz','Country of origin does not meet LC requirement','HIGH','J2',''),
('O102','O','MENSEI','Ticaret odası imzası eksik','Chamber of commerce signature missing','HIGH','J3',''),
('O103','O','MENSEI','Mal tanımı fatura ile çelişiyor','Goods description conflicts with invoice','MEDIUM','J4','');

-- O Kodları – Koli/Çeki Listesi (Packing/Weight List)
INSERT INTO validation_rule_codes (code, rule_type, document_type, description_tr, description_en, severity, isbp_reference, ucp_reference) VALUES
('O110','O','KOLI_LISTESI','Paket sayısı konşimento ile uyumsuz','Package count mismatch with B/L','HIGH','K1',''),
('O111','O','KOLI_LISTESI','Brüt ağırlık tutarsız','Gross weight inconsistency','MEDIUM','K2',''),
('O112','O','KOLI_LISTESI','Net ağırlık tutarsız','Net weight inconsistency','MEDIUM','K3',''),
('O113','O','KOLI_LISTESI','Mal tanımı fatura ile çelişiyor','Goods description conflicts with invoice','HIGH','K4','');
