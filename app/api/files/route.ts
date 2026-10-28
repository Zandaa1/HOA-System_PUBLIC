import { NextResponse } from 'next/server'

import { createClient } from '@/lib/supabase/server'
import {
  deleteStoredFile,
  getContentType,
  readStoredFile,
  saveUploadedFile,
} from '@/lib/storage/server'
import {
  isMaintenanceFilePath,
  isStaffOnlyFilePath,
  normalizeStoredPath,
} from '@/lib/storage/shared'

export const runtime = 'nodejs'

async function getAuthContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, isStaff: false }
  }

  const { data } = await supabase.rpc('is_staff')
  return { supabase, user, isStaff: data === true }
}

function canUploadDirectory(directory: string, isStaff: boolean): boolean {
  const normalized = normalizeStoredPath(directory)
  if (isStaff) return true
  return normalized === 'maintenance' || normalized.startsWith('maintenance/')
}

function validateUpload(file: File, directory: string) {
  const normalized = normalizeStoredPath(directory)
  const imageOnlyPrefixes = [
    'properties',
    'amenities',
    'violations',
    'maintenance',
    'payments',
    'liquidations',
    'branding',
    'payment-channels',
  ]

  const maxBytes = normalized.startsWith('documents') ? 10 * 1024 * 1024 : 5 * 1024 * 1024
  if (file.size > maxBytes) {
    throw new Error(`File must be ${Math.round(maxBytes / 1024 / 1024)}MB or smaller.`)
  }

  if (imageOnlyPrefixes.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`))) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Only image uploads are allowed here.')
    }
  }
}

async function canReadPath(path: string, context: Awaited<ReturnType<typeof getAuthContext>>): Promise<boolean> {
  const normalized = normalizeStoredPath(path)
  if (normalized.startsWith('branding/')) return true

  if (!context.user) return false
  if (context.isStaff) return true
  if (isStaffOnlyFilePath(path)) return false

  if (normalized.startsWith('documents/')) return true
  if (normalized.startsWith('properties/') || normalized.startsWith('amenities/')) return true
  if (normalized.startsWith('payment-channels/')) return true

  if (isMaintenanceFilePath(normalized)) {
    const { data, error } = await context.supabase
      .from('maintenance_requests')
      .select('id')
      .contains('photo_urls', [normalized])
      .limit(1)

    return !error && Boolean(data?.length)
  }

  return false
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const storedPath = normalizeStoredPath(url.searchParams.get('path') || '')
    const context = await getAuthContext()

    if (!(await canReadPath(storedPath, context))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const file = await readStoredFile(storedPath)
    const headers = new Headers({
      'Content-Type': getContentType(storedPath),
      'Content-Length': String(file.length),
      'Cache-Control': 'private, max-age=300',
    })

    if (url.searchParams.get('download') === '1') {
      headers.set('Content-Disposition', `attachment; filename="${storedPath.split('/').at(-1) || 'download'}"`)
    }

    return new Response(file, { headers })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext()
    if (!context.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    const directory = String(formData.get('directory') || '')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }

    if (!canUploadDirectory(directory, context.isStaff)) {
      return NextResponse.json({ error: 'You do not have permission to upload this file.' }, { status: 403 })
    }

    validateUpload(file, directory)
    const saved = await saveUploadedFile(file, directory)
    return NextResponse.json({ file: saved })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload file'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getAuthContext()
    if (!context.isStaff) {
      return NextResponse.json({ error: 'You do not have permission to delete this file.' }, { status: 403 })
    }

    const url = new URL(request.url)
    const storedPath = normalizeStoredPath(url.searchParams.get('path') || '')
    await deleteStoredFile(storedPath)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
