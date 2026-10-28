'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, X, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { deleteAppFile, uploadAppFile } from '@/lib/storage/client'
import { getDisplayFileUrl } from '@/lib/storage/shared'

interface LogoUploadProps {
  currentUrl: string
  onUrlChange: (url: string) => void
  label?: string
}

export function LogoUpload({ currentUrl, onUrlChange, label = 'Logo' }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB')
      return
    }

    setUploading(true)
    try {
      const uploaded = await uploadAppFile(file, { directory: 'branding' })
      if (currentUrl) await deleteAppFile(currentUrl).catch(() => {})
      onUrlChange(uploaded.path)
      setPreview(URL.createObjectURL(file))
      toast.success(`${label} uploaded successfully`)
    } catch (err) {
      toast.error('Failed to upload logo')
      console.error(err)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = () => {
    void deleteAppFile(currentUrl).catch(() => {})
    onUrlChange('')
    setPreview(null)
  }

  const displayUrl = preview || getDisplayFileUrl(currentUrl)

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <div className="flex items-start gap-4">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-lg border border-muted bg-muted/30 flex items-center justify-center">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt="Logo"
              fill
              className="object-contain p-2"
              unoptimized
            />
          ) : (
            <Upload className="size-6 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Upload className="mr-2 size-4" />
              )}
              {currentUrl ? 'Replace' : 'Upload'}
            </Button>
            {displayUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
              >
                <X className="mr-2 size-4" />
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            PNG, SVG, or JPG. Max 2MB.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>
    </div>
  )
}
