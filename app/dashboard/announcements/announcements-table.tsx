'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Pencil, Trash2, Pin, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/utils'

interface Announcement {
  id: string
  title: string
  content: string
  is_pinned: boolean
  is_alert: boolean
  created_at: string
  author: {
    first_name: string
    last_name: string
  }
}

interface AnnouncementsTableProps {
  announcements: Announcement[]
}

export function AnnouncementsTable({ announcements: initialAnnouncements }: AnnouncementsTableProps) {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return

    setIsDeleting(id)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Announcement deleted successfully')
      setAnnouncements(announcements.filter((a) => a.id !== id))
      router.refresh()
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setIsDeleting(null)
    }
  }

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Author</TableHead>
            <TableHead>Date Published</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {announcements.map((announcement) => (
            <TableRow key={announcement.id}>
              <TableCell className="font-semibold max-w-[300px] truncate">
                {announcement.title}
              </TableCell>
              <TableCell className="text-sm">
                {announcement.author ? `${announcement.author.first_name} ${announcement.author.last_name}` : 'Unknown'}
              </TableCell>
              <TableCell className="text-sm">
                {new Date(announcement.created_at).toLocaleDateString('en-PH', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </TableCell>
              <TableCell>
                <div className="flex gap-2">
                  {announcement.is_pinned && (
                    <Badge variant="outline" className="flex items-center gap-1 border-primary/50 text-primary">
                      <Pin className="size-3" /> Pinned
                    </Badge>
                  )}
                  {announcement.is_alert && (
                    <Badge variant="outline" className="flex items-center gap-1 border-destructive/50 text-destructive bg-destructive/5">
                      <AlertTriangle className="size-3" /> Alert
                    </Badge>
                  )}
                  {!announcement.is_pinned && !announcement.is_alert && (
                    <Badge variant="secondary">Standard</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/dashboard/announcements/${announcement.id}/edit`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={isDeleting === announcement.id}
                    onClick={() => handleDelete(announcement.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {announcements.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground italic">
                No announcements published yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
