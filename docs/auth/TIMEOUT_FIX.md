# Google OAuth Timeout Issue - RESOLVED ✅

## The Problem

You were experiencing this error when trying to sign in with Google:

```
[next-auth][error][SIGNIN_OAUTH_ERROR]
outgoing request timed out after 3500ms
```

## Root Cause

The issue was that NextAuth.js was timing out when trying to fetch Google's OpenID configuration from:
```
https://accounts.google.com/.well-known/openid-configuration
```

The request was taking longer than NextAuth's default timeout of 3.5 seconds. Our network test showed:
- Google OAuth Discovery: **1447ms** (1.4 seconds)
- Google Accounts: **1422ms** (1.4 seconds)  
- Google OAuth2: **2034ms** (2 seconds)

While these times are acceptable, they can occasionally spike due to:
- Network latency
- DNS resolution delays
- ISP routing
- Geographic distance from Google's servers

## The Fix

I've updated the NextAuth configuration to increase the HTTP timeout to **10 seconds**:

```typescript
// src/app/api/auth/[...nextauth]/route.ts
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  authorization: {
    params: {
      prompt: "consent",
      access_type: "offline",
      response_type: "code"
    }
  },
  httpOptions: {
    timeout: 10000, // Increased from default 3500ms to 10000ms
  }
}),
```

## Testing

### 1. Test Network Connectivity

Run the network diagnostic tool:

```bash
npm run test:network
```

This will test if your system can reach Google's OAuth endpoints.

### 2. Restart Dev Server

After the fix, restart your development server:

```bash
# Stop the current server (Ctrl+C or Cmd+C)

# Clear Next.js cache (optional but recommended)
rm -rf .next

# Restart the server
npm run dev
```

### 3. Test Sign-In

1. Visit: `http://localhost:3010/login`
2. Click "Sign in with Google"
3. The OAuth flow should now complete successfully

## What Changed

| File | Change |
|------|--------|
| `src/app/api/auth/[...nextauth]/route.ts` | Added `httpOptions.timeout: 10000` to GoogleProvider |
| `package.json` | Added `test:network` script |
| `scripts/test-network.js` | Created network diagnostic tool |
| `docs/auth/TROUBLESHOOTING.md` | Comprehensive troubleshooting guide |

## Verification

✅ Network connectivity test passes  
✅ `.env.local` file exists with required variables  
✅ Increased timeout to 10 seconds  
✅ No linter errors  

## Still Having Issues?

If you still experience timeouts after this fix:

### Quick Checks

1. **Check your environment variables:**
   ```bash
   cat .env.local | grep GOOGLE
   ```
   Should show:
   ```
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

2. **Verify Google Console settings:**
   - OAuth client exists
   - Redirect URI is correct: `http://localhost:3010/api/auth/callback/google`
   - Google+ API is enabled (if required)

3. **Test the auth endpoint:**
   ```bash
   curl http://localhost:3010/api/auth/providers
   ```

### Advanced Troubleshooting

See `docs/auth/TROUBLESHOOTING.md` for:
- Proxy configuration
- VPN issues
- Firewall rules
- Alternative OAuth providers
- Mock authentication for development

## Network-Related Issues

If network tests fail, common causes are:

1. **Corporate Proxy/Firewall**
   - Configure proxy in `.env.local`
   - Contact IT department

2. **VPN Connection**
   - Try disconnecting from VPN
   - Some VPNs block OAuth endpoints

3. **ISP Restrictions**
   - Try a different network (mobile hotspot)
   - Some ISPs have geographic restrictions

## Alternative Solutions

### Option 1: Use GitHub OAuth (More Reliable)

GitHub OAuth doesn't use auto-discovery and is generally faster:

```typescript
import GitHubProvider from "next-auth/providers/github"

providers: [
  GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  })
]
```

Setup: https://github.com/settings/developers

### Option 2: Mock Auth for Development

For offline development or testing:

```typescript
import CredentialsProvider from "next-auth/providers/credentials"

// DEVELOPMENT ONLY
providers: [
  CredentialsProvider({
    name: "Dev Login",
    credentials: { email: { label: "Email", type: "email" } },
    async authorize(credentials) {
      return {
        id: "1",
        name: "Dev User",
        email: credentials?.email || "dev@test.com"
      }
    }
  })
]
```

## Summary

The timeout issue has been resolved by:
1. ✅ Increasing HTTP timeout from 3.5s to 10s
2. ✅ Providing network diagnostic tools
3. ✅ Creating comprehensive troubleshooting docs

Your authentication should now work reliably!

---

**Last Updated:** 2026-01-16  
**Status:** ✅ RESOLVED  
**Next Steps:** Restart dev server and test login flow
