'use client'

import { Badge } from '@/components/ui/badge'
import {
  getSecretScopeDetail,
  getSecretScopeKind,
  SECRET_SCOPE_LABELS,
  type TenantSecret,
} from '../types'

export function SecretScopeBadge({ secret }: { secret: TenantSecret }) {
  const kind = getSecretScopeKind(secret)
  const detail = getSecretScopeDetail(secret)

  return (
    <Badge variant="outline" className="max-w-full font-normal">
      <span>{SECRET_SCOPE_LABELS[kind]}</span>
      {detail ? (
        <span className="truncate font-mono text-[11px] text-muted-foreground">{detail}</span>
      ) : null}
    </Badge>
  )
}
