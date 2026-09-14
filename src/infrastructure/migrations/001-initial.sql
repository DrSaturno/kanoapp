CREATE ROLE kano_app NOLOGIN NOSUPERUSER NOBYPASSRLS;
CREATE TABLE organizations (id uuid PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE accounts (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), email text NOT NULL UNIQUE, name text NOT NULL, password_hash text NOT NULL, role text NOT NULL CHECK (role IN ('owner','admin','student')));
CREATE TABLE auth_sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES accounts(id), expires_at timestamptz NOT NULL);
CREATE TABLE auth_attempts (bucket text PRIMARY KEY, attempts int NOT NULL, expires_at timestamptz NOT NULL);
CREATE TABLE settings_versions (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), version int NOT NULL, value jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,version));
CREATE TABLE locations (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), name text NOT NULL, address text NOT NULL, state text NOT NULL CHECK(state IN ('active','paused','archived')), version int NOT NULL DEFAULT 1, UNIQUE(organization_id,id));
CREATE TABLE students (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), name text NOT NULL, contact text NOT NULL, birth_date text NOT NULL, state text NOT NULL CHECK(state IN ('active','paused','archived')), version int NOT NULL DEFAULT 1, UNIQUE(organization_id,id));
CREATE TABLE services (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), state text NOT NULL CHECK(state IN ('active','paused','archived')), revision int NOT NULL DEFAULT 1, UNIQUE(organization_id,id));
CREATE TABLE service_versions (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), service_id uuid NOT NULL, version int NOT NULL, name text NOT NULL, discipline text NOT NULL, modality text NOT NULL CHECK(modality IN ('group','personal','hybrid')), location_id uuid NOT NULL, location_name text NOT NULL, days jsonb NOT NULL, time text NOT NULL, duration int NOT NULL CHECK(duration BETWEEN 15 AND 240), capacity int NOT NULL CHECK(capacity BETWEEN 1 AND 500), amount int NOT NULL CHECK(amount > 0), currency text NOT NULL, effective_on text NOT NULL, UNIQUE(organization_id,id), UNIQUE(organization_id,service_id,id), UNIQUE(service_id,version), UNIQUE(service_id,effective_on), FOREIGN KEY(organization_id,service_id) REFERENCES services(organization_id,id), FOREIGN KEY(organization_id,location_id) REFERENCES locations(organization_id,id));
CREATE TABLE enrollments (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), student_id uuid NOT NULL, service_id uuid NOT NULL, service_version_id uuid NOT NULL, settings_version int NOT NULL, state text NOT NULL CHECK(state IN ('active','ended')), created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,id), FOREIGN KEY(organization_id,student_id) REFERENCES students(organization_id,id), FOREIGN KEY(organization_id,service_id,service_version_id) REFERENCES service_versions(organization_id,service_id,id), FOREIGN KEY(organization_id,settings_version) REFERENCES settings_versions(organization_id,version));
CREATE UNIQUE INDEX enrollment_active_unique ON enrollments(student_id,service_id) WHERE state = 'active';
CREATE TABLE charges (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), student_id uuid NOT NULL, enrollment_id uuid NOT NULL, description text NOT NULL, amount int NOT NULL CHECK(amount>0), currency text NOT NULL, due_date text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,id), FOREIGN KEY(organization_id,student_id) REFERENCES students(organization_id,id), FOREIGN KEY(organization_id,enrollment_id) REFERENCES enrollments(organization_id,id));
CREATE TABLE payments (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), charge_id uuid NOT NULL, amount int NOT NULL CHECK(amount>0), currency text NOT NULL, method text NOT NULL CHECK(method IN ('cash','transfer')), reference text NOT NULL, idempotency_key uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id,idempotency_key), FOREIGN KEY(organization_id,charge_id) REFERENCES charges(organization_id,id));
CREATE TABLE audit_events (id uuid PRIMARY KEY, organization_id uuid NOT NULL REFERENCES organizations(id), actor_id uuid NOT NULL REFERENCES accounts(id), actor_name text NOT NULL, action text NOT NULL, summary text NOT NULL, details jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX charges_tenant_due ON charges(organization_id,due_date);
CREATE INDEX payments_tenant_charge ON payments(organization_id,charge_id);
CREATE INDEX service_versions_tenant ON service_versions(organization_id,service_id,effective_on);
CREATE INDEX audit_tenant_time ON audit_events(organization_id,created_at DESC);
CREATE FUNCTION reject_historical_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Historical records are immutable'; END; $$;
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['settings_versions','locations','students','services','service_versions','enrollments','charges','payments','audit_events'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I TO kano_app USING (organization_id = nullif(current_setting(''app.tenant'', true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.tenant'', true),'''')::uuid)',tbl);
    EXECUTE format('GRANT SELECT, INSERT ON %I TO kano_app',tbl);
  END LOOP;
  FOREACH tbl IN ARRAY ARRAY['settings_versions','service_versions','charges','payments','audit_events'] LOOP
    EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation()',tbl);
  END LOOP;
END $$;
GRANT UPDATE ON locations,students,services,enrollments TO kano_app;
