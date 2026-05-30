# Authentication and Authorization Systems

## Chapter 1: Core Concepts

Authentication is the process of verifying that someone is who they claim to be. Authorization is the process of determining what an authenticated user is allowed to do.

### Authentication Methods

#### 1. Password-Based Authentication
The most common form of authentication involves a username and password. When a user logs in, the system verifies that the provided password matches the stored password (usually hashed).

**Best Practices:**
- Always hash passwords using bcrypt, Argon2, or PBKDF2
- Never store passwords in plain text
- Use salt to prevent rainbow table attacks
- Require minimum password length (12+ characters recommended)

#### 2. Multi-Factor Authentication (MFA)
MFA adds an additional layer of security by requiring multiple verification methods:
- Something you know (password)
- Something you have (phone, security key)
- Something you are (biometric)

#### 3. OAuth 2.0 and OpenID Connect
These protocols allow users to authenticate using third-party providers (Google, Microsoft, GitHub). The benefit is that users don't need to create yet another password.

## Chapter 2: Authorization Models

### Role-Based Access Control (RBAC)
RBAC assigns users to roles, and roles are granted permissions. For example:
- Admin role: can delete users
- Editor role: can edit content
- Viewer role: can only read

### Attribute-Based Access Control (ABAC)
ABAC makes decisions based on attributes of the user, resource, and environment. More flexible than RBAC but more complex.

### Access Control Lists (ACL)
ACLs specify which users or groups have access to specific resources.

## Chapter 3: Security Best Practices

1. **Use HTTPS/TLS** - Always encrypt data in transit
2. **Implement rate limiting** - Prevent brute force attacks
3. **Log authentication attempts** - Monitor for suspicious activity
4. **Session management** - Use secure session tokens
5. **Token expiration** - Tokens should expire after a set time
6. **Refresh tokens** - Use separate tokens for refreshing access

## Chapter 4: Common Vulnerabilities

### 1. Broken Authentication
- Weak password policies
- Credential stuffing attacks
- Session fixation

### 2. Broken Authorization
- Insecure Direct Object Reference (IDOR)
- Missing access controls
- Privilege escalation

### 3. Injection Attacks
- SQL injection in login forms
- Command injection
- LDAP injection

## Chapter 5: Implementation Examples

### Password Hashing (Node.js)
```javascript
const bcrypt = require('bcrypt');

// Hash a password
const hashedPassword = await bcrypt.hash(userPassword, 10);

// Verify a password
const isValid = await bcrypt.compare(userPassword, hashedPassword);
```

### JWT Token Generation
```javascript
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { userId: user.id, email: user.email },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
```

## Conclusion

Authentication and authorization are critical components of any secure application. By following best practices and staying aware of common vulnerabilities, you can build systems that protect user data and maintain trust.
