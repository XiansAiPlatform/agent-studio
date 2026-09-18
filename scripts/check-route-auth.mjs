#!/usr/bin/env node
/**
 * Route authorization guard.
 *
 * Every API route under src/app/api is a privileged proxy: it forwards to the
 * Xians backend using the admin service API key (XIANS_APIKEY), so the Next.js
 * route is the ONLY per-user authorization gate. A route that forgets to guard
 * itself silently exposes admin-key-backed, tenant-wide operations.
 *
 * This script fails (non-zero exit) if any route file neither:
 *   - uses one of the approved auth wrappers, nor
 *   - performs a manual session check (getServerSession), nor
 *   - is on the explicit public allowlist.
 *
 * It also fails if a route calls the Admin API without binding the signed-in
 * user, which would make the backend record the API-key owner as `LoggedInUser`
 * instead of the person using the Studio (see docs/auth/authorization-model.md).
 *
 * It is a coarse guardrail, not a substitute for review: it confirms a route
 * has *some* gate, not that the gate is the correct strength.
 *
 * Run: `node scripts/check-route-auth.mjs` (also wired as `npm run check:auth`).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const apiRoot = join(repoRoot, 'src', 'app', 'api')

// Routes that are intentionally public (no user auth). Keep this list tiny and
// justified — each entry is an explicit decision.
const PUBLIC_ALLOWLIST = new Set([
  'health/route.ts', // liveness probe for Docker / load balancers
  'auth/[...nextauth]/route.ts', // NextAuth handler (manages its own auth flow)
])

// Approved server-side authorization signals. A route must contain at least one.
const AUTH_SIGNALS = [
  'withTenantFromSession',
  'withParticipantAdmin',
  'withTenantAdmin',
  'withSystemAdmin',
  'getServerSession', // manual guard (must still check the result)
]

// Ways a route reaches the Xians Admin API with the service credential.
const ADMIN_CALL_SIGNALS = ['createXiansClient', 'createXiansSDK', 'xiansAdminHeaders']

// Ways a route binds the signed-in user so `X-On-Behalf-Of` is sent. The auth
// wrappers bind the session themselves; routes guarded by a manual
// getServerSession check must bind explicitly.
const ATTRIBUTION_SIGNALS = [
  'withTenantFromSession',
  'withParticipantAdmin',
  'withTenantAdmin',
  'withSystemAdmin', // also matches withSystemAdminTenant
  'runWithOnBehalfOf',
  'runWithSessionOnBehalfOf',
]

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else if (entry === 'route.ts' || entry === 'route.tsx') out.push(full)
  }
  return out
}

const offenders = []
const unattributed = []
for (const file of walk(apiRoot)) {
  const rel = relative(apiRoot, file)
  if (PUBLIC_ALLOWLIST.has(rel)) continue
  const src = readFileSync(file, 'utf8')
  if (!AUTH_SIGNALS.some((signal) => src.includes(signal))) {
    offenders.push(rel)
  }
  if (
    ADMIN_CALL_SIGNALS.some((signal) => src.includes(signal)) &&
    !ATTRIBUTION_SIGNALS.some((signal) => src.includes(signal))
  ) {
    unattributed.push(rel)
  }
}

if (offenders.length > 0) {
  console.error('\n[check-route-auth] API routes with no detectable authorization gate:\n')
  for (const o of offenders) console.error(`  - src/app/api/${o}`)
  console.error(
    '\nEvery route must use an auth wrapper (withTenantFromSession / withParticipantAdmin /' +
      '\nwithTenantAdmin / withSystemAdmin) or a manual getServerSession check. If a route is' +
      '\nintentionally public, add it to PUBLIC_ALLOWLIST in scripts/check-route-auth.mjs with a' +
      '\njustifying comment.\n'
  )
}

if (unattributed.length > 0) {
  console.error('\n[check-route-auth] API routes calling the Admin API with no bound UI user:\n')
  for (const o of unattributed) console.error(`  - src/app/api/${o}`)
  console.error(
    '\nThese calls would be audited as the API-key owner rather than the signed-in user.' +
      '\nUse an auth wrapper, or wrap the handler body in runWithSessionOnBehalfOf(session, ...)' +
      '\nfrom @/lib/xians/on-behalf-of.\n'
  )
}

if (offenders.length > 0 || unattributed.length > 0) {
  process.exit(1)
}

console.log(
  '[check-route-auth] OK — all API routes have an authorization gate and attribute Admin calls.'
)
