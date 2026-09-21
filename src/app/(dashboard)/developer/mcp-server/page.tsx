'use client'

import { Cable } from 'lucide-react'
import { XiansMcpPanel } from './components/xians-mcp-panel'

export default function DeveloperMcpServerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-4 sm:p-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2 sm:gap-3">
              <Cable className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              MCP Server
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Connect an MCP client to the Xians Platform
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 sm:p-6 space-y-8">
        <section className="rounded-xl border bg-card/40 p-4 sm:p-6">
          <XiansMcpPanel />
        </section>
      </div>
    </div>
  )
}
