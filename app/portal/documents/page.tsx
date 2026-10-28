
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDocumentStoredPath, getFileUrl } from '@/lib/storage/shared'

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export default async function PortalDocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch documents from the database
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Center</h1>
        <p className="text-muted-foreground">
          Access important HOA forms, guidelines, and community documents.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Community Documents</CardTitle>
          <CardDescription>Click on a document to download it.</CardDescription>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc: any) => (
                  <Card key={doc.id} className="flex flex-col">
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-3">
                        <FileText className="size-8 text-primary shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <CardTitle className="text-base break-words line-clamp-2">
                            {doc.title}
                          </CardTitle>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {doc.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="mt-auto flex items-center justify-between pt-0">
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(doc.file_size)}
                      </p>
                      <Button asChild size="sm" variant="outline">
                        <a href={getFileUrl(getDocumentStoredPath(doc.file_path), { download: true })} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-2 size-4" />
                          Download
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground italic">No documents available at this time.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
