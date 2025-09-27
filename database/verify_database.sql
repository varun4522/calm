-- Quick Database Test Script
-- Run this to verify all tables and columns exist after setup

-- Test 1: Check if experts table exists and has required columns
SELECT 'Testing experts table...' as test;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'experts' 
ORDER BY column_name;

-- Test 2: Check if peer_listeners table exists with status column
SELECT 'Testing peer_listeners table...' as test;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'peer_listeners' 
ORDER BY column_name;

-- Test 3: Check if book_request table exists with expert_id column
SELECT 'Testing book_request table...' as test;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'book_request' 
ORDER BY column_name;

-- Test 4: Count records in each table
SELECT 'experts' as table_name, COUNT(*) as record_count FROM experts
UNION ALL
SELECT 'peer_listeners' as table_name, COUNT(*) as record_count FROM peer_listeners  
UNION ALL
SELECT 'book_request' as table_name, COUNT(*) as record_count FROM book_request;

-- Test 5: Verify RLS policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('experts', 'peer_listeners', 'book_request');

SELECT 'Database verification complete!' as status;