'use client'

import { Lock } from 'lucide-react'
import { AgentCertificatesSection } from './components/agent-certificates-section'
import { AdminApiKeysSection } from './components/admin-apikeys-section'

export default function DeveloperSecretsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Page header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto p-4 sm:p-6">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2 sm:gap-3">
              <Lock className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              Secrets
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Manage agent certificates and admin API keys for your account
            </p>
          </div>
        </div>
      </div>

      {/* Content — two sections stacked */}
      <div className="container mx-auto p-4 sm:p-6 space-y-8">
        {/* Agent Certificates */}
        <section className="rounded-xl border bg-card/40 p-4 sm:p-6">
          <AgentCertificatesSection />
        </section>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dashed" />
          </div>
        </div>

        {/* Admin API Keys */}
        <section className="rounded-xl border bg-card/40 p-4 sm:p-6">
          <AdminApiKeysSection />
        </section>
      </div>
    </div>
  )
}
