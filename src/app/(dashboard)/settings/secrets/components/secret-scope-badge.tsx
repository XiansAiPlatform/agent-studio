'use client'

import { Badge } from '@/components/ui/badge'
import {
  getSecretScopeDetail,
  getSecretScopeKind,
  SECRET_SCOPE_LABELS,
  type AgentNameMap,
  type TenantSecret,
} from '../types'

export function SecretScopeBadge({
  secret,
  agentNames,
}: {
  secret: TenantSecret
  agentNames?: AgentNameMap
}) {
  const kind = getSecretScopeKind(secret)
  const detail = getSecretScopeDetail(secret, agentNames)

  return (
    <Badge variant="outline" className="max-w-full font-normal">
      <span>{SECRET_SCOPE_LABELS[kind]}</span>
      {detail ? (
        <span className="truncate font-mono text-[11px] text-muted-foreground">{detail}</span>
      ) : null}
    </Badge>
  )
}
