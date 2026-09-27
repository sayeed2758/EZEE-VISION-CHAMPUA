import crypto from 'node:crypto';

export const runtime = 'nodejs';

function unauthorized(message) {
  return Response.json({ error: 'unauthorized', message }, { status: 401 });
}

function getBearerToken(request) {
  const header = request.headers.get('authorization') || '';
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
}

function decodeJwtPayload(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

async function verifyActiveAdmin(idToken) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing on Vercel.');

  const payload = decodeJwtPayload(idToken);
  const uid = payload?.user_id || payload?.sub;
  if (!uid || typeof uid !== 'string' || uid.length > 160) return false;

  const pathId = encodeURIComponent(uid);
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/admins/${pathId}`;
  const response = await fetch(firestoreUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });

  if (!response.ok) return false;
  const data = await response.json();
  return data?.fields?.active?.booleanValue === true;
}

export async function GET(request) {
  const idToken = getBearerToken(request);
  if (!idToken) return unauthorized('Your admin session token is missing. Please sign in again.');

  if (!(await verifyActiveAdmin(idToken))) {
    return unauthorized('Only an active EZEE VISION administrator can request upload credentials.');
  }

  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    return Response.json({
      error: 'imagekit_not_configured',
      message: 'ImageKit is not configured on Vercel. Add IMAGEKIT_PUBLIC_KEY and IMAGEKIT_PRIVATE_KEY, then redeploy.',
    }, { status: 500 });
  }

  const token = crypto.randomUUID();
  // ImageKit requires an expiry less than one hour in the future. Keep it short-lived.
  const expire = Math.floor(Date.now() / 1000) + (30 * 60);
  const signature = crypto.createHmac('sha1', privateKey).update(token + expire).digest('hex');

  return Response.json({ token, expire, signature, publicKey });
}
