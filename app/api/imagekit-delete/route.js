export const runtime = 'nodejs';

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

  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/admins/${encodeURIComponent(uid)}`;
  const response = await fetch(firestoreUrl, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });
  if (!response.ok) return false;

  const data = await response.json();
  return data?.fields?.active?.booleanValue === true;
}

export async function POST(request) {
  const idToken = getBearerToken(request);
  if (!idToken) return Response.json({ error: 'unauthorized', message: 'Your admin session token is missing.' }, { status: 401 });

  if (!(await verifyActiveAdmin(idToken))) {
    return Response.json({ error: 'forbidden', message: 'Only an active EZEE VISION administrator can delete media.' }, { status: 403 });
  }

  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    return Response.json({ error: 'imagekit_not_configured', message: 'IMAGEKIT_PRIVATE_KEY is missing on Vercel.' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'invalid_request', message: 'Invalid JSON body.' }, { status: 400 });
  }

  const fileId = String(body?.fileId || '').trim();
  if (!fileId || fileId.length > 200) {
    return Response.json({ error: 'invalid_file_id', message: 'A valid ImageKit fileId is required.' }, { status: 400 });
  }

  const auth = Buffer.from(`${privateKey}:`).toString('base64');
  const response = await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
    },
  });

  if (response.status === 204 || response.ok) {
    return Response.json({ ok: true });
  }

  const text = await response.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  return Response.json({
    error: 'imagekit_delete_failed',
    message: data?.message || text || `ImageKit returned HTTP ${response.status}.`,
  }, { status: response.status });
}
