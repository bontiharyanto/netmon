-- Poller looks up firing device_down per device
CREATE INDEX IF NOT EXISTS "alert_device_id_event_status_idx" ON "alert"("device_id", "event", "status");

-- Dashboard / outage counts
CREATE INDEX IF NOT EXISTS "alert_tenant_id_status_idx" ON "alert"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "device_tenant_id_status_idx" ON "device"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "ticket_tenant_id_status_idx" ON "ticket"("tenant_id", "status");
