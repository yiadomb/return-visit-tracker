-- Create agenda_notes table for syncing notes across devices
CREATE TABLE agenda_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  remote_uuid UUID UNIQUE,
  title TEXT,
  html TEXT,
  pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE agenda_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own notes
CREATE POLICY "Users can manage their own agenda notes" 
ON agenda_notes 
FOR ALL 
USING (auth.uid() = user_id);

-- Index for performance
CREATE INDEX idx_agenda_notes_user_id ON agenda_notes(user_id);
CREATE INDEX idx_agenda_notes_updated_at ON agenda_notes(updated_at);
CREATE INDEX idx_agenda_notes_remote_uuid ON agenda_notes(remote_uuid);
