import { NextRequest, NextResponse } from 'next/server'
import { createToken, validateCredentials, COOKIE_NAME, COOKIE_MAX_AGE } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        { error: 'Credențiale invalide' },
        { status: 401 }
      )
    }

    const token = await createToken()

    const response = NextResponse.json({ success: true })
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Eroare la autentificare' },
      { status: 500 }
    )
  }
}
