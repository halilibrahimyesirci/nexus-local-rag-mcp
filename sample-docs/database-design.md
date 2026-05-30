# Database Design Best Practices

## Table of Contents
1. Normalization
2. Indexing Strategies
3. Query Optimization
4. Transaction Management
5. Backup and Recovery
6. Security

## 1. Database Normalization

Normalization is the process of organizing data to reduce redundancy and improve data integrity.

### First Normal Form (1NF)
- Each table should have a primary key
- No repeating groups or array values in cells
- Each attribute contains only atomic values

Example: Instead of storing multiple phone numbers in one cell:
```
WRONG:  Users: { id, name, phones: [123-456-7890, 234-567-8901] }
RIGHT:  UserPhones: { user_id, phone_number }
```

### Second Normal Form (2NF)
- Must be in 1NF
- All non-key attributes must depend on the entire primary key
- Remove partial dependencies

### Third Normal Form (3NF)
- Must be in 2NF
- No transitive dependencies
- Non-key attributes depend only on the primary key

## 2. Indexing Strategies

Indexes speed up queries but slow down inserts/updates. Choose wisely.

### Types of Indexes
- **Primary Key Index** - Automatically created, enforces uniqueness
- **Unique Index** - Ensures all values in the indexed column are different
- **Full-Text Index** - For text search (LIKE queries)
- **Composite Index** - Index on multiple columns

### When to Index
- Foreign key columns (for joins)
- Columns frequently used in WHERE clauses
- Columns used in ORDER BY or GROUP BY
- Large tables with millions of rows

### When NOT to Index
- Small tables (< 1000 rows)
- Columns with low cardinality (few distinct values)
- Columns that are frequently updated
- Columns that are NULL frequently

## 3. Query Optimization

### Use EXPLAIN
Most databases provide an EXPLAIN command to see the query execution plan:

```sql
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

Look for:
- Full table scans (avoid if possible)
- Index usage
- Number of rows examined

### Query Patterns
```sql
-- GOOD: Uses index on user_id
SELECT * FROM orders WHERE user_id = 123;

-- BAD: Function call on indexed column prevents index use
SELECT * FROM orders WHERE YEAR(created_at) = 2026;

-- GOOD: Direct comparison allows index use
SELECT * FROM orders WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01';
```

## 4. Transaction Management

Transactions ensure data consistency through ACID properties:
- **Atomicity** - All or nothing
- **Consistency** - Data remains valid
- **Isolation** - Concurrent transactions don't interfere
- **Durability** - Committed data persists

```sql
BEGIN TRANSACTION;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

## 5. Backup and Recovery

### Backup Strategies
- **Full backups** - Complete copy of database (large, slower)
- **Incremental backups** - Only changes since last backup (smaller, faster)
- **Differential backups** - Changes since last full backup

### Recovery Testing
Always test recovery procedures. A backup that can't be restored is worthless.

## 6. Security

### SQL Injection Prevention
Always use parameterized queries:

```python
# WRONG: Vulnerable to SQL injection
query = f"SELECT * FROM users WHERE id = {user_id}"

# RIGHT: Parameterized query
cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
```

### Access Control
- Grant minimum necessary permissions
- Use roles and role-based access control
- Regularly audit user permissions

### Encryption
- Encrypt sensitive data at rest (passwords, SSNs, credit cards)
- Use encryption in transit (TLS/SSL)

## Performance Monitoring

Monitor key metrics:
- Query execution time
- Number of slow queries (logs)
- Index fragmentation
- Disk space usage
- Connection pool usage

## Conclusion

Database design and optimization is both art and science. By following these best practices and continuously monitoring performance, you can build databases that are fast, secure, and maintainable.
