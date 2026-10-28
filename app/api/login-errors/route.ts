import { NextResponse } from 'next/server'

import {
  buildLoginErrorLogPayload,
  isAllowedLoginErrorOrigin,
} from '@/lib/login-error-logging'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')

  if (!isAllowedLoginErrorOrigin(origin, host)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 12_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  try {
    const body = await request.json()
    const payload = buildLoginErrorLogPayload(body)
    console.error('[login-error]', payload)
    return NextResponse.json({ ok: true }, { status: 202 })
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
}
