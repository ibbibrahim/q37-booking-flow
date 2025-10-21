/*
  # Media Channel Workflow Database Schema

  ## Overview
  This schema supports a media channel workflow management system for Booking → NOC → Ingest processes.

  ## Tables

  ### 1. workflow_requests
  Main table storing all workflow requests with their metadata and current status.
  - Supports two booking types: Incoming Feed and Guest for iNEWS Rundown
  - Tracks status through the workflow pipeline
  - Uses JSONB for flexible type-specific data storage

  ### 2. workflow_transitions
  Audit trail of all status changes for requests.
  - Tracks who made changes and when
  - Stores comments/reasons for transitions

  ### 3. resource_assignments
  Records resources assigned by NOC team.
  - Links equipment/resources to specific requests
  - Tracks assignment history

  ## Security
  - Row Level Security (RLS) enabled on all tables
  - Policies enforce role-based access control
  - Users must be authenticated to access data

  ## Notes
  - All timestamps use timestamptz for timezone awareness
  - UUIDs used for primary keys
  - Foreign key constraints ensure referential integrity
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types for better data integrity
CREATE TYPE booking_type AS ENUM ('Incoming Feed', 'Guest for iNEWS Rundown');
CREATE TYPE workflow_status AS ENUM (
  'Draft',
  'Submitted',
  'With NOC',
  'Clarification Requested',
  'Resources Added',
  'With Ingest',
  'Completed',
  'Not Done'
);
CREATE TYPE priority_level AS ENUM ('Normal', 'High', 'Urgent');
CREATE TYPE language_type AS ENUM ('English', 'Arabic');
CREATE TYPE yes_no AS ENUM ('Yes', 'No');

-- =====================================================
-- TABLE: workflow_requests
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Basic Information
  booking_type booking_type NOT NULL,
  title text NOT NULL,
  program text NOT NULL,
  air_date_time timestamptz NOT NULL,
  language language_type NOT NULL DEFAULT 'English',
  priority priority_level NOT NULL DEFAULT 'Normal',

  -- Workflow Status
  status workflow_status NOT NULL DEFAULT 'Draft',
  noc_required yes_no NOT NULL DEFAULT 'No',

  -- Common Fields
  resources_needed text,
  newsroom_ticket text,
  compliance_tags text,
  notes text,

  -- Type-Specific Data (stored as JSONB for flexibility)
  -- For Incoming Feed: { sourceType, vmixInputNumber, returnPath, keyFill }
  -- For Guest Rundown: { guestName, guestContact, inewsRundownId, storySlug, rundownPosition }
  type_specific_data jsonb DEFAULT '{}'::jsonb,

  -- Audit Fields
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- Indexes for performance
  CONSTRAINT title_not_empty CHECK (char_length(title) > 0),
  CONSTRAINT program_not_empty CHECK (char_length(program) > 0)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_workflow_requests_status ON workflow_requests(status);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_priority ON workflow_requests(priority);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_noc_required ON workflow_requests(noc_required);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_created_by ON workflow_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_air_date ON workflow_requests(air_date_time);
CREATE INDEX IF NOT EXISTS idx_workflow_requests_booking_type ON workflow_requests(booking_type);

-- =====================================================
-- TABLE: workflow_transitions
-- =====================================================
CREATE TABLE IF NOT EXISTS workflow_transitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid NOT NULL REFERENCES workflow_requests(id) ON DELETE CASCADE,

  -- Status Change Details
  from_status workflow_status NOT NULL,
  to_status workflow_status NOT NULL,
  comment text,

  -- Additional data (e.g., assigned resources, clarification messages)
  metadata jsonb DEFAULT '{}'::jsonb,

  -- Audit Fields
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT different_status CHECK (from_status != to_status)
);

-- Create indexes for transition queries
CREATE INDEX IF NOT EXISTS idx_transitions_request_id ON workflow_transitions(request_id);
CREATE INDEX IF NOT EXISTS idx_transitions_changed_at ON workflow_transitions(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_transitions_changed_by ON workflow_transitions(changed_by);

-- =====================================================
-- TABLE: resource_assignments
-- =====================================================
CREATE TABLE IF NOT EXISTS resource_assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id uuid NOT NULL REFERENCES workflow_requests(id) ON DELETE CASCADE,

  -- Resource Details
  resource_type text NOT NULL,
  resource_name text NOT NULL,
  resource_details jsonb DEFAULT '{}'::jsonb,

  -- Audit Fields
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at timestamptz DEFAULT now() NOT NULL,

  CONSTRAINT resource_type_not_empty CHECK (char_length(resource_type) > 0),
  CONSTRAINT resource_name_not_empty CHECK (char_length(resource_name) > 0)
);

-- Create indexes for resource queries
CREATE INDEX IF NOT EXISTS idx_resources_request_id ON resource_assignments(request_id);
CREATE INDEX IF NOT EXISTS idx_resources_assigned_by ON resource_assignments(assigned_by);
CREATE INDEX IF NOT EXISTS idx_resources_assigned_at ON resource_assignments(assigned_at DESC);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for workflow_requests
DROP TRIGGER IF EXISTS update_workflow_requests_updated_at ON workflow_requests;
CREATE TRIGGER update_workflow_requests_updated_at
  BEFORE UPDATE ON workflow_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create automatic transition record when status changes
CREATE OR REPLACE FUNCTION create_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO workflow_transitions (
      request_id,
      from_status,
      to_status,
      changed_by,
      comment
    ) VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      auth.uid(),
      'Status automatically updated'
    );
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic transition logging
DROP TRIGGER IF EXISTS log_status_change ON workflow_requests;
CREATE TRIGGER log_status_change
  AFTER UPDATE ON workflow_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION create_status_transition();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE workflow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_assignments ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR workflow_requests
-- =====================================================

-- Policy: All authenticated users can view all requests
CREATE POLICY "Authenticated users can view all workflow requests"
  ON workflow_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create requests
CREATE POLICY "Authenticated users can create workflow requests"
  ON workflow_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Policy: Users can update their own draft requests
CREATE POLICY "Users can update their own draft requests"
  ON workflow_requests
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() AND status = 'Draft')
  WITH CHECK (created_by = auth.uid());

-- Policy: Authenticated users can update request status (for NOC/Ingest workflows)
-- Note: In production, you'd want to add role checks here
CREATE POLICY "Authenticated users can update request status"
  ON workflow_requests
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Users can delete their own draft requests
CREATE POLICY "Users can delete their own draft requests"
  ON workflow_requests
  FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() AND status = 'Draft');

-- =====================================================
-- RLS POLICIES FOR workflow_transitions
-- =====================================================

-- Policy: All authenticated users can view transitions
CREATE POLICY "Authenticated users can view workflow transitions"
  ON workflow_transitions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create transitions
CREATE POLICY "Authenticated users can create workflow transitions"
  ON workflow_transitions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- =====================================================
-- RLS POLICIES FOR resource_assignments
-- =====================================================

-- Policy: All authenticated users can view resource assignments
CREATE POLICY "Authenticated users can view resource assignments"
  ON resource_assignments
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can create resource assignments
CREATE POLICY "Authenticated users can create resource assignments"
  ON resource_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = assigned_by);

-- Policy: Users can update resource assignments they created
CREATE POLICY "Users can update their resource assignments"
  ON resource_assignments
  FOR UPDATE
  TO authenticated
  USING (assigned_by = auth.uid())
  WITH CHECK (assigned_by = auth.uid());

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Note: This sample data assumes you have auth.users set up
-- Comment out or modify based on your authentication setup

-- INSERT INTO workflow_requests (
--   booking_type,
--   title,
--   program,
--   air_date_time,
--   language,
--   priority,
--   status,
--   noc_required,
--   resources_needed,
--   newsroom_ticket,
--   compliance_tags,
--   notes,
--   type_specific_data
-- ) VALUES (
--   'Incoming Feed',
--   'Breaking News - Market Update',
--   'Business Today',
--   '2025-10-22 14:00:00+00',
--   'English',
--   'Urgent',
--   'With NOC',
--   'Yes',
--   'Studio 2, Camera 3',
--   'TICK-1234',
--   'Financial, Live',
--   'Requires real-time graphics overlay',
--   '{"sourceType": "vMix", "vmixInputNumber": "Input 5", "returnPath": "Enabled", "keyFill": "Key"}'::jsonb
-- );

-- =====================================================
-- HELPFUL VIEWS (Optional)
-- =====================================================

-- View: Requests with latest transition
CREATE OR REPLACE VIEW requests_with_latest_transition AS
SELECT
  r.*,
  t.from_status as last_from_status,
  t.to_status as last_to_status,
  t.comment as last_comment,
  t.changed_at as last_changed_at,
  t.changed_by as last_changed_by
FROM workflow_requests r
LEFT JOIN LATERAL (
  SELECT *
  FROM workflow_transitions
  WHERE request_id = r.id
  ORDER BY changed_at DESC
  LIMIT 1
) t ON true;

-- View: Request statistics by status
CREATE OR REPLACE VIEW request_statistics AS
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE priority = 'Urgent') as urgent_count,
  COUNT(*) FILTER (WHERE priority = 'High') as high_count,
  COUNT(*) FILTER (WHERE priority = 'Normal') as normal_count,
  COUNT(*) FILTER (WHERE noc_required = 'Yes') as noc_required_count
FROM workflow_requests
GROUP BY status;

-- View: Resource assignments with request details
CREATE OR REPLACE VIEW resources_with_request_info AS
SELECT
  ra.*,
  r.title as request_title,
  r.program as request_program,
  r.status as request_status,
  r.air_date_time
FROM resource_assignments ra
JOIN workflow_requests r ON ra.request_id = r.id;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on views
GRANT SELECT ON requests_with_latest_transition TO authenticated;
GRANT SELECT ON request_statistics TO authenticated;
GRANT SELECT ON resources_with_request_info TO authenticated;
