'use client';

import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth, db, firebaseConfigured } from '../../../lib/firebase';
import styles from './coaching-profile.module.css';

const DEFAULT_PROFILE = {
  brandName: 'EZEE VISION CHAMPUA',
  shortName: 'EZEE VISION',
  locationLabel: 'CHAMPUA',
  tagline: 'Quality Education. Personal Attention. Better Learning.',
  heroTitleLine1: 'Learn better.',
  heroTitleLine2: 'Grow stronger.',
  heroText:
    'A focused learning environment built around concept clarity, regular practice and personal attention.',
  studentCount: '150',
  journeyMonths: '5',
  classRange: '4–12',
  classSupportText: 'Coaching for Classes 4–12',
  aboutTitle: 'A growing coaching community with a clear purpose.',
  aboutParagraph1:
    'EZEE VISION CHAMPUA was started with a simple idea: create a focused, student-centred learning environment where students can understand concepts, practise regularly and move forward with confidence.',
  aboutParagraph2:
    'In its first five months, the coaching community has grown to nearly 150 students. The next chapter is about building the same consistency at a larger scale — without losing the personal attention that makes learning meaningful.',
  phone: '+91 99999 99999',
  whatsapp: '919999999999',
  email: '',
  address: 'Champua, Odisha',
  mapUrl: '',
  facebook: '',
  instagram: '',
  youtube: '',
  telegram: '',
  footerTagline: 'Quality Education. Personal Attention. Better Learning.'
};

