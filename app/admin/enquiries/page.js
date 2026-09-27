'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './enquiries.module.css';

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'closed', label: 'Closed' }
];

function timeValue(value) {
  if (!value) return 0;
  if (typeof value === 'object' && value.seconds) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  const stamp = timeValue(value);
  if (!stamp) return 'Date pending';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(stamp));
}

function normalisePhone(value) {
  return String(value || '').replace(/[^0-9+]/g, '');
}

export default function EnquiriesManagerPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [busyId, setBusyId] = useState('');
  const [notice, setNotice] = useState({ type: '', text: '' });

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setAuthReady(true);
      setNotice({ type: 'error', text: 'Firebase is not configured yet.' });
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/admin/login');
        return;
      }

      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        const isActiveAdmin = adminSnap.exists() && adminSnap.data()?.active === true;
        if (!isActiveAdmin) {
          router.replace('/admin/login?error=unauthorized');
          return;
        }
        setAuthorized(true);
        await loadItems();
      } catch (error) {
        setNotice({ type: 'error', text: error?.message || 'Unable to verify admin access.' });
      } finally {
        setAuthReady(true);
      }
    });

    return unsubscribe;
  }, [router]);

  async function loadItems() {
    if (!db) return;
    const snapshot = await getDocs(collection(db, 'enquiries'));
    const loaded = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt));
    setItems(loaded);
  }

  async function updateStatus(item, status) {
    setBusyId(item.id);
    setNotice({ type: '', text: '' });
    try {
      await updateDoc(doc(db, 'enquiries', item.id), { status, updatedAt: serverTimestamp() });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, status } : entry));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update enquiry status.' });
    } finally {
      setBusyId('');
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete the enquiry from ${item.studentName || 'this student'}? This cannot be undone.`)) return;
    setBusyId(item.id);
    try {
      await deleteDoc(doc(db, 'enquiries', item.id));
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setNotice({ type: 'success', text: 'Admission enquiry deleted.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not delete enquiry.' });
    } finally {
      setBusyId('');
    }
  }

  function exportCsv() {
    const rows = [
      ['Student Name', 'Parent / Guardian', 'Class', 'Phone', 'Message', 'Status', 'Created At'],
      ...filtered.map((item) => [
        item.studentName || '',
        item.parentName || '',
        item.className || '',
        item.phone || '',
        item.message || '',
        item.status || 'new',
        formatDate(item.createdAt)
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ezee-vision-admission-enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const classes = useMemo(() => Array.from(new Set(items.map((item) => String(item.className || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })), [items]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesStatus = statusFilter === 'all' || String(item.status || 'new') === statusFilter;
      const matchesClass = classFilter === 'all' || String(item.className || '') === classFilter;
      const haystack = [item.studentName, item.parentName, item.phone, item.className, item.message].map((v) => String(v || '').toLowerCase()).join(' ');
      return matchesStatus && matchesClass && (!q || haystack.includes(q));
    });
  }, [items, search, statusFilter, classFilter]);

  const stats = useMemo(() => ({
    total: items.length,
    newCount: items.filter((item) => String(item.status || 'new') === 'new').length,
    followUp: items.filter((item) => item.status === 'follow-up').length,
    closed: items.filter((item) => item.status === 'closed').length
  }), [items]);

  if (!authReady) return <main className={styles.page}><div className={styles.stateCard}>Checking admin access…</div></main>;
  if (!authorized) return <main className={styles.page}><div className={styles.stateCard}><span className={styles.kicker}>PRIVATE AREA</span><h1>Admin access required.</h1><p>Please sign in using an active EZEE VISION administrator account.</p><a href="/admin" className={styles.primaryButton}>Back to Admin</a></div></main>;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.brand}>EZEE VISION <span>CHAMPUA</span></div>
          <div className={styles.subbrand}>Admission Enquiries Manager • Phase 3.8</div>
        </div>
        <div className={styles.topActions}>
          <a href="/admin" className={styles.secondaryButton}>Dashboard</a>
          <a href="/" className={styles.secondaryButton}>Website</a>
        </div>
      </header>

      <section className={styles.heroCard}>
        <span className={styles.kicker}>ADMISSION CONTROL</span>
        <h1>See, organise and follow up on website enquiries.</h1>
        <p>Every submitted admission enquiry is stored in the secure Firestore enquiries collection. Use statuses to track follow-up without losing the original message.</p>
        <div className={styles.heroStats}>
          <div><strong>{stats.total}</strong><span>Total enquiries</span></div>
          <div><strong>{stats.newCount}</strong><span>New</span></div>
          <div><strong>{stats.followUp}</strong><span>Follow-up</span></div>
          <div><strong>{stats.closed}</strong><span>Closed</span></div>
        </div>
      </section>

      {notice.text ? <div className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : styles.noticeSuccess}`}>{notice.text}</div> : null}

      <section className={styles.toolbarCard}>
        <div className={styles.filterRow}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search student, parent, phone…" aria-label="Search enquiries" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="all">All statuses</option>
            {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </select>
          <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} aria-label="Filter by class">
            <option value="all">All classes</option>
            {classes.map((value) => <option key={value} value={value}>Class {value}</option>)}
          </select>
          <button type="button" className={styles.secondaryButton} onClick={loadItems}>Refresh</button>
          <button type="button" className={styles.primarySmallButton} onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
        </div>
      </section>

      <section className={styles.listCard}>
        <div className={styles.sectionHead}>
          <div><span className={styles.kicker}>LIVE ENQUIRIES</span><h2>{filtered.length} enquiry{filtered.length === 1 ? '' : 'ies'}</h2></div>
          <span className={styles.resultHint}>Showing filtered records</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}><strong>No admission enquiries found.</strong><span>New website submissions will appear here automatically after they are submitted.</span></div>
        ) : (
          <div className={styles.itemList}>
            {filtered.map((item) => {
              const phone = normalisePhone(item.phone);
              const status = item.status || 'new';
              return (
                <article className={styles.item} key={item.id}>
                  <div className={styles.itemTop}>
                    <div>
                      <span className={styles.kicker}>{formatDate(item.createdAt)}</span>
                      <h3>{item.studentName || 'Student enquiry'}</h3>
                      <p className={styles.parentLine}>Parent / Guardian: <b>{item.parentName || '—'}</b></p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles[`status_${status.replace(/[^a-z-]/g, '')}`] || styles.status_new}`}>{status}</span>
                  </div>

                  <div className={styles.metaGrid}>
                    <div><span>CLASS</span><b>{item.className || '—'}</b></div>
                    <div><span>PHONE</span><b>{item.phone || '—'}</b></div>
                    <div><span>SOURCE</span><b>{item.source || 'website'}</b></div>
                  </div>

                  {item.message ? <div className={styles.messageBox}><span>MESSAGE</span><p>{item.message}</p></div> : null}

                  <div className={styles.actions}>
                    {phone ? <a className={styles.actionButton} href={`tel:${phone}`}>Call</a> : null}
                    {phone ? <a className={styles.actionButton} href={`https://wa.me/${phone.replace(/^\+/, '')}`} target="_blank" rel="noreferrer">WhatsApp</a> : null}
                    <label className={styles.statusControl}>Status
                      <select value={status} onChange={(e) => updateStatus(item, e.target.value)} disabled={busyId === item.id}>
                        {STATUSES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <button type="button" className={`${styles.actionButton} ${styles.dangerButton}`} onClick={() => removeItem(item)} disabled={busyId === item.id}>Delete</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <footer className={styles.footer}>Admission enquiries are stored in the Firestore <b>enquiries</b> collection. Only active admins can read, update or delete them.</footer>
    </main>
  );
}
