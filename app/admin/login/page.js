'use client';

import { useEffect, useState } from 'react';
import { signInWithEmailAndPassword, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        if (adminSnap.exists() && adminSnap.data()?.active === true) {
          router.replace('/admin/dashboard');
        }
      } catch {
        // Stay on the login page if the admin record cannot be read.
      }
    });
    return unsubscribe;
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');

    if (!firebaseConfigured || !auth || !db) {
      setMessage('Firebase is not configured yet. Complete Phase 2 Firebase setup first.');
      return;
    }

    setBusy(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const adminSnap = await getDoc(doc(db, 'admins', credential.user.uid));

      if (!adminSnap.exists() || adminSnap.data()?.active !== true) {
        await auth.signOut();
        setMessage('This account is not authorized for the EZEE VISION admin panel.');
        return;
      }

      router.replace('/admin/dashboard');
    } catch (error) {
      const friendly = {
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/invalid-login-credentials': 'Incorrect email or password.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect email or password.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.'
      };
      setMessage(friendly[error?.code] || 'Unable to sign in. Please check the details and try again.');
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

          {message && <div className="admin-message">{message}</div>}
        </div>

        <a className="admin-back-link" href="/">← Back to public website</a>
      </div>
    </main>
  );
}
