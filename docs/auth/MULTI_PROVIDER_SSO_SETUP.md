# Multi-Provider SSO Setup Guide

## Overview

Agent Studio supports multiple authentication providers:
- **Google** (Google Workspace & Gmail accounts)
- **Microsoft** (Office 365, Microsoft Entra ID, & personal Microsoft accounts)
- **Keycloak** (Self-hosted OIDC identity provider)

Users can sign in with any configured provider, and the system will recognize them by their email address.

## Quick Start

### 1. Environment Variables

Create or update your `.env.local` file with the following:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Microsoft/Entra ID OAuth Configuration
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=organizations  # use `organizations` or `common` for multitenant sign-in

# Keycloak OIDC Configuration (optional)
KEYCLOAK_CLIENT_ID=your-keycloak-client-id
KEYCLOAK_CLIENT_SECRET=your-keycloak-client-secret
KEYCLOAK_ISSUER=https://your-keycloak-domain.com/realms/Your_Realm
```

### 2. Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

### 3. Set Up OAuth Providers

Follow the detailed guides for each provider:

- **Google**: See [GOOGLE_SSO_SETUP.md](./GOOGLE_SSO_SETUP.md)
- **Microsoft**: See [MICROSOFT_SSO_SETUP.md](./MICROSOFT_SSO_SETUP.md)
- **Keycloak**: See [KEYCLOAK_SSO_SETUP.md](./KEYCLOAK_SSO_SETUP.md)

## Provider Configuration Options

### Google OAuth

**Best for:**
- Organizations using Google Workspace
- Users with Gmail accounts
- Simple setup with fewer configuration options

**Setup Time:** ~10 minutes

**Key Features:**
- Access to Google APIs (if needed)
- Simple permission model
- Wide user adoption

### Microsoft/Entra ID OAuth

**Best for:**
- Organizations using Microsoft 365/Office 365
- Enterprise environments with Microsoft Entra ID (formerly Azure AD)
- Users with Outlook/Hotmail accounts

**Setup Time:** ~15 minutes

**Key Features:**
- Integration with Microsoft Entra ID
- Conditional access policies
- Multi-tenant support
- Enterprise security features

### How Microsoft Multitenancy Works In Agent Studio

Agent Studio uses Microsoft authentication in two different ways, and they are configured differently:

1. **App sign-in (`/login`)**
   - The main Microsoft login button uses the NextAuth Azure AD provider.
   - This flow is controlled by `AZURE_AD_TENANT_ID`.
   - If `AZURE_AD_TENANT_ID` is a specific tenant GUID, sign-in is effectively **single-tenant**.
   - If `AZURE_AD_TENANT_ID=organizations`, sign-in supports **work/school accounts from any Entra tenant**.
   - If `AZURE_AD_TENANT_ID=common`, sign-in supports **work/school accounts plus personal Microsoft accounts**.

2. **Microsoft tenant connections (for example SharePoint / Outlook 365)**
   - The connection authorization flow uses Microsoft's `common` authority.
   - That means the connection initiation flow is already using a **multitenant authorization endpoint**.
   - This is separate from the main application sign-in configuration above.

To support multitenant Microsoft login for the application itself, you must configure **both**:

- A multitenant Entra app registration in Microsoft Entra ID
- `AZURE_AD_TENANT_ID` set to `organizations` or `common`

## Choosing Tenant Configuration

### Microsoft Entra ID Tenant Types

Your `AZURE_AD_TENANT_ID` determines who can sign in:

| Tenant ID | Who Can Sign In | Use Case |
|-----------|----------------|----------|
| `common` | Work/school accounts + Personal Microsoft accounts | Maximum compatibility |
| `organizations` | Work/school accounts only | Business-focused apps |
| `consumers` | Personal Microsoft accounts only | Consumer apps |
| `{tenant-id}` | Your organization only | Single organization |

**Recommendation:** Use `organizations` for most business applications. Use `common` only if you intentionally want to allow personal Microsoft accounts too. Use a specific tenant ID only for single-tenant deployments.

### Important Behavior

If users from other organizations cannot sign in, the most common cause is that the app is still using a tenant-specific Microsoft authority through `AZURE_AD_TENANT_ID={tenant-id}`.

For multitenant sign-in, use one of these values instead:

- `organizations` for work/school accounts only
- `common` for work/school and personal Microsoft accounts

Also make sure the Entra app registration's **Supported account types** is configured for a multitenant app. A multitenant tenant ID value alone is not enough if the app registration is still single-tenant.

## User Identity Management

### How Users Are Identified

Users are identified by their **email address** across all providers. This means:

- A user with `john@company.com` can sign in with Google or Microsoft
- The system recognizes them as the same user
- Tenant access is based on email address, not provider

### Provider-Specific Tokens

Each provider issues its own access tokens. The system stores:
- `accessToken`: Provider-specific access token
- `idToken`: Provider-specific ID token
- `provider`: Which provider was used ("google", "azure-ad", or "keycloak")

This allows you to access provider-specific APIs if needed.

## Testing Multi-Provider Setup

### Test Checklist

- [ ] **Google Login**
  - Navigate to `/login`
  - Click "Sign in with Google"
  - Complete OAuth flow
  - Verify redirect to dashboard
  - Verify tenant access

- [ ] **Microsoft Login**
  - Sign out if logged in
  - Navigate to `/login`
  - Click "Sign in with Microsoft"
  - Complete OAuth flow
  - Verify redirect to dashboard
  - Verify tenant access
  - If multitenant is expected, verify sign-in with a user from a different Entra tenant

- [ ] **Keycloak Login** (if configured)
  - Sign out if logged in
  - Navigate to `/login`
  - Click "Sign in with Keycloak"
  - Complete OAuth flow
  - Verify redirect to dashboard

- [ ] **Same User, Different Provider**
  - Create a test account with the same email on both providers
  - Sign in with Google
  - Note your tenant access
  - Sign out
  - Sign in with Microsoft (or Keycloak)
  - Verify same tenant access

## Production Deployment

### Environment Variables by Environment

**Development:**
```env
NEXTAUTH_URL=http://localhost:3010
GOOGLE_CLIENT_ID=dev-google-client-id
AZURE_AD_CLIENT_ID=dev-azure-client-id
```

**Staging:**
```env
NEXTAUTH_URL=https://staging.yourdomain.com
GOOGLE_CLIENT_ID=staging-google-client-id
AZURE_AD_CLIENT_ID=staging-azure-client-id
```

**Production:**
```env
NEXTAUTH_URL=https://yourdomain.com
GOOGLE_CLIENT_ID=prod-google-client-id
AZURE_AD_CLIENT_ID=prod-azure-client-id
```

### Redirect URIs by Environment

Configure these redirect URIs in each provider's console:

| Environment | Google | Microsoft | Keycloak |
|-------------|--------|------------|----------|
| Development | `http://localhost:3010/api/auth/callback/google` | `http://localhost:3010/api/auth/callback/azure-ad` | `http://localhost:3010/api/auth/callback/keycloak` |
| Staging | `https://staging.yourdomain.com/api/auth/callback/google` | `https://staging.yourdomain.com/api/auth/callback/azure-ad` | `https://staging.yourdomain.com/api/auth/callback/keycloak` |
| Production | `https://yourdomain.com/api/auth/callback/google` | `https://yourdomain.com/api/auth/callback/azure-ad` | `https://yourdomain.com/api/auth/callback/keycloak` |

