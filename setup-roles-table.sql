-- Create roles table for managing job roles and cost codes
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role_name TEXT NOT NULL UNIQUE,
    cost_code TEXT,
    hourly_rate DECIMAL(10,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_roles_status ON roles(status);
CREATE INDEX IF NOT EXISTS idx_roles_role_name ON roles(role_name);

-- Enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone authenticated can view roles
CREATE POLICY "Anyone can view roles"
    ON roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only admins can insert roles (we'll handle this in the app)
CREATE POLICY "Admins can insert roles"
    ON roles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy: Only admins can update roles (we'll handle this in the app)
CREATE POLICY "Admins can update roles"
    ON roles
    FOR UPDATE
    TO authenticated
    USING (true);

-- Policy: Only admins can delete roles (we'll handle this in the app)
CREATE POLICY "Admins can delete roles"
    ON roles
    FOR DELETE
    TO authenticated
    USING (true);

-- Insert default roles (current hardcoded ones)
INSERT INTO roles (role_name, status) VALUES
    ('Laborer', 'active'),
    ('Foreman', 'active'),
    ('Equipment Operator', 'active'),
    ('Irrigation Specialist', 'active'),
    ('Crew Leader', 'active'),
    ('Landscape Designer', 'active')
ON CONFLICT (role_name) DO NOTHING;
