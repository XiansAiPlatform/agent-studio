# Authentication Documentation

## Overview

This directory contains comprehensive documentation for the authentication system in Agent Studio. The application uses NextAuth.js with support for multiple OAuth providers.

## 📚 Documentation Index

### Quick Start Guides

1. **[SSO Quick Reference](./SSO_QUICK_REFERENCE.md)** ⭐ START HERE
   - Quick overview of all providers
   - Essential environment variables
   - Common commands and troubleshooting

### Provider Setup Guides

2. **[Google SSO Setup](./GOOGLE_SSO_SETUP.md)**
   - Step-by-step Google OAuth configuration
   - Google Cloud Console setup
   - Testing and troubleshooting

3. **[Microsoft SSO Setup](./MICROSOFT_SSO_SETUP.md)**
   - Step-by-step Microsoft Entra ID OAuth configuration
   - Azure Portal setup
   - Multi-tenant configuration options

4. **[Multi-Provider Setup](./MULTI_PROVIDER_SSO_SETUP.md)**
   - Configure both Google and Microsoft
   - User identity management across providers

### Architecture & Implementation

5. **[Authentication Implementation](./AUTHENTICATION_IMPLEMENTATION.md)**
   - Technical architecture
   - Code structure and flow
   - Implementation details

6. **[Auth Quick Reference](./AUTH_QUICK_REFERENCE.md)**
   - API reference for auth utilities
   - Common patterns and examples
   - Code snippets

### Tenant Management

7. **[Tenant Implementation](./TENANT_IMPLEMENTATION.md)**
   - How tenant validation works
   - Tenant-based access control

8. **[Tenant Usage Guide](./TENANT_USAGE.md)**
   - How to use tenant features
   - API and client quick reference
   - Managing tenant access

9. **[Tenant Client Integration](./TENANT_CLIENT_INTEGRATION.md)**
    - Client-side tenant integration

### Troubleshooting

10. **[Troubleshooting Guide](./TROUBLESHOOTING.md)**
    - OAuth and network issues
    - Debug techniques and solutions

## 🚀 Getting Started

### For First-Time Setup

1. **Read**: [SSO Quick Reference](./SSO_QUICK_REFERENCE.md)
2. **Choose a provider**:
   - Google: [Google SSO Setup](./GOOGLE_SSO_SETUP.md)
   - Microsoft: [Microsoft SSO Setup](./MICROSOFT_SSO_SETUP.md)
   - Both: [Multi-Provider Setup](./MULTI_PROVIDER_SSO_SETUP.md)
3. **Test**: Follow the testing steps in your chosen guide
4. **Deploy**: Update production environment variables

### For Developers

1. **Understand the architecture**: [Authentication Implementation](./AUTHENTICATION_IMPLEMENTATION.md)
2. **Use auth utilities**: [Auth Quick Reference](./AUTH_QUICK_REFERENCE.md)
3. **Implement tenant checks**: [Tenant Implementation](./TENANT_IMPLEMENTATION.md)

## 🔑 Supported Authentication Providers

| Provider | Status | Setup Guide | Best For |
|----------|--------|-------------|----------|
| Google | ✅ Active | [Google SSO Setup](./GOOGLE_SSO_SETUP.md) | Google Workspace, Gmail users |
| Microsoft | ✅ Active | [Microsoft SSO Setup](./MICROSOFT_SSO_SETUP.md) | Office 365, Microsoft Entra ID, Microsoft accounts |

## 📋 Required Environment Variables

### Core Configuration
```env
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=<generated-secret>
```

### Google OAuth (Optional)
```env
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
```

### Microsoft/Entra ID OAuth (Optional)
```env
AZURE_AD_CLIENT_ID=<your-client-id>
AZURE_AD_CLIENT_SECRET=<your-client-secret>
AZURE_AD_TENANT_ID=common  # or 'organizations', or specific tenant ID
```

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       User Login Page                        │
│                      /app/(auth)/login                       │
└───────────────┬─────────────────────────┬───────────────────┘
                │                         │
        ┌───────▼────────┐        ┌──────▼───────┐
        │ Google OAuth   │        │ Microsoft    │
        │   Provider     │        │   OAuth      │
        └───────┬────────┘        └──────┬───────┘
                │                        │
                └────────┬───────────────┘
                         │
                 ┌───────▼────────┐
                 │   NextAuth.js  │
                 │  /api/auth/    │
                 │ [...nextauth]  │
                 └───────┬────────┘
                         │
                 ┌───────▼────────┐
                 │  Auth Callback │
                 │  - JWT Token   │
                 │  - Session     │
                 └───────┬────────┘
                         │
                 ┌───────▼────────┐
                 │ Tenant Check   │
                 │  (Client-side) │
                 └───────┬────────┘
                         │
             ┌───────────┴──────────┐
             │                      │
      ┌──────▼──────┐      ┌───────▼────────┐
      │  Dashboard  │      │   No Access    │
      │   /dashboard│      │   /no-access   │
      └─────────────┘      └────────────────┘
```

## 🔐 Security Features

- ✅ **JWT-based sessions** - Stateless authentication
- ✅ **Secure cookies** - HTTPOnly, SameSite, Secure in production
- ✅ **CSRF protection** - Built-in token validation
- ✅ **30-day session expiration** - Automatic re-authentication
- ✅ **Provider isolation** - Separate credentials per environment
- ✅ **Tenant-based access control** - Email-based authorization

## 🧪 Testing

### Manual Testing
1. Navigate to `/login`
2. Click on a provider sign-in button
3. Complete OAuth flow
4. Verify redirect to dashboard
5. Verify tenant access

### Automated Testing
```bash
# Run auth tests (if available)
npm test -- auth

# Test network connectivity
npm run test:network
```

## 🐛 Common Issues

| Issue | Quick Fix | Documentation |
|-------|-----------|---------------|
| Configuration error | Check environment variables | [SSO Quick Reference](./SSO_QUICK_REFERENCE.md) |
| Callback URL mismatch | Update redirect URI in provider console | [Troubleshooting](./TROUBLESHOOTING.md) |
| OAuth timeout | See Troubleshooting | [Troubleshooting](./TROUBLESHOOTING.md) |
| No tenant access | Add user to tenant | [Tenant Usage](./TENANT_USAGE.md) |

## 📖 Additional Documentation

- **[Security Setup](./SECURITY_SETUP.md)** - General security configuration

## 🤝 Contributing

When adding new authentication features:
1. Update relevant documentation
2. Add test cases
3. Update this README index
4. Document any new environment variables

## 📞 Support

For authentication issues:
1. Check [SSO Quick Reference](./SSO_QUICK_REFERENCE.md)
2. Review [Troubleshooting Guide](./TROUBLESHOOTING.md)
3. Check provider-specific setup guides
4. Review NextAuth.js documentation

## 🔄 Version History

- **v1.1** (Current) - Added Microsoft/Azure AD OAuth support
- **v1.0** - Initial release with Google OAuth

## 📝 License

See project root LICENSE file.
