-- Migration for FAI System Setup

-- Create fai table with columns matching FAISubmission type
CREATE TABLE fai (
    id TEXT PRIMARY KEY, -- Using the SUB-XXXX ID from app
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    supplierName TEXT NOT NULL,
    partNumber TEXT NOT NULL,
    revision TEXT,
    timestamp BIGINT NOT NULL,
    status TEXT NOT NULL,
    files JSONB NOT NULL DEFAULT '[]',
    aiAnalysis JSONB,
    iqaRemarks TEXT,
    isNewVerdict BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE fai ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for fai
-- IQA can see everything, Suppliers can only see their own
CREATE POLICY "Users can view their own submissions" ON fai
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "IQA can view all submissions" ON fai
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role') = 'IQA'
        )
    );

CREATE POLICY "Users can insert their own submissions" ON fai
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions" ON fai
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "IQA can update any submission" ON fai
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role') = 'IQA'
        )
    );
