-- ============================================================================
-- Migration: 00009_certificates
-- Purpose: Auto-generated certificates of completion
-- Rollback: DROP FUNCTION IF EXISTS generate_certificate_number();
--           DROP TABLE IF EXISTS certificates CASCADE;
-- ============================================================================

CREATE TABLE certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    certificate_number TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    pdf_url TEXT,                                 -- Supabase Storage path
    metadata JSONB DEFAULT '{}',                  -- Snapshot of course title, instructor, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_certificates_user ON certificates(user_id);
CREATE INDEX idx_certificates_org ON certificates(organization_id);
CREATE INDEX idx_certificates_number ON certificates(certificate_number);
CREATE INDEX idx_certificates_course ON certificates(course_id);

-- ============================================================================
-- Helper: Generate a unique, human-readable certificate number
-- Format: VIT-YYYYMMDD-XXXXX (e.g., VIT-20260315-A7K2M)
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_certificate_number()
RETURNS TEXT AS $$
DECLARE
    _date_part TEXT;
    _random_part TEXT;
    _number TEXT;
    _exists BOOLEAN;
BEGIN
    LOOP
        _date_part := to_char(now(), 'YYYYMMDD');
        _random_part := upper(substr(md5(random()::text), 1, 5));
        _number := 'VIT-' || _date_part || '-' || _random_part;

        SELECT EXISTS(SELECT 1 FROM certificates WHERE certificate_number = _number) INTO _exists;
        IF NOT _exists THEN
            RETURN _number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE certificates IS 'Issued certificates of completion. Certificate number is unique and human-readable.';
COMMENT ON COLUMN certificates.metadata IS 'Snapshot of course/instructor details at time of issuance for PDF generation.';
