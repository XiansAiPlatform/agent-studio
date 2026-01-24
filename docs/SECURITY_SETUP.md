# Security Setup Guide

This guide covers the security configurations implemented in the application.

## ✅ Implemented Security Features

### 1. Security Headers

The application now includes comprehensive security headers configured in `next.config.ts`:

- **X-DNS-Prefetch-Control**: Controls DNS prefetching
- **Strict-Transport-Security (HSTS)**: Forces HTTPS connections
- **X-Frame-Options**: Prevents clickjacking attacks
- **X-Content-Type-Options**: Prevents MIME-type sniffing
- **X-XSS-Protection**: Enables browser XSS protection
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts access to browser features

### 2. Secure Cookie Configuration

NextAuth cookies are now configured with secure settings:

- **httpOnly**: Cookies cannot be accessed via JavaScript
- **sameSite**: CSRF protection via 'lax' policy
- **secure**: Cookies only sent over HTTPS in production
- **Prefixed names**: Uses `__Secure-` and `__Host-` prefixes in production

### 3. NEXTAUTH_SECRET Validation

The application validates that `NEXTAUTH_SECRET` is set in production environments.

## 🔧 Required Environment Variables

### NEXTAUTH_SECRET (REQUIRED)

This is a secret key used to encrypt JWT tokens and session data.

#### Generating NEXTAUTH_SECRET

**Option 1: Using OpenSSL (Recommended)**
```bash
openssl rand -base64 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Option 3: Online Generator**
Visit: https://generate-secret.vercel.app/32

#### Setting the Environment Variable

**Development (.env.local):**
```env
NEXTAUTH_SECRET=your-generated-secret-here
```

**Production:**
Set this in your hosting platform's environment variables:
- Vercel: Settings → Environment Variables
- Railway: Variables tab
- AWS/Azure/GCP: Through their respective secrets management

### Complete Environment Variables List

```env
# NextAuth Configuration
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>
NEXTAUTH_URL=http://localhost:3010

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Xians Backend API
XIANS_SERVER_URL=https://your-xians-server-url
XIANS_APIKEY=your-xians-api-key
```

## 🚀 Production Deployment Checklist

Before deploying to production, ensure:

- [ ] `NEXTAUTH_SECRET` is set (32+ character random string)
- [ ] `NEXTAUTH_URL` is set to your production domain
- [ ] All Google OAuth credentials are for production
- [ ] HTTPS is enabled (required for secure cookies)
- [ ] Environment variables are not committed to git
- [ ] Security headers are verified (check with securityheaders.com)

## 🔒 Security Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for local development
   - Use hosting platform's secrets management for production

2. **Rotate secrets regularly**
   - Change `NEXTAUTH_SECRET` periodically (will invalidate all sessions)
   - Update OAuth credentials when compromised

3. **Use different secrets per environment**
   - Development, staging, and production should have different secrets

4. **Monitor security headers**
   - Use tools like https://securityheaders.com to verify headers
   - Test with https://observatory.mozilla.org

## 🧪 Testing Security Configuration

### Test Security Headers

After deployment, test your security headers:

```bash
curl -I https://your-domain.com
```

Look for the security headers in the response.

### Test Secure Cookies

1. Open browser DevTools → Application → Cookies
2. Find NextAuth cookies
3. Verify they have:
   - `HttpOnly` flag
   - `Secure` flag (in production)
   - `SameSite=Lax`

## 📚 Additional Resources

- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)

## ⚠️ Troubleshooting

### "NEXTAUTH_SECRET must be set" Error

This error occurs when `NEXTAUTH_SECRET` is not set in production.

**Solution:**
1. Generate a secret: `openssl rand -base64 32`
2. Add it to your environment variables
3. Restart your application

### Cookies Not Being Set

If cookies aren't being set in production:

1. Ensure you're using HTTPS
2. Check that `NEXTAUTH_URL` matches your domain
3. Verify cookie settings in browser DevTools

### Session Expired After Deployment

If all sessions expire after deployment:

- This is expected if you changed `NEXTAUTH_SECRET`
- Users will need to log in again
- This is a security feature, not a bug

## 🔄 Updating Security Configuration

If you need to update security settings:

1. **Security Headers**: Edit `next.config.ts`
2. **Cookie Settings**: Edit `src/app/api/auth/[...nextauth]/route.ts`
3. **Test thoroughly** in staging before production
4. **Document changes** in this file

---

Last updated: 2026-01-24
