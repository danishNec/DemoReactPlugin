import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  /**
   * Launches the eKey 2.0 app-to-app login flow from the current Activity/ViewController.
   * Resolves once the flow completes, is cancelled, or fails (e.g. state mismatch) — never
   * rejects for those cases, only for a genuine native error (e.g. no current activity).
   */
  initiateLogin(): Promise<{
    status: string;
    redirectUri?: string;
    codeVerifier?: string;
    claims?: Object;
    kycData?: Object;
    error?: string;
  }>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('EkeySdk');
