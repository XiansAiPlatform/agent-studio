'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { showErrorToast, showSuccessToast } from '@/lib/utils/error-handler'

type Configuration = { mcpServers: { url: string }[] }

export function XiansMcpPanel({ agentName, activationName }: { agentName: string; activationName: string }) {
  const [configuration, setConfiguration] = useState<Configuration>()
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    const query = new URLSearchParams({ agentName, activationName })
    fetch(`/api/mcp/configuration?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load MCP configuration.')
        return response.json() as Promise<Configuration>
      })
      .then((value) => { if (!controller.signal.aborted) setConfiguration(value) })
      .catch(() => { if (!controller.signal.aborted) setError('Unable to load MCP configuration.') })
    return () => controller.abort()
  }, [agentName, activationName])

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value)
      showSuccessToast('MCP URL copied.')
    } catch {
      showErrorToast(new Error('Unable to copy. Select and copy the URL manually.'))
    }
  }

  return (
    <section className="mb-6 space-y-3 rounded-xl border bg-card p-4 sm:p-6" aria-label="Xians MCP">
      <h2 className="text-lg font-semibold">Xians MCP</h2>
      <p className="text-sm text-muted-foreground">Connect an MCP client to this agent activation.</p>
      {configuration ? (
        <div className="flex items-center gap-2 rounded-md bg-muted p-3">
          <p className="min-w-0 flex-1 break-all font-mono text-xs">{configuration.mcpServers[0].url}</p>
          <Button variant="ghost" size="icon" className="shrink-0" aria-label="Copy MCP URL" title="Copy URL" onClick={() => copy(configuration.mcpServers[0].url)}>
            <Copy className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <p className="text-sm" role="status">{error || 'Loading MCP configuration…'}</p>
      )}
      <p className="text-xs text-muted-foreground">Authentication: Xians admin API key (Bearer token).</p>
    </section>
  )
}
