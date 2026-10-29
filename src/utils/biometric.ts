// Déverrouillage par Face ID / Touch ID / empreinte via WebAuthn (authentificateur du téléphone).
// Tout reste local : on mémorise seulement l'identifiant de la clé créée par le téléphone,
// et on exige que le téléphone ait vérifié l'utilisateur (biométrie ou code de l'appareil).

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(text: string): Uint8Array {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4);
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** Drapeaux de authenticatorData (octet 32) : UP (présence, 0x01) et UV (vérification, 0x04). */
export function userVerified(authenticatorData: Uint8Array): boolean {
  const flags = authenticatorData[32];
  return flags !== undefined && (flags & 0x01) !== 0 && (flags & 0x04) !== 0;
}

export function isAppleDevice(userAgent: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod|Macintosh/.test(userAgent);
}

/** Nom affiché selon l'appareil, utilisable après « avec » / « utilisez » (« Utilisez votre empreinte digitale »). */
export function biometricName(userAgent: string = navigator.userAgent): string {
  return isAppleDevice(userAgent) ? 'Face ID / Touch ID' : 'votre empreinte digitale';
}

export async function isBiometricAvailable(): Promise<boolean> {
  try {
    return (
      window.isSecureContext &&
      typeof PublicKeyCredential !== 'undefined' &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

/** Crée une clé sur le téléphone (le système demande Face ID / l'empreinte). Retourne son identifiant. */
export async function registerBiometric(userName: string): Promise<string> {
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Mes Dépenses', id: window.location.hostname },
      user: {
        id: crypto.getRandomValues(new Uint8Array(16)),
        name: userName || 'Mes Dépenses',
        displayName: userName || 'Mes Dépenses',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 }, // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged',
      },
      timeout: 60_000,
      attestation: 'none',
    },
  });
  if (!(credential instanceof PublicKeyCredential)) throw new Error('Aucune clé créée.');
  return toBase64Url(new Uint8Array(credential.rawId));
}

/** Demande Face ID / l'empreinte et vérifie que c'est bien la clé enregistrée. */
export async function verifyBiometric(credentialId: string): Promise<boolean> {
  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rpId: window.location.hostname,
      allowCredentials: [{ type: 'public-key', id: fromBase64Url(credentialId), transports: ['internal'] }],
      userVerification: 'required',
      timeout: 60_000,
    },
  });
  if (!(credential instanceof PublicKeyCredential)) return false;
  if (toBase64Url(new Uint8Array(credential.rawId)) !== credentialId) return false;
  const response = credential.response;
  if (!(response instanceof AuthenticatorAssertionResponse)) return false;
  return userVerified(new Uint8Array(response.authenticatorData));
}

export function describeBiometricError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return 'Reconnaissance annulée ou expirée. Réessayez ou tapez votre code.';
    if (error.name === 'InvalidStateError') return 'Cette reconnaissance est déjà enregistrée sur ce téléphone.';
    if (error.name === 'SecurityError') return "La reconnaissance nécessite l'adresse sécurisée (https) de l'application.";
    if (error.name === 'NotSupportedError') return "Ce téléphone ou ce navigateur ne permet pas la reconnaissance.";
  }
  return 'La reconnaissance a échoué. Utilisez votre code.';
}
