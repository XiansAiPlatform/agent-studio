# Migration Guide: Adding Microsoft OAuth to Existing Google OAuth Setup

## Overview

This guide helps you add Microsoft/Office 365 authentication to your existing Google OAuth setup without disrupting current users.

## What's New

✅ **Microsoft/Entra ID OAuth Support**
- Office 365 accounts
- Microsoft Entra ID work/school accounts (formerly Azure AD)
- Personal Microsoft accounts (Outlook, Hotmail, etc.)

✅ **Backward Compatible**
- Existing Google authentication continues to work
- No changes required for existing users
- Same user can use either provider

## Migration Steps

### Step 1: Verify Current Setup

Ensure your existing Google OAuth is working:
- [ ] Users can sign in with Google
- [ ] Environment variables are set (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- [ ] No authentication errors in logs

### Step 2: Update Environment Variables

Add Microsoft OAuth credentials to your `.env.local`:

```env
# Existing Google OAuth (keep as-is)
GOOGLE_CLIENT_ID=existing-google-client-id
GOOGLE_CLIENT_SECRET=existing-google-client-secret

# New: Microsoft/Entra ID OAuth
AZURE_AD_CLIENT_ID=your-azure-client-id
AZURE_AD_CLIENT_SECRET=your-azure-client-secret
AZURE_AD_TENANT_ID=common
```

> **Note**: If you don't set the Microsoft variables, the app will still work with Google only.

### Step 3: Register Microsoft Entra ID Application

Follow the [Microsoft SSO Setup Guide](./MICROSOFT_SSO_SETUP.md) to:
1. Register your app in Azure Portal (Microsoft Entra ID)
2. Get Client ID and Client Secret
3. Configure redirect URIs
4. Set up API permissions

### Step 4: Test Microsoft Authentication

1. **Don't sign out of existing sessions yet**
2. Open an incognito/private browser window
3. Navigate to `/login`
4. Verify you see both buttons:
   - ✅ Sign in with Google
   - ✅ Sign in with Microsoft
5. Test Microsoft sign-in with a test account
6. Verify successful redirect to dashboard

### Step 5: Verify User Identity Consistency

Test with an account that exists on both providers:

1. **First test - Google:**
   - Sign in with Google using `user@domain.com`
   - Note your tenant access
   - Sign out

2. **Second test - Microsoft:**
   - Sign in with Microsoft using same `user@domain.com`
   - Verify you have the same tenant access
   - System should recognize you as the same user

### Step 6: Production Deployment

#### Development → Staging

1. Create Microsoft Entra ID app registration for staging
2. Add staging redirect URI: `https://staging.yourdomain.com/api/auth/callback/azure-ad`
3. Update staging environment variables
4. Test thoroughly in staging

#### Staging → Production

1. Create Microsoft Entra ID app registration for production
2. Add production redirect URI: `https://yourdomain.com/api/auth/callback/azure-ad`
3. Update production environment variables
4. Deploy and monitor

## Code Changes Made

### ✅ Updated Files

1. **`src/app/api/auth/[...nextauth]/route.ts`**
   - Added `AzureADProvider` import
   - Added Microsoft Entra ID provider configuration
   - Maintains all existing Google OAuth functionality

2. **`src/app/(auth)/login/sign-in-form.tsx`**
   - Added "Sign in with Microsoft" button
   - Maintains existing "Sign in with Google" button
   - UI styled consistently

### ✅ New Documentation

3. **`docs/auth/MICROSOFT_SSO_SETUP.md`**
   - Comprehensive Microsoft OAuth setup guide
   - Microsoft Entra ID configuration via Azure Portal
   - Troubleshooting section

4. **`docs/auth/MULTI_PROVIDER_SSO_SETUP.md`**
   - Multi-provider overview
   - User identity management
   - Advanced configuration

5. **`docs/auth/SSO_QUICK_REFERENCE.md`**
   - Quick reference for all providers
   - Common commands and fixes

6. **`docs/auth/README.md`**
   - Updated documentation index
   - Architecture overview

## Zero-Downtime Deployment Strategy

### Option A: Feature Flag (Recommended)

Add Microsoft support but hide the button initially:

```typescript
// In sign-in-form.tsx (temporary)
const ENABLE_MICROSOFT_AUTH = process.env.NEXT_PUBLIC_ENABLE_MICROSOFT_AUTH === 'true'

// Then conditionally render:
{ENABLE_MICROSOFT_AUTH && (
  <Button onClick={() => signIn('azure-ad', { callbackUrl: '/dashboard' })}>
    Sign in with Microsoft
  </Button>
)}
```

Deployment steps:
1. Deploy code with feature flag OFF
2. Set up Azure AD credentials
3. Test with feature flag ON in development
4. Enable feature flag in production when ready

### Option B: Direct Deployment (Simple)

If you've tested thoroughly:
1. Set up Azure AD credentials in production
2. Deploy updated code
3. Microsoft button appears immediately
4. Monitor for any issues

## Rollback Plan

If issues occur with Microsoft authentication:

### Quick Rollback (Keep Google Working)

1. **Remove Microsoft Entra ID environment variables**:
   ```bash
   # Comment out or remove from production env
   # AZURE_AD_CLIENT_ID=...
   # AZURE_AD_CLIENT_SECRET=...
   # AZURE_AD_TENANT_ID=...
   ```

2. **Application behavior**:
   - Microsoft sign-in will fail (expected)
   - Google sign-in continues working normally
   - Existing sessions remain active

3. **User communication**:
   - "Microsoft sign-in temporarily unavailable"
   - "Please use Google sign-in"

### Full Rollback

If you need to revert all changes:

```bash
git revert <commit-hash>
```

This removes:
- Microsoft sign-in button
- Microsoft Entra ID provider configuration
- Reverts to Google-only authentication

## User Communication Template

### Internal Announcement

```
Subject: New Sign-In Option Available

We're excited to announce that you can now sign in to Agent Studio 
using your Microsoft/Office 365 account in addition to Google!

What's new:
✅ Sign in with your Microsoft account
✅ Sign in with your Google account (existing)
✅ Use whichever provider you prefer

Nothing changes for existing users - continue using Google if you prefer. 
If you'd like to try Microsoft sign-in, just click the new button on the 
login page.

Your access and data remain the same regardless of which provider you use.
```

## Testing Checklist

Before deployment to production:

### Functionality Tests
- [ ] Google sign-in still works
- [ ] Microsoft sign-in works
- [ ] Both buttons appear on login page
- [ ] Correct redirects after sign-in
- [ ] Session persists correctly
- [ ] Sign-out works for both providers

### User Identity Tests
- [ ] Same email recognized across providers
- [ ] Tenant access consistent across providers
- [ ] User can switch between providers

### Error Handling Tests
- [ ] Invalid credentials handled gracefully
- [ ] Network timeout errors show proper messages
- [ ] Callback URL mismatch shows clear error
- [ ] Missing env variables don't break Google auth

### UI/UX Tests
- [ ] Both buttons have proper styling
- [ ] Loading states work correctly
- [ ] Error messages are clear
- [ ] Mobile responsive design

## Monitoring

After deployment, monitor:

### Metrics to Track
- Sign-in success rate by provider
- Sign-in error rate by provider
- Provider preference distribution
- Average session duration by provider

### Logs to Watch
```bash
# Look for these patterns
[Auth] User signed in with: google
[Auth] User signed in with: azure-ad
[Auth] Error checking tenant access
[Auth] OAuth timeout
```

### Alert Thresholds
- Sign-in error rate > 5%
- OAuth timeout rate > 2%
- No sign-ins for > 1 hour (production)

## FAQ

### Q: Do existing users need to re-authenticate?
**A:** No. Existing Google sessions continue working. No action required from users.

### Q: Can a user have both Google and Microsoft sign-in?
**A:** Yes! The same user (identified by email) can use either provider interchangeably.

### Q: What happens to sessions when we add Microsoft auth?
**A:** Nothing. Existing sessions remain valid. No disruption.

### Q: Can we make Microsoft the default/primary option?
**A:** Yes. Just reorder the buttons in `sign-in-form.tsx`. Put Microsoft button first.

### Q: Do we need both providers configured?
**A:** No. The app works fine with just Google, just Microsoft, or both. Configure what you need.

### Q: What if Microsoft OAuth credentials expire?
**A:** Microsoft sign-in will fail, but Google continues working. Users can still access the app.

### Q: Can we remove Google and keep only Microsoft?
**A:** Yes, but this would break existing Google users. Recommend keeping both unless you have a specific reason to remove one.

## Support

If you encounter issues during migration:

1. **Check Documentation**:
   - [Microsoft SSO Setup](./MICROSOFT_SSO_SETUP.md)
   - [Troubleshooting Guide](./TROUBLESHOOTING.md)
   - [SSO Quick Reference](./SSO_QUICK_REFERENCE.md)

2. **Common Issues**:
   - Provider console configuration errors
   - Environment variable typos
   - Redirect URI mismatches

3. **Rollback**:
   - See "Rollback Plan" section above
   - Google authentication always remains working

## Next Steps

After successful migration:

1. **Monitor** authentication metrics for 1-2 weeks
2. **Gather feedback** from users on provider preferences
3. **Document** any organization-specific configuration
4. **Set reminders** to rotate OAuth secrets in 6-12 months
5. **Consider** adding other providers if needed (GitHub, LinkedIn, etc.)

## Summary

✅ **Safe Migration**: Google authentication remains unaffected
✅ **Backward Compatible**: No breaking changes for existing users
✅ **Flexible**: Configure one or both providers as needed
✅ **Rollback Ready**: Easy to disable Microsoft auth if needed

The migration is designed to be low-risk with minimal disruption to existing users.
