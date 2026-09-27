'use client';

import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './testimonials.module.css';

const EMPTY_FORM = {
  name: '',
  role: 'Student',
  quote: '',
  rating: 5,
  sortOrder: 1,
  published: true,
  featured: false,
  permissionConfirmed: false
};

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    const oa = Number(a.sortOrder ?? 9999);
    const ob = Number(b.sortOrder ?? 9999);
    if (oa !== ob) return oa - ob;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export default function TestimonialsManagerPage() {
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
        const active = adminSnap.exists() && adminSnap.data()?.active === true;
        if (!active) {
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
    const snapshot = await getDocs(collection(db, 'testimonials'));
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
      rating: Math.min(5, Math.max(1, Number(item.rating || 5))),
      sortOrder: Number(item.sortOrder || 1),
      published: item.published !== false,
      featured: Boolean(item.featured),
      permissionConfirmed: item.permissionConfirmed === true
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveItem(event) {
    event.preventDefault();
    if (!authorized || !db) return;

    const name = form.name.trim();
    const quote = form.quote.trim();

    if (!quote) {
      setNotice({ type: 'error', text: 'Testimonial text is required.' });
      return;
    }
    if (form.published && name && !form.permissionConfirmed) {
      setNotice({ type: 'error', text: 'Confirm that you have permission to publish this named testimonial.' });
      return;
    }

    setBusy(true);
    setNotice({ type: '', text: '' });

    const payload = {
      name,
      role: form.role.trim() || 'Student',
      quote,
      rating: Number(form.rating) || 5,
      sortOrder: Number(form.sortOrder) || 10,
      published: Boolean(form.published),
      featured: Boolean(form.featured),
      permissionConfirmed: Boolean(form.permissionConfirmed),
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'testimonials', editingId), payload);
        setNotice({ type: 'success', text: 'Testimonial updated successfully.' });
      } else {
        await addDoc(collection(db, 'testimonials'), { ...payload, createdAt: serverTimestamp() });
        setNotice({ type: 'success', text: 'Testimonial published to the website library.' });
      }
      await loadItems();
      resetForm();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not save testimonial.' });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item) {
    try {
      await updateDoc(doc(db, 'testimonials', item.id), { published: !item.published, updatedAt: serverTimestamp() });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, published: !entry.published } : entry));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update publication status.' });
    }
  }

  async function toggleFeatured(item) {
    try {
      await updateDoc(doc(db, 'testimonials', item.id), { featured: !item.featured, updatedAt: serverTimestamp() });
      setItems(sortItems(items.map((entry) => entry.id === item.id ? { ...entry, featured: !entry.featured } : entry)));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update featured status.' });
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete the testimonial from ${item.name || 'this entry'}?`)) return;
    try {
      await deleteDoc(doc(db, 'testimonials', item.id));
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) resetForm();
      setNotice({ type: 'success', text: 'Testimonial deleted.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not delete testimonial.' });
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.name, item.role, item.quote].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [items, search]);

  if (!authReady) return <main className={styles.page}><div className={styles.stateCard}>Checking admin access…</div></main>;
  if (!authorized) return <main className={styles.page}><div className={styles.stateCard}><span className={styles.kicker}>PRIVATE AREA</span><h1>Admin access required.</h1><p>Please sign in using an active EZEE VISION administrator account.</p><a href="/admin" className={styles.primaryButton}>Back to Admin</a></div></main>;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div><div className={styles.brand}>EZEE VISION <span>CHAMPUA</span></div><div className={styles.subbrand}>Testimonials Manager • Phase 3.9</div></div>
        <div className={styles.topActions}><a href="/admin" className={styles.secondaryButton}>Dashboard</a><a href="/" className={styles.secondaryButton}>Website</a></div>
      </header>

      <section className={styles.heroCard}>
        <span className={styles.kicker}>STUDENT & PARENT VOICE</span>
        <h1>{editingId ? 'Edit a testimonial.' : 'Publish approved feedback with control.'}</h1>
        <p>Keep public feedback short, authentic and appropriately authorised. Anonymous or community-level testimonials can be published without a person’s name.</p>
        <div className={styles.heroStats}>
          <div><strong>{items.length}</strong><span>Total entries</span></div>
          <div><strong>{items.filter((item) => item.published).length}</strong><span>Published</span></div>
          <div><strong>{items.filter((item) => item.featured).length}</strong><span>Featured</span></div>
        </div>
      </section>

      <div className={styles.privacyNote}><b>Permission note:</b> Publish a named student or parent testimonial only when the coaching centre has the appropriate permission. For a safer public display, leave the name blank or use a community label.</div>

      {notice.text ? <div className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : styles.noticeSuccess}`}>{notice.text}</div> : null}

      <section className={styles.formCard}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>TESTIMONIAL EDITOR</span><h2>{editingId ? 'Edit testimonial' : 'Add testimonial'}</h2></div>{editingId ? <button type="button" className={styles.secondaryButton} onClick={resetForm}>Cancel edit</button> : null}</div>
        <form onSubmit={saveItem}>
          <div className={styles.formGrid}>
            <label>Name <span className={styles.fieldHint}>Optional</span><input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Student Name / Parent Name / leave blank" /></label>
            <label>Role / Label<input value={form.role} onChange={(e) => updateField('role', e.target.value)} placeholder="Student / Parent / Alumni" /></label>
            <label>Rating<input type="number" min="1" max="5" step="1" value={form.rating} onChange={(e) => updateField('rating', e.target.value)} /></label>
            <label>Display order<input type="number" min="0" step="1" value={form.sortOrder} onChange={(e) => updateField('sortOrder', e.target.value)} /></label>
            <label className={styles.full}>Testimonial<textarea rows="5" maxLength={500} value={form.quote} onChange={(e) => updateField('quote', e.target.value)} placeholder="Write the approved testimonial text…" required /></label>
          </div>

          <div className={styles.toggleRow}>
            <label className={styles.toggle}><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} /><span>Publish on website</span></label>
            <label className={styles.toggle}><input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} /><span>Mark as featured</span></label>
            <label className={styles.toggle}><input type="checkbox" checked={form.permissionConfirmed} onChange={(e) => updateField('permissionConfirmed', e.target.checked)} /><span>Permission confirmed</span></label>
          </div>

          <button className={styles.primaryButton} disabled={busy}>{busy ? 'Saving…' : editingId ? 'Update Testimonial' : 'Save Testimonial'}</button>
        </form>
      </section>

      <section className={styles.libraryCard}>
        <div className={styles.sectionHead}><div><span className={styles.kicker}>LIVE CONTENT LIBRARY</span><h2>Your testimonials</h2></div><input className={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search testimonials…" /></div>
        {filtered.length === 0 ? <div className={styles.empty}>No testimonials found. Add an approved testimonial above.</div> : (
          <div className={styles.itemList}>
            {filtered.map((item) => (
              <article className={styles.item} key={item.id}>
                <div className={styles.quoteBadge}>“</div>
                <div className={styles.itemMain}>
                  <div className={styles.itemTop}><div><span className={styles.role}>{item.role || 'Student'}</span><h3>{item.name || 'Community Testimonial'}</h3></div><div className={styles.badges}><span className={item.published ? styles.badgeGreen : styles.badgeMuted}>{item.published ? 'Published' : 'Draft'}</span>{item.featured ? <span className={styles.badgeGold}>Featured</span> : null}</div></div>
                  <div className={styles.rating}>{'★'.repeat(Math.max(0, Math.min(5, Number(item.rating || 5))))}<span> {Number(item.rating || 5)}/5</span></div>
                  <div className={styles.description}>“{item.quote}”</div>
                  <div className={styles.actions}><button type="button" onClick={() => editItem(item)}>Edit</button><button type="button" onClick={() => togglePublished(item)}>{item.published ? 'Unpublish' : 'Publish'}</button><button type="button" onClick={() => toggleFeatured(item)}>{item.featured ? 'Unfeature' : 'Feature'}</button><button type="button" className={styles.dangerButton} onClick={() => removeItem(item)}>Delete</button></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.footer}>Made With ❤️ By Shahid Sir</footer>
    </main>
  );
}