function fieldLabel(label, hint, children) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export default function CoachingProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!firebaseConfigured || !auth || !db) {
      setLoading(false);
      setStatus('Firebase is not configured.');
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
        const profileSnap = await getDoc(doc(db, 'siteContent', 'profile'));
        if (profileSnap.exists()) {
          setProfile({ ...DEFAULT_PROFILE, ...profileSnap.data() });
        }
      } catch (error) {
        console.error(error);
        setStatus('Unable to load the coaching profile. Check Firestore rules.');
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [router]);

  const whatsappLink = useMemo(() => {
    const digits = String(profile.whatsapp || '').replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : '#';
  }, [profile.whatsapp]);

  function update(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setStatus('');

    try {
      const cleanProfile = {
        ...profile,
        studentCount: String(profile.studentCount).trim(),
        journeyMonths: String(profile.journeyMonths).trim(),
        classRange: String(profile.classRange).trim(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'siteContent', 'profile'), cleanProfile, { merge: true });
      setStatus('Profile saved successfully. The public website can now use these details.');
    } catch (error) {
      console.error(error);
      setStatus('Save failed. Please verify that this account is an active admin and try again.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className={styles.page}><div className={styles.loadingCard}>Loading Coaching Profile…</div></main>;
  }

  if (!allowed) {
    return <main className={styles.page}><div className={styles.loadingCard}>{status || 'Access denied.'}</div></main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.brandWrap}>
          <div className={styles.logo}>EV</div>
          <div>
            <strong>EZEE VISION</strong>
            <span>COACHING PROFILE</span>
          </div>
        </div>
        <div className={styles.topActions}>
          <button type="button" className={styles.secondaryButton} onClick={() => router.push('/admin/dashboard')}>← Dashboard</button>
          <a className={styles.secondaryButton} href="/" target="_blank" rel="noreferrer">View Website</a>
        </div>
      </header>

      <section className={styles.shell}>
        <div className={styles.pageIntro}>
          <div>
            <div className={styles.kicker}>CONTENT MANAGEMENT • PHASE 3.2</div>
            <h1>Coaching Profile</h1>
            <p>Control the core public information of EZEE VISION CHAMPUA from one secure place. Changes are stored in Cloud Firestore.</p>
          </div>
          <div className={styles.saveHint}>PUBLIC PROFILE<br /><b>siteContent / profile</b></div>
        </div>

        <form onSubmit={handleSave} className={styles.form}>
          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div><span>01</span><h2>Brand & messaging</h2></div>
              <p>Visible across the public website.</p>
            </div>
            <div className={styles.grid2}>
              {fieldLabel('Coaching name', 'Use the official public name.', <input value={profile.brandName} onChange={(e) => update('brandName', e.target.value)} />)}
              {fieldLabel('Short brand name', 'Used in compact headers.', <input value={profile.shortName} onChange={(e) => update('shortName', e.target.value)} />)}
              {fieldLabel('Location label', 'Example: CHAMPUA', <input value={profile.locationLabel} onChange={(e) => update('locationLabel', e.target.value)} />)}
              {fieldLabel('Tagline', 'Keep it short and clear.', <input value={profile.tagline} onChange={(e) => update('tagline', e.target.value)} />)}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div><span>02</span><h2>Homepage hero</h2></div>
              <p>The first message visitors see.</p>
            </div>
            <div className={styles.grid2}>
              {fieldLabel('Headline — line 1', '', <input value={profile.heroTitleLine1} onChange={(e) => update('heroTitleLine1', e.target.value)} />)}
              {fieldLabel('Headline — line 2', '', <input value={profile.heroTitleLine2} onChange={(e) => update('heroTitleLine2', e.target.value)} />)}
            </div>
            {fieldLabel('Hero description', '', <textarea rows="3" value={profile.heroText} onChange={(e) => update('heroText', e.target.value)} />)}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div><span>03</span><h2>Coaching statistics</h2></div>
              <p>Keep these numbers factual and current.</p>
            </div>
            <div className={styles.grid3}>
              {fieldLabel('Student count', 'Example: 150', <input inputMode="numeric" value={profile.studentCount} onChange={(e) => update('studentCount', e.target.value)} />)}
              {fieldLabel('Journey months', 'Example: 5', <input inputMode="numeric" value={profile.journeyMonths} onChange={(e) => update('journeyMonths', e.target.value)} />)}
              {fieldLabel('Class range', 'Example: 4–12', <input value={profile.classRange} onChange={(e) => update('classRange', e.target.value)} />)}
            </div>
            {fieldLabel('Class section label', '', <input value={profile.classSupportText} onChange={(e) => update('classSupportText', e.target.value)} />)}
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div><span>04</span><h2>About & journey</h2></div>
              <p>Your public coaching story.</p>
            </div>
            {fieldLabel('About section title', '', <input value={profile.aboutTitle} onChange={(e) => update('aboutTitle', e.target.value)} />)}
            <div className={styles.grid2}>
              {fieldLabel('About paragraph 1', '', <textarea rows="6" value={profile.aboutParagraph1} onChange={(e) => update('aboutParagraph1', e.target.value)} />)}
              {fieldLabel('About paragraph 2', '', <textarea rows="6" value={profile.aboutParagraph2} onChange={(e) => update('aboutParagraph2', e.target.value)} />)}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div><span>05</span><h2>Contact & admissions</h2></div>
              <p>Used by phone and WhatsApp calls-to-action.</p>
            </div>
            <div className={styles.grid2}>
              {fieldLabel('Phone number', '', <input type="tel" value={profile.phone} onChange={(e) => update('phone', e.target.value)} />)}
              {fieldLabel('WhatsApp number', 'Country code + number, no + or spaces. Example: 919999999999', <input inputMode="numeric" value={profile.whatsapp} onChange={(e) => update('whatsapp', e.target.value)} />)}
              {fieldLabel('Email', 'Optional.', <input type="email" value={profile.email} onChange={(e) => update('email', e.target.value)} />)}
              {fieldLabel('Address', '', <textarea rows="3" value={profile.address} onChange={(e) => update('address', e.target.value)} />)}
              {fieldLabel('Google Maps URL', 'Optional. Add the share URL of your coaching location.', <input type="url" value={profile.mapUrl} onChange={(e) => update('mapUrl', e.target.value)} />)}
            </div>
            <div className={styles.previewLink}><span>WhatsApp preview</span><a href={whatsappLink} target="_blank" rel="noreferrer">{whatsappLink === '#' ? 'Add a WhatsApp number' : whatsappLink}</a></div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHead}>
              <div><span>06</span><h2>Social links</h2></div>
              <p>Leave a field blank if you do not use that platform.</p>
            </div>
            <div className={styles.grid2}>
              {fieldLabel('YouTube', '', <input type="url" placeholder="https://youtube.com/..." value={profile.youtube} onChange={(e) => update('youtube', e.target.value)} />)}
              {fieldLabel('Instagram', '', <input type="url" placeholder="https://instagram.com/..." value={profile.instagram} onChange={(e) => update('instagram', e.target.value)} />)}
              {fieldLabel('Facebook', '', <input type="url" placeholder="https://facebook.com/..." value={profile.facebook} onChange={(e) => update('facebook', e.target.value)} />)}
              {fieldLabel('Telegram', '', <input type="url" placeholder="https://t.me/..." value={profile.telegram} onChange={(e) => update('telegram', e.target.value)} />)}
            </div>
            {fieldLabel('Footer tagline', '', <input value={profile.footerTagline} onChange={(e) => update('footerTagline', e.target.value)} />)}
          </section>

          <div className={styles.saveBar}>
            <div>
              <strong>Ready to publish</strong>
              <span>{status || 'Save the profile when your details are complete.'}</span>
            </div>
            <button className={styles.saveButton} type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Coaching Profile'}</button>
          </div>
        </form>
      </section>
    </main>
  );
}
