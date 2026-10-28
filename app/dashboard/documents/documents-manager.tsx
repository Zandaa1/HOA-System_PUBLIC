'use client'

import { useState, useMemo } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FileText, Download, Trash2, Loader2, Upload, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'
import { deleteAppFile, uploadAppFile } from '@/lib/storage/client'
import { getDocumentStoredPath, getFileUrl } from '@/lib/storage/shared'

interface Document {
  id: string
  title: string
  description: string | null
  file_path: string
  file_size: number
  created_at: string
  uploaded_by: string | null
  uploader?: {
    first_name: string
    last_name: string
  } | null
}

interface DocumentsManagerProps {
  initialDocuments: Document[]
  staffId?: string
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function DocumentsManager({ initialDocuments, staffId }: DocumentsManagerProps) {
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>(initialDocuments)
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents
    const q = searchQuery.toLowerCase()
    return documents.filter((d) =>
      d.title?.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q) ||
      d.uploader?.first_name?.toLowerCase().includes(q) ||
      d.uploader?.last_name?.toLowerCase().includes(q)
    )
  }, [documents, searchQuery])

  const supabase = createClient()

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select a file to upload')
      return
    }

    setIsLoading(true)

    let filePath: string | null = null

    try {
      const uploaded = await uploadAppFile(file, { directory: 'documents/community' })
      filePath = uploaded.path

      const { data: newDoc, error: insertError } = await supabase
        .from('documents')
        .insert({
          title,
          description: description || null,
          file_path: filePath,
          file_size: file.size,
          uploaded_by: staffId || null
        })
        .select(`
          id,
          title,
          description,
          file_path,
          file_size,
          created_at,
          uploaded_by,
          uploader:staff(first_name, last_name)
        `)
        .single()

      if (insertError) {
        throw insertError
      }

      toast.success('Document uploaded successfully')
      
      // Reset form
      setTitle('')
      setDescription('')
      setFile(null)
      const fileInput = document.getElementById('document-file') as HTMLInputElement
      if (fileInput) fileInput.value = ''

      // Refresh data
      setDocuments([newDoc as any, ...documents])
      router.refresh()
    } catch (err) {
      await deleteAppFile(filePath).catch(() => {})
      toast.error(getErrorMessage(err))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Are you sure you want to delete "${doc.title}"? This cannot be undone.`)) return

    setIsDeleting(doc.id)

    try {
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', doc.id)

      if (dbError) throw dbError
      await deleteAppFile(getDocumentStoredPath(doc.file_path))

      toast.success('Document deleted successfully')
      setDocuments(documents.filter((d) => d.id !== doc.id))
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Upload Form */}
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle className="text-base">Upload Document</CardTitle>
          <CardDescription>Add folders/files to the Resident Document Center.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                placeholder="e.g. Construction Guidelines 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Short summary of what this document is for..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document-file">File *</Label>
              <Input
                id="document-file"
                type="file"
                className="cursor-pointer"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
              <p className="text-[10px] text-muted-foreground">
                Supported formats: PDF, DOCX, XLSX, images, etc.
              </p>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-4" />
                  Upload Document
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Community Files</CardTitle>
          <CardDescription>Currently published files available to all residents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents by title, description, or uploader..."
              className="h-10 pl-9 pr-9"
              aria-label="Search documents"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-muted-foreground">
              Showing {filteredDocuments.length} of {documents.length}
            </p>
          )}
          {filteredDocuments.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">
              {searchQuery ? `No documents match "${searchQuery}"` : 'No documents uploaded yet.'}
            </p>
          ) : (
          <div className="rounded-md border bg-card overflow-hidden">
            <Table suppressHydrationWarning>
              <TableHeader>
                <TableRow>
                  <TableHead>Document Info</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="max-w-[280px]">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-sm flex items-center gap-1.5 break-words">
                            <FileText className="size-4 shrink-0 text-primary" />
                            {doc.title}
                          </span>
                          {doc.description && (
                            <span className="text-xs text-muted-foreground line-clamp-2">
                              {doc.description}
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground">
                            Published: {new Date(doc.created_at).toLocaleDateString('en-PH', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {formatBytes(doc.file_size)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {doc.uploader ? `${doc.uploader.first_name} ${doc.uploader.last_name}` : 'System'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" asChild>
                            <a href={getFileUrl(getDocumentStoredPath(doc.file_path), { download: true })} target="_blank" rel="noopener noreferrer" title="Download">
                              <Download className="size-4" />
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={isDeleting === doc.id}
                            onClick={() => handleDelete(doc)}
                            title="Delete"
                          >
                            {isDeleting === doc.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                ))}
                {filteredDocuments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground italic">
                      {searchQuery ? `No documents match "${searchQuery}"` : 'No documents uploaded yet.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
