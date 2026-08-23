import NativeEkeySdk from './NativeEkeySdk';

export type EkeyLoginStatus = 'completed' | 'cancelled' | 'failed';

export type EkeyLoginResult = {
  status: EkeyLoginStatus;
  redirectUri?: string;
  /** PKCE code verifier for this login attempt — send it with `code`/`state` to your
   * back-end's token exchange call (integration guide §2.2.5 requires it), if you're doing
   * your own token exchange instead of relying on `claims`/`kycData` below. */
  codeVerifier?: string;
  /** Decoded ID token claims (identity data — name, national ID, etc. per the `id-*` scope).
   * The SDK performs the token exchange internally (both iOS and Android) rather than
   * requiring a back-end round trip. See EkeyTokenExchange.swift / EkeyTokenExchange.kt for
   * the security trade-off this implies (client_secret ships inside the app binary). */
  claims?: Record<string, unknown>;
  /** Full KYC data payload (integration guide §6.2), if `ekyc-bhr-*` scopes were granted.
   * Same SDK-embedded caveat as `claims`. */
  kycData?: Record<string, unknown>;
  error?: string;
};

/**
 * Starts the eKey 2.0 app-to-app login flow. All integration config lives in the native
 * EkeySDK (iOS) / ekeysdk (Android) modules — nothing to configure here.
 */
export function initiateEkeyLogin(): Promise<EkeyLoginResult> {
  return NativeEkeySdk.initiateLogin() as Promise<EkeyLoginResult>;
}
