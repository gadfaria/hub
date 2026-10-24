export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
const SCOPES = ['openid', 'email', 'profile', DRIVE_SCOPE].join(' ')
const GIS_SRC = 'https://accounts.google.com/gsi/client'
const STORAGE_KEY = 'vault.session'

export interface Session {
  accessToken: string
  expiresAt: number
  email: string
  name: string
  picture?: string
}

export class SessionExpiredError extends Error {
  constructor() {
    super('Sua sessão expirou.')
    this.name = 'SessionExpiredError'
  }
}

let gisLoading: Promise<void> | undefined

function loadGis(): Promise<void> {
  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      gisLoading = undefined
      reject(new Error('Não foi possível carregar o login do Google.'))
    }
    document.head.appendChild(script)
  })
  return gisLoading
}

function requestToken(loginHint?: string): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID!,
      scope: SCOPES,
      login_hint: loginHint,
      prompt: loginHint ? '' : undefined,
      callback: (response) => {
        if (response.error) reject(new Error(response.error_description || response.error))
        else resolve(response)
      },
      error_callback: (error) => reject(new Error(error.message || error.type)),
    })
    client.requestAccessToken()
  })
}

/** Opens the Google popup. Must be called from a user gesture (click) or browsers block it. */
export async function signIn(loginHint?: string): Promise<Session> {
  if (!GOOGLE_CLIENT_ID) throw new Error('VITE_GOOGLE_CLIENT_ID não configurado.')
  await loadGis()
  const token = await requestToken(loginHint)

  // With granular consent the user can uncheck Drive access on the consent screen.
  if (!google.accounts.oauth2.hasGrantedAllScopes(token, DRIVE_SCOPE)) {
    throw new Error('O acesso ao Google Drive é necessário para guardar seus dados.')
  }

  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  if (!res.ok) throw new Error('Não foi possível ler seu perfil do Google.')
  const profile = (await res.json()) as { email: string; name: string; picture?: string }

  const session: Session = {
    accessToken: token.access_token,
    // Renew a minute early so a request never goes out with a token about to expire.
    expiresAt: Date.now() + (Number(token.expires_in) - 60) * 1000,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  }
  saveSession(session)
  return session
}

export function isExpired(session: Session): boolean {
  return Date.now() >= session.expiresAt
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

function saveSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Storage unavailable (private mode): the session just won't survive a reload.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
