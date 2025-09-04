-- Check if the archived column exists in the contacts table
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

-- Show the structure of the contacts table
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
ORDER BY 
    ordinal_position;

-- Count total contacts and archived contacts
SELECT 
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN archived = true THEN 1 END) as archived_contacts,
    COUNT(CASE WHEN archived = false OR archived IS NULL THEN 1 END) as active_contacts
FROM 
    public.contacts;

-- Show a few sample contacts to see the archived field values
SELECT 
    id,
    name,
    bucket,
    archived,
    updated_at
FROM 
    public.contacts
ORDER BY 
    updated_at DESC
LIMIT 10;

-- Check if there are any contacts where archived is NULL
SELECT 
    COUNT(*) as null_archived_count
FROM 
    public.contacts
WHERE 
    archived IS NULL;
