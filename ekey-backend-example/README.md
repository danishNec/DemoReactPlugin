# eKey backend reference implementation

Everything that happens after `initiateEkeyLogin()` resolves in the app. Runs on your
backend only — never in the mobile app, since it needs `client_secret`.

- `ekeyBackend.ts` — the actual logic: token exchange (§2.2.5), decoding the ID token, and
  fetching KYC data (§6.2). Framework-agnostic, Node 18+ built-in `fetch` only.
- `exampleRoute.ts` — one way to wire it into an HTTP endpoint (Express shown as an
  example). Adapt to whatever your backend actually uses.

## Setup

```bash
EKEY_CLIENT_ID=iZ4lBvruWxmSYqSWw-Wcf              # UAT client_id; use production's for that env
EKEY_CLIENT_SECRET=<matching secret for that exact client_id — see note below>
EKEY_TOKEN_URL=https://login.test.ekey-b.com/oidc/token   # UAT; swap for production
EKEY_REDIRECT_URI=https://mobileapp.uat.necremit.com/RedirectURIC/WS_MobileAPICALLS.asmx
```

**`client_id`, `client_secret`, `EKEY_TOKEN_URL`, and `EKEY_REDIRECT_URI` must all come from
the same environment** (all-UAT or all-production) — mixing them (e.g. a production secret
with the UAT client_id) fails with `invalid_client`, indistinguishable from a genuinely wrong
secret. Confirmed this in practice: the same secret authenticated fine against production's
client_id but failed every time against the UAT one.

## Before this will actually work

Per the integration guide, confirm these with your Beyon Connect account manager first —
none of these are code changes:

1. **`client_secret`** — issued alongside `client_id` at app registration (§2.2.1), one per
   environment. Confirm you have the one matching whichever `client_id`/environment you're
   testing against.
2. **Backend server IP whitelisting** — your server's public IP must be whitelisted for the
   UAT/test environment (§2.2.1) before `/oidc/token` will respond to it.
3. **KYC scope approval** — requesting `ekyc-bhr-*` scopes isn't the same as being approved
   for them. §6.3's disclaimer requires explicit whitelisting per client for KYC data access.
4. **`redirect_uri`** — §2.2.5 says this token-exchange parameter is only required when a
   client has multiple redirect URIs registered. Confirmed in practice that production
   requires it (rejects the request without it); UAT may or may not, depending on how many
   redirect URIs are registered for that client. `ekeyBackend.ts` now sends it
   unconditionally, so this shouldn't bite you either way — just make sure
   `EKEY_REDIRECT_URI` exactly matches the `redirectUri` used in the original authorization
   request (see `EkeyLoginConfig.swift`/`.kt`).

## What's intentionally left out

`decodeIdTokenClaims` in `ekeyBackend.ts` decodes the JWT payload but does **not** verify
its signature. §2.2.6 requires verifying the signature against eKey's public key (JWKS),
plus the `iss`, `aud`, `exp`, and `iat` claims, before trusting any of it. Left out here
since it depends on which JWT/JWKS library you want (e.g. `jose`) — wire that in before
this touches real user data.
