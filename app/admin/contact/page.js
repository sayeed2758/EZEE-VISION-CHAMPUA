'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './contact.module.css';

const DEFAULTS = {
  phone: '+91 99999 99999',
  whatsapp: '919999999999',
  email: '',
  address: 'Champua, Odisha',
  mapUrl: '',
  facebook: '',
  instagram: '',
  youtube: '',
  telegram: '',
  contactTitle: 'Let’s connect',
  contactText: 'Have a question about classes, batches or admissions? Contact EZEE VISION CHAMPUA.',
  officeHours: 'Monday – Saturday | 8:00 AM – 8:00 PM'
};

export default function ContactManagerPage() {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      setMessage('Firebase is not configured.');
      return undefined;
    }

    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/admin/login');
        return;
      }
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        if (!adminSnap.exists() || adminSnap.data()?.active !== true) {
          router.replace('/admin/login?error=unauthorized');
          return;
        }
        const snapshot = await getDoc(doc(db, 'siteContent', 'profile'));
        if (snapshot.exists()) setForm((current) => ({ ...current, ...snapshot.data() }));
      } catch {
        setMessage('Unable to load contact details.');
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function save(event) {
    event.preventDefault();
    if (!db) return;
    setSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'siteContent', 'profile'), {
        ...form,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setMessage('Contact information saved successfully.');
    } catch (error) {
      setMessage(error?.message || 'Unable to save contact information.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className={styles.page}><div className={styles.card}>Loading Contact Manager…</div></main>;

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <div>
          <span className={styles.kicker}>PHASE 3.10</span>
          <h1>Contact & Communication</h1>
          <p>Control the contact details parents see across the public website.</p>
        </div>
        <button className={styles.back} onClick={() => router.push('/admin/dashboard')}>← Dashboard</button>
      </div>

      <form onSubmit={save} className={styles.grid}>
        <section className={styles.card}>
          <h2>Primary Contact</h2>
          <div className={styles.fields}>
            <label>Phone<input value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="+91 98765 43210" /></label>
            <label>WhatsApp Number<input value={form.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} placeholder="919876543210" /></label>
            <label>Email<input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="ezevision@example.com" /></label>
            <label>Address<textarea value={form.address} onChange={(e) => update('address', e.target.value)} rows={3} /></label>
            <label>Google Maps URL<input value={form.mapUrl} onChange={(e) => update('mapUrl', e.target.value)} placeholder="https://maps.google.com/..." /></label>
            <label>Office Hours<input value={form.officeHours} onChange={(e) => update('officeHours', e.target.value)} /></label>
          </div>
        </section>

        <section className={styles.card}>
          <h2>Contact Section</h2>
          <div className={styles.fields}>
            <label>Section Title<input value={form.contactTitle} onChange={(e) => update('contactTitle', e.target.value)} /></label>
            <label>Section Text<textarea value={form.contactText} onChange={(e) => update('contactText', e.target.value)} rows={5} /></label>
          </div>
        </section>

        <section className={styles.card}>
          <h2>Social & Communication Links</h2>
          <div className={styles.fields}>
            <label>Facebook URL<input value={form.facebook} onChange={(e) => update('facebook', e.target.value)} /></label>
            <label>Instagram URL<input value={form.instagram} onChange={(e) => update('instagram', e.target.value)} /></label>
            <label>YouTube URL<input value={form.youtube} onChange={(e) => update('youtube', e.target.value)} /></label>
            <label>Telegram URL<input value={form.telegram} onChange={(e) => update('telegram', e.target.value)} /></label>
          </div>
        </section>

        <section className={styles.preview}>
          <span>LIVE PREVIEW</span>
          <h2>{form.contactTitle || 'Let’s connect'}</h2>
          <p>{form.contactText}</p>
          <div className={styles.previewItems}>
            <b>☎ {form.phone || 'Phone not set'}</b>
            <b>◉ {form.whatsapp || 'WhatsApp not set'}</b>
            <b>✉ {form.email || 'Email not set'}</b>
            <b>⌖ {form.address || 'Address not set'}</b>
          </div>
        </section>

        <div className={styles.actions}>
          {message && <span className={styles.message}>{message}</span>}
          <button className={styles.save} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Contact Information'}</button>
        </div>
      </form>
    </main>
  );
}
