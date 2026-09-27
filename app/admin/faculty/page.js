'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './faculty.module.css';

const emptyForm = {
  name: '',
  role: '',
  qualification: '',
  subjects: '',
  experience: '',
  bio: '',
  imageUrl: '',
  sortOrder: 10,
  published: true,
  featured: false
};

function safeTime(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  return new Date(value).getTime() || 0;
}

function initials(name) {
  return String(name || 'EV')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'EV';
}

export default function FacultyManager() {
  const [authReady, setAuthReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthReady(true);
      if (!user || !firebaseConfigured || !db) {
        setAuthorized(false);
        return;
      }

      try {
        const token = await user.getIdTokenResult();
        const adminSnap = await getDocs(collection(db, 'admins'));
        const matched = adminSnap.docs.find((item) => item.id === user.uid);
        const isAdmin = Boolean(token.claims?.admin) || Boolean(matched?.data()?.active === true);
        setAuthorized(isAdmin);
      } catch {
        setAuthorized(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authorized || !db) return undefined;

    let cancelled = false;
    async function load() {
      setBusy(true);
      try {
        const snapshot = await getDocs(collection(db, 'faculty'));
        if (cancelled) return;
        const next = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort((a, b) => {
            if (a.featured !== b.featured) return a.featured ? -1 : 1;
            const orderA = Number(a.sortOrder ?? 9999);
            const orderB = Number(b.sortOrder ?? 9999);
            if (orderA !== orderB) return orderA - orderB;
            return safeTime(b.updatedAt || b.createdAt) - safeTime(a.updatedAt || a.createdAt);
          });
        setItems(next);
      } catch (error) {
        setNotice({ type: 'error', text: error?.message || 'Could not load faculty.' });
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [authorized]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => [item.name, item.role, item.subjects, item.qualification]
      .some((value) => String(value || '').toLowerCase().includes(q)));
  }, [items, search]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId('');
    setNotice({ type: '', text: '' });
  }

  function editItem(item) {
    setEditingId(item.id);
    setForm({
      ...emptyForm,
      ...item,
      id: undefined,
      sortOrder: Number(item.sortOrder ?? 10)
    });
    setNotice({ type: '', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveFaculty(event) {
    event.preventDefault();
    if (!authorized || !db) return;

    const name = form.name.trim();
    if (!name) {
      setNotice({ type: 'error', text: 'Faculty name is required.' });
      return;
    }

    setBusy(true);
    setNotice({ type: '', text: '' });

    const payload = {
      name,
      role: form.role.trim(),
      qualification: form.qualification.trim(),
      subjects: form.subjects.trim(),
      experience: form.experience.trim(),
      bio: form.bio.trim(),
      imageUrl: form.imageUrl.trim(),
      sortOrder: Number(form.sortOrder) || 10,
      published: Boolean(form.published),
      featured: Boolean(form.featured),
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'faculty', editingId), payload);
        setNotice({ type: 'success', text: 'Faculty profile updated successfully.' });
      } else {
        await addDoc(collection(db, 'faculty'), { ...payload, createdAt: serverTimestamp() });
        setNotice({ type: 'success', text: 'Faculty profile created successfully.' });
      }

      const snapshot = await getDocs(collection(db, 'faculty'));
      const next = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
      next.sort((a, b) => {
        if (a.featured !== b.featured) return a.featured ? -1 : 1;
        return Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999);
      });
      setItems(next);
      resetForm();
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not save faculty profile.' });
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(item) {
    if (!authorized || !db) return;
    try {
      await updateDoc(doc(db, 'faculty', item.id), { published: !item.published, updatedAt: serverTimestamp() });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, published: !entry.published } : entry));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update publication status.' });
    }
  }

  async function toggleFeatured(item) {
    if (!authorized || !db) return;
    try {
      await updateDoc(doc(db, 'faculty', item.id), { featured: !item.featured, updatedAt: serverTimestamp() });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, featured: !entry.featured } : entry));
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not update featured status.' });
    }
  }

  async function removeItem(item) {
    if (!authorized || !db) return;
    if (!window.confirm(`Delete ${item.name || 'this faculty profile'}?`)) return;

    try {
      await deleteDoc(doc(db, 'faculty', item.id));
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (editingId === item.id) resetForm();
      setNotice({ type: 'success', text: 'Faculty profile deleted.' });
    } catch (error) {
      setNotice({ type: 'error', text: error?.message || 'Could not delete faculty profile.' });
    }
  }

  if (!authReady) {
    return <main className={styles.page}><div className={styles.stateCard}>Checking admin access…</div></main>;
  }

  if (!authorized) {
    return <main className={styles.page}><div className={styles.stateCard}><span className={styles.kicker}>PRIVATE AREA</span><h1>Admin access required.</h1><p>Please sign in using an active EZEE VISION administrator account.</p><a href="/admin" className={styles.primaryButton}>Back to Admin</a></div></main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div>
          <div className={styles.brand}>EZEE VISION <span>CHAMPUA</span></div>
          <div className={styles.subbrand}>Faculty Manager • Phase 3.5</div>
        </div>
        <div className={styles.topActions}>
          <a href="/admin" className={styles.secondaryButton}>Dashboard</a>
          <a href="/" className={styles.secondaryButton}>Website</a>
        </div>
      </header>

      <section className={styles.heroCard}>
        <span className={styles.kicker}>MEET OUR EDUCATORS</span>
        <h1>{editingId ? 'Edit faculty profile.' : 'Build your faculty team.'}</h1>
        <p>Create clean, trustworthy educator profiles. Only profiles marked as published appear on the public Faculty section.</p>
        <div className={styles.heroStats}>
          <div><strong>{items.length}</strong><span>Total profiles</span></div>
          <div><strong>{items.filter((item) => item.published).length}</strong><span>Published</span></div>
          <div><strong>{items.filter((item) => item.featured).length}</strong><span>Featured</span></div>
        </div>
      </section>

      {notice.text ? <div className={`${styles.notice} ${notice.type === 'error' ? styles.noticeError : styles.noticeSuccess}`}>{notice.text}</div> : null}

      <section className={styles.formCard}>
        <div className={styles.sectionHead}>
          <div><span className={styles.kicker}>PROFILE EDITOR</span><h2>{editingId ? 'Edit educator' : 'Add educator'}</h2></div>
          {editingId ? <button type="button" className={styles.secondaryButton} onClick={resetForm}>Cancel edit</button> : null}
        </div>

        <form onSubmit={saveFaculty}>
          <div className={styles.formGrid}>
            <label>Full name<input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Sayeedur Rahman (Shahid)" required /></label>
            <label>Role<input value={form.role} onChange={(e) => updateField('role', e.target.value)} placeholder="Founder • Educator" /></label>
            <label>Qualification<input value={form.qualification} onChange={(e) => updateField('qualification', e.target.value)} placeholder="Graduation • D.E.L.ED • CTET" /></label>
            <label>Subjects<input value={form.subjects} onChange={(e) => updateField('subjects', e.target.value)} placeholder="SST • English" /></label>
            <label>Experience<input value={form.experience} onChange={(e) => updateField('experience', e.target.value)} placeholder="1.5 years" /></label>
            <label>Display order<input type="number" min="0" step="1" value={form.sortOrder} onChange={(e) => updateField('sortOrder', e.target.value)} /></label>
            <label className={styles.full}>Image URL <span className={styles.fieldHint}>Paste the public ImageKit URL for this faculty photo.</span><input value={form.imageUrl} onChange={(e) => updateField('imageUrl', e.target.value)} placeholder="https://ik.imagekit.io/..." /></label>
            <label className={styles.full}>Bio<textarea rows="5" value={form.bio} onChange={(e) => updateField('bio', e.target.value)} placeholder="Short professional introduction…" /></label>
          </div>

          <div className={styles.helperRow}>
            <a href="https://imagekit.io/dashboard/media" target="_blank" rel="noreferrer">Open ImageKit Media Library →</a>
            <span>Use the public URL from the selected photo; no Firebase Storage is used.</span>
          </div>

          <div className={styles.toggleRow}>
            <label className={styles.toggle}><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} /><span>Publish on website</span></label>
            <label className={styles.toggle}><input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} /><span>Mark as featured</span></label>
          </div>

          <button className={styles.primaryButton} disabled={busy}>{busy ? 'Saving…' : editingId ? 'Update Faculty Profile' : 'Save Faculty Profile'}</button>
        </form>
      </section>

      <section className={styles.libraryCard}>
        <div className={styles.sectionHead}>
          <div><span className={styles.kicker}>LIVE CONTENT LIBRARY</span><h2>Faculty profiles</h2></div>
          <input className={styles.search} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search faculty…" />
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>No faculty profile found. Add your first educator above.</div>
        ) : (
          <div className={styles.profileList}>
            {filtered.map((item) => (
              <article className={styles.profileItem} key={item.id}>
                <div className={styles.avatar}>
                  {item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span>{initials(item.name)}</span>}
                </div>
                <div className={styles.profileMain}>
                  <div className={styles.profileTop}><div><span className={styles.role}>{item.role || 'Educator'}</span><h3>{item.name || 'Unnamed educator'}</h3></div><div className={styles.badges}><span className={item.published ? styles.badgeGreen : styles.badgeMuted}>{item.published ? 'Published' : 'Draft'}</span>{item.featured ? <span className={styles.badgeGold}>Featured</span> : null}</div></div>
                  <p>{item.subjects || 'Subjects not added'}{item.qualification ? ` • ${item.qualification}` : ''}</p>
                  {item.bio ? <div className={styles.bioPreview}>{item.bio}</div> : null}
                  <div className={styles.actions}>
                    <button type="button" onClick={() => editItem(item)}>Edit</button>
                    <button type="button" onClick={() => togglePublished(item)}>{item.published ? 'Unpublish' : 'Publish'}</button>
                    <button type="button" onClick={() => toggleFeatured(item)}>{item.featured ? 'Unfeature' : 'Feature'}</button>
                    <button type="button" className={styles.dangerButton} onClick={() => removeItem(item)}>Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className={styles.footer}>Faculty data is stored as lightweight Firestore metadata. Photos stay in ImageKit.</footer>
    </main>
  );
}
