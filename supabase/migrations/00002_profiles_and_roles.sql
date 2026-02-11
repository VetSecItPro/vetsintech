-- ============================================================================
-- Migration: 00002_profiles_and_roles
-- Purpose: User profiles extending auth.users + role-based access control
-- Rollback: DROP TABLE IF EXISTS user_roles CASCADE;
--           DROP TABLE IF EXISTS profiles CASCADE;
--           DROP TYPE IF EXISTS user_role;
-- ============================================================================

-- Role enum
CREATE TYPE user_role AS ENUM ('admin', 'instructor', 'student');

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    phone TEXT,
    timezone TEXT NOT NULL DEFAULT 'America/New_York',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_active ON profiles(organization_id, is_active);

-- Auto-update trigger
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- User roles junction table (supports multiple roles per user per org)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, organization_id, role)
);

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_org_role ON user_roles(organization_id, role);

-- ============================================================================
-- Trigger: Auto-create profile when a new auth.users row is inserted
-- NOTE: The registration flow should pass organization_id and full_name
-- via auth.users.raw_user_meta_data
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, organization_id, email, full_name)
    VALUES (
        NEW.id,
        (NEW.raw_user_meta_data->>'organization_id')::UUID,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    );

    -- Auto-assign student role
    INSERT INTO user_roles (user_id, organization_id, role)
    VALUES (
        NEW.id,
        (NEW.raw_user_meta_data->>'organization_id')::UUID,
        'student'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- Helper function: Check if a user has a specific role in an organization
-- ============================================================================
CREATE OR REPLACE FUNCTION user_has_role(
    _user_id UUID,
    _organization_id UUID,
    _role user_role
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = _user_id
          AND organization_id = _organization_id
          AND role = _role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper: Get user's organization_id
CREATE OR REPLACE FUNCTION get_user_organization_id(_user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT organization_id FROM profiles WHERE id = _user_id LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON TABLE profiles IS 'Extends auth.users with app-specific profile data. One profile per user.';
COMMENT ON TABLE user_roles IS 'Maps users to roles within organizations. Supports multiple roles per user.';
