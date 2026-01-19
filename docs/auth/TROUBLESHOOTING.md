# NextAuth Google OAuth Troubleshooting

## Error: "outgoing request timed out after 3500ms"

This error occurs when NextAuth can't reach Google's OAuth discovery endpoint. This is typically due to network connectivity issues.

### Quick Fixes

#### Solution 1: Check Your Internet Connection

The error indicates that the request to Google's servers is timing out. Verify:

```bash
# Test connectivity to Google
ping accounts.google.com

# Test HTTPS connectivity
curl https://accounts.google.com/.well-known/openid-configuration
```

If these fail, you have a network connectivity issue.

#### Solution 2: Proxy Configuration

If you're behind a corporate proxy or firewall, you may need to configure Node.js to use it:

**Set proxy environment variables:**

```bash
# In your .env.local
HTTP_PROXY=http://your-proxy:port
HTTPS_PROXY=http://your-proxy:port
NO_PROXY=localhost,127.0.0.1
```

**Or set them in your terminal:**

```bash
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
npm run dev
```

#### Solution 3: VPN Issues

If you're using a VPN, try:
1. Disconnecting from the VPN
2. Running the dev server
3. Testing the OAuth flow

#### Solution 4: Firewall Rules

Check if your firewall is blocking outgoing requests to Google:
- Allow outgoing HTTPS (443) to `*.google.com`
- Allow outgoing HTTPS (443) to `accounts.google.com`

#### Solution 5: Use Alternative Network

Try running the dev server on:
- A different network (e.g., mobile hotspot)
- A different machine
- A cloud development environment

### Verify Your Setup

1. **Check environment variables:**

```bash
# Make sure these are set in .env.local
cat .env.local | grep GOOGLE
```

You should see:
```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
```

2. **Restart the dev server:**

```bash
# Stop the current server (Ctrl+C)
# Clear Next.js cache
rm -rf .next

# Restart
npm run dev
```

3. **Test the auth endpoint:**

```bash
# This should return available providers
curl http://localhost:3010/api/auth/providers
```

Expected response:
```json
{
  "google": {
    "id": "google",
    "name": "Google",
    "type": "oauth",
    "signinUrl": "http://localhost:3010/api/auth/signin/google",
    "callbackUrl": "http://localhost:3010/api/auth/callback/google"
  }
}
```

### Network Diagnostics

Run these commands to diagnose the issue:

```bash
# Check if Node can reach Google
node -e "fetch('https://accounts.google.com/.well-known/openid-configuration').then(r => r.text()).then(console.log).catch(console.error)"

# Check DNS resolution
nslookup accounts.google.com

# Check if port 443 is accessible
nc -zv accounts.google.com 443
```

### Alternative: Use Mock Authentication for Development

If you can't fix the network issue immediately, you can use a mock authentication provider for local development:

Create `src/app/api/auth/[...nextauth]/route.development.ts`:

```typescript
import NextAuth, { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Development Login",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "dev@example.com" }
      },
      async authorize(credentials) {
        // ONLY FOR DEVELOPMENT - DO NOT USE IN PRODUCTION
        return {
          id: "dev-user-1",
          name: "Dev User",
          email: credentials?.email || "dev@example.com",
          role: "admin"
        }
      }
    })
  ],
  // ... rest of your config
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### Still Having Issues?

1. **Check NextAuth.js logs:**
   - Look for detailed error messages in the terminal
   - Enable debug mode (already enabled in development)

2. **Check Google Cloud Console:**
   - Verify OAuth client is created
   - Check redirect URIs are correct
   - Ensure Google+ API is enabled

3. **Try a different OAuth provider:**
   - GitHub (usually more reliable for local development)
   - No discovery endpoint needed

### Using GitHub as Alternative (No Discovery Required)

If Google continues to have issues, GitHub OAuth is more reliable:

```typescript
import GitHubProvider from "next-auth/providers/github"

providers: [
  GitHubProvider({
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  })
]
```

GitHub OAuth Setup:
1. Go to https://github.com/settings/developers
2. Create New OAuth App
3. Set callback URL: `http://localhost:3010/api/auth/callback/github`
4. Copy Client ID and Secret to `.env.local`

### Common Network Issues by Platform

#### macOS
```bash
# Check system proxy settings
scutil --proxy

# Reset DNS cache
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

#### Windows (PowerShell)
```powershell
# Check proxy settings
netsh winhttp show proxy

# Reset DNS
ipconfig /flushdns
```

#### Linux
```bash
# Check proxy in environment
env | grep -i proxy

# Test DNS
dig accounts.google.com
```

### Last Resort: Contact Information

If none of these solutions work:
1. Check if your organization blocks OAuth endpoints
2. Contact your network administrator
3. Use a cloud development environment (GitHub Codespaces, GitPod, etc.)

---

**Most Common Solution:** The issue is usually network-related (proxy, VPN, or firewall). Try disconnecting from VPN or using a mobile hotspot.
