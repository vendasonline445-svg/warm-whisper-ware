
-- Insert the mesa-dobravel site linked to existing client
INSERT INTO sites (site_id, name, domain, active, client_id)
VALUES ('mesa-dobravel', 'Mesa Dobrável 180x60cm', 'joyfulmoments.com.br', true, 'a30642c7-b740-4918-97cc-2918f635ac4e')
ON CONFLICT (site_id) DO NOTHING;

-- Backfill existing data without site_id
UPDATE events SET site_id = 'mesa-dobravel' WHERE site_id IS NULL;
UPDATE sessions SET site_id = 'mesa-dobravel' WHERE site_id IS NULL;
UPDATE checkout_leads SET site_id = 'mesa-dobravel' WHERE site_id IS NULL;
UPDATE orders SET site_id = 'mesa-dobravel' WHERE site_id IS NULL;
