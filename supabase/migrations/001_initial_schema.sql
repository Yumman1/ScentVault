-- ============================================
-- ScentVault Database Schema
-- Migration 001: Initial Schema
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (Linked to Supabase Auth)
-- ============================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'Viewer' CHECK (role IN ('Admin', 'Operator', 'Viewer')),
    can_view_prices BOOLEAN NOT NULL DEFAULT false,
    allowed_location_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, role, can_view_prices)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Viewer'),
        CASE WHEN COALESCE(NEW.raw_user_meta_data->>'role', 'Viewer') = 'Admin' THEN true ELSE false END
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SUPPLIERS
-- ============================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Local' CHECK (type IN ('Local', 'International')),
    contact_person TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CUSTOMERS
-- ============================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PACKING TYPES
-- ============================================
CREATE TABLE packing_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    qty_per_packing NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- LOCATIONS
-- ============================================
CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'Main Location' CHECK (type IN ('Main Location', 'Sub Location')),
    parent_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- OLFACTIVE NOTES
-- ============================================
CREATE TABLE olfactive_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PERFUMES
-- ============================================
CREATE TABLE perfumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    code TEXT NOT NULL DEFAULT '',
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    dosage NUMERIC NOT NULL DEFAULT 0,
    price_usd NUMERIC NOT NULL DEFAULT 0,
    price_pkr NUMERIC NOT NULL DEFAULT 0,
    low_stock_alert NUMERIC NOT NULL DEFAULT 0,
    olfactive_notes TEXT[] DEFAULT '{}',
    remarks TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- GATE IN LOGS
-- ============================================
CREATE TABLE gate_in_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE RESTRICT,
    import_reference TEXT NOT NULL DEFAULT '',
    packing_type_id UUID REFERENCES packing_types(id) ON DELETE SET NULL,
    packing_qty NUMERIC NOT NULL DEFAULT 0,
    net_weight NUMERIC NOT NULL DEFAULT 0,
    main_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    sub_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    supplier_invoice TEXT NOT NULL DEFAULT '',
    remarks TEXT NOT NULL DEFAULT '',
    price_usd NUMERIC,
    price_pkr NUMERIC,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- GATE OUT LOGS
-- ============================================
CREATE TABLE gate_out_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE RESTRICT,
    packing_type_id UUID REFERENCES packing_types(id) ON DELETE SET NULL,
    packing_qty NUMERIC NOT NULL DEFAULT 0,
    net_weight NUMERIC NOT NULL DEFAULT 0,
    main_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    sub_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    usage TEXT NOT NULL DEFAULT 'Production' CHECK (usage IN ('Production', 'Sale')),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    remarks TEXT NOT NULL DEFAULT '',
    batch_number TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- STOCK TRANSFER LOGS
-- ============================================
CREATE TABLE stock_transfer_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    perfume_id UUID NOT NULL REFERENCES perfumes(id) ON DELETE RESTRICT,
    packing_type_id UUID REFERENCES packing_types(id) ON DELETE SET NULL,
    packing_qty NUMERIC NOT NULL DEFAULT 0,
    net_weight NUMERIC NOT NULL DEFAULT 0,
    from_main_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    from_sub_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    to_main_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    to_sub_location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    remarks TEXT NOT NULL DEFAULT '',
    batch_number TEXT NOT NULL DEFAULT '',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT NOT NULL DEFAULT 'System',
    action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'UNDO')),
    entity TEXT NOT NULL CHECK (entity IN ('SUPPLIER', 'CUSTOMER', 'PERFUME', 'LOCATION', 'PACKING_TYPE', 'GATE_IN', 'GATE_OUT', 'TRANSFER', 'USER', 'OLFACTIVE_NOTE')),
    entity_id TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    previous_state JSONB
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX idx_gate_in_perfume ON gate_in_logs(perfume_id);
CREATE INDEX idx_gate_in_location ON gate_in_logs(main_location_id);
CREATE INDEX idx_gate_in_date ON gate_in_logs(date);

CREATE INDEX idx_gate_out_perfume ON gate_out_logs(perfume_id);
CREATE INDEX idx_gate_out_location ON gate_out_logs(main_location_id);
CREATE INDEX idx_gate_out_date ON gate_out_logs(date);

CREATE INDEX idx_transfer_perfume ON stock_transfer_logs(perfume_id);
CREATE INDEX idx_transfer_date ON stock_transfer_logs(date);

CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);

CREATE INDEX idx_perfumes_supplier ON perfumes(supplier_id);
CREATE INDEX idx_locations_parent ON locations(parent_id);
