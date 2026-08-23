/**
 * Example Express route wiring `completeEkeyLogin` to an endpoint the mobile app calls
 * right after `initiateEkeyLogin()` resolves. Adapt to whatever framework you actually use —
 * the logic lives in ekeyBackend.ts, this file is just the HTTP glue.
 */
import express from 'express';
import { completeEkeyLogin } from './ekeyBackend';

const router = express.Router();

router.post('/ekey/login', async (req, res) => {
  const { redirectUri, codeVerifier } = req.body as {
    redirectUri?: string;
    codeVerifier?: string;
  };

  if (!redirectUri || !codeVerifier) {
    return res.status(400).json({ error: 'redirectUri and codeVerifier are required' });
  }

  const { searchParams } = new URL(redirectUri);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return res.status(400).json({ error: 'redirectUri did not contain a code parameter' });
  }

  // TODO: validate `state` against whatever your app associated with this login attempt —
  // see the note on completeEkeyLogin in ekeyBackend.ts.
  void state;

  try {
    const { claims, kycData } = await completeEkeyLogin(code, codeVerifier);
    res.json({ claims, kycData });
  } catch (error) {
    res.status(502).json({ error: (error as Error).message });
  }
});

export default router;
