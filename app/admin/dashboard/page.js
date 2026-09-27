'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';

const modules = [
  ['Gallery', 'Manage coaching photos and events.', 'gallery'],
  ['Results', 'Publish verified student achievements.', 'results'],
  ['Testimonials', 'Manage real student/parent feedback.', 'testimonials'],
  ['Updates', 'Publish notices, admissions and academic updates.', 'updates'],
  ['Faculty', 'Manage educator profiles and subjects.', 'faculty'],
  ['Enquiries', 'Review admission enquiries from the website.', 'enquiries']
];

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      setMessage('Firebase is not configured yet.');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace('/admin/login');
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', currentUser.uid));
        const isActiveAdmin = adminSnap.exists() && adminSnap.data()?.active === true;

        if (!isActiveAdmin) {
          await signOut(auth);
          router.replace('/admin/login?error=unauthorized');
          return;
        }

        setUser(currentUser);
        setAllowed(true);
      } catch {
        setMessage('Unable to verify admin access. Check your Firestore rules and admin document.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  async function handleLogout() {
    if (auth) await signOut(auth);
    router.replace('/admin/login');
  }

  if (loading) {
    return <main className="admin-app-page"><div className="admin-loading">Checking secure access…</div></main>;
  }

  if (!allowed) {
    return <main className="admin-app-page"><div className="admin-loading">{message || 'Access denied.'}</div></main>;
  }

  return (
    <main className="admin-app-page">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="brand-mark admin-mark">EV</div>
          <div>
            <strong>EZEE VISION</strong>
            <span>ADMIN PANEL</span>
          </div>
        </div>
        <button className="admin-logout" onClick={handleLogout}>Sign out</button>
      </header>

      <section className="admin-dashboard-shell">
        <div className="admin-welcome">
          <div className="admin-card-kicker">CONTROL CENTRE</div>
          <h1>Welcome back.</h1>
          <p>Signed in as <b>{user?.email}</b>. This private dashboard is the foundation for the website content manager.</p>
        </div>

        <div className="admin-status-grid">
          <div className="admin-status-card"><span>AUTHENTICATION</span><b>Connected</b><small>Firebase Auth</small></div>
          <div className="admin-status-card"><span>DATABASE</span><b>Connected</b><small>Cloud Firestore</small></div>
          <div className="admin-status-card"><span>STORAGE</span><b>Ready</b><small>Firebase Storage rules</small></div>
          <div className="admin-status-card"><span>PUBLIC SITE</span><b>Live</b><small>Vercel deployment</small></div>
        </div>

        <div className="admin-module-grid">
          {modules.map(([title, text, key]) => (
            <article key={key} className="admin-module-card">
              <div className="admin-module-icon">{title.slice(0, 1)}</div>
              <div>
                <h2>{title}</h2>
                <p>{text}</p>
              </div>
              <span className="admin-module-status">SETUP</span>
            </article>
          ))}
        </div>

        <div className="admin-next-step">
          <div>
            <div className="admin-card-kicker">PHASE 2 FOUNDATION</div>
            <h2>Security first. Content tools next.</h2>
            <p>The next implementation will connect these modules to Firestore and Storage while keeping writes restricted to active admin accounts.</p>
          </div>
          <a className="btn btn-outline" href="/">View Website</a>
        </div>
      </section>
    </main>
  );
}
