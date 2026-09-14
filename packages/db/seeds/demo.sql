PRAGMA foreign_keys = ON;

INSERT OR IGNORE INTO users (id, external_id, name, email, role, active, created_at, updated_at) VALUES
  ('usr-admin-001', NULL, 'Nina Controller', 'nina.controller@example.test', 'admin', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('usr-manager-001', NULL, 'Martin Manager', 'martin.manager@example.test', 'manager', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('usr-cs-001', NULL, 'Clara Support', 'clara.support@example.test', 'customer_service', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('usr-cs-002', NULL, 'Samuel Care', 'samuel.care@example.test', 'customer_service', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('usr-cs-003', NULL, 'Eva Followup', 'eva.followup@example.test', 'customer_service', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('usr-sales-001', NULL, 'Peter Field', 'peter.field@example.test', 'sales_rep', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('usr-sales-002', NULL, 'Lucia Route', 'lucia.route@example.test', 'sales_rep', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('usr-sales-003', NULL, 'Daniel Visit', 'daniel.visit@example.test', 'sales_rep', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('usr-inactive-001', NULL, 'Inactive Operator', 'inactive.operator@example.test', 'customer_service', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO customers (
  id, external_id, company_name, company_registration_number, tax_id, vat_id, contact_name, email, phone, website, address, city, postal_code, country, assigned_sales_rep_id, b2b_status, active, source, metadata_json, created_at, updated_at
) VALUES
  ('cus-001', 'erp-cus-001', 'Orion Retail Labs', '50000001', '202600001', 'SK202600001', 'Andrea Novak', 'andrea@orion-retail.test', '+421900100001', 'https://orion-retail.test', 'Market Street 1', 'Bratislava', '81101', 'SK', 'usr-sales-001', 'registered', 1, 'mock_erp', '{"scenario":"normal_active"}', '2026-01-01T00:00:00.000Z', '2026-08-31T10:00:00.000Z'),
  ('cus-002', 'erp-cus-002', 'Blue Pine Stores', '50000002', '202600002', 'SK202600002', 'Marek Blue', 'marek@blue-pine.test', '+421900100002', NULL, 'Lake Road 12', 'Zilina', '01001', 'SK', 'usr-sales-001', 'registered', 1, 'mock_erp', '{"scenario":"overdue_reorder"}', '2026-01-01T00:00:00.000Z', '2026-07-20T10:00:00.000Z'),
  ('cus-003', 'erp-cus-003', 'Cedar Office Supply', '50000003', '202600003', 'SK202600003', 'Petra Cedar', 'petra@cedar-office.test', '+421900100003', NULL, 'Office Park 8', 'Trnava', '91701', 'SK', 'usr-sales-002', 'registered', 1, 'mock_erp', '{"scenario":"declining_turnover"}', '2026-01-01T00:00:00.000Z', '2026-08-15T10:00:00.000Z'),
  ('cus-004', 'erp-cus-004', 'Delta Gastro Group', '50000004', '202600004', NULL, 'Tomas Delta', 'tomas@delta-gastro.test', '+421900100004', NULL, 'Kitchen Avenue 3', 'Kosice', '04001', 'SK', 'usr-sales-002', 'missing', 1, 'mock_erp', '{"scenario":"inactive_30_plus"}', '2026-01-01T00:00:00.000Z', '2026-08-01T10:00:00.000Z'),
  ('cus-005', 'erp-cus-005', 'Evergreen Clinic', '50000005', '202600005', NULL, 'Jana Green', 'jana@evergreen-clinic.test', '+421900100005', NULL, 'Health Square 4', 'Nitra', '94901', 'SK', 'usr-sales-003', 'registered', 1, 'mock_erp', '{"scenario":"inactive_60_plus"}', '2026-01-01T00:00:00.000Z', '2026-07-01T10:00:00.000Z'),
  ('cus-006', 'erp-cus-006', 'Futura Workshop', '50000006', '202600006', NULL, 'Roman Future', 'roman@futura-workshop.test', '+421900100006', NULL, 'Builder Lane 6', 'Presov', '08001', 'SK', 'usr-sales-003', 'registered', 1, 'mock_erp', '{"scenario":"reactivation_90_plus"}', '2026-01-01T00:00:00.000Z', '2026-05-01T10:00:00.000Z'),
  ('cus-007', 'erp-cus-007', 'Golden Cup Cafe', '50000007', '202600007', NULL, 'Laura Gold', 'laura@golden-cup.test', '+421900100007', NULL, 'Bean Street 7', 'Bratislava', '82101', 'SK', 'usr-sales-001', 'missing', 1, 'mock_erp', '{"scenario":"active_without_b2b"}', '2026-01-01T00:00:00.000Z', '2026-09-01T10:00:00.000Z'),
  ('cus-008', 'erp-cus-008', 'Harbor Mini Market', '50000008', '202600008', 'SK202600008', 'Igor Harbor', 'igor@harbor-market.test', '+421900100008', NULL, 'Port Road 8', 'Komarno', '94501', 'SK', 'usr-sales-002', 'registered', 1, 'mock_erp', '{"scenario":"cross_sell_candidate"}', '2026-01-01T00:00:00.000Z', '2026-09-02T10:00:00.000Z'),
  ('cus-009', 'erp-cus-009', 'Iris Wellness Studio', '50000009', '202600009', NULL, 'Irena Iris', 'irena@iris-wellness.test', '+421900100009', NULL, 'Wellness 9', 'Banska Bystrica', '97401', 'SK', 'usr-sales-003', 'registered', 1, 'mock_erp', '{"scenario":"campaign_click_no_purchase"}', '2026-01-01T00:00:00.000Z', '2026-09-03T10:00:00.000Z'),
  ('cus-010', 'erp-cus-010', 'Juniper Trade House', '50000010', '202600010', 'SK202600010', 'Juraj Juniper', 'juraj@juniper-trade.test', '+421900100010', NULL, 'Trade 10', 'Martin', '03601', 'SK', 'usr-sales-001', 'registered', 1, 'mock_erp', '{"scenario":"normal_active"}', '2026-01-01T00:00:00.000Z', '2026-09-01T10:00:00.000Z'),
  ('cus-011', 'erp-cus-011', 'Kite Sports Corner', '50000011', '202600011', NULL, 'Katarina Kite', 'katarina@kite-sports.test', '+421900100011', NULL, 'Arena 11', 'Poprad', '05801', 'SK', 'usr-sales-002', 'unknown', 1, 'mock_erp', '{"scenario":"new_customer"}', '2026-01-01T00:00:00.000Z', '2026-08-25T10:00:00.000Z'),
  ('cus-012', 'erp-cus-012', 'Lumen Design Shop', '50000012', '202600012', NULL, 'Lenka Lumen', 'lenka@lumen-design.test', '+421900100012', NULL, 'Light 12', 'Piestany', '92101', 'SK', 'usr-sales-003', 'registered', 1, 'mock_erp', '{"scenario":"steady_buyer"}', '2026-01-01T00:00:00.000Z', '2026-08-29T10:00:00.000Z'),
  ('cus-013', 'erp-cus-013', 'Maple Pet Supply', '50000013', '202600013', NULL, 'Miriam Maple', 'miriam@maple-pet.test', '+421900100013', NULL, 'Pet 13', 'Trencin', '91101', 'SK', 'usr-sales-001', 'registered', 1, 'mock_erp', '{"scenario":"overdue_reorder"}', '2026-01-01T00:00:00.000Z', '2026-07-10T10:00:00.000Z'),
  ('cus-014', 'erp-cus-014', 'North Star Books', '50000014', '202600014', NULL, 'Norbert Star', 'norbert@north-books.test', '+421900100014', NULL, 'Library 14', 'Zvolen', '96001', 'SK', 'usr-sales-002', 'not_applicable', 1, 'mock_erp', '{"scenario":"low_value_active"}', '2026-01-01T00:00:00.000Z', '2026-09-04T10:00:00.000Z'),
  ('cus-015', 'erp-cus-015', 'Oak Bakery', '50000015', '202600015', NULL, 'Olivia Oak', 'olivia@oak-bakery.test', '+421900100015', NULL, 'Bread 15', 'Bratislava', '83101', 'SK', 'usr-sales-003', 'missing', 1, 'mock_erp', '{"scenario":"b2b_missing"}', '2026-01-01T00:00:00.000Z', '2026-08-30T10:00:00.000Z'),
  ('cus-016', 'erp-cus-016', 'Pixel Repair Desk', '50000016', '202600016', NULL, 'Pavol Pixel', 'pavol@pixel-repair.test', '+421900100016', NULL, 'Tech 16', 'Kosice', '04011', 'SK', 'usr-sales-001', 'registered', 1, 'mock_erp', '{"scenario":"declining_turnover"}', '2026-01-01T00:00:00.000Z', '2026-08-18T10:00:00.000Z'),
  ('cus-017', 'erp-cus-017', 'Quartz Beauty Bar', '50000017', '202600017', NULL, 'Queta Quartz', 'queta@quartz-beauty.test', '+421900100017', NULL, 'Beauty 17', 'Nitra', '94905', 'SK', 'usr-sales-002', 'registered', 1, 'mock_erp', '{"scenario":"inactive_60_plus"}', '2026-01-01T00:00:00.000Z', '2026-06-20T10:00:00.000Z'),
  ('cus-018', 'erp-cus-018', 'River Tool Rental', '50000018', '202600018', NULL, 'Robert River', 'robert@river-tool.test', '+421900100018', NULL, 'Rental 18', 'Zilina', '01008', 'SK', 'usr-sales-003', 'registered', 1, 'mock_erp', '{"scenario":"reactivation_90_plus"}', '2026-01-01T00:00:00.000Z', '2026-05-30T10:00:00.000Z'),
  ('cus-019', 'erp-cus-019', 'Silver Event Hall', '50000019', '202600019', NULL, 'Silvia Silver', 'silvia@silver-events.test', '+421900100019', NULL, 'Event 19', 'Trnava', '91708', 'SK', 'usr-sales-001', 'unknown', 0, 'mock_erp', '{"scenario":"inactive_account"}', '2026-01-01T00:00:00.000Z', '2026-03-01T10:00:00.000Z'),
  ('cus-020', 'erp-cus-020', 'Terra Garden Center', '50000020', '202600020', 'SK202600020', 'Teresa Terra', 'teresa@terra-garden.test', '+421900100020', NULL, 'Garden 20', 'Presov', '08006', 'SK', 'usr-sales-002', 'registered', 1, 'mock_erp', '{"scenario":"seasonal_active"}', '2026-01-01T00:00:00.000Z', '2026-09-05T10:00:00.000Z');

INSERT OR IGNORE INTO customer_locations (id, external_id, customer_id, name, location_type, address, city, postal_code, country, latitude, longitude, phone, active, created_at, updated_at) VALUES
  ('loc-001-main', 'erp-loc-001-main', 'cus-001', 'Main Store', 'retail_pos', 'Market Street 1', 'Bratislava', '81101', 'SK', 48.1486, 17.1077, '+421900200001', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-001-wh', NULL, 'cus-001', 'Warehouse', 'warehouse', 'Depot 2', 'Bratislava', '82101', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-002-main', 'erp-loc-002-main', 'cus-002', 'Blue Pine POS', 'retail_pos', 'Lake Road 12', 'Zilina', '01001', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-003-main', 'erp-loc-003-main', 'cus-003', 'Cedar Office', 'headquarters', 'Office Park 8', 'Trnava', '91701', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-004-main', 'erp-loc-004-main', 'cus-004', 'Delta Kitchen', 'delivery', 'Kitchen Avenue 3', 'Kosice', '04001', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-005-main', 'erp-loc-005-main', 'cus-005', 'Evergreen Clinic', 'headquarters', 'Health Square 4', 'Nitra', '94901', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-006-main', 'erp-loc-006-main', 'cus-006', 'Futura Workshop', 'warehouse', 'Builder Lane 6', 'Presov', '08001', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-007-main', 'erp-loc-007-main', 'cus-007', 'Golden Cup Cafe', 'retail_pos', 'Bean Street 7', 'Bratislava', '82101', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-008-main', 'erp-loc-008-main', 'cus-008', 'Harbor Market', 'retail_pos', 'Port Road 8', 'Komarno', '94501', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-009-main', 'erp-loc-009-main', 'cus-009', 'Iris Studio', 'retail_pos', 'Wellness 9', 'Banska Bystrica', '97401', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-010-main', 'erp-loc-010-main', 'cus-010', 'Juniper HQ', 'headquarters', 'Trade 10', 'Martin', '03601', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-011-main', 'erp-loc-011-main', 'cus-011', 'Kite Sports', 'retail_pos', 'Arena 11', 'Poprad', '05801', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-012-main', 'erp-loc-012-main', 'cus-012', 'Lumen Showroom', 'retail_pos', 'Light 12', 'Piestany', '92101', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-013-main', 'erp-loc-013-main', 'cus-013', 'Maple Pet', 'retail_pos', 'Pet 13', 'Trencin', '91101', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-014-main', 'erp-loc-014-main', 'cus-014', 'North Books', 'retail_pos', 'Library 14', 'Zvolen', '96001', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-015-main', 'erp-loc-015-main', 'cus-015', 'Oak Bakery', 'retail_pos', 'Bread 15', 'Bratislava', '83101', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-016-main', 'erp-loc-016-main', 'cus-016', 'Pixel Desk', 'retail_pos', 'Tech 16', 'Kosice', '04011', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-017-main', 'erp-loc-017-main', 'cus-017', 'Quartz Bar', 'retail_pos', 'Beauty 17', 'Nitra', '94905', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-018-main', 'erp-loc-018-main', 'cus-018', 'River Rental', 'warehouse', 'Rental 18', 'Zilina', '01008', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-019-main', 'erp-loc-019-main', 'cus-019', 'Silver Hall', 'other', 'Event 19', 'Trnava', '91708', 'SK', NULL, NULL, NULL, 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('loc-020-main', 'erp-loc-020-main', 'cus-020', 'Terra Garden', 'retail_pos', 'Garden 20', 'Presov', '08006', 'SK', NULL, NULL, NULL, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO products (id, external_id, sku, name, brand, category, active, created_at, updated_at) VALUES
  ('prd-001', 'erp-prd-001', 'NICO-COF-001', 'Classic Coffee Beans', 'NICO', 'coffee', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('prd-002', 'erp-prd-002', 'NICO-TEA-001', 'Mountain Herbal Tea', 'NICO', 'tea', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('prd-003', 'erp-prd-003', 'NICO-SNK-001', 'Retail Snack Box', 'NICO', 'snacks', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('prd-004', 'erp-prd-004', 'NICO-CLE-001', 'Surface Cleaner', 'NICO Pro', 'cleaning', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('prd-005', 'erp-prd-005', 'NICO-PKG-001', 'Eco Packaging Set', 'NICO', 'packaging', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('prd-006', 'erp-prd-006', 'NICO-B2B-001', 'B2B Starter Bundle', 'NICO', 'bundles', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('prd-007', 'erp-prd-007', 'NICO-SEA-001', 'Seasonal Display Kit', 'NICO', 'merchandising', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('prd-008', 'erp-prd-008', 'NICO-CRM-001', 'Demo Legacy Item', 'Legacy Brand', 'legacy', 0, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO orders (id, external_id, customer_id, customer_location_id, order_number, order_date, net_amount, gross_amount, currency, status, source, created_at, updated_at) VALUES
  ('ord-001', 'erp-ord-001', 'cus-001', 'loc-001-main', 'ORD-2025-0901', '2025-09-15', 500, 600, 'EUR', 'completed', 'mock_erp', '2025-09-15T10:00:00.000Z', '2025-09-15T10:00:00.000Z'),
  ('ord-002', 'erp-ord-002', 'cus-001', 'loc-001-main', 'ORD-2026-0801', '2026-08-28', 620, 744, 'EUR', 'completed', 'mock_erp', '2026-08-28T10:00:00.000Z', '2026-08-28T10:00:00.000Z'),
  ('ord-003', 'erp-ord-003', 'cus-002', 'loc-002-main', 'ORD-2026-0601', '2026-06-12', 410, 492, 'EUR', 'completed', 'mock_erp', '2026-06-12T10:00:00.000Z', '2026-06-12T10:00:00.000Z'),
  ('ord-004', 'erp-ord-004', 'cus-003', 'loc-003-main', 'ORD-2025-1001', '2025-10-05', 1200, 1440, 'EUR', 'completed', 'mock_erp', '2025-10-05T10:00:00.000Z', '2025-10-05T10:00:00.000Z'),
  ('ord-005', 'erp-ord-005', 'cus-003', 'loc-003-main', 'ORD-2026-0802', '2026-08-10', 300, 360, 'EUR', 'completed', 'mock_erp', '2026-08-10T10:00:00.000Z', '2026-08-10T10:00:00.000Z'),
  ('ord-006', 'erp-ord-006', 'cus-004', 'loc-004-main', 'ORD-2026-0731', '2026-07-31', 260, 312, 'EUR', 'completed', 'mock_erp', '2026-07-31T10:00:00.000Z', '2026-07-31T10:00:00.000Z'),
  ('ord-007', 'erp-ord-007', 'cus-005', 'loc-005-main', 'ORD-2026-0620', '2026-06-20', 880, 1056, 'EUR', 'completed', 'mock_erp', '2026-06-20T10:00:00.000Z', '2026-06-20T10:00:00.000Z'),
  ('ord-008', 'erp-ord-008', 'cus-006', 'loc-006-main', 'ORD-2026-0420', '2026-04-20', 190, 228, 'EUR', 'completed', 'mock_erp', '2026-04-20T10:00:00.000Z', '2026-04-20T10:00:00.000Z'),
  ('ord-009', 'erp-ord-009', 'cus-007', 'loc-007-main', 'ORD-2026-0901', '2026-09-01', 340, 408, 'EUR', 'completed', 'mock_erp', '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'),
  ('ord-010', 'erp-ord-010', 'cus-008', 'loc-008-main', 'ORD-2026-0830', '2026-08-30', 760, 912, 'EUR', 'completed', 'mock_erp', '2026-08-30T10:00:00.000Z', '2026-08-30T10:00:00.000Z'),
  ('ord-011', 'erp-ord-011', 'cus-010', 'loc-010-main', 'ORD-2026-0828', '2026-08-28', 510, 612, 'EUR', 'completed', 'mock_erp', '2026-08-28T10:00:00.000Z', '2026-08-28T10:00:00.000Z'),
  ('ord-012', 'erp-ord-012', 'cus-011', 'loc-011-main', 'ORD-2026-0825', '2026-08-25', 230, 276, 'EUR', 'completed', 'mock_erp', '2026-08-25T10:00:00.000Z', '2026-08-25T10:00:00.000Z'),
  ('ord-013', 'erp-ord-013', 'cus-012', 'loc-012-main', 'ORD-2026-0818', '2026-08-18', 450, 540, 'EUR', 'completed', 'mock_erp', '2026-08-18T10:00:00.000Z', '2026-08-18T10:00:00.000Z'),
  ('ord-014', 'erp-ord-014', 'cus-013', 'loc-013-main', 'ORD-2026-0701', '2026-07-01', 350, 420, 'EUR', 'completed', 'mock_erp', '2026-07-01T10:00:00.000Z', '2026-07-01T10:00:00.000Z'),
  ('ord-015', 'erp-ord-015', 'cus-014', 'loc-014-main', 'ORD-2026-0902', '2026-09-02', 95, 114, 'EUR', 'completed', 'mock_erp', '2026-09-02T10:00:00.000Z', '2026-09-02T10:00:00.000Z'),
  ('ord-016', 'erp-ord-016', 'cus-015', 'loc-015-main', 'ORD-2026-0829', '2026-08-29', 275, 330, 'EUR', 'completed', 'mock_erp', '2026-08-29T10:00:00.000Z', '2026-08-29T10:00:00.000Z'),
  ('ord-017', 'erp-ord-017', 'cus-016', 'loc-016-main', 'ORD-2025-1101', '2025-11-01', 980, 1176, 'EUR', 'completed', 'mock_erp', '2025-11-01T10:00:00.000Z', '2025-11-01T10:00:00.000Z'),
  ('ord-018', 'erp-ord-018', 'cus-016', 'loc-016-main', 'ORD-2026-0816', '2026-08-16', 260, 312, 'EUR', 'completed', 'mock_erp', '2026-08-16T10:00:00.000Z', '2026-08-16T10:00:00.000Z'),
  ('ord-019', 'erp-ord-019', 'cus-017', 'loc-017-main', 'ORD-2026-0615', '2026-06-15', 420, 504, 'EUR', 'completed', 'mock_erp', '2026-06-15T10:00:00.000Z', '2026-06-15T10:00:00.000Z'),
  ('ord-020', 'erp-ord-020', 'cus-018', 'loc-018-main', 'ORD-2026-0520', '2026-05-20', 670, 804, 'EUR', 'completed', 'mock_erp', '2026-05-20T10:00:00.000Z', '2026-05-20T10:00:00.000Z'),
  ('ord-021', 'erp-ord-021', 'cus-019', 'loc-019-main', 'ORD-2026-0210', '2026-02-10', 150, 180, 'EUR', 'completed', 'mock_erp', '2026-02-10T10:00:00.000Z', '2026-02-10T10:00:00.000Z'),
  ('ord-022', 'erp-ord-022', 'cus-020', 'loc-020-main', 'ORD-2026-0905', '2026-09-05', 720, 864, 'EUR', 'completed', 'mock_erp', '2026-09-05T10:00:00.000Z', '2026-09-05T10:00:00.000Z');

INSERT OR IGNORE INTO order_items (id, order_id, product_id, external_product_id, sku, product_name, quantity, unit_price, total_price) VALUES
  ('itm-001', 'ord-001', 'prd-001', 'erp-prd-001', 'NICO-COF-001', 'Classic Coffee Beans', 10, 50, 500),
  ('itm-002', 'ord-002', 'prd-001', 'erp-prd-001', 'NICO-COF-001', 'Classic Coffee Beans', 8, 55, 440),
  ('itm-003', 'ord-002', 'prd-005', 'erp-prd-005', 'NICO-PKG-001', 'Eco Packaging Set', 4, 45, 180),
  ('itm-004', 'ord-003', 'prd-002', 'erp-prd-002', 'NICO-TEA-001', 'Mountain Herbal Tea', 10, 41, 410),
  ('itm-005', 'ord-004', 'prd-006', 'erp-prd-006', 'NICO-B2B-001', 'B2B Starter Bundle', 6, 200, 1200),
  ('itm-006', 'ord-005', 'prd-006', 'erp-prd-006', 'NICO-B2B-001', 'B2B Starter Bundle', 1, 300, 300),
  ('itm-007', 'ord-006', 'prd-004', 'erp-prd-004', 'NICO-CLE-001', 'Surface Cleaner', 4, 65, 260),
  ('itm-008', 'ord-007', 'prd-003', 'erp-prd-003', 'NICO-SNK-001', 'Retail Snack Box', 22, 40, 880),
  ('itm-009', 'ord-008', NULL, 'erp-legacy-991', 'LEG-OLD-991', 'Legacy ERP Item Snapshot', 1, 190, 190),
  ('itm-010', 'ord-009', 'prd-001', 'erp-prd-001', 'NICO-COF-001', 'Classic Coffee Beans', 4, 55, 220),
  ('itm-011', 'ord-009', 'prd-002', 'erp-prd-002', 'NICO-TEA-001', 'Mountain Herbal Tea', 3, 40, 120),
  ('itm-012', 'ord-010', 'prd-003', 'erp-prd-003', 'NICO-SNK-001', 'Retail Snack Box', 12, 45, 540),
  ('itm-013', 'ord-010', 'prd-007', 'erp-prd-007', 'NICO-SEA-001', 'Seasonal Display Kit', 2, 110, 220),
  ('itm-014', 'ord-011', 'prd-005', 'erp-prd-005', 'NICO-PKG-001', 'Eco Packaging Set', 17, 30, 510),
  ('itm-015', 'ord-012', 'prd-007', 'erp-prd-007', 'NICO-SEA-001', 'Seasonal Display Kit', 1, 230, 230),
  ('itm-016', 'ord-013', 'prd-004', 'erp-prd-004', 'NICO-CLE-001', 'Surface Cleaner', 9, 50, 450),
  ('itm-017', 'ord-014', 'prd-002', 'erp-prd-002', 'NICO-TEA-001', 'Mountain Herbal Tea', 7, 50, 350),
  ('itm-018', 'ord-015', 'prd-003', 'erp-prd-003', 'NICO-SNK-001', 'Retail Snack Box', 5, 19, 95),
  ('itm-019', 'ord-016', 'prd-001', 'erp-prd-001', 'NICO-COF-001', 'Classic Coffee Beans', 5, 55, 275),
  ('itm-020', 'ord-017', 'prd-006', 'erp-prd-006', 'NICO-B2B-001', 'B2B Starter Bundle', 5, 196, 980),
  ('itm-021', 'ord-018', 'prd-006', 'erp-prd-006', 'NICO-B2B-001', 'B2B Starter Bundle', 1, 260, 260),
  ('itm-022', 'ord-019', 'prd-004', 'erp-prd-004', 'NICO-CLE-001', 'Surface Cleaner', 7, 60, 420),
  ('itm-023', 'ord-020', 'prd-005', 'erp-prd-005', 'NICO-PKG-001', 'Eco Packaging Set', 10, 67, 670),
  ('itm-024', 'ord-021', 'prd-008', 'erp-prd-008', 'NICO-CRM-001', 'Demo Legacy Item', 3, 50, 150),
  ('itm-025', 'ord-022', 'prd-007', 'erp-prd-007', 'NICO-SEA-001', 'Seasonal Display Kit', 6, 120, 720);

INSERT OR IGNORE INTO customer_segments (id, code, name, description, active, system, created_at, updated_at) VALUES
  ('seg-active', 'ACTIVE', 'Active', 'Recently active customer.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('seg-reorder-due', 'REORDER_DUE', 'Reorder Due', 'Expected reorder window has passed.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('seg-declining', 'DECLINING', 'Declining', 'Recent turnover is below prior period.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('seg-at-risk', 'AT_RISK', 'At Risk', 'Customer inactivity requires attention.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('seg-critical', 'CRITICAL', 'Critical', 'High priority retention risk.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('seg-reactivation', 'REACTIVATION', 'Reactivation', 'Long inactive customer suitable for reactivation.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('seg-b2b-missing', 'B2B_MISSING', 'B2B Missing', 'Active customer without B2B registration.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('seg-cross-sell', 'CROSS_SELL', 'Cross Sell', 'Customer has a likely cross-sell opportunity.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
  ('seg-newsletter-follow-up', 'NEWSLETTER_FOLLOW_UP', 'Newsletter Follow Up', 'Campaign interaction without conversion.', 1, 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

INSERT OR IGNORE INTO customer_segment_memberships (customer_id, segment_id, reason, score, assigned_at, expires_at, updated_at) VALUES
  ('cus-001', 'seg-active', 'Recent purchase and stable activity.', 72, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z'),
  ('cus-002', 'seg-reorder-due', 'No order after expected reorder interval.', 81, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z'),
  ('cus-003', 'seg-declining', 'Recent order value is below previous pattern.', 77, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z'),
  ('cus-004', 'seg-at-risk', 'More than 30 days since last order.', 61, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z'),
  ('cus-005', 'seg-critical', 'More than 60 days since last order.', 86, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z'),
  ('cus-006', 'seg-reactivation', 'More than 90 days since last order.', 91, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z'),
  ('cus-007', 'seg-b2b-missing', 'Active customer has missing B2B status.', 70, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z'),
  ('cus-008', 'seg-cross-sell', 'Buys snacks and displays but not coffee.', 65, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z'),
  ('cus-009', 'seg-newsletter-follow-up', 'Clicked campaign email without purchase.', 74, '2026-09-01T00:00:00.000Z', NULL, '2026-09-01T00:00:00.000Z');

INSERT OR IGNORE INTO customer_metrics (
  customer_id, last_order_date, first_order_date, turnover_30d, turnover_90d, turnover_365d, previous_turnover_90d, average_order_value, average_reorder_days, days_since_last_order, order_count_30d, order_count_90d, order_count_365d, lifetime_order_count, lifetime_turnover, updated_at
) VALUES
  ('cus-001', '2026-08-28', '2025-09-15', 620, 620, 1120, 500, 560, 45, 13, 1, 1, 2, 2, 1120, '2026-09-10T00:00:00.000Z'),
  ('cus-002', '2026-06-12', '2026-06-12', 0, 410, 410, 0, 410, 30, 90, 0, 1, 1, 1, 410, '2026-09-10T00:00:00.000Z'),
  ('cus-003', '2026-08-10', '2025-10-05', 300, 300, 1500, 1200, 750, 90, 31, 1, 1, 2, 2, 1500, '2026-09-10T00:00:00.000Z'),
  ('cus-004', '2026-07-31', '2026-07-31', 0, 260, 260, 0, 260, 30, 41, 0, 1, 1, 1, 260, '2026-09-10T00:00:00.000Z'),
  ('cus-005', '2026-06-20', '2026-06-20', 0, 880, 880, 0, 880, 45, 82, 0, 1, 1, 1, 880, '2026-09-10T00:00:00.000Z'),
  ('cus-006', '2026-04-20', '2026-04-20', 0, 0, 190, 190, 190, 60, 143, 0, 0, 1, 1, 190, '2026-09-10T00:00:00.000Z'),
  ('cus-007', '2026-09-01', '2026-09-01', 340, 340, 340, 0, 340, 30, 9, 1, 1, 1, 1, 340, '2026-09-10T00:00:00.000Z'),
  ('cus-008', '2026-08-30', '2026-08-30', 760, 760, 760, 0, 760, 30, 11, 1, 1, 1, 1, 760, '2026-09-10T00:00:00.000Z'),
  ('cus-009', NULL, NULL, 0, 0, 0, 0, NULL, NULL, NULL, 0, 0, 0, 0, 0, '2026-09-10T00:00:00.000Z'),
  ('cus-010', '2026-08-28', '2026-08-28', 510, 510, 510, 0, 510, 30, 13, 1, 1, 1, 1, 510, '2026-09-10T00:00:00.000Z');

INSERT OR IGNORE INTO customer_interactions (id, customer_id, customer_location_id, user_id, interaction_type, reason, result, notes, next_action, follow_up_at, created_at, updated_at) VALUES
  ('int-001', 'cus-002', 'loc-002-main', 'usr-cs-001', 'CALL', 'Reorder reminder', 'No answer', 'Try again in two days.', 'Call again', '2026-09-12T09:00:00.000Z', '2026-09-08T09:00:00.000Z', '2026-09-08T09:00:00.000Z'),
  ('int-002', 'cus-003', 'loc-003-main', 'usr-cs-002', 'CALL', 'Declining turnover', 'Reached buyer', 'Buyer mentioned lower demand this month.', 'Sales rep visit', '2026-09-15T10:00:00.000Z', '2026-09-07T11:00:00.000Z', '2026-09-07T11:00:00.000Z'),
  ('int-003', 'cus-007', 'loc-007-main', 'usr-cs-003', 'EMAIL', 'B2B registration', 'Email sent', 'Sent B2B activation instructions.', 'Check registration', '2026-09-14T08:00:00.000Z', '2026-09-06T08:00:00.000Z', '2026-09-06T08:00:00.000Z'),
  ('int-004', 'cus-009', 'loc-009-main', 'usr-cs-001', 'CUSTOMER_SERVICE', 'Campaign click follow-up', 'Interested', 'Asked for product comparison.', 'Prepare offer', '2026-09-11T13:00:00.000Z', '2026-09-05T13:00:00.000Z', '2026-09-05T13:00:00.000Z'),
  ('int-005', 'cus-001', 'loc-001-main', 'usr-sales-001', 'MEETING', 'Quarterly check-in', 'Positive', 'Customer wants seasonal display preview.', NULL, NULL, '2026-08-30T12:00:00.000Z', '2026-08-30T12:00:00.000Z'),
  ('int-006', 'cus-010', 'loc-010-main', 'usr-cs-002', 'CALL', 'Routine reorder check', 'Completed', 'Recent customer service check completed; no follow-up needed today.', NULL, NULL, '2026-09-11T08:30:00.000Z', '2026-09-11T08:30:00.000Z');

INSERT OR IGNORE INTO tasks (id, customer_id, customer_location_id, assigned_user_id, created_by_user_id, source_interaction_id, title, description, task_type, priority, status, due_at, completed_at, created_at, updated_at, operational_type, source_origin) VALUES
  ('tsk-001', 'cus-002', 'loc-002-main', 'usr-cs-001', 'usr-cs-001', 'int-001', 'Call Blue Pine about reorder', 'Follow up after no answer.', 'call', 'high', 'open', '2026-09-12T09:00:00.000Z', NULL, '2026-09-08T09:05:00.000Z', '2026-09-08T09:05:00.000Z', 'FOLLOW_UP_CALL', 'CALL'),
  ('tsk-002', 'cus-003', 'loc-003-main', 'usr-sales-002', 'usr-cs-002', 'int-002', 'Visit Cedar Office', 'Customer Service handoff due to declining order value.', 'handoff', 'high', 'open', '2026-09-15T10:00:00.000Z', NULL, '2026-09-07T11:10:00.000Z', '2026-09-07T11:10:00.000Z', 'SALES_VISIT', 'CS_TO_SALES_HANDOFF'),
  ('tsk-003', 'cus-007', 'loc-007-main', 'usr-cs-003', 'usr-cs-003', 'int-003', 'Check B2B registration', NULL, 'follow_up', 'normal', 'open', '2026-09-14T08:00:00.000Z', NULL, '2026-09-06T08:10:00.000Z', '2026-09-06T08:10:00.000Z', 'B2B_REGISTRATION', 'CALL'),
  ('tsk-004', 'cus-009', 'loc-009-main', 'usr-cs-001', 'usr-cs-001', 'int-004', 'Send campaign offer', 'Clicked campaign without purchase.', 'email', 'high', 'in_progress', '2026-09-11T13:00:00.000Z', NULL, '2026-09-05T13:10:00.000Z', '2026-09-05T13:10:00.000Z', 'CAMPAIGN_FOLLOW_UP', 'CAMPAIGN'),
  ('tsk-005', 'cus-006', 'loc-006-main', 'usr-sales-003', 'usr-manager-001', NULL, 'Plan reactivation visit', NULL, 'visit', 'urgent', 'open', '2026-09-20T09:00:00.000Z', NULL, '2026-09-01T09:00:00.000Z', '2026-09-01T09:00:00.000Z', 'SALES_VISIT', 'MANUAL'),
  ('tsk-006', 'cus-001', 'loc-001-main', 'usr-sales-001', 'usr-sales-001', 'int-005', 'Send seasonal display preview', NULL, 'follow_up', 'normal', 'completed', '2026-09-03T10:00:00.000Z', '2026-09-03T09:30:00.000Z', '2026-08-30T12:10:00.000Z', '2026-09-03T09:30:00.000Z', 'CUSTOMER_SERVICE', 'OTHER');

INSERT OR IGNORE INTO tasks (id, customer_id, customer_location_id, assigned_user_id, created_by_user_id, source_interaction_id, title, description, task_type, priority, status, due_at, completed_at, created_at, updated_at, operational_type, source_origin) VALUES
  ('tsk-007', 'cus-008', 'loc-008-main', 'usr-sales-002', 'usr-manager-001', NULL, 'Plan cross-sell follow-up visit', 'Review the customer product mix and schedule an on-site follow-up.', 'visit', 'normal', 'open', '2026-09-25T09:00:00.000Z', NULL, '2026-09-10T09:00:00.000Z', '2026-09-10T09:00:00.000Z', 'SALES_VISIT', 'MANUAL');

INSERT OR IGNORE INTO sales_visits (id, customer_id, customer_location_id, sales_rep_id, planned_at, started_at, completed_at, status, result, notes, order_value, created_at, updated_at) VALUES
  ('vis-001', 'cus-001', 'loc-001-main', 'usr-sales-001', '2026-08-30T11:00:00.000Z', '2026-08-30T11:05:00.000Z', '2026-08-30T12:00:00.000Z', 'completed', 'Seasonal display discussed', 'Good momentum.', 0, '2026-08-25T10:00:00.000Z', '2026-08-30T12:00:00.000Z'),
  ('vis-002', 'cus-003', 'loc-003-main', 'usr-sales-002', '2026-09-15T10:00:00.000Z', NULL, NULL, 'planned', NULL, 'Customer Service handoff.', NULL, '2026-09-07T11:15:00.000Z', '2026-09-07T11:15:00.000Z'),
  ('vis-003', 'cus-006', 'loc-006-main', 'usr-sales-003', '2026-09-20T09:00:00.000Z', NULL, NULL, 'planned', NULL, 'Reactivation candidate.', NULL, '2026-09-01T09:05:00.000Z', '2026-09-01T09:05:00.000Z'),
  ('vis-004', 'cus-008', 'loc-008-main', 'usr-sales-002', '2026-09-04T14:00:00.000Z', '2026-09-04T14:02:00.000Z', '2026-09-04T14:45:00.000Z', 'completed', 'Cross-sell accepted for review', 'Buyer wants coffee samples.', 0, '2026-09-02T10:00:00.000Z', '2026-09-04T14:45:00.000Z');

UPDATE sales_visits SET source_task_id = 'tsk-002' WHERE id = 'vis-002' AND source_task_id IS NULL;
UPDATE sales_visits SET source_task_id = 'tsk-005' WHERE id = 'vis-003' AND source_task_id IS NULL;

INSERT OR IGNORE INTO campaigns (id, name, campaign_type, status, description, start_date, end_date, created_at, updated_at) VALUES
  ('cmp-001', 'September Reorder Push', 'retention', 'active', 'Synthetic demo campaign for reorder follow-up.', '2026-09-01', '2026-09-30', '2026-08-25T00:00:00.000Z', '2026-08-25T00:00:00.000Z'),
  ('cmp-002', 'Autumn Cross-Sell Newsletter', 'newsletter', 'active', 'Synthetic demo newsletter with click/no-purchase scenario.', '2026-09-01', '2026-09-30', '2026-08-25T00:00:00.000Z', '2026-08-25T00:00:00.000Z');

INSERT OR IGNORE INTO customer_campaigns (id, campaign_id, customer_id, sent_at, opened_at, clicked_at, converted_at, conversion_order_id, created_at, updated_at) VALUES
  ('cuc-001', 'cmp-001', 'cus-002', '2026-09-02T08:00:00.000Z', '2026-09-02T10:00:00.000Z', NULL, NULL, NULL, '2026-09-02T08:00:00.000Z', '2026-09-02T10:00:00.000Z'),
  ('cuc-002', 'cmp-002', 'cus-008', '2026-09-02T08:00:00.000Z', '2026-09-02T09:00:00.000Z', '2026-09-02T09:05:00.000Z', NULL, NULL, '2026-09-02T08:00:00.000Z', '2026-09-02T09:05:00.000Z'),
  ('cuc-003', 'cmp-002', 'cus-009', '2026-09-02T08:00:00.000Z', '2026-09-02T09:15:00.000Z', '2026-09-02T09:30:00.000Z', NULL, NULL, '2026-09-02T08:00:00.000Z', '2026-09-02T09:30:00.000Z'),
  ('cuc-004', 'cmp-002', 'cus-001', '2026-09-02T08:00:00.000Z', '2026-09-02T11:00:00.000Z', '2026-09-02T11:05:00.000Z', '2026-09-03T10:00:00.000Z', 'ord-002', '2026-09-02T08:00:00.000Z', '2026-09-03T10:00:00.000Z');

INSERT OR IGNORE INTO kpi_definitions (id, code, name, description, metric_type, active, created_at, updated_at) VALUES
  ('kpi-calls', 'CALLS_COMPLETED', 'Calls Completed', 'Legacy KPI superseded by role-aware definitions.', 'count', 0, '2026-01-01T00:00:00.000Z', '2026-09-11T00:00:00.000Z'),
  ('kpi-visits', 'VISITS_COMPLETED', 'Visits Completed', 'Legacy KPI superseded by role-aware definitions.', 'count', 0, '2026-01-01T00:00:00.000Z', '2026-09-11T00:00:00.000Z'),
  ('kpi-turnover', 'TURNOVER', 'Turnover', 'Legacy KPI superseded by role-aware definitions.', 'currency', 0, '2026-01-01T00:00:00.000Z', '2026-09-11T00:00:00.000Z');

INSERT OR IGNORE INTO kpi_targets (id, kpi_definition_id, user_id, role, period_type, period_start, period_end, target_value, weight, created_at, updated_at) VALUES
  ('kpit-cs-calls-sep', 'kpi-calls', NULL, 'customer_service', 'month', '2026-09-01', '2026-09-30', 300, 1, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('kpit-sales-visits-sep', 'kpi-visits', NULL, 'sales_rep', 'month', '2026-09-01', '2026-09-30', 80, 1, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z');

INSERT OR IGNORE INTO system_config (key, value, value_type, description, updated_at) VALUES
  ('system.business_timezone', 'Europe/Bratislava', 'string', 'IANA timezone used for business-day boundaries and reporting.', '2026-09-11T00:00:00.000Z'),
  ('reorder_grace_days', '7', 'number', 'Extra days after expected reorder before customer becomes reorder due.', '2026-09-01T00:00:00.000Z'),
  ('at_risk_days', '30', 'number', 'Days since last order before customer is considered at risk.', '2026-09-01T00:00:00.000Z'),
  ('critical_inactivity_days', '60', 'number', 'Days since last order before customer is considered critical.', '2026-09-01T00:00:00.000Z'),
  ('reactivation_days', '90', 'number', 'Days since last order before customer is a reactivation candidate.', '2026-09-01T00:00:00.000Z'),
  ('customer_service.daily_call_target', '8', 'number', 'Daily required Customer Service call target.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.reorder_grace_days', '7', 'number', 'Extra days after expected reorder before customer becomes reorder due.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.at_risk_days', '30', 'number', 'Days since last order before Customer Service risk scoring starts.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.critical_days', '60', 'number', 'Days since last order before critical inactivity scoring.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.reactivation_days', '90', 'number', 'Days since last order before reactivation scoring.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.recent_interaction_suppression_days', '3', 'number', 'Recent completed interaction window for deterministic priority reduction.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_reorder_slightly_overdue', '15', 'number', 'Priority points for slightly overdue reorder.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_reorder_significantly_overdue', '25', 'number', 'Priority points for significantly overdue reorder.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_reorder_severely_overdue', '35', 'number', 'Priority points for severely overdue reorder.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_decline_20', '15', 'number', 'Priority points for 20 percent sales decline.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_decline_30', '25', 'number', 'Priority points for 30 percent sales decline.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_decline_50', '35', 'number', 'Priority points for 50 percent sales decline.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_inactivity_at_risk', '15', 'number', 'Priority points for at-risk inactivity.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_inactivity_critical', '30', 'number', 'Priority points for critical inactivity.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_inactivity_reactivation', '45', 'number', 'Priority points for reactivation inactivity.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_b2b_missing', '10', 'number', 'Priority points for missing B2B registration.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_campaign_interest', '20', 'number', 'Priority points for clicked campaign without conversion.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_open_follow_up_task', '15', 'number', 'Priority points for open follow-up task.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_overdue_follow_up_task', '25', 'number', 'Priority points for overdue follow-up task.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_cross_sell', '10', 'number', 'Priority points for cross-sell candidate.', '2026-09-11T00:00:00.000Z'),
  ('customer_service.weight_recent_interaction_reduction', '-20', 'number', 'Priority reduction after recent completed interaction.', '2026-09-11T00:00:00.000Z');

INSERT OR IGNORE INTO sync_runs (id, provider, entity_type, started_at, finished_at, status, imported_count, updated_count, skipped_count, failed_count, cursor, checkpoint, error_message, created_at, updated_at) VALUES
  ('sync-demo-customers', 'mock', 'customers', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:01.000Z', 'completed', 20, 0, 0, 0, NULL, 'demo-seed-2026-09', NULL, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:01.000Z');

-- Deterministic KPI demo facts. These remain normalized CRM data, not simulated production claims.
INSERT OR IGNORE INTO customer_interactions (id, customer_id, customer_location_id, user_id, interaction_type, reason, result, notes, next_action, follow_up_at, created_at, updated_at) VALUES
  ('int-kpi-react-cs', 'cus-006', 'loc-006-main', 'usr-cs-001', 'CALL', 'REACTIVATION', 'RESOLVED', 'Demo reactivation contact preceding a new order.', NULL, NULL, '2026-08-25T09:00:00.000Z', '2026-08-25T09:00:00.000Z');

INSERT OR IGNORE INTO sales_visits (id, customer_id, customer_location_id, sales_rep_id, source_task_id, planned_at, started_at, completed_at, status, result, notes, order_value, next_action, created_at, updated_at) VALUES
  ('vis-kpi-react-sales', 'cus-018', 'loc-018-main', 'usr-sales-003', NULL, '2026-08-28T10:00:00.000Z', '2026-08-28T10:02:00.000Z', '2026-08-28T10:45:00.000Z', 'completed', 'INTERESTED', 'Demo reactivation visit preceding a new order.', 0, 'NONE', '2026-08-20T10:00:00.000Z', '2026-08-28T10:45:00.000Z');

INSERT OR IGNORE INTO orders (id, external_id, customer_id, customer_location_id, order_number, order_date, net_amount, gross_amount, currency, status, source, created_at, updated_at) VALUES
  ('ord-023', 'erp-ord-023', 'cus-006', 'loc-006-main', 'ORD-2026-0903', '2026-09-03', 450, 540, 'EUR', 'completed', 'mock_erp', '2026-09-03T10:00:00.000Z', '2026-09-03T10:00:00.000Z'),
  ('ord-024', 'erp-ord-024', 'cus-018', 'loc-018-main', 'ORD-2026-0905-B', '2026-09-05', 800, 960, 'EUR', 'completed', 'mock_erp', '2026-09-05T10:00:00.000Z', '2026-09-05T10:00:00.000Z');

INSERT OR IGNORE INTO order_items (id, order_id, product_id, external_product_id, sku, product_name, quantity, unit_price, total_price) VALUES
  ('itm-026', 'ord-023', 'prd-005', 'erp-prd-005', 'NICO-PKG-001', 'Eco Packaging Set', 10, 45, 450),
  ('itm-027', 'ord-024', 'prd-006', 'erp-prd-006', 'NICO-B2B-001', 'B2B Starter Bundle', 4, 200, 800);

INSERT OR IGNORE INTO b2b_activations (id, customer_id, attributed_user_id, source_interaction_id, source_visit_id, activated_at, source, created_at, updated_at) VALUES
  ('b2b-act-001', 'cus-007', 'usr-cs-003', 'int-003', NULL, '2026-09-06T08:00:00.000Z', 'crm', '2026-09-06T08:00:00.000Z', '2026-09-06T08:00:00.000Z'),
  ('b2b-act-002', 'cus-008', 'usr-sales-002', NULL, 'vis-004', '2026-09-04T14:45:00.000Z', 'crm', '2026-09-04T14:45:00.000Z', '2026-09-04T14:45:00.000Z');

INSERT OR IGNORE INTO kpi_targets (id, kpi_definition_id, user_id, role, period_type, period_start, period_end, target_value, weight, created_at, updated_at) VALUES
  ('kpit-cs-turnover-sep', 'kpi-cs-turnover', NULL, 'customer_service', 'month', '2026-09-01', '2026-09-30', 1500, 0.60, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('kpit-cs-calls-v2-sep', 'kpi-cs-calls', NULL, 'customer_service', 'month', '2026-09-01', '2026-09-30', 30, 0.15, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('kpit-cs-react-sep', 'kpi-cs-reactivations', NULL, 'customer_service', 'month', '2026-09-01', '2026-09-30', 2, 0.20, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('kpit-cs-b2b-sep', 'kpi-cs-b2b', NULL, 'customer_service', 'month', '2026-09-01', '2026-09-30', 2, 0.05, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('kpit-sales-turnover-sep', 'kpi-sales-turnover', NULL, 'sales_rep', 'month', '2026-09-01', '2026-09-30', 2500, 0.50, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('kpit-sales-visits-v2-sep', 'kpi-sales-visits', NULL, 'sales_rep', 'month', '2026-09-01', '2026-09-30', 12, 0.25, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('kpit-sales-react-sep', 'kpi-sales-reactivations', NULL, 'sales_rep', 'month', '2026-09-01', '2026-09-30', 2, 0.15, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'),
  ('kpit-sales-b2b-sep', 'kpi-sales-b2b', NULL, 'sales_rep', 'month', '2026-09-01', '2026-09-30', 2, 0.10, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z');

INSERT OR IGNORE INTO company_kpi_targets (id, kpi_definition_id, period_type, period_start, period_end, target_value, created_at, updated_at) VALUES
  ('company-sales-sep-2026', 'kpi-sales-turnover', 'month', '2026-09-01', '2026-09-30', 6000, '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z');

INSERT OR IGNORE INTO system_config (key, value, value_type, description, updated_at) VALUES
  ('kpi.attribution_window_days', '30', 'number', 'Operational activity-to-order attribution window.', '2026-09-11T00:00:00.000Z'),
  ('kpi.reactivation_inactivity_days', '90', 'number', 'Minimum prior order inactivity for a reactivation outcome.', '2026-09-11T00:00:00.000Z');

INSERT OR IGNORE INTO system_config (key, value, value_type, description, updated_at) VALUES
  ('business.company_name', 'NICO', 'string', 'Company name shown in internal business settings.', '2026-09-11T00:00:00.000Z'),
  ('business.default_currency', 'EUR', 'string', 'Default reporting currency.', '2026-09-11T00:00:00.000Z'),
  ('business.default_reporting_period', 'month', 'string', 'Default management reporting period.', '2026-09-11T00:00:00.000Z'),
  ('ai.enabled', 'true', 'boolean', 'Enables user-triggered advisory AI assistance.', '2026-09-11T00:00:00.000Z'),
  ('ai.provider', 'MOCK', 'string', 'Configured AI provider: MOCK or OPENAI.', '2026-09-11T00:00:00.000Z'),
  ('ai.model', 'gpt-5.4-mini', 'string', 'Configured provider model identifier.', '2026-09-11T00:00:00.000Z'),
  ('ai.max_output_tokens', '700', 'number', 'Maximum provider output token budget.', '2026-09-11T00:00:00.000Z'),
  ('ai.timeout_ms', '15000', 'number', 'Provider request timeout in milliseconds.', '2026-09-11T00:00:00.000Z'),
  ('ai.cache_ttl_minutes', '15', 'number', 'Advisory response cache lifetime.', '2026-09-11T00:00:00.000Z');

-- Authentication demo identities. Production identities are mapped explicitly after SSO setup.
UPDATE users
SET auth_provider = 'mock', auth_subject = id
WHERE auth_provider IS NULL;
