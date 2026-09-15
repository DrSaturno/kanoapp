CREATE TABLE schedule_batches (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  from_date text NOT NULL,
  to_date text NOT NULL,
  created_count int NOT NULL CHECK(created_count BETWEEN 0 AND 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,idempotency_key)
);

CREATE TABLE class_sessions (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  service_id uuid NOT NULL,
  service_version_id uuid NOT NULL,
  title text NOT NULL,
  discipline text NOT NULL,
  modality text NOT NULL CHECK(modality IN ('group','personal','hybrid')),
  location_id uuid NOT NULL,
  location_name text NOT NULL,
  session_date text NOT NULL CHECK(session_date ~ '^\d{4}-\d{2}-\d{2}$'),
  start_time text NOT NULL CHECK(start_time ~ '^([01]\d|2[0-3]):[0-5]\d$'),
  duration int NOT NULL CHECK(duration BETWEEN 15 AND 240),
  capacity int NOT NULL CHECK(capacity BETWEEN 1 AND 500),
  state text NOT NULL DEFAULT 'scheduled' CHECK(state IN ('scheduled','completed','cancelled')),
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id),
  UNIQUE(organization_id,service_id,session_date),
  FOREIGN KEY(organization_id,service_id,service_version_id)
    REFERENCES service_versions(organization_id,service_id,id),
  FOREIGN KEY(organization_id,location_id) REFERENCES locations(organization_id,id)
);

CREATE TABLE class_bookings (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  session_id uuid NOT NULL,
  student_id uuid NOT NULL,
  enrollment_id uuid NOT NULL,
  status text NOT NULL CHECK(status IN ('confirmed','waitlist','cancelled','present','absent','no_show')),
  waitlist_position int,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,id),
  FOREIGN KEY(organization_id,session_id) REFERENCES class_sessions(organization_id,id),
  FOREIGN KEY(organization_id,student_id) REFERENCES students(organization_id,id),
  FOREIGN KEY(organization_id,enrollment_id) REFERENCES enrollments(organization_id,id),
  CHECK((status = 'waitlist' AND waitlist_position IS NOT NULL AND waitlist_position > 0)
    OR (status <> 'waitlist' AND waitlist_position IS NULL))
);

CREATE UNIQUE INDEX class_booking_active_student
  ON class_bookings(session_id,student_id) WHERE status <> 'cancelled';
CREATE INDEX class_sessions_tenant_date
  ON class_sessions(organization_id,session_date,start_time,id);
CREATE INDEX class_bookings_tenant_roster
  ON class_bookings(organization_id,session_id,status,waitlist_position,created_at,id);

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['schedule_batches','class_sessions','class_bookings'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I TO kano_app USING (organization_id = nullif(current_setting(''app.tenant'', true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.tenant'', true),'''')::uuid)',tbl);
    EXECUTE format('GRANT SELECT, INSERT ON %I TO kano_app',tbl);
  END LOOP;
END $$;

GRANT UPDATE ON class_sessions,class_bookings TO kano_app;
CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON schedule_batches
  FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
CREATE TRIGGER class_sessions_no_delete BEFORE DELETE ON class_sessions
  FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
CREATE TRIGGER class_bookings_no_delete BEFORE DELETE ON class_bookings
  FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation();
