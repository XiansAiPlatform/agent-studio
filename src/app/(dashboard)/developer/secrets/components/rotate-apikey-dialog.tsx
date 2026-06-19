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
import { Label } from '@/components/ui/label'
import { AlertTriangle, Copy, Check, Eye, EyeOff } from 'lucide-react'
import { AdminApiKey, RotateAdminApiKeyResponse } from '../types'

interface RotateApiKeyDialogProps {
  apiKey: AdminApiKey | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRotate: (id: string) => Promise<RotateAdminApiKeyResponse>
}

export function RotateApiKeyDialog({
  apiKey,
  open,
  onOpenChange,
  onRotate,
}: RotateApiKeyDialogProps) {
  const [isRotating, setIsRotating] = useState(false)
  const [result, setResult] = useState<RotateAdminApiKeyResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [revealed, setRevealed] = useState(false)

  const handleRotate = async () => {
    if (!apiKey) return
    setIsRotating(true)
    try {
      const res = await onRotate(apiKey.id)
      setResult(res)
    } finally {
      setIsRotating(false)
    }
  }

  const handleCopy = async () => {
    if (!result?.apiKey) return
    await navigator.clipboard.writeText(result.apiKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
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
          <DialogTitle>Rotate API Key</DialogTitle>
          <DialogDescription>
            {result
              ? `"${apiKey?.name}" has been rotated successfully.`
              : `Rotate "${apiKey?.name}"? The current key will be immediately invalidated.`}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="flex items-start gap-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-3">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Any services using the current key will lose access immediately. Update them with
                the new key before or right after rotation.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRotate} disabled={isRotating}>
                {isRotating ? 'Rotating…' : 'Rotate Key'}
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
                <Label className="text-xs text-muted-foreground">New API Key — {result.name}</Label>
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
                    Copy New API Key
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
