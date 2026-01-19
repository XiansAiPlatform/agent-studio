# Google SSO Setup Guide

## Step 1: Create Environment Variables File

Create a `.env.local` file in the root of your project with the following content:

```env
# NextAuth Configuration
# Generate a secret with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3010
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth Configuration
# Get these from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Step 2: Generate NEXTAUTH_SECRET

Run this command to generate a secure secret:

```bash
openssl rand -base64 32
```

Copy the output and replace `your-secret-key-here` in your `.env.local` file.

## Step 3: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API"
   - Click "Enable"

4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For development: `http://localhost:3010/api/auth/callback/google`
     - For production: `https://yourdomain.com/api/auth/callback/google`
   - Click "Create"

5. Copy the Client ID and Client Secret to your `.env.local` file

## Step 4: Start the Development Server

```bash
npm run dev
```

## Step 5: Test the Authentication

1. Navigate to `http://localhost:3010/login`
2. Click "Sign in with Google"
3. Complete the OAuth flow
4. You should be redirected to the dashboard

## For Production Deployment

1. Update `NEXTAUTH_URL` in your production environment to your actual domain
2. Add the production callback URL to Google OAuth settings
3. Ensure all environment variables are set in your hosting platform
