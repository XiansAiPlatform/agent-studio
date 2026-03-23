# Keycloak SSO Setup Guide

> **Note:** This application also supports Google and Microsoft authentication. See [GOOGLE_SSO_SETUP.md](./GOOGLE_SSO_SETUP.md), [MICROSOFT_SSO_SETUP.md](./MICROSOFT_SSO_SETUP.md), or [MULTI_PROVIDER_SSO_SETUP.md](./MULTI_PROVIDER_SSO_SETUP.md) for other providers.

## Step 1: Create Environment Variables File

Add the following to your `.env.local` file:

```env
# Keycloak OIDC Configuration
KEYCLOAK_CLIENT_ID=your-keycloak-client-id
KEYCLOAK_CLIENT_SECRET=your-keycloak-client-secret
KEYCLOAK_ISSUER=https://your-keycloak-domain.com/realms/Your_Realm
```

**Important:** The `KEYCLOAK_ISSUER` must include the realm path, e.g. `https://keycloak.example.com/realms/My_Realm`

## Step 2: Create Keycloak Client

1. Log in to your Keycloak Admin Console
2. Select the realm you want to use (or create one)
3. Go to **Clients** → **Create client**
4. Configure the client:
   - **Client ID:** Choose a unique ID (e.g. `agent-studio`)
   - **Client authentication:** ON (confidential client)
   - **Authorization:** OFF (unless you need it)
   - **Authentication flow:** Standard flow enabled
   - **Direct access grants:** Optional

5. Click **Save**, then configure:
   - **Valid redirect URIs:**
     - Development: `http://localhost:3010/api/auth/callback/keycloak`
     - Production: `https://yourdomain.com/api/auth/callback/keycloak`
   - **Web origins:** Add your app origins (e.g. `http://localhost:3010` or `https://yourdomain.com`)

6. Go to the **Credentials** tab and copy the **Client secret** to `KEYCLOAK_CLIENT_SECRET`

## Step 3: Get the Issuer URL

The issuer URL format is:
```
https://{keycloak-host}/realms/{realm-name}
```

Example: `https://auth.mycompany.com/realms/production`

Copy this to `KEYCLOAK_ISSUER` in your `.env.local` file.

## Step 4: Start the Development Server

```bash
npm run dev
```

## Step 5: Test the Authentication

1. Navigate to `http://localhost:3010/login`
2. Click "Sign in with Keycloak"
3. Complete the Keycloak login flow
4. You should be redirected to the dashboard

## For Production Deployment

1. Update `NEXTAUTH_URL` in your production environment to your actual domain
2. Add the production callback URL to Keycloak client settings:
   - `https://yourdomain.com/api/auth/callback/keycloak`
3. Ensure all environment variables are set in your hosting platform
4. Configure Keycloak for production (HTTPS, proper CORS, etc.)

## Troubleshooting

- **"Invalid redirect URI"**: Ensure the redirect URI in Keycloak exactly matches `{NEXTAUTH_URL}/api/auth/callback/keycloak`
- **"Invalid issuer"**: Verify `KEYCLOAK_ISSUER` includes the realm and has no trailing slash
- **CORS errors**: Add your app URL to Keycloak client's Web origins
