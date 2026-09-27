'use client';

import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';

function firebaseErrorText(error) {
  const code = error?.code || 'unknown-error';
  const message = error?.message || 'No Firebase message was returned.';
  return `Firebase error: ${code}\n${message}`;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [diagnostic, setDiagnostic] = useState('');

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        if (adminSnap.exists() && adminSnap.data()?.active === true) {
          router.replace('/admin/dashboard');
        }
      } catch (error) {
        console.error('Admin session check failed:', error);
      }
    });

    return unsubscribe;
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setDiagnostic('');

    if (!firebaseConfigured || !auth || !db) {
      setMessage('Firebase configuration is missing from the deployed Vercel environment.');
      setDiagnostic('Check all NEXT_PUBLIC_FIREBASE_* variables in Vercel, then redeploy.');
      return;
    }

    setBusy(true);

    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (error) {
      console.error('Firebase sign-in failed:', error);
      setMessage('Firebase sign-in failed.');
      setDiagnostic(firebaseErrorText(error));
      setBusy(false);
      return;
    }

    try {
      const adminSnap = await getDoc(doc(db, 'admins', credential.user.uid));

      if (!adminSnap.exists()) {
        await auth.signOut();
        setMessage('Login worked, but this account is not registered as an admin.');
        setDiagnostic(`Authenticated UID: ${credential.user.uid}\nCreate Firestore document: admins/${credential.user.uid}`);
        setBusy(false);
        return;
      }

      if (adminSnap.data()?.active !== true) {
        await auth.signOut();
        setMessage('This account is listed as an admin but is not active.');
        setDiagnostic(`Firestore document admins/${credential.user.uid} must contain: active = true`);
        setBusy(false);
        return;
      }

      router.replace('/admin/dashboard');
    } catch (error) {
      console.error('Admin Firestore check failed:', error);
      await auth.signOut().catch(() => {});
      setMessage('Authentication succeeded, but the admin database check failed.');
      setDiagnostic(firebaseErrorText(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-auth-page">
      <div className="admin-auth-shell">
        <div className="admin-brand-block">
          <div className="brand-mark admin-mark">EV</div>
          <div>
            <strong>EZEE VISION</strong>
            <span>CHAMPUA</span>
          </div>
        </div>

        <div className="admin-auth-card">
          <div className="admin-card-kicker">PRIVATE AREA</div>
          <h1>Admin Sign In</h1>
          <p>Authorized staff only. Your Firebase account must also be listed as an active admin.</p>

          <form onSubmit={handleSubmit} className="admin-form">
            <label>
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@example.com"
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="btn btn-primary admin-submit" disabled={busy}>
              {busy ? 'Checking access…' : 'Sign in to Admin'}
            </button>
          </form>

          {message && (
            <div className="admin-message" style={{ whiteSpace: 'pre-wrap' }}>
              <strong>{message}</strong>
              {diagnostic && <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>{diagnostic}</div>}
            </div>
          )}
        </div>

        <a className="admin-back-link" href="/">← Back to public website</a>
      </div>
    </main>
  );
}
