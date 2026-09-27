'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, getCountFromServer, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './dashboard.module.css';

const contentCollections = [
  ['gallery', 'Gallery'],
  ['results', 'Results'],
  ['testimonials', 'Testimonials'],
  ['updates', 'Updates'],
  ['faculty', 'Faculty'],
  ['classes', 'Classes']
];

const moduleRoadmap = [
  {
    key: 'profile',
    label: 'Coaching Profile',
    description: 'Edit your public brand information, contact details and highlights.',
    phase: '3.2'
  },
  {
    key: 'updates',
    label: 'Announcements',
    description: 'Publish admission notices, academic updates and important messages.',
    phase: '3.3'
  },
  {
    key: 'gallery',
    label: 'Gallery',
    description: 'Add and organise classroom, event and achievement photos.',
    phase: '3.4'
  },
  {
    key: 'faculty',
    label: 'Faculty',
    description: 'Create and manage educator profiles and teaching subjects.',
    phase: '3.5'
  },
  {
    key: 'classes',
    label: 'Classes & Courses',
    description: 'Manage class offerings, subjects and course information.',
    phase: '3.6'
  },
  {
    key: 'results',
    label: 'Results & Achievements',
    description: 'Publish verified academic achievements, milestones and result highlights.',
    phase: '3.7'
  },
  {
    key: 'enquiries',
    label: 'Admission Enquiries',
    description: 'Review website enquiries and follow up with prospective students.',
    phase: '3.8'
  },
  {
    key: 'testimonials',
    label: 'Testimonials',
    description: 'Manage approved student and parent feedback displayed on the public website.',
    phase: '3.9'
  },
  {
    key: 'contact',
    label: 'Contact & Communication',
    description: 'Control phone, WhatsApp, email, address, map and social links shown to parents.',
    phase: '3.10'
  },
  {
    key: 'seo',
    label: 'SEO & Search',
    description: 'Technical SEO, Google-friendly metadata, sitemap, robots and social sharing setup.',
    phase: '3.11'
  }
];

