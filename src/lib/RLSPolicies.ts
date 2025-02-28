
// This file is for reference only and contains the SQL commands that have been 
// executed to set up the Row-Level Security policies for the datasets table and storage bucket

/*

-- For the datasets table:

-- Enable row level security
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

-- Users can view only their own datasets
CREATE POLICY "Users can view their own datasets" 
ON public.datasets 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own datasets
CREATE POLICY "Users can insert their own datasets" 
ON public.datasets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own datasets
CREATE POLICY "Users can update their own datasets" 
ON public.datasets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own datasets
CREATE POLICY "Users can delete their own datasets" 
ON public.datasets 
FOR DELETE 
USING (auth.uid() = user_id);

-- For the storage.objects table (that manages files in buckets):

-- Allow users to upload files to their own folder within the bucket
CREATE POLICY "Users can upload files to datasets"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'datasets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own files
CREATE POLICY "Users can view their own files"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'datasets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'datasets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- For admin access (if needed):

-- Admin can view all datasets
CREATE POLICY "Admins can view all datasets"
ON public.datasets
FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM admin_users WHERE is_superadmin = true
  )
);

-- Note: This would require an admin_users table to be created

*/