## Common Issues

### Issue: "User can sign in but has no tenant access"

**Cause:** User's email is not associated with any tenant in your system.

**Solution:**
1. Verify the user's email in your tenant management system
2. Add the user to a tenant using the admin interface
3. Ask the user to sign out and sign in again

### Issue: "Error: Configuration error"

**Cause:** Missing or invalid environment variables.

**Solution:**
1. Check all required environment variables are set
2. Verify no extra spaces in values
3. Ensure secrets match those in provider consoles
4. Restart the development server

### Issue: "Callback URL mismatch"

**Cause:** Redirect URI in code doesn't match provider configuration.

**Solution:**
1. Verify `NEXTAUTH_URL` is correct
2. Check redirect URIs in Google/Azure consoles
3. Ensure protocol (http/https) matches
4. Check for trailing slashes

### Issue: "Users from other Microsoft organizations can't sign in"

**Cause:** The Microsoft sign-in flow is still configured as single-tenant.

**Solution:**
1. Verify the Entra app registration uses a multitenant supported account type
2. Set `AZURE_AD_TENANT_ID=organizations` for work/school accounts only, or `AZURE_AD_TENANT_ID=common` to also allow personal Microsoft accounts
3. Restart the application after updating environment variables
4. Retest with a user from another Entra tenant

