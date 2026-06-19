'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { CreateAdminApiKeyResponse } from '../types'

interface CreateApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => Promise<CreateAdminApiKeyResponse>
}

export function CreateApiKeyDialog({ open, onOpenChange, onCreate }: CreateApiKeyDialogProps) {
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<CreateAdminApiKeyResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) return
    setIsCreating(true)
    try {
      const res = await onCreate(name.trim())
      setResult(res)
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.apiKey) return
    await navigator.clipboard.writeText(result.apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setName('')
    setResult(null)
    setCopied(false)
    setRevealed(false)
    onOpenChange(false)
  }

  const maskedKey = result
    ? `${result.apiKey.slice(0, 8)}${'•'.repeat(Math.min(result.apiKey.length - 12, 24))}${result.apiKey.slice(-4)}`
    : ''

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Admin API Key</DialogTitle>
          <DialogDescription>
            Create a named API key for programmatic access to the Xians Admin API.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="key-name">Key name</Label>
                <Input
                  id="key-name"
                  placeholder="e.g. CI/CD Pipeline, Local Dev"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim()) handleCreate()
                  }}
                  disabled={isCreating}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Give it a descriptive name so you can identify it later.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
                {isCreating ? 'Creating…' : 'Create API Key'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  Copy this key now. It will not be shown again after you close this dialog.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">API Key — {result.name}</Label>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                  <code className="flex-1 text-xs font-mono break-all text-foreground">
                    {revealed ? result.apiKey : maskedKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setRevealed(!revealed)}
                    title={revealed ? 'Hide key' : 'Reveal key'}
                  >
                    {revealed ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <Button className="w-full gap-2" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy API Key
                  </>
                )}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
