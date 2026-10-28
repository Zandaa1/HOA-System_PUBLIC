import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { getDisplayFileUrl } from '@/lib/storage/shared'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred'
  
  if (typeof err === 'string') return err

  if (typeof err === 'object') {
    const errorObj = err as Record<string, any>
    
    // Check PostgreSQL RLS/Permission error code (42501) or standard RLS phrasing
    if (
      errorObj.code === '42501' || 
      (errorObj.message && typeof errorObj.message === 'string' && (
        errorObj.message.toLowerCase().includes('row-level security') ||
        errorObj.message.toLowerCase().includes('violates row-level security') ||
        errorObj.message.toLowerCase().includes('permission denied')
      ))
    ) {
      return 'You do not have the permission to perform this action.'
    }
    
    if (errorObj.message && typeof errorObj.message === 'string') {
      return errorObj.message
    }
  }
  
  return 'An unexpected error occurred'
}

export interface ImageOptimizationOptions {
  width?: number
  height?: number
  quality?: number
  resize?: 'cover' | 'contain' | 'fill'
  format?: 'origin' | 'webp'
}

export function getOptimizedStorageUrl(
  path: string | null | undefined,
  options?: ImageOptimizationOptions
): string {
  void options
  return getDisplayFileUrl(path)
}
