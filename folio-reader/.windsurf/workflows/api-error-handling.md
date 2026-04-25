# API Error Handling Workflow

Consistent patterns for handling API errors, retries, and offline states.

## Common Error Scenarios

### 1. Network Errors (No Connection)
```typescript
// Check before API call
try {
  const response = await api.fetchLibraries();
  // handle success
} catch (error) {
  if (error.message?.includes('Network Error') || !navigator.onLine) {
    // Show offline state UI
    setNetworkError('No connection. Please check your network.');
    setConnected(false);
  }
}
```

### 2. Authentication Errors (401/403)
```typescript
catch (error) {
  if (error.response?.status === 401) {
    // Token expired - redirect to login
    router.replace('/login');
  } else if (error.response?.status === 403) {
    // Permission denied
    setError('You do not have permission to access this resource.');
  }
}
```

### 3. Retry Logic with Backoff
```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
      }
    }
  }
  throw lastError;
}
```

### 4. Error State UI Pattern
```typescript
// In component render
{networkError ? (
  <View style={styles.centered}>
    <Ionicons name="cloud-offline" size={48} color={colors.textMuted} />
    <Text style={{ color: colors.textSecondary, marginTop: Spacing.md }}>
      {networkError}
    </Text>
    <TouchableOpacity onPress={retry} style={{ marginTop: Spacing.lg }}>
      <Text style={{ color: colors.accent }}>Retry</Text>
    </TouchableOpacity>
  </View>
) : loading ? (
  <ActivityIndicator color={colors.accent} size="large" />
) : (
  // Actual content
)}
```

## Checklist for API Calls

- [ ] Wrap in try-catch
- [ ] Set loading state before call
- [ ] Clear previous errors
- [ ] Handle network errors specifically
- [ ] Handle auth errors (401/403)
- [ ] Set error state for UI display
- [ ] Always set loading false in finally
- [ ] Log errors with context (endpoint, params)

## Common Mistakes

- ❌ Not clearing error state on retry
- ❌ Not handling loading state consistently
- ❌ Silent failures (catch with no action)
- ✅ Use `finally` to ensure loading state resets
- ✅ Distinguish between retryable and permanent errors

## Example: Complete Pattern

```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
const [data, setData] = useState(null);

const loadData = async () => {
  setLoading(true);
  setError(null); // Clear previous error
  
  try {
    const result = await fetchWithRetry(() => api.getData());
    setData(result);
  } catch (err) {
    console.error('[ComponentName] Failed to load:', err);
    setError(err.message || 'Failed to load data');
  } finally {
    setLoading(false);
  }
};
```
