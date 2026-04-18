-- ============================================
-- ScentVault Row-Level Security Policies
-- Migration 002: RLS Policies
-- ============================================

-- ============================================
-- Helper function: Get current user's role
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- PROFILES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read all profiles (needed for displaying user names)
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can update any profile (role changes)
CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE USING (public.get_user_role() = 'Admin');

-- ============================================
-- SUPPLIERS - Admin can manage, all can read
-- ============================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "suppliers_select" ON suppliers
    FOR SELECT USING (true);

CREATE POLICY "suppliers_insert" ON suppliers
    FOR INSERT WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "suppliers_update" ON suppliers
    FOR UPDATE USING (public.get_user_role() = 'Admin');

CREATE POLICY "suppliers_delete" ON suppliers
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- CUSTOMERS - Admin can manage, all can read
-- ============================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select" ON customers
    FOR SELECT USING (true);

CREATE POLICY "customers_insert" ON customers
    FOR INSERT WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "customers_update" ON customers
    FOR UPDATE USING (public.get_user_role() = 'Admin');

CREATE POLICY "customers_delete" ON customers
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- PACKING TYPES - Admin can manage, all can read
-- ============================================
ALTER TABLE packing_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "packing_types_select" ON packing_types
    FOR SELECT USING (true);

CREATE POLICY "packing_types_insert" ON packing_types
    FOR INSERT WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "packing_types_update" ON packing_types
    FOR UPDATE USING (public.get_user_role() = 'Admin');

CREATE POLICY "packing_types_delete" ON packing_types
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- LOCATIONS - Admin can manage, all can read
-- ============================================
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "locations_select" ON locations
    FOR SELECT USING (true);

CREATE POLICY "locations_insert" ON locations
    FOR INSERT WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "locations_update" ON locations
    FOR UPDATE USING (public.get_user_role() = 'Admin');

CREATE POLICY "locations_delete" ON locations
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- OLFACTIVE NOTES - Admin can manage, all can read
-- ============================================
ALTER TABLE olfactive_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "olfactive_notes_select" ON olfactive_notes
    FOR SELECT USING (true);

CREATE POLICY "olfactive_notes_insert" ON olfactive_notes
    FOR INSERT WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "olfactive_notes_update" ON olfactive_notes
    FOR UPDATE USING (public.get_user_role() = 'Admin');

CREATE POLICY "olfactive_notes_delete" ON olfactive_notes
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- PERFUMES - Admin can manage, all can read
-- ============================================
ALTER TABLE perfumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "perfumes_select" ON perfumes
    FOR SELECT USING (true);

CREATE POLICY "perfumes_insert" ON perfumes
    FOR INSERT WITH CHECK (public.get_user_role() = 'Admin');

CREATE POLICY "perfumes_update" ON perfumes
    FOR UPDATE USING (public.get_user_role() = 'Admin');

CREATE POLICY "perfumes_delete" ON perfumes
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- GATE IN LOGS - Admin & Operator can manage, all can read
-- ============================================
ALTER TABLE gate_in_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gate_in_select" ON gate_in_logs
    FOR SELECT USING (true);

CREATE POLICY "gate_in_insert" ON gate_in_logs
    FOR INSERT WITH CHECK (public.get_user_role() IN ('Admin', 'Operator'));

CREATE POLICY "gate_in_update" ON gate_in_logs
    FOR UPDATE USING (public.get_user_role() IN ('Admin', 'Operator'));

CREATE POLICY "gate_in_delete" ON gate_in_logs
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- GATE OUT LOGS - Admin & Operator can manage, all can read
-- ============================================
ALTER TABLE gate_out_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gate_out_select" ON gate_out_logs
    FOR SELECT USING (true);

CREATE POLICY "gate_out_insert" ON gate_out_logs
    FOR INSERT WITH CHECK (public.get_user_role() IN ('Admin', 'Operator'));

CREATE POLICY "gate_out_update" ON gate_out_logs
    FOR UPDATE USING (public.get_user_role() IN ('Admin', 'Operator'));

CREATE POLICY "gate_out_delete" ON gate_out_logs
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- STOCK TRANSFER LOGS - Admin & Operator can manage, all can read
-- ============================================
ALTER TABLE stock_transfer_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "transfer_select" ON stock_transfer_logs
    FOR SELECT USING (true);

CREATE POLICY "transfer_insert" ON stock_transfer_logs
    FOR INSERT WITH CHECK (public.get_user_role() IN ('Admin', 'Operator'));

CREATE POLICY "transfer_update" ON stock_transfer_logs
    FOR UPDATE USING (public.get_user_role() IN ('Admin', 'Operator'));

CREATE POLICY "transfer_delete" ON stock_transfer_logs
    FOR DELETE USING (public.get_user_role() = 'Admin');

-- ============================================
-- AUDIT LOGS - Admin can read, system inserts
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_select" ON audit_logs
    FOR SELECT USING (public.get_user_role() = 'Admin');

CREATE POLICY "audit_insert" ON audit_logs
    FOR INSERT WITH CHECK (true);
