/**
 * Reference backend implementation for the second half of the eKey 2.0 login flow —
 * everything that happens AFTER the mobile app hands you { redirectUri, codeVerifier }
 * from `initiateEkeyLogin()`.
 *
 * This must run on your backend, never in the app: the token exchange requires
 * `client_secret`, which must not ship inside a mobile app.
 *
 * Covers integration guide §2.2.5 (Token Exchange) and §6.2 (Getting KYC data).
 *
 * Requires Node 18+ (built-in fetch). No other dependencies.
 *
 * NOTE ON ID TOKEN VALIDATION: `decodeIdTokenClaims` below only decodes the JWT payload —
 * it does NOT verify the signature. §2.2.6 requires verifying the signature against eKey's
 * public key (JWKS), the `iss`, `aud`, `exp`, and `iat` claims before trusting any of this
 * data. Wire in a JWT library (e.g. `jose`) for that before using this in production —
 * left out here since it depends on which library/JWKS-caching approach you prefer.
 */

const EKEY_TOKEN_URL = process.env.EKEY_TOKEN_URL ?? 'https://login.test.ekey-b.com/oidc/token';
const EKEY_CLIENT_ID = process.env.EKEY_CLIENT_ID ?? '';
const EKEY_CLIENT_SECRET = process.env.EKEY_CLIENT_SECRET ?? '';
// Must match the `redirectUri` used for the original authorization request exactly (see
// EkeyLoginConfig.swift/.kt). §2.2.5 documents this as only required when a client has
// multiple redirect URIs registered — but the production client does, and rejects the
// request outright without it, so it's sent unconditionally here rather than guessed at.
const EKEY_REDIRECT_URI = process.env.EKEY_REDIRECT_URI ?? '';

export type EkeyTokenResponse = {
  access_token?: string;
  id_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
};

/** §2.2.5 — exchange the authorization code (+ PKCE verifier) for tokens. */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string
): Promise<EkeyTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: EKEY_CLIENT_ID,
    client_secret: EKEY_CLIENT_SECRET,
    code_verifier: codeVerifier,
    redirect_uri: EKEY_REDIRECT_URI,
  });

  const response = await fetch(EKEY_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`eKey token exchange failed (HTTP ${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<EkeyTokenResponse>;
}

/**
 * Decodes the ID token's claims WITHOUT verifying the signature — see the file-level note
 * above. Fine for reading the `urn:oneid:ekyc:bhr:data` URL to make the next call; do not
 * treat any claim as trustworthy user identity until signature verification is added.
 */
export function decodeIdTokenClaims(idToken: string): Record<string, unknown> {
  const payload = idToken.split('.')[1];
  if (!payload) {
    throw new Error('Malformed ID token: missing payload segment');
  }
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const json = Buffer.from(base64, 'base64').toString('utf8');
  return JSON.parse(json);
}

/**
 * §6.2 — fetch the granted KYC data. The URL comes from the ID token's
 * `urn:oneid:ekyc:bhr:data` claim, not a fixed endpoint — always read it from the token
 * rather than hardcoding it.
 */
export async function fetchKycData(
  kycDataUrl: string,
  accessToken: string
): Promise<Record<string, string>> {
  const response = await fetch(kycDataUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`eKey KYC data request failed (HTTP ${response.status}): ${errorBody}`);
  }

  return response.json() as Promise<Record<string, string>>;
}

export type EkeyIdentityResult = {
  claims: Record<string, unknown>;
  kycData: Record<string, string> | null;
};

/**
 * Orchestrates the full post-login sequence: token exchange, decode the ID token, and (if
 * KYC scopes were granted) fetch the KYC data. Call this from your endpoint that receives
 * `{ code, state, codeVerifier }` from the mobile app.
 *
 * `state` should also be checked server-side against whatever your app associated with
 * this login attempt, as defense in depth — the SDK already validates it on-device, but
 * your backend has no record of the original request unless your own architecture tracks
 * it, so this is a call your team needs to make based on how your session flow works.
 */
export async function completeEkeyLogin(code: string, codeVerifier: string): Promise<EkeyIdentityResult> {
  const tokens = await exchangeCodeForTokens(code, codeVerifier);
  const claims = decodeIdTokenClaims(tokens.id_token);

  const kycDataUrl = claims['urn:oneid:ekyc:bhr:data'] as string | undefined;
  const kycData =
    kycDataUrl && tokens.access_token ? await fetchKycData(kycDataUrl, tokens.access_token) : null;

  return { claims, kycData };
}
