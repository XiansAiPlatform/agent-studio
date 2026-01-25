# Microsoft/Office 365 SSO Setup Guide

## Overview

This guide will help you set up Microsoft/Office 365 authentication using Microsoft Entra ID (formerly Azure AD) for your application.

## Prerequisites

- An Azure account (free tier works)
- Access to Azure Portal (portal.azure.com)

## Step 1: Register Application in Microsoft Entra ID

1. **Navigate to Azure Portal**
   - Go to [Azure Portal](https://portal.azure.com/)
   - Sign in with your Microsoft account

2. **Access Microsoft Entra ID**
   - Search for "Microsoft Entra ID" or "Azure Active Directory" in the top search bar
   - Click on "Microsoft Entra ID" from the results
   - Note: You may still see "Azure Active Directory" in some places during the transition

3. **Register a New Application**
   - In the left sidebar, click "App registrations"
   - Click "New registration" button
   - Fill in the application details:
     - **Name**: Agent Studio (or your preferred app name)
     - **Supported account types**: Choose one of:
       - "Accounts in this organizational directory only" (Single tenant - for your organization only)
       - "Accounts in any organizational directory" (Multi-tenant - for any Microsoft Entra ID)
       - "Accounts in any organizational directory and personal Microsoft accounts" (Multi-tenant + personal accounts)
     - **Redirect URI**: 
       - Select "Web" from the dropdown
       - For development: `http://localhost:3010/api/auth/callback/azure-ad`
       - For production: `https://yourdomain.com/api/auth/callback/azure-ad`
   - Click "Register"

## Step 2: Get Application Credentials

1. **Copy Application (client) ID**
   - On the app's Overview page, copy the **Application (client) ID**
   - This will be your `AZURE_AD_CLIENT_ID`

2. **Copy Directory (tenant) ID**
   - On the same Overview page, copy the **Directory (tenant) ID**
   - This will be your `AZURE_AD_TENANT_ID`
   - Note: If you selected "Multi-tenant" or "Multi-tenant + personal accounts", you can set this to `common` or `organizations`

3. **Create a Client Secret**
   - In the left sidebar, click "Certificates & secrets"
   - Click "New client secret"
   - Add a description (e.g., "Agent Studio Production")
   - Choose an expiration period (recommended: 24 months)
   - Click "Add"
   - **IMPORTANT**: Copy the secret **Value** immediately (not the Secret ID)
   - This will be your `AZURE_AD_CLIENT_SECRET`
   - ⚠️ You won't be able to see this value again after you leave this page

## Step 3: Configure API Permissions

1. **Add Required Permissions**
   - In the left sidebar, click "API permissions"
   - Click "Add a permission"
   - Select "Microsoft Graph"
   - Select "Delegated permissions"
   - Add the following permissions:
     - `openid` (Sign users in)
     - `profile` (View users' basic profile)
     - `email` (View users' email address)
     - `User.Read` (Sign in and read user profile)
   - Click "Add permissions"

2. **Grant Admin Consent** (if required by your organization)
   - Click "Grant admin consent for [Your Organization]"
   - Confirm by clicking "Yes"
   - All permissions should now show a green checkmark under "Status"

## Step 4: Configure Authentication Settings

1. **Configure Token Settings**
   - In the left sidebar, click "Authentication" and the "Settings"
   - Under "Implicit grant and hybrid flows", ensure:
     - "ID tokens" is checked (for hybrid flow)
   - Under "Allow public client flows":
     - Set "Allow public client flows" to "Disabled"
   - Click "Save"

2. **Add Additional Redirect URIs** (if needed)
   - In the "Web" section under "Redirect URIs"
   - Click "Add URI" to add production or staging URLs
   - Click "Save"

## Step 5: Update Environment Variables

Add the following variables to your `.env.local` file:

```env
# Microsoft/Entra ID OAuth Configuration
AZURE_AD_CLIENT_ID=your-application-client-id
AZURE_AD_CLIENT_SECRET=your-client-secret-value
AZURE_AD_TENANT_ID=your-tenant-id-or-common

# Note: For multi-tenant apps, you can use:
# AZURE_AD_TENANT_ID=common           # For work/school and personal Microsoft accounts
# AZURE_AD_TENANT_ID=organizations    # For work/school accounts only
# AZURE_AD_TENANT_ID=consumers        # For personal Microsoft accounts only
```

## Step 6: Test the Authentication

1. **Start the Development Server**
   ```bash
   npm run dev
   ```

2. **Test the Login Flow**
   - Navigate to `http://localhost:3010/login`
   - Click "Sign in with Microsoft"
   - Complete the OAuth flow
   - You should be redirected to the dashboard

## Common Tenant ID Values

- **Single Tenant**: Use your specific tenant ID (GUID)
- **Multi-tenant (Work/School)**: Use `organizations`
- **Multi-tenant (Work/School + Personal)**: Use `common`
- **Personal Accounts Only**: Use `consumers`

## Troubleshooting

### Error: "AADSTS50011: The reply URL specified in the request does not match"
- Ensure the redirect URI in Microsoft Entra ID exactly matches your callback URL
- Check for trailing slashes and ensure the protocol (http/https) matches

### Error: "AADSTS700016: Application not found"
- Verify your `AZURE_AD_CLIENT_ID` is correct
- Ensure the app registration exists in the correct Microsoft Entra ID tenant

### Error: "AADSTS7000215: Invalid client secret"
- Your client secret may have expired
- Create a new client secret in Azure Portal
- Update your environment variables

### Error: "AADSTS65001: The user or administrator has not consented"
- Grant admin consent in Azure Portal (API permissions section)
- Or ensure users can consent to apps in your Microsoft Entra ID settings

### Users from Other Organizations Can't Sign In
- Check your "Supported account types" setting in app registration
- Update to "Multi-tenant" if you want to allow external users
- Ensure you're using the correct tenant ID (`common` or `organizations`)

## Production Deployment Checklist

- [ ] Create a separate app registration for production
- [ ] Update `AZURE_AD_CLIENT_ID` with production client ID
- [ ] Create a new client secret for production
- [ ] Add production redirect URI to Microsoft Entra ID app registration
- [ ] Update `NEXTAUTH_URL` to your production domain
- [ ] Set appropriate client secret expiration reminders
- [ ] Configure proper CORS settings if needed
- [ ] Test the complete authentication flow in production

## Security Best Practices

1. **Rotate Secrets Regularly**
   - Set calendar reminders before client secrets expire
   - Create new secrets before old ones expire
   - Update environment variables promptly

2. **Use Separate Registrations**
   - Use different app registrations for development, staging, and production
   - This limits the impact of compromised credentials

3. **Minimal Permissions**
   - Only request the permissions your app actually needs
   - Review permissions regularly

4. **Monitor Sign-ins**
   - Use Microsoft Entra ID sign-in logs to monitor authentication activity
   - Set up alerts for suspicious activity

## Additional Resources

- [Microsoft Identity Platform Documentation](https://learn.microsoft.com/en-us/entra/identity-platform/)
- [Microsoft Entra ID App Registration Guide](https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app)
- [NextAuth.js Azure AD Provider](https://next-auth.js.org/providers/azure-ad)
- [Microsoft Graph API Permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)
- [Azure AD to Microsoft Entra ID Rename](https://learn.microsoft.com/en-us/entra/fundamentals/new-name)
