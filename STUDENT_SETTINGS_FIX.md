# Student Settings Page - Fixes & Enhancements

## Issues Fixed

### 1. PGRST116 Error on Data Loading
**Problem:** The page was using `.single()` method which throws a PGRST116 error when no records are found in the database.

**Solution:** Changed both data loading queries from `.single()` to `.maybeSingle()`:
- Initial data load (line ~109)
- Refresh data function (line ~195)

**Why this matters:**
- `.single()` expects exactly 1 row, throws error on 0 rows
- `.maybeSingle()` returns null on 0 rows without error
- Provides better user experience with graceful error handling

### 2. Enhanced Error Messages
**Before:** Generic "Error" or "Failed to load student data"

**After:** Detailed error messages showing the actual database error:
- "Database Error: [specific error message]"
- Helps with debugging and gives users better feedback

## New Features Added

### Additional User Details Display
The page now shows ALL available data from the `user_requests` table:

1. **Full Name** - Student's complete name
2. **Username** - Social/display username (if available)
3. **Registration Number** - Unique student identifier
4. **Email** - Contact email address
5. **Course** - Enrolled course/program
6. **Phone** - Contact number
7. **Year** - Academic year (NEW - shown if available)
8. **Account Status** - Shows approval status (NEW - approved/pending/etc.)
9. **Member Since** - Account creation date (NEW - formatted as readable date)

### Visual Enhancements
- Green checkmark icon for Account Status
- Clock icon for Member Since date
- Calendar icon for Year
- Color-coded status text (green for active/approved)
- Formatted date display (e.g., "October 9, 2025")

## Data Flow

### 1. Initial Load
```
params.registration → Check AsyncStorage (persistent) → Check AsyncStorage (session) → Fetch from Supabase
```

### 2. Data Storage
All fetched data is saved to:
- `persistentStudentData_{regNo}` - Persistent across sessions
- `currentStudentData` - Current session only

### 3. Refresh Button
- Fetches fresh data from `user_requests` table
- Updates all state variables
- Saves to persistent storage
- Shows success alert

## Database Query

### Query Details
```typescript
const { data, error } = await supabase
  .from('user_requests')
  .select('*')  // Gets ALL columns
  .eq('registration_number', regNo)
  .eq('user_type', 'Student')
  .eq('status', 'approved')
  .maybeSingle();  // Returns null if no match, no error
```

### Fields Retrieved from user_requests
- `name` / `user_name` - Display name
- `username` - Social username
- `registration_number` - Student ID
- `email` - Email address
- `course` - Course name
- `phone` - Phone number
- `year` - Academic year
- `user_type` - User role (Student/Expert/Admin)
- `status` - Approval status
- `created_at` - Registration timestamp
- `updated_at` - Last modification timestamp

## State Variables

All user data is stored in React state:
```typescript
const [studentName, setStudentName] = useState('');
const [studentUsername, setStudentUsername] = useState('');
const [studentCourse, setStudentCourse] = useState('');
const [studentEmail, setStudentEmail] = useState('');
const [studentPhone, setStudentPhone] = useState('');
const [studentYear, setStudentYear] = useState('');        // NEW
const [studentStatus, setStudentStatus] = useState('');    // NEW
const [accountCreatedAt, setAccountCreatedAt] = useState(''); // NEW
const [isLoading, setIsLoading] = useState(true);
const [studentRegNo, setStudentRegNo] = useState('');
```

## Error Handling

### Graceful Degradation
- Shows "Not available" for missing required fields
- Shows "Not provided" for optional fields
- Conditionally renders fields that might not exist (username, year, created_at)
- No crashes if data is incomplete

### User-Friendly Messages
1. **Loading:** "Loading your data..."
2. **Database Error:** Shows specific error message
3. **No Data:** "No student record found in the database"
4. **Success:** "Student data refreshed successfully!"

## Testing Checklist

### Test Scenarios
- [ ] Login with valid student registration number
- [ ] Check all fields display correctly
- [ ] Press refresh button - verify data reloads
- [ ] Test with student record missing optional fields (username, year)
- [ ] Test with wrong registration number - should show error gracefully
- [ ] Change profile picture - should save and redirect
- [ ] Logout and login again - data should persist

### Expected Behavior
✅ All fields from user_requests table displayed
✅ No PGRST116 errors in console
✅ Loading state shows before data appears
✅ Refresh button works and shows success message
✅ Data persists between sessions
✅ Graceful handling of missing data
✅ Profile picture changes save correctly

## Files Modified
- `app/student/student-setting.tsx`
  - Changed `.single()` to `.maybeSingle()` (2 locations)
  - Added 3 new state variables
  - Enhanced error messages
  - Added Year, Status, and Member Since display
  - Added statusText style

## Related Fixes
This fix is similar to the authentication fix in `app/index.tsx` where we also changed `.single()` to `.maybeSingle()` to prevent PGRST116 errors.

**Key Learning:** Always use `.maybeSingle()` for queries that might return 0 rows (searches, lookups). Only use `.single()` when you're certain the row exists.
