import crypto from 'crypto';

export interface QrTokenPayload {
  sessionId: string;
  courseSectionId: string;
  timestamp: number;
  nonce: string;
}

export class QrVerificationModule {
  /**
   * Generates a signed QR token that encodes the session ID, section ID, timestamp, and nonce
   */
  generateToken(sessionId: string, courseSectionId: string, secret: string): string {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(8).toString('hex');
    const rawData = `${sessionId}:${courseSectionId}:${timestamp}:${nonce}`;
    const signature = crypto.createHmac('sha256', secret).update(rawData).digest('hex');
    return Buffer.from(JSON.stringify({ sessionId, courseSectionId, timestamp, nonce, sig: signature })).toString('base64');
  }

  /**
   * Verifies the QR token against the secret and checks if it's within the validity window (default 60s)
   */
  verifyToken(
    tokenStr: string,
    secret: string,
    validitySeconds: number = 60
  ): { valid: boolean; error?: string; payload?: QrTokenPayload } {
    try {
      const decodedJson = Buffer.from(tokenStr, 'base64').toString('utf-8');
      const data = JSON.parse(decodedJson);
      const { sessionId, courseSectionId, timestamp, nonce, sig } = data;

      if (!sessionId || !courseSectionId || !timestamp || !sig) {
        return { valid: false, error: 'Malformed QR code payload' };
      }

      // Check signature
      const rawData = `${sessionId}:${courseSectionId}:${timestamp}:${nonce}`;
      const expectedSig = crypto.createHmac('sha256', secret).update(rawData).digest('hex');
      if (sig !== expectedSig) {
        return { valid: false, error: 'Invalid QR signature or corrupted QR code' };
      }

      // Check expiry (FR-QR-02, BR-10)
      const now = Date.now();
      const ageSeconds = (now - timestamp) / 1000;
      if (ageSeconds > validitySeconds) {
        return {
          valid: false,
          error: 'This code expired, scan the one currently on screen',
        };
      }

      return {
        valid: true,
        payload: { sessionId, courseSectionId, timestamp, nonce },
      };
    } catch (err: any) {
      return { valid: false, error: 'Invalid QR code format' };
    }
  }
}
