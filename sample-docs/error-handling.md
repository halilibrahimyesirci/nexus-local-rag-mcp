# Error Handling in Modern Applications

## Introduction

Error handling is a critical aspect of building robust and reliable applications. Proper error handling can prevent crashes, provide useful debugging information, and improve user experience.

## Types of Errors

### 1. Syntax Errors
Syntax errors occur when code violates the language's grammar rules. These are caught at compile-time or parse-time and prevent execution.

### 2. Runtime Errors
Runtime errors occur during program execution. Examples include:
- Null pointer exceptions
- Division by zero
- File not found errors
- Network timeouts

### 3. Logic Errors
Logic errors occur when the code runs without crashing but produces incorrect results. These are the hardest to debug.

## Error Handling Strategies

### Try-Catch Blocks
The most common approach in most modern programming languages:

```python
try:
    result = 10 / denominator
except ZeroDivisionError:
    print("Cannot divide by zero")
except Exception as e:
    print(f"Unexpected error: {e}")
finally:
    print("Cleanup operations here")
```

### Error Codes
Returning error codes instead of throwing exceptions. Common in C and systems programming:

```c
int result = read_file(filename);
if (result == ERROR_FILE_NOT_FOUND) {
    // Handle missing file
}
```

### Monadic Error Handling
Functional programming approach using Maybe/Option or Either types:

```haskell
data Either e a = Left e | Right a

readFile :: FilePath -> IO (Either IOError String)
```

### Structured Logging
Instead of generic error messages, log structured data:

```json
{
  "level": "error",
  "msg": "Database connection failed",
  "timestamp": "2026-05-16T10:30:00Z",
  "service": "auth-service",
  "errorCode": "DB_TIMEOUT",
  "duration_ms": 5000
}
```

## Best Practices

1. **Be Specific** - Don't catch generic Exception if you can catch SQLException
2. **Clean Up Resources** - Use try-with-resources or finally blocks
3. **Log Contextual Information** - Include variables that led to the error
4. **Fail Fast** - Don't ignore errors and continue
5. **Provide User-Friendly Messages** - Never expose internal stack traces to users
6. **Handle at the Right Level** - Catch errors where they can be meaningfully handled
7. **Use Custom Exceptions** - Create domain-specific exceptions for your application

## Error Recovery

### Retry Logic
Some errors are transient and may succeed on retry:

```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

### Circuit Breaker Pattern
Prevent cascading failures by stopping requests to a failing service:

```
CLOSED (normal) → OPEN (after threshold failures) → HALF_OPEN (test retry) → CLOSED
```

### Fallback Values
Provide sensible defaults when operations fail:

```python
def get_user_name(user_id):
    try:
        return db.get_user(user_id).name
    except UserNotFound:
        return "Anonymous User"
```

## Testing Error Scenarios

### Unit Tests
Test that errors are caught and handled correctly:

```python
def test_division_by_zero():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)
```

### Integration Tests
Test error handling across multiple components:

```python
def test_database_connection_timeout():
    # Simulate database timeout
    with mock.patch('db.connect', side_effect=TimeoutError):
        result = service.process_data()
        assert result.status == 'failed'
        assert 'timeout' in result.error_message.lower()
```

## Common Pitfalls

1. **Swallowing Exceptions** - Catching errors and doing nothing
2. **Generic Exception Handling** - Catching too broad exception types
3. **Lost Stack Traces** - Re-throwing without preserving original error context
4. **Silent Failures** - Not logging errors at all
5. **Resource Leaks** - Not cleaning up in error paths

## Conclusion

Good error handling is the mark of a mature codebase. By implementing proper error handling strategies, you create applications that are more reliable, easier to debug, and better for users.
