
'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './results.module.css';

const EMPTY_FORM = {
  title: '',
  category: 'Achievement',
  displayName: '',
  className: '',
  exam: '',
  subject: '',
  year: new Date().getFullYear(),
  score: '',
  scoreUnit: '%',
  rank: '',
  badge: '',
  description: '',
  sortOrder: 1,
  published: true,
  featured: false
};

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const orderA = Number(a.sortOrder ?? 9999);
    const orderB = Number(b.sortOrder ?? 9999);
    if (orderA !== orderB) return orderA - orderB;
    return String(b.year || '').localeCompare(String(a.year || ''));
  });
}

export default function ResultsManagerPage() {
  const router = useRouter();
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
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
    const snapshot = await getDocs(collection(db, 'results'));
    setItems(sortItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId('');
  }

  function editItem(item) {
    setEditingId(item.id);
    setForm({
      ...EMPTY_FORM,
      ...item,
      score: item.score ?? '',
      year: item.year ?? new Date().getFullYear(),
      published: item.published !== false,
      featured: Boolean(item.featured)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!authorized || !db) return;

    if (!form.title.trim()) {
      setNotice({ type: 'error', text: 'Achievement / result title is required.' });
      return;
    }

    setBusy(true);
    setNotice({ type: '', text: '' });

    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || 'Achievement',
      displayName: form.displayName.trim(),
      className: form.className.trim(),
      exam: form.exam.trim(),
      subject: form.subject.trim(),
      year: String(form.year || ''),
      score: String(form.score || '').trim(),
      scoreUnit: form.scoreUnit.trim() || '%',
      rank: String(form.rank || '').trim(),
      badge: String(form.badge || '').trim(),
      description: form.description.trim(),
      sortOrder: Number(form.sortOrder) || 10,
      published: Boolean(form.published),
      featured: Boolean(form.featured),
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'results', editingId), payload);
        setNotice({ type: 'success', text: 'Result / achievement updated successfully.' });
      } else {
        await addDoc(collection(db, 'results'), { ...payload, createdAt: serverTimestamp() });
        setNotice({ type: 'success', text: 'Result / achievement published to the library.' });
      }
      await loadItems();
      resetForm();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not save result / achievement.' });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item) {
    try {
      await updateDoc(doc(db, 'results', item.id), { published: !item.published, updatedAt: serverTimestamp() });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, published: !entry.published } : entry));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update publication status.' });
    }
  }

  async function toggleFeatured(item) {
    try {
      await updateDoc(doc(db, 'results', item.id), { featured: !item.featured, updatedAt: serverTimestamp() });
      setItems(sortItems(items.map((entry) => entry.id === item.id ? { ...entry, featured: !entry.featured } : entry)));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update featured status.' });
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete ${item.title || 'this result / achievement'}?`)) return;
    try {
      await deleteDoc(doc(db, 'results', item.id));
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) resetForm();
      setNotice({ type: 'success', text: 'Result / achievement deleted.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not delete result / achievement.' });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.title, item.category, item.displayName, item.className, item.exam, item.subject, item.year, item.description].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [items, search]);

  if (!authReady) return <main className={styles.page}><div className={styles.stateCard}>Checking admin access…</div></main>;
  if (!authorized) return <main className={styles.page}><div className={styles.stateCard}><span className={styles.kicker}>PRIVATE AREA</span><h1>Admin access required.</h1><p>Please sign in using an active EZEE VISION administrator account.</p><a href="/admin" className={styles.primaryButton}>Back to Admin</a></div></main>;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div><div className={styles.brand}>EZEE VISION <span>CHAMPUA</span></div><div className={styles.subbrand}>Results & Achievements Manager • Phase 3.7</div></div>
        <div className={styles.topActions}><a href="/admin" className={styles.secondaryButton}>Dashboard</a><a href="/" className={styles.secondaryButton}>Website</a></div>
      </header>

      <section className={styles.heroCard}>
        <span className={styles.kicker}>ACADEMIC ACHIEVEMENT CONTROL</span>
        <h1>{editingId ? 'Edit an academic highlight.' : 'Publish verified results & achievements.'}</h1>
        <p>Create concise, trustworthy achievement cards for the public EZEE VISION website. Use only information that is appropriate and authorised for public display.</p>
        <div className={styles.heroStats}>
          <div><strong>{items.length}</strong><span>Total entries</span></div>
          <div><strong>{items.filter((item) => item.published).length}</strong><span>Published</span></div>
          <div><strong>{items.filter((item) => item.featured).length}</strong><span>Featured</span></div>
        </div>
      </section>

      <div className={styles.privacyNote}><b>Privacy note:</b> When publishing student names, marks or ranks, use information for which your coaching centre has appropriate permission to display publicly. You can leave the name/score fields blank and publish an anonymous achievement highlight.</div>

      {notice.text ? <div className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : styles.noticeSuccess}`}>{notice.text}</div> : null}

      <section className={styles.formCard}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>RESULT EDITOR</span><h2>{editingId ? 'Edit result / achievement' : 'Add result / achievement'}</h2></div>{editingId ? <button type="button" className={styles.secondaryButton} onClick={resetForm}>Cancel edit</button> : null}</div>
        <form onSubmit={saveItem}>
          <div className={styles.formGrid}>
            <label>Title<input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Class 10 Board Achievement" required /></label>
            <label>Category<input value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="Board Results" /></label>
            <label>Student display name <span className={styles.fieldHint}>Optional</span><input value={form.displayName} onChange={(e) => updateField('displayName', e.target.value)} placeholder="e.g. Student Name / Anonymous" /></label>
            <label>Class<input value={form.className} onChange={(e) => updateField('className', e.target.value)} placeholder="Class 10" /></label>
            <label>Exam / Board<input value={form.exam} onChange={(e) => updateField('exam', e.target.value)} placeholder="CBSE / Annual Exam" /></label>
            <label>Subject<input value={form.subject} onChange={(e) => updateField('subject', e.target.value)} placeholder="All Subjects" /></label>
            <label>Year<input value={form.year} onChange={(e) => updateField('year', e.target.value)} placeholder="2026" /></label>
            <label>Score <span className={styles.fieldHint}>Optional</span><input value={form.score} onChange={(e) => updateField('score', e.target.value)} placeholder="92" /></label>
            <label>Score unit<input value={form.scoreUnit} onChange={(e) => updateField('scoreUnit', e.target.value)} placeholder="%" /></label>
            <label>Rank <span className={styles.fieldHint}>Optional</span><input value={form.rank} onChange={(e) => updateField('rank', e.target.value)} placeholder="1st" /></label>
            <label>Badge <span className={styles.fieldHint}>Optional fallback for display</span><input value={form.badge} onChange={(e) => updateField('badge', e.target.value)} placeholder="A+" /></label>
            <label>Display order<input type="number" min="0" step="1" value={form.sortOrder} onChange={(e) => updateField('sortOrder', e.target.value)} /></label>
            <label className={styles.full}>Description<textarea rows="4" value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Brief verified achievement detail." /></label>
          </div>

          <div className={styles.toggleRow}>
            <label className={styles.toggle}><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} /><span>Publish on website</span></label>
            <label className={styles.toggle}><input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} /><span>Mark as featured</span></label>
          </div>

          <button className={styles.primaryButton} disabled={busy}>{busy ? 'Saving…' : editingId ? 'Update Result / Achievement' : 'Save Result / Achievement'}</button>
        </form>
      </section>

      <section className={styles.libraryCard}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>LIVE CONTENT LIBRARY</span><h2>Your results & achievements</h2></div><input className={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search results…" /></div>
        {filtered.length === 0 ? <div className={styles.empty}>No result or achievement found. Add your first verified highlight above.</div> : (
          <div className={styles.itemList}>
            {filtered.map((item) => (
              <article className={styles.item} key={item.id}>
                <div className={styles.scoreBadge}>{item.score || item.rank || item.badge || '✓'}</div>
                <div className={styles.itemMain}>
                  <div className={styles.itemTop}><div><span className={styles.role}>{item.category || 'Achievement'}</span><h3>{item.title || 'Academic Achievement'}</h3></div><div className={styles.badges}><span className={item.published ? styles.badgeGreen : styles.badgeMuted}>{item.published ? 'Published' : 'Draft'}</span>{item.featured ? <span className={styles.badgeGold}>Featured</span> : null}</div></div>
                  <div className={styles.metaLine}>{[item.displayName, item.className, item.exam, item.year].filter(Boolean).join(' • ')}</div>
                  {item.description ? <div className={styles.description}>{item.description}</div> : null}
                  <div className={styles.actions}><button type="button" onClick={() => editItem(item)}>Edit</button><button type="button" onClick={() => togglePublished(item)}>{item.published ? 'Unpublish' : 'Publish'}</button><button type="button" onClick={() => toggleFeatured(item)}>{item.featured ? 'Unfeature' : 'Feature'}</button><button type="button" className={styles.dangerButton} onClick={() => removeItem(item)}>Delete</button></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.footer}>Results and achievement metadata is stored in the Firestore <b>results</b> collection.</footer>
    </main>
  );
}
