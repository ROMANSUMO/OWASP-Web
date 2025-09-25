# 🔥 OWASP-Web Security Testing Guide

## 🚀 Setup Testing Environment

1. Start your backend server: `npm run dev` (in backend folder)
2. Start your frontend: `npm run dev` (in frontend folder)
3. Ensure both are running on localhost

## 🛠️ Automated Tools

### OWASP ZAP (Recommended)
1. Download: https://www.zaproxy.org/download/
2. Configure proxy: 127.0.0.1:8080
3. Target: http://localhost:3000 (frontend) and http://localhost:3001 (backend)
4. Run automated scan

### Burp Suite Community
1. Download: https://portswigger.net/burp/communitydownload
2. Configure proxy in browser
3. Intercept and modify requests

## 🎯 Manual Attack Testing

### 1. DoS/DDoS Testing
```bash
# Test timeout protection (should timeout after 60 seconds)
curl -X POST http://localhost:3001/api/login \
  --data '{"email":"test@test.com","password":"test"}' \
  --header "Content-Type: application/json" \
  --max-time 65

# Rate limiting test (should get blocked after 5 attempts)
for i in {1..10}; do
  curl -X POST http://localhost:3001/api/login \
    --data '{"email":"test@test.com","password":"wrong"}' \
    --header "Content-Type: application/json"
done
```

### 2. XSS Testing
```javascript
// Test in registration/login forms
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
<svg onload=alert('XSS')>
```

### 3. SQL Injection Testing
```sql
-- Test in login forms (should be blocked by Supabase)
admin'; DROP TABLE users; --
' OR '1'='1
' UNION SELECT * FROM users --
```

### 4. CSRF Testing
```bash
# Test without CSRF token (should fail)
curl -X POST http://localhost:3001/api/register \
  --data '{"email":"test@test.com","password":"password123"}' \
  --header "Content-Type: application/json"

# Get CSRF token first, then test
curl -X GET http://localhost:3001/api/csrf-token
```

### 5. Request Size Testing
```bash
# Test large payload (should be rejected at 1MB limit)
curl -X POST http://localhost:3001/api/register \
  --data '{"email":"test@test.com","password":"'$(python -c "print('A' * 2000000)")'"}'  \
  --header "Content-Type: application/json"
```

### 6. HTTPS Testing
```bash
# Test HTTP to HTTPS redirect (in production mode)
NODE_ENV=production npm start
curl -I http://localhost:3001/api/health
```

### 7. Security Headers Testing
```bash
# Check security headers
curl -I http://localhost:3001/api/health
# Look for: X-Frame-Options, X-XSS-Protection, X-Content-Type-Options, etc.
```

### 8. Session Testing
```bash
# Test session hijacking protection
curl -X GET http://localhost:3001/api/user \
  --cookie "websecurity.sid=invalid_session_id"
```

## 🌐 Online Testing Tools

### 1. SecurityHeaders.com
- Test: https://securityheaders.com/?q=http://localhost:3001
- Note: Won't work with localhost, deploy to test publicly

### 2. SSL Labs
- Test: https://www.ssllabs.com/ssltest/
- For HTTPS/TLS testing when deployed

### 3. Mozilla Observatory
- Test: https://observatory.mozilla.org/
- Comprehensive security analysis

## 🔍 Penetration Testing Payloads

### XSS Payloads
```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<svg onload=alert('XSS')>
javascript:alert('XSS')
<iframe src=javascript:alert('XSS')></iframe>
```

### SQL Injection Payloads
```sql
' OR 1=1--
' OR 'a'='a
admin'--
' UNION SELECT username, password FROM users--
'; DROP TABLE users; --
```

### LDAP Injection
```
*)(uid=*))(|(uid=*
*)(|(password=*))
```

### Command Injection
```bash
; ls -la
| cat /etc/passwd
`whoami`
$(id)
```

## 📊 Expected Results

### ✅ What Should Be Blocked:
- XSS attempts → Sanitized by DOMPurify
- Large requests → 413 Request Entity Too Large
- Too many requests → 429 Too Many Requests  
- Missing CSRF tokens → 403 Forbidden
- Invalid content types → 400 Bad Request
- Slow requests → 408 Request Timeout (after 60s)

### ⚠️ What Supabase Handles:
- SQL Injection → Built-in protection
- Authentication bypass → JWT validation
- Password attacks → Built-in hashing
- IDOR → Row Level Security

## 🚨 Advanced Testing

### Load Testing with Artillery
```bash
npm install -g artillery
artillery quick --count 100 --num 10 http://localhost:3001/api/health
```

### WebSocket Testing (if applicable)
```javascript
// Test WebSocket connections for vulnerabilities
const ws = new WebSocket('ws://localhost:3001');
```

## 🎯 Vulnerability Assessment Checklist

- [ ] XSS Protection
- [ ] CSRF Protection  
- [ ] Rate Limiting
- [ ] Request Size Limits
- [ ] Timeout Protection
- [ ] Security Headers
- [ ] HTTPS Enforcement
- [ ] Input Validation
- [ ] Error Handling
- [ ] Session Security
- [ ] CORS Configuration
- [ ] Content Type Validation

## 📝 Testing Notes

1. **Test in Development Mode First** - More detailed error messages
2. **Test Each Endpoint** - /api/register, /api/login, /api/user, etc.
3. **Use Different Browsers** - Check for browser-specific issues
4. **Test Mobile/Tablet** - Responsive security
5. **Network Conditions** - Test on slow connections

## 🔧 Professional Tools (Paid)

1. **Nessus** - Comprehensive vulnerability scanner
2. **Burp Suite Professional** - Advanced web app testing
3. **Acunetix** - Automated security testing
4. **OWASP ZAP Professional** - Enhanced features

Remember: Always test in a controlled environment and never run these tests against applications you don't own!