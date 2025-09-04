-- Add the archived column to the contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

-- Add an index for better performance when filtering archived contacts
CREATE INDEX IF NOT EXISTS contacts_archived_idx ON public.contacts(archived);

-- Verify the column was added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'contacts'
    AND column_name = 'archived';

-- Check that all existing contacts have archived = false
SELECT 
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN archived = true THEN 1 END) as archived_contacts,
    COUNT(CASE WHEN archived = false THEN 1 END) as active_contacts
FROM 
    public.contacts;
