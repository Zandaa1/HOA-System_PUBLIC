import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const path = url.searchParams.get('path') || ''
  const redirectUrl = new URL('/api/files', url.origin)
  redirectUrl.searchParams.set('path', path)
  return NextResponse.redirect(redirectUrl)
}
