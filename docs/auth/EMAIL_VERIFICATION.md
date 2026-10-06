# Require Verified Email (nOAuth Mitigation)

## Why

Agent Studio identifies a signed-in user by their email. It sends that email to the Xians Server to find the user's tenants.

Some identity providers issue an email claim that is not proven to belong to the user. In Microsoft Entra ID the `email` claim comes from the user's `mail` attribute, which any tenant admin can set to any address, including one on a domain they do not own. If Studio accepts sign-ins from other Entra tenants (`AZURE_AD_TENANT_ID=common` or `organizations`), an attacker can create their own tenant, set `mail = victim@yourcompany.com`, and sign in as the victim. This is known as **nOAuth**.

This feature lets you require, per identity provider, that the email is verified before a user is let in.

## How it works

The setting is off by default. When verification is required for a provider, Studio checks the claims in the sign-in **ID token**. 
The user is admitted if **either** of these is true:

1. **Verified email.** The token has an `email` claim, and every `claim=value` pair in `<PREFIX>_VERIFY_CLAIMS` matches. The user is then signed in as exactly that `email`.
2. **Trusted value.** The value of `<PREFIX>_TRUSTED_CLAIM` is in `<PREFIX>_TRUSTED_VALUES`. For example, members of your own Entra tenant via `tid`. The email is found the same way as when verification is off.

Otherwise the sign-in is refused, the user returns to the login page with "Your email address could not be verified. Contact your administrator.", and Studio logs the reason. The check runs before Studio contacts the Xians Server.

Matching rules:

- Claim names are matched exactly (case-sensitive). A missing claim never matches.
- `true` and `false` values also match `"true"`, `"1"`, `"false"` and `"0"`, because IdPs differ in how they send booleans.
- If the claim is an array, any element may match.
- Trusted values are compared case-insensitively.

## Configuration

Settings are environment variables, like the providers themselves.

| Variable | Meaning |
|---|---|
| `AUTH_ALLOW_UNVERIFIED_EMAIL` | Global default. `true` (or unset) keeps today's behaviour. `false` requires verification for every provider below. |
| `<PREFIX>_ALLOW_UNVERIFIED_EMAIL` | Per-provider override of the global default. |
| `<PREFIX>_VERIFY_CLAIMS` | Comma-separated `claim=value` pairs. All must match. |
| `<PREFIX>_TRUSTED_CLAIM` | Optional. The claim to compare against the trusted list. |
| `<PREFIX>_TRUSTED_VALUES` | Optional. Comma-separated values for `<PREFIX>_TRUSTED_CLAIM`. |

| Provider | `<PREFIX>` |
|---|---|
| Microsoft Entra ID | `AZURE_AD` |
| Azure AD B2C | `AZURE_AD_B2C` |
| Google | `GOOGLE` |
| Keycloak | `KEYCLOAK` |
| Visma Connect | `VISMA_CONNECT` |

The local development login is not affected.

Example for Entra:

```bash
AZURE_AD_ALLOW_UNVERIFIED_EMAIL=false
AZURE_AD_VERIFY_CLAIMS=xms_edov=true
# Optional: also admit members of your own tenant even without xms_edov
AZURE_AD_TRUSTED_CLAIM=tid
AZURE_AD_TRUSTED_VALUES=<your-tenant-guid>
```

### Invalid configuration

When verification is required, these are rejected:

- A `VERIFY_CLAIMS` entry that is not `claim=value`.
- Neither `VERIFY_CLAIMS` nor both `TRUSTED_CLAIM` and `TRUSTED_VALUES` set.

An invalid configuration is logged at startup and that provider refuses **every** sign-in until it is fixed.

### Choosing claims safely

Studio does not check which claims you name. Choosing them is the responsibility of whoever configures the deployment.

Only use claims that the **identity provider** sets and the user cannot change. Never use these, because users or their tenant admins can set them to any value:

- `email`, `emails`
- `upn`, `preferred_username`, `unique_name`
- `name`, `given_name`, `family_name`
- Any custom or extension attribute your users can edit

A check on one of these proves nothing, so it would let an attacker straight through. If you are unsure whether a claim is editable, do not use it.

## Setting up each provider

The claims must be present in the **ID token**. Most need enabling on the provider side first.

| Provider | Recommended `VERIFY_CLAIMS` | Provider-side setup |
|---|---|---|
| Entra ID | `xms_edov=true` | App registration > **Token configuration** > **Add optional claim** > **ID** token: add `email` and `xms_edov`. If `xms_edov` is not offered in the picker, add it to the app **Manifest** under `optionalClaims.idToken`. |
| Google | `email_verified=true` | Request the `email` scope (Studio does by default). For Google Workspace, `TRUSTED_CLAIM=hd` with your domains also works. |
| Keycloak | `email_verified=true` | Include the `email` scope. Keycloak sets `email_verified` when the user has verified their address. |
| Visma Connect | `email_verified=true` | In the Visma Developer Portal enable **Include core identity claims in ID token**. |
| Azure AD B2C | Depends on your policy | The policy must emit the address as `email`, `emails` or `signInNames.emailAddress`, plus a claim that proves verification. |

Entra manifest entry:

```json
"optionalClaims": {
  "idToken": [
    { "name": "email", "source": null, "essential": false, "additionalProperties": [] },
    { "name": "xms_edov", "source": null, "essential": false, "additionalProperties": [] }
  ]
}
```

### What `xms_edov` means

`xms_edov` ("email domain owner verified") is `true` when the email's domain is verified by the user's own tenant, or the account is a Microsoft personal, Google or one-time-passcode account. Facebook and SAML/WS-Fed accounts never have it. It is only emitted when the `email` claim is present. See Microsoft's [optional claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference).

### Additional Entra hardening

- Prefer a single-tenant app registration and set `AZURE_AD_TENANT_ID` to your tenant GUID. Only your own tenant's users can then sign in.
- Set `removeUnverifiedEmailClaim` so Entra drops emails on unverified domains. It is on by default only for multi-tenant apps created since June 2023. See [authenticationBehaviors](https://learn.microsoft.com/en-us/graph/applications-authenticationbehaviors).

```http
PATCH https://graph.microsoft.com/beta/applications/{application-object-id}
Content-Type: application/json

{ "authenticationBehaviors": { "removeUnverifiedEmailClaim": true } }
```