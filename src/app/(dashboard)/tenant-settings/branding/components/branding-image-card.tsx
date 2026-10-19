'use client'

import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Loader2, Upload, Link2, Trash2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { SaveImageRequest } from '../types'

/** Loads an image and returns its width and height in pixels. */
function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () =>
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not load the image'))
    img.src = src
  })
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
}

type ImageSource = 'upload' | 'url'

interface PendingUpload {
  fileName: string
  dataUrl: string
  width: number
  height: number
}

interface BrandingImageCardProps {
  /** "logo" or "favicon". Used in element IDs and messages. */
  kind: string
  title: string
  description: string
  /** Text shown in the upload area, for example "PNG, SVG, or JPG under 700KB". */
  fileHint: string
  maxBytes: number
  accept?: string
  urlPlaceholder: string
  /** Whether the tenant already has this image saved. */
  hasExisting: boolean
  /** Where to load the saved image from, or null. */
  existingSrc: string | null
  /** Text shown when no image is saved, for example what is used instead. */
  emptyLabel: string
  isMutating: boolean
  onSave: (image: SaveImageRequest) => Promise<void>
  onRemove: () => Promise<void>
  /** Optional. Returns a note about the chosen image, for example "not square". The image is still saved. */
  getWarning?: (dimensions: { width: number; height: number }) => string | null
  /** Optional. An extra preview shown under the upload area. */
  renderPreview?: (src: string | null) => ReactNode
}

/**
 * A card for uploading a logo or favicon, or linking to one. It keeps the
 * unsaved image itself. Give it a new `key` to clear it, for example when the
 * tenant changes.
 */
export function BrandingImageCard({
  kind,
  title,
  description,
  fileHint,
  maxBytes,
  accept = 'image/*',
  urlPlaceholder,
  hasExisting,
  existingSrc,
  emptyLabel,
  isMutating,
  onSave,
  onRemove,
  getWarning,
  renderPreview,
}: BrandingImageCardProps) {
  const [source, setSource] = useState<ImageSource>('upload')
  const [url, setUrl] = useState('')
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const label = kind.charAt(0).toUpperCase() + kind.slice(1)
  const maxSizeLabel = maxBytes >= 1024 * 1024
    ? `${Math.round(maxBytes / (1024 * 1024))}MB`
    : `${Math.round(maxBytes / 1024)}KB`

  const previewSrc = useMemo(() => {
    if (pendingUpload) return pendingUpload.dataUrl
    return hasExisting ? existingSrc : null
  }, [pendingUpload, hasExisting, existingSrc])

  const pendingWarning = pendingUpload && getWarning ? getWarning(pendingUpload) : null

  const acceptImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please choose an image file')
      return
    }
    if (file.size > maxBytes) {
      toast.error(`Image is too large. Please use an image under ${maxSizeLabel}.`)
      return
    }

    try {
      const dataUrl = await readFileAsDataUrl(file)
      const { width, height } = await getImageDimensions(dataUrl)
      setPendingUpload({ fileName: file.name, dataUrl, width, height })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read the image')
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await acceptImageFile(file)
    } finally {
      // Clear the input so the same file can be picked again.
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) await acceptImageFile(file)
  }

  const handleSave = async () => {
    try {
      if (source === 'upload') {
        if (!pendingUpload) {
          toast.error('Please choose an image first')
          return
        }
        await onSave({
          imgBase64: pendingUpload.dataUrl,
          width: pendingUpload.width,
          height: pendingUpload.height,
        })
        setPendingUpload(null)
      } else {
        const trimmed = url.trim()
        if (!trimmed) {
          toast.error('Please enter an image URL')
          return
        }
        let dimensions: { width: number; height: number }
        try {
          dimensions = await getImageDimensions(trimmed)
        } catch {
          toast.error('Could not load an image from that URL')
          return
        }
        const warning = getWarning?.(dimensions)
        if (warning) toast.warning(warning)
        await onSave({ url: trimmed, width: dimensions.width, height: dimensions.height })
        setUrl('')
      }
      toast.success(`${label} updated`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to update ${kind}`)
    }
  }

  const handleRemove = async () => {
    try {
      await onRemove()
      setPendingUpload(null)
      setUrl('')
      toast.success(`${label} removed`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to remove ${kind}`)
    }
  }

  const canSave = source === 'upload' ? pendingUpload !== null : url.trim() !== ''

  const thumbnail = (muted: boolean) => (
    <div
      className={cn(
        'flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border',
        muted ? 'bg-muted/40' : 'bg-background'
      )}
    >
      {previewSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewSrc}
          alt={`Tenant ${kind}`}
          className="max-h-full max-w-full object-contain"
        />
      ) : (
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
      )}
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source toggle */}
        <div className="inline-flex rounded-lg border p-1">
          <button
            type="button"
            onClick={() => setSource('upload')}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              source === 'upload'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Upload className="h-4 w-4" />
            Upload
          </button>
          <button
            type="button"
            onClick={() => setSource('url')}
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              source === 'url'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Link2 className="h-4 w-4" />
            Image URL
          </button>
        </div>

        {source === 'upload' ? (
          // The two modes have different keys so React builds a new <input>
          // when you switch. If it reused the file input as the URL field,
          // picking a file would stop working.
          // `relative` keeps the hidden (sr-only, absolutely positioned) file
          // input inside this card. Without it, the input is placed relative to
          // the whole page, and a card below the fold adds a second scrollbar.
          <div key={`${kind}-upload`} className="relative">
            <input
              id={`${kind}-file`}
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="sr-only"
              onChange={handleFileChange}
            />
            <label
              htmlFor={`${kind}-file`}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setIsDragging(false)
                }
              }}
              onDrop={handleDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-8 text-center transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-muted/30 hover:border-primary/60 hover:bg-muted/50'
              )}
            >
              {thumbnail(false)}
              <div className="space-y-1">
                <p className="max-w-full break-all text-sm font-medium text-foreground">
                  {pendingUpload
                    ? pendingUpload.fileName
                    : hasExisting
                      ? `Replace the current ${kind}`
                      : 'Choose an image'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pendingUpload
                    ? `${pendingUpload.width}×${pendingUpload.height}px · ready to save`
                    : `Click here, or drag and drop a ${fileHint}`}
                </p>
                {pendingWarning && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">{pendingWarning}</p>
                )}
              </div>
              <span className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                <Upload className="h-4 w-4" />
                {pendingUpload || hasExisting ? 'Change image' : 'Choose image'}
              </span>
            </label>
          </div>
        ) : (
          <div key={`${kind}-url`} className="space-y-4">
            <div className="flex items-center gap-4">
              {thumbnail(true)}
              <p className="text-sm text-muted-foreground">
                {hasExisting ? `Current ${kind}` : emptyLabel}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${kind}-url`}>Image URL</Label>
              <Input
                id={`${kind}-url`}
                type="url"
                placeholder={urlPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>
          </div>
        )}

        {renderPreview?.(previewSrc)}
      </CardContent>
      <CardFooter className="gap-2 border-t">
        <Button
          onClick={handleSave}
          disabled={!canSave || isMutating}
          className="gap-2"
        >
          {isMutating && <Loader2 className="h-4 w-4 animate-spin" />}
          Save {kind}
        </Button>
        <Button
          variant="ghost"
          onClick={handleRemove}
          disabled={isMutating || !hasExisting}
          className="gap-2 text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </CardFooter>
    </Card>
  )
}
