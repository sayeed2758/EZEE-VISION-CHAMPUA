'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './announcements.module.css';

const EMPTY_FORM = {
  title: '',
  category: 'General',
  content: '',
  publishDate: new Date().toISOString().slice(0, 10),
  published: true,
  pinned: false,
};

const CATEGORY_OPTIONS = ['Admission', 'Academics', 'Exam', 'Notice', 'Event', 'Holiday', 'General'];

function asDate(value) {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value) {
  const date = asDate(value);
  if (!date) return 'No date';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function displayDate(item) {
  return item.publishDate ? formatDate(item.publishDate) : formatDate(item.createdAt);
}

export default function AnnouncementsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    if (!db) return;
    const snapshot = await getDocs(collection(db, 'updates'));
    const nextItems = snapshot.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return String(b.publishDate || '').localeCompare(String(a.publishDate || ''));
      });
    setItems(nextItems);
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
          router.replace('/admin/login?error=unauthorized');
          return;
        }

        setAllowed(true);
        await loadAnnouncements();
      } catch (error) {
        console.error(error);
        setMessage('Unable to load announcements. Check Firestore rules or the updates collection.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadAnnouncements, router]);

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter((item) => item.published === true).length,
    draft: items.filter((item) => item.published !== true).length,
    pinned: items.filter((item) => item.pinned === true && item.published === true).length,
  }), [items]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNew() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, publishDate: new Date().toISOString().slice(0, 10) });
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      category: item.category || 'General',
      content: item.content || '',
      publishDate: item.publishDate || new Date().toISOString().slice(0, 10),
      published: item.published === true,
      pinned: item.pinned === true,
    });
    setMessage('Editing selected announcement.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();

    if (!title || !content) {
      setMessage('Please add an announcement title and message.');
      return;
    }

    setSaving(true);
    setMessage('');

    const payload = {
      title,
      category: form.category,
      content,
      publishDate: form.publishDate || new Date().toISOString().slice(0, 10),
      published: Boolean(form.published),
      pinned: Boolean(form.pinned),
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'updates', editingId), payload);
        setMessage('Announcement updated successfully.');
      } else {
        await addDoc(collection(db, 'updates'), { ...payload, createdAt: serverTimestamp() });
        setMessage('Announcement saved successfully.');
      }

      setEditingId(null);
      setForm({ ...EMPTY_FORM, publishDate: new Date().toISOString().slice(0, 10) });
      await loadAnnouncements();
    } catch (error) {
      console.error(error);
      setMessage('Save failed. Please verify that this account is an active admin and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item) {
    try {
      await updateDoc(doc(db, 'updates', item.id), { published: item.published !== true, updatedAt: serverTimestamp() });
      await loadAnnouncements();
      setMessage(item.published === true ? 'Announcement moved to draft.' : 'Announcement published.');
    } catch (error) {
      console.error(error);
      setMessage('Unable to change publication status.');
    }
  }

  async function togglePinned(item) {
    try {
      await updateDoc(doc(db, 'updates', item.id), { pinned: item.pinned !== true, updatedAt: serverTimestamp() });
      await loadAnnouncements();
      setMessage(item.pinned === true ? 'Announcement unpinned.' : 'Announcement pinned.');
    } catch (error) {
      console.error(error);
      setMessage('Unable to change pin status.');
    }
  }

  async function removeAnnouncement(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;

    try {
      await deleteDoc(doc(db, 'updates', item.id));
      if (editingId === item.id) startNew();
      await loadAnnouncements();
      setMessage('Announcement deleted.');
    } catch (error) {
      console.error(error);
      setMessage('Delete failed. Please try again.');
    }
  }

  if (loading) return <main className={styles.page}><div className={styles.loadingCard}>Checking secure access…</div></main>;
  if (!allowed) return <main className={styles.page}><div className={styles.loadingCard}>{message || 'Access denied.'}</div></main>;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brandWrap}>
          <div className={styles.logo}>EV</div>
          <div>
            <strong>EZEE VISION</strong>
            <span>ANNOUNCEMENT MANAGER</span>
          </div>
        </div>
        <div className={styles.topActions}>
          <button className={styles.secondaryButton} type="button" onClick={() => router.push('/admin/dashboard')}>← Dashboard</button>
          <a className={styles.secondaryButton} href="/" target="_blank" rel="noreferrer">View Website</a>
        </div>
      </header>

      <section className={styles.shell}>
        <div className={styles.hero}>
          <div>
            <div className={styles.kicker}>CONTENT MANAGEMENT • PHASE 3.3</div>
            <h1>Announcements</h1>
            <p>Publish admission notices, academic updates, exam information, events and important messages directly to the public website.</p>
          </div>
          <div className={styles.collectionPill}><span>FIRESTORE</span><b>updates</b></div>
        </div>

        <section className={styles.statsGrid}>
          <article><span>Total</span><b>{stats.total}</b><small>All announcements</small></article>
          <article><span>Published</span><b>{stats.published}</b><small>Visible on website</small></article>
          <article><span>Drafts</span><b>{stats.draft}</b><small>Not visible publicly</small></article>
          <article><span>Pinned</span><b>{stats.pinned}</b><small>Published priority items</small></article>
        </section>

        <section className={styles.editorCard}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.kicker}>{editingId ? 'EDIT ANNOUNCEMENT' : 'NEW ANNOUNCEMENT'}</div>
              <h2>{editingId ? 'Update announcement' : 'Create a new announcement'}</h2>
            </div>
            {editingId ? <button className={styles.ghostButton} type="button" onClick={startNew}>Cancel edit</button> : null}
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.grid2}>
              <label>Title<input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. New Class 10 batch starting soon" maxLength={120} /></label>
              <label>Category<select value={form.category} onChange={(e) => updateField('category', e.target.value)}>{CATEGORY_OPTIONS.map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>
            <div className={styles.grid2}>
              <label>Publish date<input type="date" value={form.publishDate} onChange={(e) => updateField('publishDate', e.target.value)} /></label>
              <div className={styles.optionBox}>
                <label className={styles.checkLabel}><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} /> Publish on public website</label>
                <label className={styles.checkLabel}><input type="checkbox" checked={form.pinned} onChange={(e) => updateField('pinned', e.target.checked)} /> Pin as an important update</label>
              </div>
            </div>
            <label>Message<textarea rows="6" value={form.content} onChange={(e) => updateField('content', e.target.value)} placeholder="Write the announcement clearly for students and parents…" maxLength={1200} /></label>
            <div className={styles.formBottom}>
              <div className={styles.status}>{message || 'Published announcements are shown in the public website updates section.'}</div>
              <button className={styles.saveButton} type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update Announcement' : 'Save Announcement'}</button>
            </div>
          </form>
        </section>

        <section className={styles.listCard}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.kicker}>MANAGE CONTENT</div>
              <h2>All announcements</h2>
            </div>
            <button className={styles.primaryOutline} type="button" onClick={startNew}>+ New announcement</button>
          </div>

          {items.length === 0 ? (
            <div className={styles.empty}><strong>No announcements yet.</strong><span>Create the first update above and publish it to the website.</span></div>
          ) : (
            <div className={styles.list}>
              {items.map((item) => (
                <article className={styles.item} key={item.id}>
                  <div className={styles.itemTop}>
                    <div className={styles.badges}>
                      <span className={styles.category}>{item.category || 'General'}</span>
                      <span className={item.published === true ? styles.published : styles.draft}>{item.published === true ? 'Published' : 'Draft'}</span>
                      {item.pinned === true ? <span className={styles.pinned}>Pinned</span> : null}
                    </div>
                    <time>{displayDate(item)}</time>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>
                  <div className={styles.itemActions}>
                    <button type="button" onClick={() => startEdit(item)}>Edit</button>
                    <button type="button" onClick={() => togglePublished(item)}>{item.published === true ? 'Unpublish' : 'Publish'}</button>
                    <button type="button" onClick={() => togglePinned(item)}>{item.pinned === true ? 'Unpin' : 'Pin'}</button>
                    <button className={styles.deleteAction} type="button" onClick={() => removeAnnouncement(item)}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className={styles.noteBanner}>
          <div><strong>Publishing rule</strong><span>Only announcements marked “Published” appear on the public site. Drafts stay inside this secure admin area.</span></div>
          <span className={styles.secureBadge}>ADMIN ONLY</span>
        </div>
      </section>
    </main>
  );
}
