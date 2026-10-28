import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { normalizeStoredPath, sanitizeFileName } from './shared'

export function getLocalUploadRoot(): string {
  if (process.env.LOCAL_UPLOAD_ROOT) {
    return path.resolve(process.env.LOCAL_UPLOAD_ROOT)
  }
  // Fallback to /tmp if running on Vercel or in a serverless environment where cwd is read-only
  if (process.env.VERCEL || process.env.NOW_BUILDER || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.resolve('/tmp/.data/uploads')
  }
  return path.resolve(path.join(/* turbopackIgnore: true */ process.cwd(), '.data', 'uploads'))
}

export function resolveLocalFilePath(storedPath: string): string {
  const root = getLocalUploadRoot()
  const normalized = normalizeStoredPath(storedPath)
  const resolved = path.resolve(root, normalized)

  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid file path')
  }

  return resolved
}

export function buildStoredFilePath(directory: string, originalName: string): string {
  const safeDirectory = normalizeStoredPath(directory)
  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return `${safeDirectory}/${year}/${month}/${unique}-${sanitizeFileName(originalName)}`
}

export async function saveUploadedFile(file: File, directory: string): Promise<{ path: string; size: number; type: string }> {
  if (file.size <= 0) {
    throw new Error('Uploaded file is empty')
  }

  const storedPath = buildStoredFilePath(directory, file.name)
  const destination = resolveLocalFilePath(storedPath)
  await mkdir(path.dirname(destination), { recursive: true })
  await writeFile(destination, Buffer.from(await file.arrayBuffer()))

  return {
    path: storedPath,
    size: file.size,
    type: file.type || 'application/octet-stream',
  }
}

export async function readStoredFile(storedPath: string): Promise<Buffer> {
  return readFile(resolveLocalFilePath(storedPath))
}

export async function deleteStoredFile(storedPath: string): Promise<void> {
  await rm(resolveLocalFilePath(storedPath), { force: true })
}

export function getContentType(storedPath: string): string {
  const ext = path.extname(storedPath).toLowerCase()
  const types: Record<string, string> = {
    '.avif': 'image/avif',
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }

  return types[ext] || 'application/octet-stream'
}
