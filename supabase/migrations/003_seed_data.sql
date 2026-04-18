-- ============================================
-- ScentVault Seed Data
-- Migration 003: Default Data
-- ============================================

-- ============================================
-- Default Olfactive Notes
-- ============================================
INSERT INTO olfactive_notes (name) VALUES
    ('Fruity'),
    ('Floral'),
    ('Oud'),
    ('Woody'),
    ('Citrus'),
    ('ANTIBACTERIAL'),
    ('REXONA'),
    ('GREEN'),
    ('ROYAL LATHER'),
    ('ALOE VERA')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- Default Suppliers
-- ============================================
INSERT INTO suppliers (name, type, contact_person, phone, email) VALUES
    ('Takasago', 'International', 'Abdullah Zaki', '03008231100', 'impzaks@gmail.com'),
    ('Firmenich', 'International', 'Amjad Hussain', '03002570546', 'amjad.hussain@dsm-firmenich.com'),
    ('Iberchem', 'International', 'Ejaz Ahmed', '+971557530300', 'Ejaz.Ahmed@iberchem.com'),
    ('Givaudan', 'International', 'Asif Butt', '03000455574', 'asif.butt@givaudan.com'),
    ('Ikon Essences', 'Local', 'Muhammad Saleem', '03332160683', ''),
    ('Symrise', 'International', 'Shujaat', '03028233082', 'shujaat@fei.com.pk'),
    ('Janpex', 'International', 'Amit Ashok', '+919910199990', ''),
    ('Hilal Care', 'Local', 'Salman', '03370104940', ''),
    ('ZAKs Fragrance', 'Local', 'Shamoon Zaki', '03458231100', 'shazakint@gmail.com');

-- ============================================
-- Default Packing Types
-- ============================================
INSERT INTO packing_types (name, description, qty_per_packing) VALUES
    ('200 KG Drums', 'Standard large metal/plastic drum', 200),
    ('1 Ton IBC Tank', 'Intermediate Bulk Container', 1000),
    ('25 KG Drum', 'Small plastic drum', 25),
    ('50 KG Drum', 'Medium plastic drum', 50),
    ('100 KG Drum', 'Medium large drum', 100),
    ('180 KG Drum', 'Large drum weight variant', 180);

-- ============================================
-- Default Perfumes (Takasago)
-- These reference the Takasago supplier seeded above.
-- We use a subquery to find the Takasago supplier ID.
-- ============================================
INSERT INTO perfumes (code, name, supplier_id, price_usd, price_pkr, olfactive_notes, low_stock_alert, dosage, remarks)
SELECT code, p_name, s.id, price_usd, price_pkr, olfactive_notes, 25, 1.5, ''
FROM (
    VALUES
        ('T15129337', 'LUXURE MIST', 8.32, 2880, ARRAY[]::TEXT[]),
        ('T12039341', 'BEAUTY LINEN', 9.35, 3190, ARRAY[]::TEXT[]),
        ('T15143284', 'BLUEBELL JINGLE', 6.02, 2220, ARRAY[]::TEXT[]),
        ('T15132049', 'PINK MUSK SENSATION', 6.09, 2250, ARRAY[]::TEXT[]),
        ('M-ACTIVE', 'M-ACTIVE FRESH', 8.30, 3113, ARRAY['ANTIBACTERIAL']::TEXT[]),
        ('T15128504', 'REXONA', 8.16, 2840, ARRAY['REXONA', 'GREEN']::TEXT[]),
        ('T15100945', 'ROYAL LEATHER', 9.78, 3330, ARRAY['ROYAL LATHER']::TEXT[]),
        ('T15143277', 'ALOE AQUA', 5.60, 2120, ARRAY['GREEN', 'ALOE VERA']::TEXT[])
) AS data(code, p_name, price_usd, price_pkr, olfactive_notes)
CROSS JOIN (SELECT id FROM suppliers WHERE name = 'Takasago' LIMIT 1) AS s;
