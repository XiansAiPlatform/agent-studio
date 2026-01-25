# SSO Quick Reference Guide

## Supported Providers

Agent Studio supports the following authentication providers:

1. **Google** (Google Workspace & Gmail)
2. **Microsoft** (Office 365, Microsoft Entra ID, & Microsoft accounts)

## Quick Setup

### Environment Variables Required

```env
# Core NextAuth Config
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# Google OAuth (Optional - only if using Google)
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>

# Microsoft OAuth (Optional - only if using Microsoft)
AZURE_AD_CLIENT_ID=<from Azure Portal>
AZURE_AD_CLIENT_SECRET=<from Azure Portal>
AZURE_AD_TENANT_ID=common  # See Microsoft Entra ID setup guide
```

### Callback URLs

Configure these redirect URIs in your OAuth provider consoles:

| Provider | Callback URL (Development) | Callback URL (Production) |
|----------|---------------------------|---------------------------|
| Google | `http://localhost:3010/api/auth/callback/google` | `https://yourdomain.com/api/auth/callback/google` |
| Microsoft | `http://localhost:3010/api/auth/callback/azure-ad` | `https://yourdomain.com/api/auth/callback/azure-ad` |

## Setup Guides

Choose the provider(s) you want to set up:

- **Google Only**: [GOOGLE_SSO_SETUP.md](./GOOGLE_SSO_SETUP.md)
- **Microsoft Only**: [MICROSOFT_SSO_SETUP.md](./MICROSOFT_SSO_SETUP.md)
- **Both Providers**: [MULTI_PROVIDER_SSO_SETUP.md](./MULTI_PROVIDER_SSO_SETUP.md)

## Provider Console Links

- **Google Cloud Console**: https://console.cloud.google.com/apis/credentials
- **Azure Portal**: https://portal.azure.com/ → Microsoft Entra ID → App registrations

## Common Commands

```bash
# Generate NEXTAUTH_SECRET
openssl rand -base64 32

# Start development server
npm run dev

# Test authentication
# Navigate to: http://localhost:3010/login
```

## Tenant ID Options (Microsoft Only)

| Value | Description |
|-------|-------------|
| `common` | Work/school + Personal Microsoft accounts (Recommended) |
| `organizations` | Work/school accounts only |
| `consumers` | Personal Microsoft accounts only |
| `{guid}` | Specific organization only |

## Testing Checklist

After setup, verify:

- [ ] Can access login page (`/login`)
- [ ] Google sign-in button appears (if configured)
- [ ] Microsoft sign-in button appears (if configured)
- [ ] Can complete OAuth flow
- [ ] Redirected to dashboard after login
- [ ] User has appropriate tenant access

## Troubleshooting Quick Fixes

### "Configuration Error"
→ Check all required environment variables are set
→ Restart development server

### "Callback URL Mismatch"
→ Verify redirect URI in provider console exactly matches your callback URL
→ Check protocol (http vs https) and port number

### "Invalid Client Secret"
→ Regenerate secret in provider console
→ Update environment variable
→ Restart server

### "User Can Sign In But Has No Access"
→ User email not added to any tenant
→ Add user to tenant via admin interface
→ Sign out and sign in again

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # Auth configuration
│   └── (auth)/
│       └── login/
│           ├── page.tsx              # Login page
│           └── sign-in-form.tsx      # Sign-in UI
└── lib/
    └── auth.ts                       # Auth utilities

docs/
└── auth/
    ├── GOOGLE_SSO_SETUP.md          # Google setup guide
    ├── MICROSOFT_SSO_SETUP.md       # Microsoft setup guide
    ├── MULTI_PROVIDER_SSO_SETUP.md  # Multi-provider guide
    └── SSO_QUICK_REFERENCE.md       # This file
```

## Security Notes

- ✅ Secrets stored in `.env.local` (not committed to git)
- ✅ JWT-based sessions with 30-day expiration
- ✅ Secure cookies in production
- ✅ CSRF protection enabled
- ⚠️ Rotate client secrets every 6-12 months
- ⚠️ Use separate credentials for dev/staging/production

## Next Steps

1. Choose your provider(s) and follow the setup guide(s)
2. Configure environment variables
3. Test the authentication flow
4. Deploy to production with production credentials
5. Set up secret rotation reminders

## Support Resources

- [NextAuth.js Docs](https://next-auth.js.org/)
- [Google OAuth Docs](https://developers.google.com/identity/protocols/oauth2)
- [Microsoft Identity Docs](https://docs.microsoft.com/en-us/azure/active-directory/develop/)
