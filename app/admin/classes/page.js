
'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDocs, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './classes.module.css';

const EMPTY_FORM = {
  title: '',
  tag: 'Classes',
  description: '',
  subjects: '',
  courseInfo: '',
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
    return String(a.title || '').localeCompare(String(b.title || ''));
  });
}

export default function ClassesManagerPage() {
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
    const snapshot = await getDocs(collection(db, 'classes'));
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
      title: item.title || '',
      tag: item.tag || 'Classes',
      description: item.description || '',
      subjects: item.subjects || '',
      courseInfo: item.courseInfo || '',
      sortOrder: item.sortOrder ?? 1,
      published: item.published !== false,
      featured: Boolean(item.featured)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!authorized || !db) return;
    if (!form.title.trim()) {
      setNotice({ type: 'error', text: 'Class / course title is required.' });
      return;
    }

    setBusy(true);
    setNotice({ type: '', text: '' });

    const payload = {
      title: form.title.trim(),
      tag: form.tag.trim() || 'Classes',
      description: form.description.trim(),
      subjects: form.subjects.trim(),
      courseInfo: form.courseInfo.trim(),
      sortOrder: Number(form.sortOrder) || 10,
      published: Boolean(form.published),
      featured: Boolean(form.featured),
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'classes', editingId), payload);
        setNotice({ type: 'success', text: 'Class / course updated successfully.' });
      } else {
        await addDoc(collection(db, 'classes'), { ...payload, createdAt: serverTimestamp() });
        setNotice({ type: 'success', text: 'Class / course created successfully.' });
      }
      await loadItems();
      resetForm();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not save class / course.' });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item) {
    if (!authorized || !db) return;
    try {
      await updateDoc(doc(db, 'classes', item.id), { published: !item.published, updatedAt: serverTimestamp() });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, published: !entry.published } : entry));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update publication status.' });
    }
  }

  async function toggleFeatured(item) {
    if (!authorized || !db) return;
    try {
      await updateDoc(doc(db, 'classes', item.id), { featured: !item.featured, updatedAt: serverTimestamp() });
      setItems(sortItems(items.map((entry) => entry.id === item.id ? { ...entry, featured: !entry.featured } : entry)));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update featured status.' });
    }
  }

  async function removeItem(item) {
    if (!authorized || !db) return;
    if (!window.confirm(`Delete ${item.title || 'this class / course'}?`)) return;
    try {
      await deleteDoc(doc(db, 'classes', item.id));
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) resetForm();
      setNotice({ type: 'success', text: 'Class / course deleted.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not delete class / course.' });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.title, item.tag, item.subjects, item.description, item.courseInfo].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [items, search]);

  if (!authReady) return <main className={styles.page}><div className={styles.stateCard}>Checking admin access…</div></main>;
  if (!authorized) return <main className={styles.page}><div className={styles.stateCard}><span className={styles.kicker}>PRIVATE AREA</span><h1>Admin access required.</h1><p>Please sign in using an active EZEE VISION administrator account.</p><a href="/admin" className={styles.primaryButton}>Back to Admin</a></div></main>;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div><div className={styles.brand}>EZEE VISION <span>CHAMPUA</span></div><div className={styles.subbrand}>Classes & Courses Manager • Phase 3.6</div></div>
        <div className={styles.topActions}><a href="/admin" className={styles.secondaryButton}>Dashboard</a><a href="/" className={styles.secondaryButton}>Website</a></div>
      </header>

      <section className={styles.heroCard}>
        <span className={styles.kicker}>ACADEMIC PROGRAMME CONTROL</span>
        <h1>{editingId ? 'Edit a class or course.' : 'Manage your classes & courses.'}</h1>
        <p>Create the public class offerings, subjects and course information shown on the EZEE VISION CHAMPUA website. Only published entries appear publicly.</p>
        <div className={styles.heroStats}>
          <div><strong>{items.length}</strong><span>Total entries</span></div>
          <div><strong>{items.filter((item) => item.published).length}</strong><span>Published</span></div>
          <div><strong>{items.filter((item) => item.featured).length}</strong><span>Featured</span></div>
        </div>
      </section>

      {notice.text ? <div className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : styles.noticeSuccess}`}>{notice.text}</div> : null}

      <section className={styles.formCard}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>CLASS / COURSE EDITOR</span><h2>{editingId ? 'Edit programme' : 'Add programme'}</h2></div>{editingId ? <button type="button" className={styles.secondaryButton} onClick={resetForm}>Cancel edit</button> : null}</div>
        <form onSubmit={saveItem}>
          <div className={styles.formGrid}>
            <label>Title<input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Classes 6–8" required /></label>
            <label>Category / tag<input value={form.tag} onChange={(e) => updateField('tag', e.target.value)} placeholder="Concepts" /></label>
            <label className={styles.full}>Description<textarea rows="4" value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="Explain what students can expect from this class or course." /></label>
            <label>Subjects<input value={form.subjects} onChange={(e) => updateField('subjects', e.target.value)} placeholder="SST • Science • Maths • English" /></label>
            <label>Display order<input type="number" min="0" step="1" value={form.sortOrder} onChange={(e) => updateField('sortOrder', e.target.value)} /></label>
            <label className={styles.full}>Course information <span className={styles.fieldHint}>Optional short details such as batch focus, exam preparation or learning format.</span><input value={form.courseInfo} onChange={(e) => updateField('courseInfo', e.target.value)} placeholder="Board preparation • Regular practice • Weekly revision" /></label>
          </div>
          <div className={styles.toggleRow}>
            <label className={styles.toggle}><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} /><span>Publish on website</span></label>
            <label className={styles.toggle}><input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} /><span>Mark as featured</span></label>
          </div>
          <button className={styles.primaryButton} disabled={busy}>{busy ? 'Saving…' : editingId ? 'Update Class / Course' : 'Save Class / Course'}</button>
        </form>
      </section>

      <section className={styles.libraryCard}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>LIVE CONTENT LIBRARY</span><h2>Your classes & courses</h2></div><input className={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search classes…" /></div>
        {filtered.length === 0 ? <div className={styles.empty}>No class or course found. Add your first programme above.</div> : (
          <div className={styles.itemList}>
            {filtered.map((item) => (
              <article className={styles.item} key={item.id}>
                <div className={styles.itemBadge}>{String(item.title || 'C').replace(/[^0-9A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'C'}</div>
                <div className={styles.itemMain}>
                  <div className={styles.itemTop}><div><span className={styles.role}>{item.tag || 'Classes'}</span><h3>{item.title || 'Untitled programme'}</h3></div><div className={styles.badges}><span className={item.published ? styles.badgeGreen : styles.badgeMuted}>{item.published ? 'Published' : 'Draft'}</span>{item.featured ? <span className={styles.badgeGold}>Featured</span> : null}</div></div>
                  {item.subjects ? <p className={styles.subjects}>{item.subjects}</p> : null}
                  {item.description ? <div className={styles.description}>{item.description}</div> : null}
                  {item.courseInfo ? <div className={styles.courseInfo}>{item.courseInfo}</div> : null}
                  <div className={styles.actions}><button type="button" onClick={() => editItem(item)}>Edit</button><button type="button" onClick={() => togglePublished(item)}>{item.published ? 'Unpublish' : 'Publish'}</button><button type="button" onClick={() => toggleFeatured(item)}>{item.featured ? 'Unfeature' : 'Feature'}</button><button type="button" className={styles.dangerButton} onClick={() => removeItem(item)}>Delete</button></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.footer}>Classes and course information is stored in the Firestore <b>classes</b> collection.</footer>
    </main>
  );
}