### Issue: "Different providers show different tenant access"

**Cause:** Email addresses don't match exactly (case sensitivity, formatting).

**Solution:**
1. Check email normalization in your code
2. Verify exact email format in tenant system
3. Ensure consistent email formatting across providers

## Security Considerations

### 1. Secure Secret Storage

**Development:**
- Use `.env.local` (never commit to git)
- Different secrets for each developer (optional)

**Production:**
- Use environment variable management (Vercel, AWS Secrets Manager, etc.)
- Never hardcode secrets in code
- Rotate secrets regularly

### 2. Session Security

The application uses secure session configuration:
- JWT-based sessions (stateless)
- 30-day session expiration
- Secure cookies in production
- CSRF protection

### 3. Provider Trust

Both Google and Microsoft are trusted identity providers, but:
- Validate email addresses from tokens
- Don't trust user-provided data without verification
- Implement proper authorization checks (not just authentication)

## Monitoring and Analytics

### Tracking Provider Usage

You can track which provider users prefer by logging the `provider` field from the session:

```typescript
const session = await getServerSession(authOptions)
console.log(`User signed in with: ${session?.user?.provider}`)
```

### Useful Metrics to Track

- Sign-ins by provider
- Failed authentication attempts
- Session duration by provider
- Provider-specific error rates

## Advanced Configuration

### Custom Scopes

If you need additional permissions from providers, update the scopes:

**Google:**
```typescript
GoogleProvider({
  // ... existing config
  authorization: {
    params: {
      scope: "openid profile email https://www.googleapis.com/auth/calendar.readonly"
    }
  }
})
```

**Microsoft:**
```typescript
AzureADProvider({
  // ... existing config
  authorization: {
    params: {
      scope: "openid profile email User.Read Calendars.Read"
    }
  }
})
```

### Provider-Specific Features

Access provider-specific APIs using the stored tokens:

```typescript
const session = await getServerSession(authOptions)

if (session?.provider === 'google') {
  // Use Google APIs
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    headers: {
      Authorization: `Bearer ${session.accessToken}`
    }
  })
}

if (session?.provider === 'azure-ad') {
  // Use Microsoft Graph APIs
  const response = await fetch('https://graph.microsoft.com/v1.0/me/calendar', {
    headers: {
      Authorization: `Bearer ${session.accessToken}`
    }
  })
}
```

## Additional Resources

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth Guide](./GOOGLE_SSO_SETUP.md)
- [Microsoft OAuth Guide](./MICROSOFT_SSO_SETUP.md)
- [Keycloak OAuth Guide](./KEYCLOAK_SSO_SETUP.md)
- [Authentication Architecture](./AUTHENTICATION_IMPLEMENTATION.md)

## Support

For issues or questions:
1. Check provider-specific setup guides
2. Review troubleshooting sections
3. Check NextAuth.js documentation
4. Review provider console logs
