'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import styles from './gallery.module.css';

const EMPTY_FORM = {
  title: '',
  category: 'Classroom',
  imageUrl: '',
  caption: '',
  sortOrder: '10',
  published: true,
  featured: false,
};

const CATEGORIES = ['Classroom', 'Activities', 'Events', 'Achievements', 'Students', 'Teachers', 'Other'];
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function formatDate(value) {
  if (!value) return 'No date';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function sortItems(items) {
  return [...items].sort((a, b) => {
    if (Boolean(a.featured) !== Boolean(b.featured)) return a.featured ? -1 : 1;
    const orderA = Number(a.sortOrder ?? 9999);
    const orderB = Number(b.sortOrder ?? 9999);
    if (orderA !== orderB) return orderA - orderB;
    return String(b.createdAt?.seconds || '').localeCompare(String(a.createdAt?.seconds || ''));
  });
}

function cleanFileName(name) {
  const safe = String(name || 'image.jpg').toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
  return (safe || 'image.jpg').slice(-90);
}

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || `Request failed with HTTP ${response.status}` };
  }
}

export default function GalleryPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const loadGallery = useCallback(async () => {
    if (!db) return;
    const snapshot = await getDocs(collection(db, 'gallery'));
    setItems(sortItems(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      setMessage('Firebase is not configured yet.');
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/admin/login');
        return;
      }

      setCurrentUser(user);

      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        const isActiveAdmin = adminSnap.exists() && adminSnap.data()?.active === true;
        if (!isActiveAdmin) {
          router.replace('/admin/login?error=unauthorized');
          return;
        }

        setAllowed(true);
        await loadGallery();
      } catch (error) {
        console.error(error);
        setMessage('Unable to load gallery. Check Firestore rules or the gallery collection.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [loadGallery, router]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stats = useMemo(() => ({
    total: items.length,
    published: items.filter((item) => item.published === true).length,
    draft: items.filter((item) => item.published !== true).length,
    featured: items.filter((item) => item.featured === true && item.published === true).length,
  }), [items]);

  function resetEditor() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sortOrder: String((items.length + 1) * 10) });
    setSelectedFile(null);
    setUploadProgress(0);
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setMessage('Image is too large. Please use an image smaller than 8 MB.');
      event.target.value = '';
      return;
    }

    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setUploadProgress(0);
    setMessage('Image selected. Save the gallery item to upload it to ImageKit.');
    setPreviewUrl(URL.createObjectURL(file));
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    setUploadProgress(0);
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(form.imageUrl || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      category: item.category || 'Classroom',
      imageUrl: item.imageUrl || '',
      caption: item.caption || '',
      sortOrder: String(item.sortOrder ?? '10'),
      published: item.published === true,
      featured: item.featured === true,
    });
    setSelectedFile(null);
    setUploadProgress(0);
    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(item.imageUrl || '');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setMessage('Editing selected gallery item.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function getImageKitAuth() {
    if (!currentUser) throw new Error('Your admin session is not ready. Please sign in again.');
    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/imagekit-auth', {
      method: 'GET',
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) {
      throw new Error(data.message || data.error || `Image upload authentication failed (${response.status}).`);
    }
    return data;
  }

  async function uploadToImageKit(file) {
    const authParams = await getImageKitAuth();
    const fileName = `${Date.now()}-${cleanFileName(file.name)}`;
    const folder = '/ezee-vision-champua/gallery';

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('publicKey', authParams.publicKey);
      formData.append('signature', authParams.signature);
      formData.append('expire', String(authParams.expire));
      formData.append('token', authParams.token);
      formData.append('folder', folder);
      formData.append('useUniqueFileName', 'true');
      formData.append('isPrivateFile', 'false');

      xhr.open('POST', 'https://upload.imagekit.io/api/v1/files/upload');
      xhr.timeout = 120000;
      xhr.responseType = 'text';

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onerror = () => reject(new Error('Image upload failed because the network connection was interrupted.'));
      xhr.ontimeout = () => reject(new Error('Image upload timed out after 2 minutes. Please try again with a smaller image or a better connection.'));
      xhr.onabort = () => reject(new Error('Image upload was cancelled.'));
      xhr.onload = () => {
        let data = {};
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {
          data = { message: xhr.responseText };
        }

        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          setUploadProgress(100);
          resolve({
            imageUrl: data.url,
            fileId: data.fileId || '',
            filePath: data.filePath || '',
          });
          return;
        }

        const reason = data.message || data.error?.message || `ImageKit upload failed with HTTP ${xhr.status}.`;
        reject(new Error(reason));
      };

      xhr.send(formData);
    });
  }

  async function deleteImageKitFile(fileId) {
    if (!fileId || !currentUser) return;
    const idToken = await currentUser.getIdToken();
    const response = await fetch('/api/imagekit-delete', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fileId }),
    });
    const data = await parseJsonResponse(response);
    if (!response.ok) throw new Error(data.message || data.error || `Image delete failed (${response.status}).`);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const title = form.title.trim();
    const imageUrl = form.imageUrl.trim();
    const caption = form.caption.trim();
    const order = Number(form.sortOrder);

    if (!title) {
      setMessage('Please add a title for this gallery item.');
      return;
    }
    if (!selectedFile && !imageUrl) {
      setMessage('Add an image by uploading a file or provide an image URL.');
      return;
    }

    setSaving(true);
    setUploadProgress(0);
    setMessage('');

    let uploadedNewFile = null;

    try {
      const previous = editingId ? items.find((item) => item.id === editingId) : null;
      let nextImageUrl = imageUrl;
      let nextFileId = previous?.fileId || '';
      let nextFilePath = previous?.filePath || '';

      if (selectedFile) {
        setMessage('Uploading image to ImageKit…');
        uploadedNewFile = await uploadToImageKit(selectedFile);
        nextImageUrl = uploadedNewFile.imageUrl;
        nextFileId = uploadedNewFile.fileId;
        nextFilePath = uploadedNewFile.filePath;
      } else if (!previous || imageUrl !== previous.imageUrl) {
        nextFileId = '';
        nextFilePath = '';
      }

      const payload = {
        title,
        category: form.category,
        imageUrl: nextImageUrl,
        caption,
        sortOrder: Number.isFinite(order) ? order : 10,
        published: Boolean(form.published),
        featured: Boolean(form.featured),
        provider: selectedFile ? 'imagekit' : (editingId && items.find((item) => item.id === editingId)?.provider || 'external'),
        fileId: nextFileId,
        filePath: nextFilePath,
        storagePath: '',
        updatedAt: serverTimestamp(),
      };

      if (editingId) {
        await updateDoc(doc(db, 'gallery', editingId), payload);

        if (previous?.fileId && previous.fileId !== nextFileId) {
          try {
            await deleteImageKitFile(previous.fileId);
          } catch (error) {
            console.warn('Gallery item updated, but the previous ImageKit file could not be deleted:', error);
          }
        }
        setMessage('Gallery item updated successfully.');
      } else {
        await addDoc(collection(db, 'gallery'), { ...payload, createdAt: serverTimestamp() });
        setMessage('Gallery item added successfully.');
      }

      resetEditor();
      await loadGallery();
    } catch (error) {
      console.error(error);
      if (uploadedNewFile?.fileId) {
        try {
          await deleteImageKitFile(uploadedNewFile.fileId);
        } catch (cleanupError) {
          console.warn('Uploaded image cleanup failed:', cleanupError);
        }
      }
      setMessage(error?.message || 'Save failed. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item) {
    try {
      await updateDoc(doc(db, 'gallery', item.id), { published: item.published !== true, updatedAt: serverTimestamp() });
      await loadGallery();
      setMessage(item.published === true ? 'Gallery item moved to draft.' : 'Gallery item published.');
    } catch (error) {
      console.error(error);
      setMessage('Unable to change publication status.');
    }
  }

  async function toggleFeatured(item) {
    try {
      await updateDoc(doc(db, 'gallery', item.id), { featured: item.featured !== true, updatedAt: serverTimestamp() });
      await loadGallery();
      setMessage(item.featured === true ? 'Gallery item removed from featured.' : 'Gallery item marked as featured.');
    } catch (error) {
      console.error(error);
      setMessage('Unable to change featured status.');
    }
  }

  async function removeItem(item) {
    if (!window.confirm(`Delete “${item.title}”? This cannot be undone.`)) return;

    setSaving(true);
    setMessage('Deleting gallery item…');
    try {
      await deleteDoc(doc(db, 'gallery', item.id));
      if (item.fileId) {
        try {
          await deleteImageKitFile(item.fileId);
        } catch (error) {
          console.warn('Gallery record deleted but ImageKit file could not be removed:', error);
        }
      }
      if (editingId === item.id) resetEditor();
      await loadGallery();
      setMessage('Gallery item deleted.');
    } catch (error) {
      console.error(error);
      setMessage(error?.message || 'Delete failed. Please try again.');
    } finally {
      setSaving(false);
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
            <span>GALLERY MANAGER</span>
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
            <div className={styles.kicker}>CONTENT MANAGEMENT • PHASE 3.4</div>
            <h1>Gallery</h1>
            <p>Publish authentic classroom moments, activities, events and achievements. Device uploads now go to ImageKit; Firebase stores only the small gallery metadata record.</p>
          </div>
          <div className={styles.collectionPill}><span>FIRESTORE</span><b>gallery</b><small>METADATA ONLY</small></div>
        </div>

        <section className={styles.statsGrid}>
          <article><span>Total</span><b>{stats.total}</b><small>All gallery items</small></article>
          <article><span>Published</span><b>{stats.published}</b><small>Visible on website</small></article>
          <article><span>Drafts</span><b>{stats.draft}</b><small>Not visible publicly</small></article>
          <article><span>Featured</span><b>{stats.featured}</b><small>Priority gallery items</small></article>
        </section>

        <section className={styles.editorCard}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.kicker}>{editingId ? 'EDIT GALLERY ITEM' : 'NEW GALLERY ITEM'}</div>
              <h2>{editingId ? 'Update gallery item' : 'Add a gallery photo'}</h2>
            </div>
            {editingId ? <button className={styles.ghostButton} type="button" onClick={resetEditor}>Cancel edit</button> : null}
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.grid2}>
              <label>Title<input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="e.g. Class 10 revision session" maxLength={100} /></label>
              <label>Category<select value={form.category} onChange={(e) => updateField('category', e.target.value)}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
            </div>

            <section className={styles.mediaPicker}>
              <div className={styles.mediaPickerHead}>
                <div>
                  <div className={styles.kicker}>IMAGE</div>
                  <h3>Add from your device or use a public URL</h3>
                </div>
                <span className={styles.mediaNote}>JPG • PNG • WEBP • max 8 MB</span>
              </div>

              <div className={styles.mediaChoices}>
                <div className={styles.uploadBox}>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} disabled={saving} />
                  <strong>Upload from device</strong>
                  <span>{selectedFile ? selectedFile.name : 'Saved to ImageKit, not Firebase Storage.'}</span>
                  {selectedFile ? <button type="button" className={styles.clearButton} onClick={clearSelectedFile} disabled={saving}>Remove selected file</button> : null}
                  {saving && selectedFile ? <div className={styles.progressTrack}><span style={{ width: `${uploadProgress}%` }}></span></div> : null}
                  {saving && selectedFile ? <small className={styles.progressText}>{uploadProgress}% uploaded</small> : null}
                </div>
                <div className={styles.orDivider}>OR</div>
                <label className={styles.urlBox}>Hosted image URL<input type="url" value={form.imageUrl} onChange={(e) => { updateField('imageUrl', e.target.value); if (!selectedFile) setPreviewUrl(e.target.value); }} placeholder="https://example.com/photo.jpg" disabled={saving} /></label>
              </div>

              {previewUrl ? (
                <div className={styles.previewWrap}>
                  <span>Preview</span>
                  <img src={previewUrl} alt="Gallery preview" />
                </div>
              ) : null}
            </section>

            <div className={styles.grid2}>
              <label>Caption<textarea rows="4" value={form.caption} onChange={(e) => updateField('caption', e.target.value)} placeholder="Short description shown with the photo." maxLength={180} disabled={saving} /></label>
              <label>Display order<input inputMode="numeric" value={form.sortOrder} onChange={(e) => updateField('sortOrder', e.target.value.replace(/[^0-9]/g, ''))} placeholder="10" disabled={saving} /><small className={styles.helper}>Lower number appears earlier. Use 10, 20, 30…</small></label>
            </div>

            <div className={styles.optionGrid}>
              <label className={styles.checkLabel}><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} disabled={saving} /><span><b>Publish on public website</b><small>Visible in the main Gallery section.</small></span></label>
              <label className={styles.checkLabel}><input type="checkbox" checked={form.featured} onChange={(e) => updateField('featured', e.target.checked)} disabled={saving} /><span><b>Mark as featured</b><small>Featured items are shown first.</small></span></label>
            </div>

            <div className={styles.formBottom}>
              <div className={styles.status}>{message || 'Upload a real coaching photo. Firebase stores only its metadata.'}</div>
              <button className={styles.saveButton} type="submit" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Update Gallery Item' : 'Save Gallery Item'}</button>
            </div>
          </form>
        </section>

        <section className={styles.listCard}>
          <div className={styles.cardHead}>
            <div>
              <div className={styles.kicker}>LIVE CONTENT LIBRARY</div>
              <h2>Your gallery items</h2>
            </div>
            <button className={styles.primaryOutline} type="button" onClick={resetEditor} disabled={saving}>+ Add new</button>
          </div>

          {items.length === 0 ? (
            <div className={styles.empty}><strong>No gallery items yet.</strong><span>Add your first real classroom or coaching photo above.</span></div>
          ) : (
            <div className={styles.list}>
              {items.map((item) => (
                <article className={styles.item} key={item.id}>
                  <div className={styles.thumbWrap}>
                    {item.imageUrl ? <img src={item.imageUrl} alt={item.title || 'EZEE VISION gallery item'} loading="lazy" /> : <div className={styles.noImage}>NO IMAGE</div>}
                  </div>
                  <div className={styles.itemBody}>
                    <div className={styles.itemTop}>
                      <div className={styles.badges}>
                        <span className={styles.category}>{item.category || 'Other'}</span>
                        {item.published === true ? <span className={styles.published}>Published</span> : <span className={styles.draft}>Draft</span>}
                        {item.featured === true ? <span className={styles.featured}>Featured</span> : null}
                      </div>
                      <time>{formatDate(item.createdAt)}</time>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.caption || 'No caption added.'}</p>
                    <small className={styles.orderLine}>Display order: {item.sortOrder ?? 10}</small>
                    <div className={styles.itemActions}>
                      <button type="button" onClick={() => startEdit(item)} disabled={saving}>Edit</button>
                      <button type="button" onClick={() => togglePublished(item)} disabled={saving}>{item.published === true ? 'Unpublish' : 'Publish'}</button>
                      <button type="button" onClick={() => toggleFeatured(item)} disabled={saving}>{item.featured === true ? 'Unfeature' : 'Feature'}</button>
                      <button type="button" className={styles.deleteAction} onClick={() => removeItem(item)} disabled={saving}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.noteBanner}>
          <div>
            <strong>Storage setup</strong>
            <span>Firebase Storage is not used for gallery uploads. Device images are sent directly to ImageKit; Firestore keeps only lightweight metadata and the image URL.</span>
          </div>
          <span className={styles.secureBadge}>ADMIN ONLY</span>
        </section>
      </section>
    </main>
  );
}
