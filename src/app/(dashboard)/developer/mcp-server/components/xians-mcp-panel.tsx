'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Cable, Copy, Check, KeyRound } from 'lucide-react'
import Link from 'next/link'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'

type Configuration = { mcpServers: { url: string }[] }

export function XiansMcpPanel() {
  const [configuration, setConfiguration] = useState<Configuration>()
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/mcp/configuration', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load MCP configuration.')
        return response.json() as Promise<Configuration>
      })
      .then((value) => {
        if (!controller.signal.aborted) setConfiguration(value)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Unable to load MCP configuration.')
      })
    return () => controller.abort()
  }, [])

  const url = configuration?.mcpServers[0]?.url

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      showSuccessToast('Copied to clipboard.')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      showErrorToast(new Error('Unable to copy to clipboard.'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="p-2 rounded-lg bg-primary/10 shrink-0">
          <Cable className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Xians MCP</h2>
          <p className="text-xs text-muted-foreground">
            Use this URL in an MCP client to talk to the Xians Platform
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!error && (
        <div className="rounded-lg border bg-card/60 p-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                MCP Server URL
              </p>
              {url ? (
                <code className="font-mono text-xs text-foreground break-all">{url}</code>
              ) : (
                <span className="text-xs text-muted-foreground italic" role="status">
                  {configuration ? 'Unavailable' : 'Loading MCP configuration…'}
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => url && copy(url)}
              disabled={!url}
              title="Copy URL"
              aria-label="Copy MCP URL"
              className="h-7 w-7 shrink-0"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-green-500" aria-hidden="true" />
              ) : (
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 rounded-lg border bg-card/60 p-3">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary mt-0.5 shrink-0">
          <KeyRound className="h-3.5 w-3.5" />
        </div>
        <p className="text-xs text-muted-foreground">
          Authentication uses a Xians admin API key as a Bearer token. Generate one in{' '}
          <Link href="/developer/secrets" className="underline underline-offset-2 text-foreground">
            Developer → Secrets → Admin API Keys
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
