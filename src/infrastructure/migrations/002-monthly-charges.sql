ALTER TABLE charges ADD CONSTRAINT charges_tenant_enrollment_charge_unique
  UNIQUE(organization_id,enrollment_id,id);

CREATE TABLE charge_periods (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  enrollment_id uuid NOT NULL,
  period text NOT NULL CHECK(period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  charge_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,enrollment_id,period),
  UNIQUE(organization_id,charge_id),
  FOREIGN KEY(organization_id,enrollment_id,charge_id)
    REFERENCES charges(organization_id,enrollment_id,id)
);

CREATE TABLE billing_batches (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id),
  idempotency_key uuid NOT NULL,
  request_hash text NOT NULL,
  period text NOT NULL CHECK(period ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  item_count int NOT NULL CHECK(item_count BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id,idempotency_key)
);

INSERT INTO charge_periods(id,organization_id,enrollment_id,period,charge_id,created_at)
SELECT c.id,c.organization_id,c.enrollment_id,substring(c.due_date,1,7),c.id,c.created_at
FROM charges c;

CREATE INDEX charge_periods_tenant_period
  ON charge_periods(organization_id,period,enrollment_id);
CREATE INDEX billing_batches_tenant_time
  ON billing_batches(organization_id,created_at DESC);

DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['charge_periods','billing_batches'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',tbl);
    EXECUTE format('CREATE POLICY tenant_isolation ON %I TO kano_app USING (organization_id = nullif(current_setting(''app.tenant'', true),'''')::uuid) WITH CHECK (organization_id = nullif(current_setting(''app.tenant'', true),'''')::uuid)',tbl);
    EXECUTE format('GRANT SELECT, INSERT ON %I TO kano_app',tbl);
    EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION reject_historical_mutation()',tbl);
  END LOOP;
END $$;
