import { SignJWT, jwtVerify } from 'jose'

export const COOKIE_NAME = 'pharma-session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30 // 30 zile

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET nu este configurat')
  return new TextEncoder().encode(secret)
}

export async function createToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(getSecret())
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export function validateCredentials(username: string, password: string): boolean {
  return (
    username === process.env.AUTH_USERNAME &&
    password === process.env.AUTH_PASSWORD
  )
}
