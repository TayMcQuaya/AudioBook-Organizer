# Audio Upload 402 Error Analysis

## Symptoms
- First audio upload: ✅ Works
- Second audio upload to different section: ❌ Sometimes fails with 402
- Same audio file to different section: ✅ Sometimes works
- After deletion and re-upload: ❌ Often fails with 402
- User has 20,000+ credits (not a credit shortage issue)

## Error Details
```
POST /api/upload 402 (Payment Required)
ERR_HTTP2_PROTOCOL_ERROR
```

## Analysis

### What 402 Means in This App
The 402 "Payment Required" status is ONLY returned when:
```python
if current_credits < required_credits:
    return jsonify({...}), 402
```

### The Paradox
- User has 20,000+ credits
- Audio upload costs 2 credits
- But `get_user_credits()` is returning a low value

### Possible Causes

#### 1. Database Query Issues
The query might be failing or returning incorrect data:
```python
result = self.client.table('user_credits').select('credits').eq('user_id', user_id).execute()
```

Potential issues:
- RLS (Row Level Security) blocking the query
- Database connection timeout
- Query returning null/empty result
- Wrong user_id being passed

#### 2. Race Condition
- Frontend checks credits (shows 20,000+)
- User performs action (deletion/upload)
- Backend checks credits (gets different value)
- This could happen if:
  - Database is being updated between checks
  - Different database connections see different data
  - Transaction isolation issues

#### 3. HTTP2 Protocol Error
The `ERR_HTTP2_PROTOCOL_ERROR` suggests:
- Connection being terminated abnormally
- Possible timeout during credit check
- Server overload or rate limiting

#### 4. Caching Issues
Even though `use_cache=False`, there might be:
- Database-level caching
- Connection pooling issues
- Stale connections

## Why It's Inconsistent

The inconsistent behavior suggests:
1. **Timing-dependent**: Works sometimes, fails others
2. **Not file-specific**: Same file can work or fail
3. **Not section-specific**: Different sections show same behavior
4. **Deletion-triggered**: More likely after deletion

## Debugging Steps

### 1. Add Detailed Logging
Already added:
```python
app.logger.info(f"Credit check - User: {user['id']}, Current: {current_credits}, Required: {required_credits}")
```

### 2. Check Backend Logs
Look for:
- What value `get_user_credits()` returns
- Any database errors
- Connection timeouts

### 3. Database Queries to Run
```sql
-- Check actual credits
SELECT credits, storage_used_mb, storage_quota_mb 
FROM user_credits 
WHERE user_id = 'YOUR_USER_ID';

-- Check if there are duplicate records
SELECT user_id, COUNT(*) 
FROM user_credits 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Check recent transactions
SELECT * FROM credit_transactions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 10;
```

### 4. Test Scenarios
1. Upload → Check logs → Note credit value
2. Delete → Wait 5 seconds → Upload → Check logs
3. Upload multiple files rapidly → Check for pattern

## Potential Fixes

### 1. Add Retry Logic
```python
# Retry credit check with exponential backoff
for attempt in range(3):
    current_credits = supabase_service.get_user_credits(user['id'], use_cache=False)
    if current_credits > 0:
        break
    time.sleep(0.5 * (2 ** attempt))
```

### 2. Use Service Client
The credit check might need to use the service client to bypass RLS:
```python
# Use service client for credit checks
service_client = get_service_client()
result = service_client.table('user_credits')...
```

### 3. Add Error Details
Return more information when credit check fails:
```python
if current_credits < required_credits:
    return jsonify({
        'error': 'Insufficient credits',
        'message': f'This action requires {required_credits} credits. You have {current_credits} credits.',
        'current_credits': current_credits,
        'required_credits': required_credits,
        'user_id': user['id'],  # For debugging
        'check_time': datetime.now().isoformat()  # For debugging
    }), 402
```

## Next Steps

1. **Check backend logs** for the actual credit values being returned
2. **Run the SQL queries** to verify database state
3. **Monitor timing** - is it always after deletion?
4. **Test with delays** - does waiting between operations help?
5. **Check Supabase logs** for any RLS or connection errors