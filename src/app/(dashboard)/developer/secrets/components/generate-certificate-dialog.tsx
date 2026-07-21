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
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Download, Copy, Check } from 'lucide-react'

interface GenerateCertificateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (name: string, revokePrevious: boolean) => Promise<string>
}

export function GenerateCertificateDialog({
  open,
  onOpenChange,
  onGenerate,
}: GenerateCertificateDialogProps) {
  const [name, setName] = useState('')
  const [revokePrevious, setRevokePrevious] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [certBase64, setCertBase64] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!name.trim()) return
    setIsGenerating(true)
    try {
      const cert = await onGenerate(name.trim(), revokePrevious)
      setCertBase64(cert)
    } finally {
      setIsGenerating(false)
    }
  }

  // Ensure we always have a plain string regardless of what the hook returns
  const certStr = typeof certBase64 === 'string' ? certBase64 : ''

  const handleDownload = () => {
    if (!certStr) return
    const byteString = atob(certStr)
    const bytes = new Uint8Array(byteString.length)
    for (let i = 0; i < byteString.length; i++) {
      bytes[i] = byteString.charCodeAt(i)
    }
    const blob = new Blob([bytes], { type: 'application/x-pkcs12' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${name.trim().replace(/\s+/g, '-')}.pfx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleCopy = async () => {
    if (!certStr) return
    await navigator.clipboard.writeText(certStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setName('')
    setCertBase64(null)
    setRevokePrevious(false)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Agent Certificate</DialogTitle>
          <DialogDescription>
            Generate a new X.509 certificate for your agents to authenticate with the flow server.
          </DialogDescription>
        </DialogHeader>

        {!certStr ? (
          <>
            <div className="space-y-4">
              {/* Name field */}
              <div className="space-y-1.5">
                <Label htmlFor="cert-name">Certificate name</Label>
                <Input
                  id="cert-name"
                  placeholder="e.g. Local Dev, CI Runner, Production"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && name.trim()) handleGenerate()
                  }}
                  disabled={isGenerating}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  A friendly label to identify this certificate in the list.
                </p>
              </div>

              <div className="flex items-start gap-3 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  The certificate will only be available for download once. Store it securely.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  id="revoke-previous"
                  checked={revokePrevious}
                  onCheckedChange={(checked) => setRevokePrevious(checked === true)}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="revoke-previous" className="text-sm font-medium cursor-pointer">
                    Revoke previous certificates
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    All existing active certificates for your account will be removed.
                  </p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={isGenerating || !name.trim()}>
                {isGenerating ? 'Generating…' : 'Generate Certificate'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 p-3">
                <Check className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                <p className="text-sm text-green-800 dark:text-green-300">
                  <span className="font-medium">&quot;{name}&quot;</span> generated. Download it now — it
                  won&apos;t be shown again.
                </p>
              </div>

              <div className="rounded-lg border bg-muted/50 p-3">
                <p className="text-xs font-mono text-muted-foreground break-all line-clamp-3">
                  {certStr.slice(0, 120)}…
                </p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={handleDownload}>
                  <Download className="h-4 w-4" />
                  Download PFX
                </Button>
                <Button className="gap-2" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                  {copied ? 'Copied' : 'Copy Base64'}
                </Button>
              </div>
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
