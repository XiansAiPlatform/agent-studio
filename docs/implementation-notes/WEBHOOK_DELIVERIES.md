# Webhook Deliveries

> **Status**: Implemented  
> **Last Updated**: 2026-10-29  
> **Audience**: Developers  
> **Design canvas**: [Webhook Recent Deliveries](https://claude.ai/artifact/LptT7ZhMENvU4CJAYjhUEV)

Track and inspect the webhook calls a builtin webhook connection receives, in the style of GitHub's "Recent Deliveries" view. Developers can also redeliver a past delivery to the live webhook URL.

---

## Overview

A builtin webhook connection (`platformId = builtin_webhook`) gives an external system such as GitHub a URL of the form:

```
POST /api/user/webhooks/builtin?apikeyId=…&agentName=…&workflowName=…&webhookName=…&activationName=…
```

Today the server forwards each call to the agent workflow and nothing is stored, so there is no way to see what a source sent or what the agent replied. This feature records each received call as a **delivery** and shows it in Agent Studio.

### Goals

- Show the deliveries a webhook connection has received, newest first.
- Show the full request (headers, payload) and the response returned to the caller.
- Keep a fixed number of recent deliveries per webhook; older ones are removed automatically.
- Let **Developers** redeliver a past delivery by re-hitting the live webhook URL.

### Non-Goals

- Status, outcome or error filtering in the list. Every listed delivery is a call that reached Agent Studio from the source.
- Search and filter controls.
- Retention settings in the UI. Retention is configured with environment variables.
- Outbound event webhooks (`webhook_deliveries` outbox in XiansAi.Server). That is a separate feature.

---

## Roles and Access

| Role | View deliveries | Redeliver |
|------|-----------------|-----------|
| Participant Admin (`TenantParticipantAdmin`) | Yes | No |
| Developer (`TenantUser`) | Yes | Yes |
| Tenant Admin (`TenantAdmin`) | Yes | Yes |
| System Admin (`SysAdmin`) | Yes | Yes |

- Add a frontend capability `webhooks:redeliver` in `src/lib/auth/capabilities.ts`, granted to Developer and above.
- Add matching server capabilities `TenantWebhookDeliveriesRead` and `TenantWebhookDeliveriesRedeliver`. The server enforces redeliver access; hiding the button is not enough.

---

## UI Design

The screens below match the design canvas linked at the top of this document.

### 1. Entry Point: Connection Details Sheet

File: `src/app/(dashboard)/settings/connections/components/integration-details-sheet.tsx`

For `builtin_webhook` connections, add a **Deliveries** card under "Full Webhook URL":

- A list of the 5 latest deliveries. Each row shows only the **delivery ID** and **received time**.
- A **View all deliveries** button that opens the Deliveries page.

The sheet shows no summary counts (no "last 24 h", "failed" or "last delivery" tiles) and no retention settings.

### 2. Deliveries Page

Route: `src/app/(dashboard)/settings/connections/[integrationId]/deliveries/page.tsx`

| Area | Content |
|------|---------|
| Breadcrumb | Connections / {connection name} / Deliveries |
| Header | Title "Deliveries", connection subtitle (name · type · agent / activation) |
| Retention note | "Keeps the last {N} deliveries · older ones are removed automatically", with `N` from the server |
| List | One row per delivery: delivery ID (monospace chip), received time, expand button |
| Footer | "Showing X of Y retained deliveries" and **Load more** (cursor paging) |

There is no search or filter area and no status icon or status code in the rows.

### 3. Delivery Detail (Expanded Row)

Expanding a row shows two tabs:

- **Request**
  - Headers, including `Request URL` and `Request method`. Secrets are shown as `[redacted]`.
  - Payload: pretty-printed JSON when the content type is JSON, otherwise raw text. Shows content type and size.
- **Response**
  - Headers returned to the caller.
  - Body returned to the caller.

The tab row also shows:

- "Completed in {duration}".
- **Logs** button that opens every log of the delivery: the integration step in the receiving workflow and the runs it started. Xians.Lib tags each log written while handling a message with its request ID (`properties.requestId`), so Studio opens `/settings/logs?requestId=…&startDate=…` (from a minute before the delivery arrived). Agents on an older Xians.Lib write no tagged logs. When no tagged logs exist for the delivery, the button is disabled and reads **No logs**. It does not fall back to the receiving workflow, which is shared by every delivery of the activation.
- **Redeliver** button for users with `webhooks:redeliver`.
- For other users, a lock icon with "Redeliver is available to Developers".

### 4. Redeliver Confirmation (Developer Only)

A modal dialog with:

- A "Developer only" badge and the title "Redeliver this webhook?".
- An explanation that the original payload and headers are sent as a real POST to the live webhook URL.
- A summary: original delivery ID, received time, and the added headers.
- A warning that the agent runs again and may repeat side effects (for example, a second PR comment).
- **Cancel** and **Redeliver now** buttons.

### 5. After Redelivery

- Toast: "Redelivered · completed in {duration}".
- The new delivery appears at the top of the list with a **Redelivery** badge. Its row label is the **original request ID**, not a new ID. Its detail shows:
  - Triggered by: user name and role
  - Sent to: target URL (API key masked)
  - Duration
- The original row is unchanged (no redelivery count).

---

## Behavior

### What Counts as a Delivery

A delivery is recorded for every request that reaches the builtin webhook endpoint and can be matched to a connection. The record holds the request as received and the response the server returned to the caller.

The server matches a request to its connection by `(tenantId, agentName, activationName, workflowName, webhookName)` with `platformId = builtin_webhook`. Requests that match no connection are not recorded.

### Redaction

These values are never stored:

- Headers: `Authorization`, `Cookie`, `X-Api-Key`
- Query parameters: `apikey`, `access_token`, `authorization`

The `apikeyId` value is masked in the displayed Request URL. Signature headers such as `X-Hub-Signature-256` are kept. They are not secret, and redelivery needs them.

### Retention

The server keeps the newest `N` deliveries per webhook connection and deletes older ones after each batch write. Deliveries are deleted when their connection is deleted. `N` is set by environment variable (see [Configuration](#configuration)).

### Redelivery

Redelivery **re-hits the live webhook URL**. It does not call the agent internally.

1. The user confirms in the dialog.
2. Studio calls the redeliver API. The server checks the `TenantWebhookDeliveriesRedeliver` capability.
3. The server sends an HTTP POST to the connection's current webhook URL with:
   - the stored body, byte-for-byte
   - the stored non-secret headers
   - `X-Xians-Redelivery: true`
   - `X-Xians-Redelivery-Of: {originalDeliveryId}`
4. The request goes through the normal pipeline: authentication (via `apikeyId` in the stored URL), rate limiting, activation checks and the agent workflow.
5. The endpoint records it as a new delivery. The `X-Xians-Redelivery-Of` header links it to the original, and the user who triggered it is stored.
6. The API returns the new delivery so the UI can show it.

Bodies must be stored in full for redelivery to match the original (GitHub verifies `X-Hub-Signature-256` against the exact body). If a body exceeds the storage limit, it is stored truncated and Redeliver is disabled for that delivery.

---

## Configuration

Server environment variables (XiansAi.Server, `WebhookDeliveryLogs` section):

| Variable | Default | Description |
|----------|---------|-------------|
| `WebhookDeliveryLogs__Enabled` | `true` | Turns delivery recording on or off. |
| `WebhookDeliveryLogs__MaxPerWebhook` | `100` | Deliveries kept per webhook connection. |
| `WebhookDeliveryLogs__MaxStoredBodyBytes` | `1048576` | Largest request or response body stored in full. Larger bodies are truncated, and their deliveries cannot be redelivered. |
| `WebhookDeliveryLogs__StoreBodies` | `true` | Set to `false` to store headers and metadata only. Redeliver is unavailable when bodies are not stored. |

Agent Studio has no settings for this feature. The Deliveries page reads `N` from the list API response.

---

## API Contract

### Studio Routes (Next.js)

All routes use `withParticipantAdmin` and take the tenant from the session. The redeliver route also requires `webhooks:redeliver`.

| Method | Route | Backend |
|--------|-------|---------|
| GET | `/api/integrations/{integrationId}/deliveries?cursor=&limit=` | `GET /api/v1/admin/tenants/{tenantId}/integrations/{integrationId}/deliveries` |
| GET | `/api/integrations/{integrationId}/deliveries/{deliveryId}` | `GET …/deliveries/{deliveryId}` |
| POST | `/api/integrations/{integrationId}/deliveries/{deliveryId}/redeliver` | `POST …/deliveries/{deliveryId}/redeliver` |

### List Response

```json
{
  "items": [
    {
      "id": "002b75c0-d279-11f1-984b-c9a409fe5ef7",
      "receivedAt": "2026-10-28T08:10:58Z",
      "isRedelivery": false,
      "redeliveryOf": null
    }
  ],
  "nextCursor": "…",
  "retained": 100,
  "maxPerWebhook": 100
}
```

### Detail Response

```json
{
  "id": "002b75c0-d279-11f1-984b-c9a409fe5ef7",
  "receivedAt": "2026-10-28T08:10:58Z",
  "durationMs": 700,
  "request": {
    "method": "POST",
    "url": "https://api.agentri.ai/api/user/webhooks/builtin?apikeyId=••••••&…",
    "headers": { "X-GitHub-Event": "pull_request", "Authorization": "[redacted]" },
    "contentType": "application/json",
    "sizeBytes": 18840,
    "body": "{ … }",
    "bodyTruncated": false
  },
  "response": {
    "headers": { "Content-Type": "application/json; charset=utf-8" },
    "body": "{ \"accepted\": true }",
    "bodyTruncated": false
  },
  "isRedelivery": false,
  "redeliveryOf": null,
  "triggeredBy": null,
  "canRedeliver": true
}
```

The delivery ID is taken from the source's own ID header (for example `X-GitHub-Delivery`) when one is present, otherwise generated by the server.

Each record has its own internal `id`, but the UI labels a row with the original request ID. For a redelivery, `redeliveryOf` holds the original request ID, and the row shows that ID with a Redelivery badge.

---

## Implementation Outline

| Area | Work |
|------|------|
| XiansAi.Server | `webhook_delivery_logs` collection, model and repository, with an index on `{tenantId, integrationId, receivedAt: -1}` |
| XiansAi.Server | Capture in the builtin webhook endpoint (`try/finally` around processing); background batched writer; retention pruning; redaction |
| XiansAi.Server | Admin list, detail and redeliver endpoints; capabilities; audit log entry for redeliver |
| Agent Studio | `webhooks:redeliver` capability; Next.js proxy routes; `useWebhookDeliveries` hook |
| Agent Studio | Deliveries card in the details sheet; Deliveries page; delivery detail; redeliver dialog |

---

## Open Questions

- Should repeated redelivery of the same delivery have a cooldown (for example, once per minute)?
- Should the Deliveries page be visible to Participant Admins, or to Developers and above only?

---

**Related:** [API_CONTRACT.md](../architecture/API_CONTRACT.md) | [SECURITY_ARCHITECTURE.md](../architecture/SECURITY_ARCHITECTURE.md)
