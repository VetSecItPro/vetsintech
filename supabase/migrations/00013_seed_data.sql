-- ============================================================================
-- Migration: 00013_seed_data
-- Purpose: Seed data for development — org, sample course with modules/lessons
-- NOTE: This is DEV ONLY. Do not run in production.
-- Rollback: DELETE FROM organizations WHERE slug = 'vetsintech-dev';
-- ============================================================================

-- ============================================================================
-- Seed Organization
-- ============================================================================
INSERT INTO organizations (id, name, slug, settings)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'VetsInTech Education',
    'vetsintech',
    '{"allow_self_registration": true, "default_timezone": "America/New_York"}'
);

-- ============================================================================
-- Seed Course: Introduction to Cybersecurity
-- ============================================================================
INSERT INTO courses (id, organization_id, title, slug, description, category, status, estimated_duration_minutes)
VALUES (
    '00000000-0000-0000-0000-000000000010',
    '00000000-0000-0000-0000-000000000001',
    'Introduction to Cybersecurity',
    'intro-to-cybersecurity',
    'A foundational course covering the core concepts of cybersecurity, threat landscapes, and defense strategies.',
    'Cybersecurity',
    'published',
    480
);

-- Module 1: Fundamentals
INSERT INTO modules (id, course_id, title, description, sort_order)
VALUES (
    '00000000-0000-0000-0000-000000000100',
    '00000000-0000-0000-0000-000000000010',
    'Security Fundamentals',
    'Core concepts of information security — CIA triad, threat models, and risk management.',
    1
);

-- Lessons for Module 1
INSERT INTO lessons (id, module_id, title, lesson_type, sort_order, estimated_duration_minutes, content)
VALUES
    ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000100',
     'What is Cybersecurity?', 'text', 1, 15,
     '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "What is Cybersecurity?"}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Cybersecurity is the practice of protecting systems, networks, and programs from digital attacks. This lesson introduces the fundamental concepts you need to understand."}]}]}'),
    ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000100',
     'The CIA Triad', 'text', 2, 20,
     '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Confidentiality, Integrity, Availability"}]}, {"type": "paragraph", "content": [{"type": "text", "text": "The CIA triad is the foundation of information security. Every security decision maps back to protecting one or more of these three properties."}]}]}'),
    ('00000000-0000-0000-0000-000000001003', '00000000-0000-0000-0000-000000000100',
     'Threat Landscape Overview', 'video', 3, 25, NULL);

-- Update video URL separately
UPDATE lessons SET video_url = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
WHERE id = '00000000-0000-0000-0000-000000001003';

-- Module 2: Network Security
INSERT INTO modules (id, course_id, title, description, sort_order)
VALUES (
    '00000000-0000-0000-0000-000000000200',
    '00000000-0000-0000-0000-000000000010',
    'Network Security',
    'Understanding network protocols, firewalls, intrusion detection, and secure architecture.',
    2
);

INSERT INTO lessons (id, module_id, title, lesson_type, sort_order, estimated_duration_minutes, content)
VALUES
    ('00000000-0000-0000-0000-000000002001', '00000000-0000-0000-0000-000000000200',
     'Network Protocols and Ports', 'text', 1, 20,
     '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Understanding Network Protocols"}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Every network communication relies on protocols. Understanding TCP/IP, HTTP, DNS, and other core protocols is essential for identifying and mitigating network-based attacks."}]}]}'),
    ('00000000-0000-0000-0000-000000002002', '00000000-0000-0000-0000-000000000200',
     'Firewalls and IDS/IPS', 'text', 2, 25,
     '{"type": "doc", "content": [{"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Firewalls and Intrusion Detection"}]}, {"type": "paragraph", "content": [{"type": "text", "text": "Firewalls and intrusion detection systems form the first line of defense in network security. Learn how they work and how to configure them effectively."}]}]}');

-- ============================================================================
-- Seed Cohort
-- ============================================================================
INSERT INTO cohorts (id, organization_id, course_id, name, description, status, starts_at)
VALUES (
    '00000000-0000-0000-0000-000000000500',
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000010',
    'Spring 2026 Cohort',
    'First cohort for the Introduction to Cybersecurity course.',
    'active',
    '2026-03-01T00:00:00Z'
);

-- ============================================================================
-- NOTE: Admin user and enrollments will be created via the app's
-- registration flow once Supabase Auth is connected. The seed data
-- above provides the structural data needed for development.
--
-- To create a test admin user:
-- 1. Register via the app UI
-- 2. Run: INSERT INTO user_roles (user_id, organization_id, role)
--    VALUES ('<your-user-id>', '00000000-0000-0000-0000-000000000001', 'admin');
-- ============================================================================
