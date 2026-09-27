'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './contact.module.css';

const DEFAULT_NUMBERS = ['+91 89172 25693', '+91 77499 16815', '+91 91244 78453'];

const DEFAULTS = {
  phone: DEFAULT_NUMBERS[0],
  whatsapp: '918917225693',
  contactNumbersVersion: 1,
  contactPhones: DEFAULT_NUMBERS,
  whatsappNumbers: DEFAULT_NUMBERS,
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
        if (snapshot.exists()) {
          const data = snapshot.data();
          const savedNumbers = data.contactNumbersVersion === 1;
          const numbers = savedNumbers && Array.isArray(data.contactPhones) && data.contactPhones.length ? data.contactPhones.slice(0, 3) : DEFAULT_NUMBERS;
          const whatsappNumbers = savedNumbers && Array.isArray(data.whatsappNumbers) && data.whatsappNumbers.length ? data.whatsappNumbers.slice(0, 3) : DEFAULT_NUMBERS;
          setForm((current) => ({ ...current, ...data, contactPhones: numbers, whatsappNumbers, phone: numbers[0], whatsapp: String(whatsappNumbers[0] || '').replace(/\D/g, '') }));
        }
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
      const numbers = (form.contactPhones || DEFAULT_NUMBERS).map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
      const whatsappNumbers = (form.whatsappNumbers || numbers).map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
      await setDoc(doc(db, 'siteContent', 'profile'), {
        ...form,
        contactNumbersVersion: 1,
        contactPhones: numbers,
        whatsappNumbers,
        phone: numbers[0] || '',
        whatsapp: String(whatsappNumbers[0] || '').replace(/\D/g, ''),
        updatedAt: serverTimestamp()
      }, { merge: true });
      setForm((current) => ({ ...current, contactNumbersVersion: 1, contactPhones: numbers, whatsappNumbers, phone: numbers[0] || '', whatsapp: String(whatsappNumbers[0] || '').replace(/\D/g, '') }));
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
          <span className={styles.kicker}>PHASE 3.10 • CONTACT</span>
          <h1>Contact & Communication</h1>
          <p>Control the contact details parents see across the public website.</p>
        </div>
        <button className={styles.back} onClick={() => router.push('/admin/dashboard')}>← Dashboard</button>
      </div>

      <form onSubmit={save} className={styles.grid}>
        <section className={styles.card}>
          <h2>Call & WhatsApp Numbers</h2>
          <p className={styles.hint}>All three numbers below are configured for both Call and WhatsApp on the public website.</p>
          <div className={styles.fields}>
            {[0, 1, 2].map((index) => (
              <label key={`contact-${index}`}>Contact {index + 1}<input value={(form.contactPhones || DEFAULT_NUMBERS)[index] || ''} onChange={(e) => {
                const value = e.target.value;
                const numbers = [...(form.contactPhones || DEFAULT_NUMBERS)];
                numbers[index] = value;
                const wa = [...(form.whatsappNumbers || DEFAULT_NUMBERS)];
                wa[index] = value;
                setForm((current) => ({ ...current, contactPhones: numbers, whatsappNumbers: wa, phone: numbers[0], whatsapp: String(wa[0] || '').replace(/\D/g, '') }));
              }} placeholder="+91 98765 43210" /></label>
            ))}
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
            {(form.contactPhones || DEFAULT_NUMBERS).filter(Boolean).map((number, index) => (
              <b key={`preview-${number}-${index}`}>☎ + ◉ {number} — Call & WhatsApp</b>
            ))}
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
