import NativeEkeySdk from './NativeEkeySdk';

export type EkeyLoginStatus = 'completed' | 'cancelled' | 'failed';

export type EkeyLoginResult = {
  status: EkeyLoginStatus;
  redirectUri?: string;
  /** PKCE code verifier for this login attempt — send it with `code`/`state` to your
   * back-end's token exchange call (integration guide §2.2.5 requires it). iOS only for now;
   * Android's native module doesn't surface it yet. */
  codeVerifier?: string;
  error?: string;
};

/**
 * Starts the eKey 2.0 app-to-app login flow. All integration config lives in the native
 * EkeySDK (iOS) / ekeysdk (Android) modules — nothing to configure here.
 */
export function initiateEkeyLogin(): Promise<EkeyLoginResult> {
  return NativeEkeySdk.initiateLogin() as Promise<EkeyLoginResult>;
}