function formatCount(value) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-IN').format(value);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [counts, setCounts] = useState({
    gallery: null,
    results: null,
    testimonials: null,
    updates: null,
    faculty: null,
    classes: null,
    enquiries: null
  });

  const loadCounts = useCallback(async () => {
    if (!db) return;

    setRefreshing(true);
    try {
      const entries = await Promise.all(
        [...contentCollections, ['enquiries', 'Enquiries']].map(async ([collectionName]) => {
          try {
            const snap = await getCountFromServer(collection(db, collectionName));
            return [collectionName, snap.data().count];
          } catch {
            return [collectionName, null];
          }
        })
      );

      setCounts((previous) => ({ ...previous, ...Object.fromEntries(entries) }));
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      setMessage('Firebase is not configured yet.');
      return undefined;
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
        setMessage('');
        await loadCounts();
      } catch {
        setMessage('Unable to verify admin access. Check your Firestore rules and admin document.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadCounts, router]);

  async function handleLogout() {
    if (auth) await signOut(auth);
    router.replace('/admin/login');
  }

  const publishedContent = useMemo(() => {
    const values = [
      counts.gallery,
      counts.results,
      counts.testimonials,
      counts.updates,
      counts.faculty,
      counts.classes
    ];

    if (values.some((value) => value === null)) return null;
    return values.reduce((total, value) => total + value, 0);
  }, [counts]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>Checking secure access…</div>
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingCard}>{message || 'Access denied.'}</div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brandWrap}>
          <div className={styles.logo}>EV</div>
          <div>
            <strong>EZEE VISION</strong>
            <span>ADMIN CONTROL CENTRE</span>
          </div>
        </div>

        <div className={styles.topActions}>
          <a className={styles.siteButton} href="/" target="_blank" rel="noreferrer">
            View Website
          </a>
          <button className={styles.logoutButton} onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <section className={styles.shell}>
        <div className={styles.heroRow}>
          <div>
            <div className={styles.kicker}>CONTROL CENTRE • PHASE 3.1</div>
            <h1>{getGreeting()}, <span>Shahid Sir.</span></h1>
            <p>
              Your private workspace for managing the EZEE VISION CHAMPUA public website.
              Signed in as <b>{user?.email}</b>.
            </p>
          </div>

          <button className={styles.refreshButton} onClick={loadCounts} disabled={refreshing}>
            <span className={refreshing ? styles.spin : ''}>↻</span>
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>

        <section className={styles.statGrid} aria-label="Website overview">
          <article className={`${styles.statCard} ${styles.statPrimary}`}>
            <span className={styles.statLabel}>STUDENTS</span>
            <strong>150</strong>
            <small>Current coaching community</small>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statLabel}>CLASSES</span>
            <strong>4–12</strong>
            <small>Publicly offered range</small>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statLabel}>PUBLISHED CONTENT</span>
            <strong>{formatCount(publishedContent)}</strong>
            <small>Across website collections</small>
          </article>

          <article className={styles.statCard}>
            <span className={styles.statLabel}>ENQUIRIES</span>
            <strong>{formatCount(counts.enquiries)}</strong>
            <small>Admission enquiries in Firestore</small>
          </article>
        </section>

        <div className={styles.contentGrid}>
          <section className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <div className={styles.kicker}>WEBSITE OVERVIEW</div>
                <h2>Content snapshot</h2>
              </div>
              <div className={styles.updatedText}>
                {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for data'}
              </div>
            </div>

            <div className={styles.snapshotList}>
              {contentCollections.map(([key, label]) => (
                <div className={styles.snapshotItem} key={key}>
                  <span className={styles.snapshotIcon}>{label.slice(0, 1)}</span>
                  <div>
                    <strong>{label}</strong>
                    <small>Firestore collection</small>
                  </div>
                  <b>{formatCount(counts[key])}</b>
                </div>
              ))}
            </div>
          </section>

          <aside className={styles.panel}>
            <div className={styles.panelHead}>
              <div>
                <div className={styles.kicker}>SYSTEM STATUS</div>
                <h2>Everything is connected.</h2>
              </div>
              <span className={styles.liveBadge}>LIVE</span>
            </div>

            <div className={styles.statusList}>
              <div><span>●</span><strong>Authentication</strong><small>Firebase Auth</small></div>
              <div><span>●</span><strong>Database</strong><small>Cloud Firestore</small></div>
              <div><span>●</span><strong>Public site</strong><small>Vercel deployment</small></div>
              <div><span>●</span><strong>Admin access</strong><small>UID verified</small></div>
            </div>
          </aside>
        </div>

        <section className={styles.roadmapSection}>
          <div className={styles.panelHead}>
            <div>
              <div className={styles.kicker}>CONTENT MANAGEMENT ROADMAP</div>
              <h2>What you will control from here</h2>
            </div>
            <span className={styles.phasePill}>PHASE 3</span>
          </div>

          <div className={styles.moduleGrid}>
            {moduleRoadmap.map((module) => (
              <article className={`${styles.moduleCard} ${['profile', 'updates', 'gallery', 'faculty', 'classes', 'results', 'enquiries'].includes(module.key) ? styles.moduleCardActive : ''}`} key={module.key}>
                <div className={styles.moduleTop}>
                  <span className={styles.moduleIcon}>{module.label.slice(0, 1)}</span>
                  <span className={styles.phaseTag}>NEXT • {module.phase}</span>
                </div>
                <h3>{module.label}</h3>
                <p>{module.description}</p>
                {module.key === 'profile' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/coaching-profile')}>
                    Open Coaching Profile →
                  </button>
                ) : module.key === 'updates' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/announcements')}>
                    Open Announcements →
                  </button>
                ) : module.key === 'gallery' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/gallery')}>
                    Open Gallery Manager →
                  </button>
                ) : module.key === 'faculty' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/faculty')}>
                    Open Faculty Manager →
                  </button>
                ) : module.key === 'classes' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/classes')}>
                    Open Classes Manager →
                  </button>
                ) : module.key === 'results' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/results')}>
                    Open Results Manager →
                  </button>
                ) : module.key === 'enquiries' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/enquiries')}>
                    Open Admission Enquiries →
                  </button>
                ) : module.key === 'testimonials' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/testimonials')}>
                    Open Testimonials Manager →
                  </button>
                ) : module.key === 'contact' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/contact')}>
                    Open Contact Manager →
                  </button>
                ) : module.key === 'seo' ? (
                  <button className={styles.openButton} type="button" onClick={() => router.push('/admin/seo')}>
                    Open SEO Guide →
                  </button>
                ) : (
                  <button className={styles.lockedButton} type="button" disabled>
                    Coming next
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className={styles.bottomBanner}>
          <div>
            <div className={styles.kicker}>BUILDING IN STAGES</div>
            <h2>Security is live. Now we build your content controls.</h2>
            <p>Phase 3.1 is the command-centre foundation. Each next module will plug into this same secure admin area.</p>
          </div>
          <a className={styles.bannerButton} href="/">Open public website →</a>
        </section>
      </section>
    </main>
  );
}
