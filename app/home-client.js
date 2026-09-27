'use client';

import { Fragment, useEffect, useState } from 'react';
import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { db, firebaseConfigured } from '../lib/firebase';

const classGroups = [
  {
    tag: 'Foundation',
    title: 'Classes 4–5',
    text: 'Build strong basics, better study habits and confidence from an early stage.',
    subjects: 'Core academic support'
  },
  {
    tag: 'Concepts',
    title: 'Classes 6–8',
    text: 'Strengthen concepts with guided practice, revision and subject-wise support.',
    subjects: 'SST • Science • Maths • English'
  },
  {
    tag: 'Boards',
    title: 'Classes 9–10',
    text: 'Focused preparation with concept clarity, practice and exam-oriented guidance.',
    subjects: 'SST • Science • Maths • English'
  },
  {
    tag: 'Senior Secondary',
    title: 'Classes 11–12',
    text: 'Structured academic support for senior secondary learning and consistent progress.',
    subjects: 'Subject-wise guidance'
  }
];

const reasons = [
  ['01', 'Concept-Based Learning', 'Understand the idea first, then practise it with confidence.'],
  ['02', 'Personal Attention', 'A focused environment where students can ask, practise and improve.'],
  ['03', 'Regular Practice', 'Consistent classwork, revision and practice to build stronger learning habits.'],
  ['04', 'Student-Focused Environment', 'A disciplined but comfortable space designed around learning.'],
  ['05', 'Academic Guidance', 'Clear guidance for students and parents around learning and progress.'],
  ['06', 'Continuous Improvement', 'A growing coaching community focused on doing better every month.']
];

const testimonials = [
  {
    quote: 'A clear and comfortable learning environment can make a real difference for students.',
    name: 'Student Community',
    role: 'EZEE VISION CHAMPUA'
  },
  {
    quote: 'Regular practice and guidance help students stay consistent with their studies.',
    name: 'Parent Community',
    role: 'EZEE VISION CHAMPUA'
  },
  {
    quote: 'The focus is on helping students understand concepts and build confidence step by step.',
    name: 'Learning Approach',
    role: 'EZEE VISION CHAMPUA'
  }
];

const DEFAULT_UPDATES = [
  { label: 'Admissions', title: 'Enquiry open for Classes 4–12', text: 'Contact the team for batch timing and admission information.' },
  { label: 'Academics', title: 'Regular practice and revision', text: 'Structured support to keep learning consistent throughout the session.' },
  { label: 'Community', title: 'Growing student community', text: 'Nearly 150 students have joined the EZEE VISION CHAMPUA journey in the first five months.' }
];

const DEFAULT_GALLERY = [
  { category: 'Classroom', title: 'Focused learning in action', caption: 'Real classroom moments will appear here as they are added from the Admin Gallery Manager.', variant: 'large' },
  { category: 'Activities', title: 'Learning beyond the notebook', caption: 'Add activity photos to make the coaching journey more visible.', variant: 'warm' },
  { category: 'Community', title: 'Students • Teachers • Growth', caption: 'Share authentic moments from the EZEE VISION community.', variant: 'dark' },
  { category: 'Achievements', title: 'Celebrate every milestone', caption: 'Verified achievements and special moments can be highlighted here.', variant: 'tall' }
];

const DEFAULT_CONTACT_NUMBERS = [
  '+91 89172 25693',
  '+91 77499 16815',
  '+91 91244 78453'
];

function normalizeContactNumbers(value, fallback = DEFAULT_CONTACT_NUMBERS) {
  const list = Array.isArray(value)
    ? value
    : String(value || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
  const cleaned = list.map((item) => String(item).trim()).filter(Boolean).slice(0, 3);
  return cleaned.length ? cleaned : fallback.slice();
}

function withNormalizedContacts(current, incoming = {}) {
  const merged = { ...current, ...incoming };
  const useSavedNumbers = incoming.contactNumbersVersion === 1;
  const phoneNumbers = normalizeContactNumbers(
    useSavedNumbers ? incoming.contactPhones : DEFAULT_CONTACT_NUMBERS
  );
  const whatsappNumbers = normalizeContactNumbers(
    useSavedNumbers ? incoming.whatsappNumbers : DEFAULT_CONTACT_NUMBERS
  );
  return {
    ...merged,
    contactPhones: phoneNumbers,
    whatsappNumbers,
    phone: phoneNumbers[0],
    whatsapp: whatsappNumbers[0].replace(/\D/g, '')
  };
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [profile, setProfile] = useState({
    brandName: 'EZEE VISION CHAMPUA', shortName: 'EZEE VISION', locationLabel: 'CHAMPUA',
    tagline: 'Quality Education. Personal Attention. Better Learning.',
    heroTitleLine1: 'Learn better.', heroTitleLine2: 'Grow stronger.',
    heroText: 'A focused learning environment built around concept clarity, regular practice and personal attention.',
    studentCount: '150', journeyMonths: '5', classRange: '4–12',
    classSupportText: 'Coaching for Classes 4–12',
    aboutTitle: 'A growing coaching community with a clear purpose.',
    aboutParagraph1: 'EZEE VISION CHAMPUA was started with a simple idea: create a focused, student-centred learning environment where students can understand concepts, practise regularly and move forward with confidence.',
    aboutParagraph2: 'In its first five months, the coaching community has grown to nearly 150 students. The next chapter is about building the same consistency at a larger scale — without losing the personal attention that makes learning meaningful.',
    phone: '+91 89172 25693', whatsapp: '918917225693', contactNumbersVersion: 1, contactPhones: DEFAULT_CONTACT_NUMBERS, whatsappNumbers: DEFAULT_CONTACT_NUMBERS, email: '', address: 'Champua, Odisha', mapUrl: '',
    facebook: '', instagram: '', youtube: '', telegram: '', footerTagline: 'Quality Education. Personal Attention. Better Learning.'
  });
  const [publishedUpdates, setPublishedUpdates] = useState(DEFAULT_UPDATES);
  const [publishedGallery, setPublishedGallery] = useState(DEFAULT_GALLERY);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPaused, setGalleryPaused] = useState(false);
  const [publishedFaculty, setPublishedFaculty] = useState([]);
  const [publishedClasses, setPublishedClasses] = useState(classGroups);
  const [publishedResults, setPublishedResults] = useState([]);
  const [publishedTestimonials, setPublishedTestimonials] = useState(testimonials);
  const [enquiryForm, setEnquiryForm] = useState({ studentName: '', parentName: '', className: '', phone: '', message: '', website: '' });
  const [enquiryState, setEnquiryState] = useState({ busy: false, type: '', text: '' });

  useEffect(() => {
    setGalleryIndex(0);
  }, [publishedGallery.length]);

  useEffect(() => {
    if (galleryPaused || publishedGallery.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setGalleryIndex((current) => (current + 1) % publishedGallery.length);
    }, 4500);

    return () => window.clearInterval(timer);
  }, [galleryPaused, publishedGallery.length]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let mounted = true;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const captureInstallPrompt = (event) => {
      event.preventDefault();
      if (mounted) setInstallPrompt(event);
    };

    const handleInstalled = () => {
      if (mounted) setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', captureInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      mounted = false;
      window.removeEventListener('beforeinstallprompt', captureInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = enquiryModalOpen ? 'hidden' : previous;
    return () => {
      document.body.style.overflow = previous;
    };
  }, [enquiryModalOpen]);

  useEffect(() => {
    if (!enquiryModalOpen || typeof window === 'undefined') return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setEnquiryModalOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enquiryModalOpen]);

  useEffect(() => {
    if (!firebaseConfigured || !db) return;

    Promise.all([
      getDoc(doc(db, 'siteContent', 'profile')).then((snapshot) => {
        if (snapshot.exists()) {
          setProfile((current) => withNormalizedContacts(current, snapshot.data()));
        } else {
          setProfile((current) => withNormalizedContacts(current));
        }
      }).catch(() => {
        setProfile((current) => withNormalizedContacts(current));
      }),
      getDocs(collection(db, 'updates')).then((snapshot) => {
        const liveUpdates = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => item.published === true)
          .sort((a, b) => {
            if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
            return String(b.publishDate || '').localeCompare(String(a.publishDate || ''));
          })
          .slice(0, 6)
          .map((item) => ({
            label: item.category || 'Update',
            title: item.title || 'EZEE VISION Update',
            text: item.content || '',
            id: item.id
          }));

        setPublishedUpdates(liveUpdates);
      }).catch(() => {}),
      getDocs(collection(db, 'classes')).then((snapshot) => {
        const liveClasses = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => item.published === true)
          .sort((a, b) => {
            if (a.featured !== b.featured) return a.featured ? -1 : 1;
            const orderA = Number(a.sortOrder ?? 9999);
            const orderB = Number(b.sortOrder ?? 9999);
            if (orderA !== orderB) return orderA - orderB;
            return String(a.title || '').localeCompare(String(b.title || ''));
          });

        if (liveClasses.length) {
          setPublishedClasses(liveClasses.map((item) => ({
            id: item.id,
            tag: item.tag || 'Classes',
            title: item.title || item.className || 'Class & Course',
            text: item.description || '',
            subjects: item.subjects || '',
            courseInfo: item.courseInfo || ''
          })));
        }
      }).catch(() => {}),
      getDocs(collection(db, 'faculty')).then((snapshot) => {
        const liveFaculty = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => item.published === true)
          .sort((a, b) => {
            if (a.featured !== b.featured) return a.featured ? -1 : 1;
            const orderA = Number(a.sortOrder ?? 9999);
            const orderB = Number(b.sortOrder ?? 9999);
            if (orderA !== orderB) return orderA - orderB;
            return String(a.name || '').localeCompare(String(b.name || ''));
          });

        setPublishedFaculty(liveFaculty);
      }).catch(() => {})
,
      getDocs(collection(db, 'results')).then((snapshot) => {
        const liveResults = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => item.published === true)
          .sort((a, b) => {
            if (a.featured !== b.featured) return a.featured ? -1 : 1;
            const orderA = Number(a.sortOrder ?? 9999);
            const orderB = Number(b.sortOrder ?? 9999);
            if (orderA !== orderB) return orderA - orderB;
            return String(b.year || '').localeCompare(String(a.year || ''));
          })
          .slice(0, 12);

        setPublishedResults(liveResults);
      }).catch(() => {})
,
      getDocs(collection(db, 'testimonials')).then((snapshot) => {
        const liveTestimonials = snapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .filter((item) => item.published === true && item.quote)
          .sort((a, b) => {
            if (a.featured !== b.featured) return a.featured ? -1 : 1;
            const orderA = Number(a.sortOrder ?? 9999);
            const orderB = Number(b.sortOrder ?? 9999);
            if (orderA !== orderB) return orderA - orderB;
            return String(a.name || '').localeCompare(String(b.name || ''));
          })
          .slice(0, 9);

        if (liveTestimonials.length) {
          setPublishedTestimonials(liveTestimonials);
        }
      }).catch(() => {})
    ]);
  }, []);

  useEffect(() => {
    if (!firebaseConfigured || !db) return undefined;

    const galleryQuery = query(collection(db, 'gallery'), where('published', '==', true));
    const unsubscribe = onSnapshot(galleryQuery, (snapshot) => {
      const liveGallery = snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }))
        .filter((item) => item.imageUrl)
        .sort((a, b) => {
          if (a.featured !== b.featured) return a.featured ? -1 : 1;
          const orderA = Number(a.sortOrder ?? 9999);
          const orderB = Number(b.sortOrder ?? 9999);
          if (orderA !== orderB) return orderA - orderB;
          return String(b.createdAt?.seconds || '').localeCompare(String(a.createdAt?.seconds || ''));
        })
        .map((item) => ({
          id: item.id,
          category: item.category || 'Gallery',
          title: item.title || 'EZEE VISION CHAMPUA',
          caption: item.caption || '',
          imageUrl: item.imageUrl
        }));

      setPublishedGallery(liveGallery);
    }, () => {});

    return () => unsubscribe();
  }, []);

  const goTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAdmission = () => {
    setMenuOpen(false);
    setEnquiryModalOpen(true);
  };

  const handleInstallApp = async () => {
    if (installPrompt) {
      try {
        installPrompt.prompt();
        await installPrompt.userChoice;
      } catch (error) {
        console.warn('Install prompt failed:', error);
      } finally {
        setInstallPrompt(null);
      }
      return;
    }

    if (typeof window !== 'undefined') {
      window.alert('App install is not available from this browser right now. Open your browser menu and choose “Add to Home screen” or “Install app”.');
    }
  };

  const schemaNumbers = profile.contactPhones || [profile.phone];
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: profile.brandName || 'EZEE VISION CHAMPUA',
    description: profile.tagline || 'Quality Education. Personal Attention. Better Learning.',
    address: { '@type': 'PostalAddress', addressLocality: 'Champua', addressRegion: 'Odisha', addressCountry: 'IN' },
    telephone: schemaNumbers
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }} />
      <style>{`
        html, body { touch-action: manipulation; }
        body, body * { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
        input, textarea, select, [contenteditable="true"] { user-select: text; -webkit-user-select: text; -webkit-touch-callout: default; }
        .ev-site-chrome,
        .ev-site-chrome * {
          -webkit-tap-highlight-color: transparent;
        }
        .ev-topbar {
          position: relative;
          z-index: 40;
          background: linear-gradient(135deg, #073b8f 0%, #0b4cae 52%, #0a3b86 100%);
          color: #fff;
          box-shadow: 0 10px 30px rgba(3, 27, 73, .16);
        }
        .ev-topbar-inner {
          max-width: 1240px;
          margin: 0 auto;
          min-height: 68px;
          padding: 10px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }
        .ev-phone-list {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 10px 18px;
          min-width: 0;
        }
        .ev-phone-link {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #fff;
          text-decoration: none;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: .01em;
          white-space: nowrap;
          transition: opacity .18s ease, transform .18s ease;
        }
        .ev-phone-link::before {
          content: '☎';
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          color: #ffd54a;
          background: rgba(255,255,255,.08);
          font-size: 13px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.16);
        }
        .ev-phone-link:hover { opacity: .86; }
        .ev-phone-link:active { transform: translateY(1px); opacity: .72; }
        .ev-download-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-width: 174px;
          min-height: 46px;
          padding: 0 19px;
          border: 1px solid rgba(255,255,255,.20);
          border-radius: 13px;
          background: linear-gradient(145deg, #18a90f 0%, #07870c 100%);
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: .02em;
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(2, 66, 2, .24), inset 0 1px 0 rgba(255,255,255,.22), inset 0 -3px 0 rgba(0,0,0,.10);
          transition: transform .16s ease, box-shadow .16s ease, opacity .16s ease;
        }
        .ev-download-btn .ev-download-icon { font-size: 18px; line-height: 1; }
        .ev-download-btn:active { transform: translateY(2px) scale(.99); opacity: .82; box-shadow: 0 4px 10px rgba(2,66,2,.20), inset 0 1px 0 rgba(255,255,255,.16); }
        .ev-main-header {
          position: sticky;
          top: 0;
          z-index: 35;
          background: rgba(255,255,255,.97);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(8, 43, 91, .08);
          box-shadow: 0 10px 30px rgba(13, 41, 83, .08);
        }
        .ev-main-header-inner {
          max-width: 1240px;
          margin: 0 auto;
          min-height: 84px;
          padding: 12px 22px;
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .ev-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
          flex: 1 1 auto;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }
        .ev-brand-mark {
          position: relative;
          flex: 0 0 auto;
          width: 58px;
          height: 58px;
          display: grid;
          place-items: center;
          border-radius: 17px;
          background: linear-gradient(145deg, #0c55bb 0%, #093c8d 58%, #062e70 100%);
          color: #fff;
          font-size: 20px;
          font-weight: 950;
          letter-spacing: -.07em;
          box-shadow: 0 10px 22px rgba(6, 58, 142, .22), inset 0 2px 0 rgba(255,255,255,.25), inset 0 -4px 0 rgba(0,0,0,.12);
        }
        .ev-brand-mark::after {
          content: '';
          position: absolute;
          width: 10px;
          height: 10px;
          right: 7px;
          top: 7px;
          border-radius: 50%;
          background: #ffd447;
          box-shadow: 0 2px 6px rgba(0,0,0,.18);
        }
        .ev-brand-copy { min-width: 0; }
        .ev-brand-copy strong {
          display: block;
          color: #081a39;
          font-size: clamp(20px, 2.4vw, 28px);
          line-height: 1;
          letter-spacing: -.055em;
          text-transform: uppercase;
        }
        .ev-brand-copy small {
          display: block;
          margin-top: 5px;
          color: #52709d;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .22em;
          text-transform: uppercase;
        }
        .ev-register-btn {
          flex: 0 0 auto;
          min-height: 48px;
          padding: 0 25px;
          border: 1px solid rgba(0, 111, 0, .13);
          border-radius: 999px;
          background: linear-gradient(145deg, #15b31a 0%, #079c0e 52%, #07860b 100%);
          color: #fff;
          font-size: 13px;
          font-weight: 950;
          letter-spacing: .13em;
          text-transform: uppercase;
          box-shadow: 0 10px 20px rgba(7, 133, 13, .19), inset 0 2px 0 rgba(255,255,255,.20), inset 0 -3px 0 rgba(0,0,0,.10);
          cursor: pointer;
          transition: transform .16s ease, opacity .16s ease;
        }
        .ev-register-btn:active { transform: translateY(2px) scale(.99); opacity: .78; }
        .ev-menu-btn {
          flex: 0 0 auto;
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          gap: 5px;
          padding: 13px;
          border: 0;
          border-radius: 14px;
          background: rgba(7, 44, 93, .045);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.8), 0 6px 18px rgba(20, 55, 93, .08);
          cursor: pointer;
          transition: transform .16s ease, background .16s ease, opacity .16s ease;
        }
        .ev-menu-btn span {
          display: block;
          width: 25px;
          height: 3px;
          border-radius: 99px;
          background: #0a1630;
        }
        .ev-menu-btn:active { transform: scale(.96); opacity: .72; background: rgba(7,44,93,.08); }
        .ev-menu {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 22px 14px;
        }
        .ev-menu-panel {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 8px;
          padding: 10px;
          border: 1px solid rgba(9, 50, 104, .09);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 18px 34px rgba(10, 38, 79, .10);
        }
        .ev-menu-panel button {
          min-height: 44px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: #0c2247;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: background .16s ease, transform .16s ease, opacity .16s ease;
        }
        .ev-menu-panel button:hover { background: #eef5ff; }
        .ev-menu-panel button:active { transform: translateY(1px); opacity: .70; }
        @media (max-width: 900px) {
          .ev-topbar-inner, .ev-main-header-inner { padding-left: 16px; padding-right: 16px; }
          .ev-menu-panel { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .ev-download-btn { min-width: 148px; }
        }
        @media (max-width: 660px) {
          .ev-topbar-inner { min-height: 74px; align-items: stretch; }
          .ev-phone-list { gap: 6px 12px; align-content: center; }
          .ev-phone-link { font-size: 11px; }
          .ev-phone-link::before { width: 20px; height: 20px; font-size: 10px; }
          .ev-download-btn { min-width: 126px; min-height: 44px; padding: 0 12px; font-size: 11px; border-radius: 12px; }
          .ev-download-btn .ev-download-icon { font-size: 15px; }
          .ev-main-header-inner { min-height: 72px; gap: 9px; }
          .ev-brand-mark { width: 46px; height: 46px; border-radius: 14px; font-size: 16px; }
          .ev-brand-copy strong { font-size: 16px; }
          .ev-brand-copy small { font-size: 8px; margin-top: 4px; letter-spacing: .18em; }
          .ev-register-btn { min-height: 42px; padding: 0 14px; font-size: 10px; letter-spacing: .10em; }
          .ev-menu-btn { width: 44px; height: 44px; padding: 10px; border-radius: 12px; }
          .ev-menu-panel { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 430px) {
          .ev-topbar-inner { padding: 8px 11px; gap: 9px; }
          .ev-phone-list { max-width: calc(100% - 126px); }
          .ev-phone-link { font-size: 9px; gap: 4px; }
          .ev-phone-link:nth-child(3) { width: 100%; }
          .ev-download-btn { min-width: 116px; padding: 0 9px; font-size: 10px; }
          .ev-main-header-inner { padding: 9px 11px; }
          .ev-brand-copy small { letter-spacing: .12em; }
          .ev-register-btn { padding: 0 10px; font-size: 9px; }
        }
      `}</style>

      <style>{`
        .ev-enquiry-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 18px;
          background: rgba(3, 16, 36, .64);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }
        .ev-enquiry-modal {
          width: min(680px, 100%);
          max-height: min(88vh, 820px);
          overflow: auto;
          border: 1px solid rgba(12, 66, 130, .14);
          border-radius: 26px;
          background: #fff;
          box-shadow: 0 35px 90px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.8);
          padding: 24px;
        }
        .ev-enquiry-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 18px;
        }
        .ev-enquiry-modal-kicker {
          margin-bottom: 8px;
          color: #0b5cbb;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .19em;
        }
        .ev-enquiry-modal h2 {
          margin: 0;
          color: #0a1c3d;
          font-size: clamp(27px, 4vw, 38px);
          line-height: 1.04;
          letter-spacing: -.045em;
        }
        .ev-enquiry-modal-head p {
          margin: 9px 0 0;
          max-width: 520px;
          color: #63748f;
          font-size: 13px;
          line-height: 1.55;
        }
        .ev-enquiry-close {
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border: 1px solid rgba(9, 48, 98, .10);
          border-radius: 12px;
          background: #f7faff;
          color: #162d53;
          font-size: 28px;
          line-height: 1;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .ev-enquiry-close:active { transform: scale(.96); opacity: .70; }
        .ev-enquiry-form { margin: 0; }
        .ev-enquiry-form input,
        .ev-enquiry-form textarea,
        .ev-enquiry-form select { user-select: text; -webkit-user-select: text; }
        @media (max-width: 560px) {
          .ev-enquiry-overlay { padding: 10px; align-items: end; }
          .ev-enquiry-modal { max-height: 92vh; border-radius: 22px 22px 0 0; padding: 18px; }
          .ev-enquiry-modal-head { margin-bottom: 13px; }
        }
      `}</style>

      <div className="ev-site-chrome">
        <div className="ev-topbar">
          <div className="ev-topbar-inner">
            <div className="ev-phone-list" aria-label="EZEE VISION CHAMPUA contact numbers">
              {(profile.contactPhones || DEFAULT_CONTACT_NUMBERS).map((number, index) => (
                <a
                  key={`${number}-${index}`}
                  className="ev-phone-link"
                  href={`tel:${String(number).replace(/[^0-9+]/g, '')}`}
                  aria-label={`Call EZEE VISION CHAMPUA ${number}`}
                >
                  {number}
                </a>
              ))}
            </div>
            <button className="ev-download-btn" type="button" onClick={handleInstallApp}>
              <span className="ev-download-icon">⬇</span>
              <span>Download App</span>
            </button>
          </div>
        </div>

        <header className="ev-main-header">
          <div className="ev-main-header-inner">
            <button className="ev-brand" onClick={() => goTo('home')} aria-label="Go to EZEE VISION CHAMPUA home">
              <span className="ev-brand-mark">EV</span>
              <span className="ev-brand-copy">
                <strong>EZEE VISION CHAMPUA</strong>
                <small>{profile.tagline || 'Quality Education · Personal Attention'}</small>
              </span>
            </button>

            <button className="ev-register-btn" onClick={openAdmission} type="button">
              Register Now
            </button>

            <button className="ev-menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle navigation menu" aria-expanded={menuOpen} type="button">
              <span></span><span></span><span></span>
            </button>
          </div>
          {menuOpen ? (
            <div className="ev-menu">
              <nav className="ev-menu-panel" aria-label="Primary navigation">
                {[
                  ['home', 'Home'],
                  ['about', 'About'],
                  ['classes', 'Classes'],
                  ['faculty', 'Faculty'],
                  ['results', 'Results'],
                  ['gallery', 'Gallery'],
                  ['contact', 'Contact']
                ].map(([id, label]) => (
                  <button key={id} onClick={() => goTo(id)} type="button">{label}</button>
                ))}
              </nav>
            </div>
          ) : null}
        </header>
      </div>

      <section id="home" className="hero section-anchor">
        <div className="hero-glow glow-a"></div>
        <div className="hero-glow glow-b"></div>
        <div className="shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span className="dot"></span> {profile.classSupportText}</div>
            <h1>{profile.heroTitleLine1}<br /><span>{profile.heroTitleLine2}</span></h1>
            <p className="hero-text">
              {profile.heroText}
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={openAdmission}>Get Admission Info <span>→</span></button>
              <button className="btn btn-ghost btn-lg" onClick={() => goTo('classes')}>Explore Classes <span>↘</span></button>
            </div>
            <div className="hero-note">
              <span className="mini-people"><i>4</i><i>1</i><i>2</i></span>
              <span><b>Nearly {profile.studentCount} students</b> have joined the journey in the first {profile.journeyMonths} months.</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="EZEE VISION CHAMPUA learning visual">
            <div className="visual-card visual-main">
              <div className="visual-top">
                <span>{profile.brandName}</span>
                <span className="status-pill">LEARN • PRACTISE • GROW</span>
              </div>
              <div className="visual-content">
                <div className="board-lines">
                  <span>UNDERSTAND</span>
                  <span>PRACTISE</span>
                  <span>IMPROVE</span>
                </div>
                <div className="figure-wrap">
                  <div className="figure-head"></div>
                  <div className="figure-body"></div>
                  <div className="figure-card">{profile.classRange}</div>
                </div>
              </div>
              <div className="visual-footer"><span>Student-focused coaching</span><span>{profile.locationLabel}</span></div>
            </div>
            <div className="floating-stat stat-one"><b>{profile.studentCount}</b><span>students</span></div>
            <div className="floating-stat stat-two"><b>{profile.journeyMonths} mo.</b><span>journey</span></div>
            <div className="floating-chip">FOCUSED LEARNING</div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell trust-grid">
          <div><strong>{profile.journeyMonths} Months</strong><span>of focused growth</span></div>
          <div><strong>~{profile.studentCount}</strong><span>students joined</span></div>
          <div><strong>{profile.classRange}</strong><span>classes supported</span></div>
          <div><strong>Student-first</strong><span>learning approach</span></div>
        </div>
      </section>

      <section id="about" className="section section-anchor">
        <div className="shell two-col">
          <div>
            <div className="section-kicker">ABOUT EZEE VISION</div>
            <h2>{profile.aboutTitle}</h2>
          </div>
          <div className="section-copy">
            <p>
              {profile.aboutParagraph1}
            </p>
            <p>
              {profile.aboutParagraph2}
            </p>
          </div>
        </div>

        <div className="shell journey">
          <div className="journey-line"></div>
          <div className="journey-item"><span>01</span><b>Started</b><p>A clear vision for student-focused learning.</p></div>
          <div className="journey-item highlight"><span>02</span><b>{profile.journeyMonths} Months</b><p>Nearly {profile.studentCount} students in the growing community.</p></div>
          <div className="journey-item"><span>03</span><b>Next Chapter</b><p>More learning resources, stronger systems and wider reach.</p></div>
        </div>
      </section>

      <section id="classes" className="section section-soft section-anchor">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-kicker">CLASSES WE OFFER</div>
              <h2>Support for every stage of learning.</h2>
            </div>
            <p>From strong foundations to senior secondary preparation, learning support is structured around the student’s stage.</p>
          </div>
          <div className="class-grid">
            {publishedClasses.map((item) => (
              <article className="class-card" key={item.id || item.title}>
                <div className="class-top"><span>{item.tag}</span><span>↗</span></div>
                <div className="class-number">{String(item.title || '').replace(/^Classes?\s*/i, '').split(' ')[0] || '—'}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="class-subjects">{item.subjects}</div>
                {item.courseInfo ? <div className="class-course-info">{item.courseInfo}</div> : null}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head compact">
            <div>
              <div className="section-kicker">WHY EZEE VISION</div>
              <h2>Built around better learning habits.</h2>
            </div>
          </div>
          <div className="reason-grid">
            {reasons.map(([no, title, text]) => (
              <article className="reason-card" key={no}>
                <div className="reason-no">{no}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="faculty" className="section section-dark section-anchor">
        <div className="shell">
          <div className="section-head dark-head">
            <div>
              <div className="section-kicker light">MEET OUR EDUCATORS</div>
              <h2>Teachers who guide the EZEE VISION journey.</h2>
            </div>
            <p>Faculty profiles published from the Admin Faculty Manager appear here automatically.</p>
          </div>

          <style>{`
            .faculty-public-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 20px;
            }
            .faculty-public-card {
              overflow: hidden;
              border: 1px solid rgba(255,255,255,.10);
              border-radius: 28px;
              background: rgba(255,255,255,.06);
              box-shadow: 0 22px 55px rgba(0,0,0,.14);
            }
            .faculty-public-photo {
              width: 100%;
              aspect-ratio: 4 / 3;
              background: rgba(255,255,255,.07);
              overflow: hidden;
              display: grid;
              place-items: center;
            }
            .faculty-public-photo img {
              width: 100%;
              height: 100%;
              display: block;
              object-fit: cover;
            }
            .faculty-public-photo .faculty-fallback {
              width: 92px;
              height: 92px;
              display: grid;
              place-items: center;
              border-radius: 28px;
              background: rgba(255,255,255,.10);
              color: #fff;
              font-size: 30px;
              font-weight: 800;
              letter-spacing: -.04em;
            }
            .faculty-public-copy {
              padding: 22px;
            }
            .faculty-public-role {
              margin-bottom: 8px;
              color: #79b1ff;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: .18em;
              text-transform: uppercase;
            }
            .faculty-public-name {
              margin: 0;
              color: #fff;
              font-size: clamp(22px, 3vw, 30px);
              line-height: 1.08;
              letter-spacing: -.03em;
            }
            .faculty-public-meta {
              display: grid;
              gap: 8px;
              margin-top: 14px;
              color: rgba(255,255,255,.72);
              font-size: 13px;
              line-height: 1.5;
            }
            .faculty-public-bio {
              margin: 15px 0 0;
              color: rgba(255,255,255,.78);
              font-size: 14px;
              line-height: 1.65;
            }
            .faculty-empty-public {
              padding: 28px;
              border: 1px dashed rgba(255,255,255,.16);
              border-radius: 24px;
              color: rgba(255,255,255,.72);
              background: rgba(255,255,255,.04);
            }
            @media (max-width: 960px) {
              .faculty-public-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            @media (max-width: 640px) {
              .faculty-public-grid { grid-template-columns: 1fr; }
            }
          `}</style>

          {publishedFaculty.length > 0 ? (
            <div className="faculty-public-grid">
              {publishedFaculty.map((item) => {
                const initials = String(item.name || 'EV')
                  .split(/\s+/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')
                  .toUpperCase();

                return (
                  <article className="faculty-public-card" key={item.id}>
                    <div className="faculty-public-photo">
                      {item.imageUrl ? (
                        <img src={String(item.imageUrl).replace(/\"/g, '')} alt={item.name || 'EZEE VISION educator'} loading="lazy" />
                      ) : (
                        <div className="faculty-fallback">{initials || 'EV'}</div>
                      )}
                    </div>
                    <div className="faculty-public-copy">
                      <div className="faculty-public-role">{item.role || 'Educator'}</div>
                      <h3 className="faculty-public-name">{item.name || 'EZEE VISION Educator'}</h3>
                      <div className="faculty-public-meta">
                        {item.qualification ? <span><b>Qualification:</b> {item.qualification}</span> : null}
                        {item.subjects ? <span><b>Subjects:</b> {item.subjects}</span> : null}
                        {item.experience ? <span><b>Experience:</b> {item.experience}</span> : null}
                      </div>
                      {item.bio ? <p className="faculty-public-bio">{item.bio}</p> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="faculty-public-grid">
              <article className="faculty-public-card">
                <div className="faculty-public-photo"><div className="faculty-fallback">SS</div></div>
                <div className="faculty-public-copy">
                  <div className="faculty-public-role">Founder • Educator</div>
                  <h3 className="faculty-public-name">Sayeedur Rahman (Shahid)</h3>
                  <div className="faculty-public-meta"><span><b>Role:</b> Teacher • Content Creator • Educator</span></div>
                  <p className="faculty-public-bio">Teaching with clarity, structure and a human touch. Add more faculty profiles from the Admin Faculty Manager.</p>
                </div>
              </article>
            </div>
          )}
        </div>
      </section>

      <section id="results" className="section section-anchor">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-kicker">RESULTS & ACHIEVEMENTS</div>
              <h2>Progress worth celebrating.</h2>
            </div>
            <p>Verified academic milestones and achievement highlights published from the secure Admin Results Manager.</p>
          </div>

          <style>{`
            .results-live-grid {
              display: grid;
              grid-template-columns: repeat(3, minmax(0, 1fr));
              gap: 18px;
            }
            .result-live-card {
              position: relative;
              overflow: hidden;
              min-height: 230px;
              padding: 24px;
              border: 1px solid rgba(15,18,41,.08);
              border-radius: 28px;
              background: linear-gradient(145deg, #ffffff 0%, #f7f9ff 100%);
              box-shadow: 0 18px 50px rgba(15,18,41,.08);
            }
            .result-live-card.featured {
              border-color: rgba(33,105,210,.24);
            }
            .result-live-card::after {
              content: '';
              position: absolute;
              width: 130px;
              height: 130px;
              right: -48px;
              top: -48px;
              border-radius: 50%;
              background: rgba(33,105,210,.08);
            }
            .result-live-top {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              align-items: center;
              margin-bottom: 22px;
            }
            .result-live-tag {
              color: #2169d2;
              font-size: 10px;
              font-weight: 800;
              letter-spacing: .16em;
              text-transform: uppercase;
            }
            .result-live-year {
              padding: 7px 10px;
              border-radius: 999px;
              background: #eef4ff;
              color: #1c4f9e;
              font-size: 11px;
              font-weight: 800;
            }
            .result-live-score {
              font-size: clamp(40px, 6vw, 58px);
              line-height: .95;
              font-weight: 900;
              letter-spacing: -.06em;
              color: #0f1229;
            }
            .result-live-score small {
              margin-left: 5px;
              font-size: 18px;
              letter-spacing: -.02em;
              color: #627088;
            }
            .result-live-title {
              margin: 16px 0 4px;
              font-size: 21px;
              line-height: 1.15;
              letter-spacing: -.03em;
              color: #10182d;
            }
            .result-live-student {
              color: #4f5d72;
              font-size: 13px;
              font-weight: 700;
            }
            .result-live-meta {
              display: flex;
              flex-wrap: wrap;
              gap: 7px;
              margin-top: 16px;
            }
            .result-live-meta span {
              padding: 7px 10px;
              border-radius: 10px;
              background: rgba(15,18,41,.05);
              color: #55627a;
              font-size: 11px;
              font-weight: 700;
            }
            .result-live-desc {
              margin: 16px 0 0;
              color: #6c788c;
              font-size: 13px;
              line-height: 1.55;
            }
            .results-empty-public {
              padding: 28px;
              border: 1px dashed rgba(15,18,41,.16);
              border-radius: 24px;
              background: #fbfcff;
              color: #68758a;
            }
            @media (max-width: 920px) {
              .results-live-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            }
            @media (max-width: 640px) {
              .results-live-grid { grid-template-columns: 1fr; }
            }
          `}</style>

          {publishedResults.length > 0 ? (
            <div className="results-live-grid">
              {publishedResults.map((item) => (
                <article className={`result-live-card ${item.featured ? 'featured' : ''}`} key={item.id}>
                  <div className="result-live-top">
                    <span className="result-live-tag">{item.category || 'Achievement'}</span>
                    {item.year ? <span className="result-live-year">{item.year}</span> : null}
                  </div>
                  <div className="result-live-score">
                    {item.score || item.rank || item.badge || '✓'}
                    {item.score ? <small>{item.scoreUnit || '%'}</small> : null}
                  </div>
                  <h3 className="result-live-title">{item.title || 'Academic Achievement'}</h3>
                  {item.displayName ? <div className="result-live-student">{item.displayName}</div> : null}
                  <div className="result-live-meta">
                    {item.className ? <span>{item.className}</span> : null}
                    {item.exam ? <span>{item.exam}</span> : null}
                    {item.subject ? <span>{item.subject}</span> : null}
                  </div>
                  {item.description ? <p className="result-live-desc">{item.description}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="results-empty-public">
              Academic result highlights and verified achievements will appear here as they are published from the Admin Results Manager.
            </div>
          )}
        </div>
      </section>

      <section className="section section-soft">
        <div className="shell">
          <div className="section-head compact">
            <div>
              <div className="section-kicker">STUDENT & PARENT VOICE</div>
              <h2>What the learning experience should feel like.</h2>
            </div>
          </div>
          <div className="testimonial-grid">
            {publishedTestimonials.map((item) => (
              <article className="testimonial-card" key={item.name}>
                <div className="quote-mark">“</div>
                <p>{item.quote}</p>
                <div className="testimonial-by"><b>{item.name}</b><span>{item.role}</span></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="section section-anchor gallery-section">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-kicker">GALLERY</div>
              <h2>A glimpse of the EZEE VISION journey.</h2>
            </div>
            <p>Real classroom moments, activities and achievements can be published here through the Admin Gallery Manager.</p>
          </div>

          <style>{`
            .gallery-section {
              scroll-margin-top: 112px;
            }
            .gallery-slider {
              position: relative;
              overflow: hidden;
              border: 1px solid rgba(11, 36, 75, .10);
              border-radius: 30px;
              background: #fff;
              box-shadow: 0 22px 55px rgba(12, 38, 76, .09);
            }
            .gallery-viewport {
              position: relative;
              overflow: hidden;
            }
            .gallery-track {
              display: flex;
              transform: translate3d(calc(var(--gallery-index) * -100%), 0, 0);
              transition: transform .65s cubic-bezier(.22, .61, .36, 1);
              will-change: transform;
            }
            .gallery-slide {
              flex: 0 0 100%;
              min-width: 100%;
              background: #fff;
            }
            .gallery-slide-image {
              width: 100%;
              aspect-ratio: 16 / 9;
              overflow: hidden;
              display: grid;
              place-items: center;
              background: #eef3fa;
            }
            .gallery-slide-image img {
              display: block;
              width: 100%;
              height: 100%;
              object-fit: contain;
              object-position: center;
              user-select: none;
            }
            .gallery-slide-copy {
              padding: 22px 24px 26px;
            }
            .gallery-slide-category {
              margin-bottom: 7px;
              color: #2767c9;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: .18em;
              text-transform: uppercase;
            }
            .gallery-slide-title {
              margin: 0;
              color: #0b1b35;
              font-size: clamp(24px, 4vw, 38px);
              line-height: 1.08;
              letter-spacing: -.035em;
            }
            .gallery-slide-caption {
              margin: 12px 0 0;
              max-width: 780px;
              color: #64748b;
              font-size: 15px;
              line-height: 1.65;
            }
            .gallery-slider-controls {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 14px;
              padding: 14px 18px 18px;
              border-top: 1px solid rgba(11, 36, 75, .07);
              background: #fff;
            }
            .gallery-arrow {
              width: 42px;
              height: 42px;
              display: grid;
              place-items: center;
              flex: 0 0 auto;
              border: 1px solid rgba(11, 36, 75, .12);
              border-radius: 50%;
              background: #fff;
              color: #0b1b35;
              font-size: 20px;
              cursor: pointer;
              -webkit-tap-highlight-color: transparent;
            }
            .gallery-arrow:active {
              transform: scale(.97);
            }
            .gallery-dots {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 7px;
              flex: 1;
              min-width: 0;
            }
            .gallery-dot {
              width: 7px;
              height: 7px;
              padding: 0;
              border: 0;
              border-radius: 50%;
              background: #cbd5e1;
              cursor: pointer;
              -webkit-tap-highlight-color: transparent;
            }
            .gallery-dot.active {
              width: 24px;
              border-radius: 999px;
              background: #1769d2;
            }
            .gallery-slide-counter {
              min-width: 48px;
              color: #64748b;
              font-size: 12px;
              font-weight: 800;
              text-align: right;
              letter-spacing: .08em;
            }
  
          .form-note-success { color: #147746; background: #ecfbf3; border: 1px solid #c9efda; padding: 10px 12px; border-radius: 12px; }
          .form-note-error { color: #ad3c2b; background: #fff2ef; border: 1px solid #ffd0c5; padding: 10px 12px; border-radius: 12px; }
          .enquiry-form button:disabled { opacity: .65; cursor: wait; }
          .gallery-placeholder {
              padding: 48px 24px;
              border: 1px dashed rgba(11, 36, 75, .16);
              border-radius: 28px;
              background: #fff;
              color: #64748b;
              text-align: center;
            }
            .gallery-placeholder strong {
              display: block;
              margin-bottom: 7px;
              color: #0b1b35;
              font-size: 22px;
            }
            @media (max-width: 720px) {
              .gallery-section {
                scroll-margin-top: 98px;
              }
              .gallery-slider {
                border-radius: 24px;
              }
              .gallery-slide-image {
                aspect-ratio: 16 / 9;
              }
              .gallery-slide-copy {
                padding: 18px 18px 20px;
              }
              .gallery-slide-title {
                font-size: 28px;
              }
              .gallery-slide-caption {
                font-size: 14px;
              }
              .gallery-slider-controls {
                padding: 12px 14px 14px;
                gap: 8px;
              }
              .gallery-arrow {
                width: 40px;
                height: 40px;
              }
            }
          `}</style>

          {publishedGallery.length > 0 ? (
            <div
              className="gallery-slider"
              onMouseEnter={() => setGalleryPaused(true)}
              onMouseLeave={() => setGalleryPaused(false)}
              onFocus={() => setGalleryPaused(true)}
              onBlur={() => setGalleryPaused(false)}
              onTouchStart={() => setGalleryPaused(true)}
              onTouchEnd={() => {
                window.setTimeout(() => setGalleryPaused(false), 1200);
              }}
              aria-label="EZEE VISION CHAMPUA photo gallery"
            >
              <div className="gallery-viewport">
                <div
                  className="gallery-track"
                  style={{ '--gallery-index': galleryIndex }}
                >
                  {publishedGallery.map((item, index) => (
                    <article className="gallery-slide" key={item.id || `${item.title}-${index}`}>
                      {item.imageUrl ? (
                        <div className="gallery-slide-image">
                          <img
                            src={String(item.imageUrl).replace(/\"/g, '')}
                            alt={item.title || 'EZEE VISION CHAMPUA gallery photo'}
                            loading={index === 0 ? 'eager' : 'lazy'}
                            draggable="false"
                          />
                        </div>
                      ) : null}

                      <div className="gallery-slide-copy">
                        <div className="gallery-slide-category">{item.category || 'Gallery'}</div>
                        <h3 className="gallery-slide-title">{item.title || 'EZEE VISION CHAMPUA'}</h3>
                        <p className="gallery-slide-caption">
                          {item.caption || 'Real classroom moments from the EZEE VISION CHAMPUA journey.'}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              {publishedGallery.length > 1 && (
                <div className="gallery-slider-controls">
                  <button
                    type="button"
                    className="gallery-arrow"
                    onClick={() => setGalleryIndex((current) => (current - 1 + publishedGallery.length) % publishedGallery.length)}
                    aria-label="Previous gallery photo"
                  >
                    ←
                  </button>

                  <div className="gallery-dots" role="tablist" aria-label="Gallery photos">
                    {publishedGallery.map((item, index) => (
                      <button
                        key={item.id || index}
                        type="button"
                        className={index === galleryIndex ? 'gallery-dot active' : 'gallery-dot'}
                        onClick={() => setGalleryIndex(index)}
                        aria-label={`Show gallery photo ${index + 1}`}
                        aria-selected={index === galleryIndex}
                        role="tab"
                      />
                    ))}
                  </div>

                  <div className="gallery-slide-counter">
                    {String(galleryIndex + 1).padStart(2, '0')} / {String(publishedGallery.length).padStart(2, '0')}
                  </div>

                  <button
                    type="button"
                    className="gallery-arrow"
                    onClick={() => setGalleryIndex((current) => (current + 1) % publishedGallery.length)}
                    aria-label="Next gallery photo"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="gallery-placeholder">
              <strong>Gallery coming soon.</strong>
              New photos published from the Admin Gallery Manager will appear here automatically.
            </div>
          )}
        </div>
      </section>

      <section className="section section-dark updates-section">
        <div className="shell">
          <div className="section-head dark-head">
            <div>
              <div className="section-kicker light">LATEST UPDATES</div>
              <h2>Stay connected with EZEE VISION.</h2>
            </div>
            <p>Announcements, admission updates, academic notices and important information can live here.</p>
          </div>
          <div className="updates-grid">
            {publishedUpdates.map((item) => (
              <article className="update-card" key={item.id || item.title}>
                <span>{item.label}</span><h3>{item.title}</h3><p>{item.text}</p><button onClick={openAdmission}>Know more →</button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="admission" className="section admission section-anchor">
        <div className="shell admission-grid">
          <div>
            <div className="section-kicker">ADMISSION ENQUIRY</div>
            <h2>Let’s talk about the right learning plan.</h2>
            <p>Share a few details and the coaching team can guide you regarding classes, subjects and batch information.</p>
            <div className="quick-contact">
              {(profile.contactPhones || [profile.phone]).map((number, index) => {
                const whatsappNumber = (profile.whatsappNumbers || profile.contactPhones || [profile.whatsapp])[index] || number;
                return (
                  <Fragment key={`${number}-${index}`}>
                    <a href={`tel:${String(number).replace(/[^0-9+]/g, '')}`}><span>Call {index + 1}</span><b>{number}</b></a>
                    <a href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><span>WhatsApp {index + 1}</span><b>Chat with EZEE VISION</b></a>
                  </Fragment>
                );
              })}
            </div>
          </div>
          <form className="enquiry-form" onSubmit={async (e) => {
            e.preventDefault();
            if (enquiryState.busy) return;
            if (enquiryForm.website) return;
            const studentName = enquiryForm.studentName.trim();
            const parentName = enquiryForm.parentName.trim();
            const className = enquiryForm.className.trim();
            const phone = enquiryForm.phone.trim();
            const message = enquiryForm.message.trim();
            if (!studentName || !parentName || !className || !phone) {
              setEnquiryState({ busy: false, type: 'error', text: 'Please fill Student Name, Parent / Guardian Name, Class and Phone.' });
              return;
            }
            if (!/^[0-9+()\-\s]{10,18}$/.test(phone)) {
              setEnquiryState({ busy: false, type: 'error', text: 'Please enter a valid phone number.' });
              return;
            }
            if (!firebaseConfigured || !db) {
              setEnquiryState({ busy: false, type: 'error', text: 'Enquiry service is temporarily unavailable. Please call or WhatsApp us.' });
              return;
            }
            setEnquiryState({ busy: true, type: '', text: '' });
            try {
              await addDoc(collection(db, 'enquiries'), {
                studentName,
                parentName,
                className,
                phone,
                message,
                createdAt: serverTimestamp(),
                source: 'website',
                status: 'new'
              });
              setEnquiryForm({ studentName: '', parentName: '', className: '', phone: '', message: '', website: '' });
              setEnquiryState({ busy: false, type: 'success', text: 'Thank you. Your admission enquiry has been received. The coaching team will contact you soon.' });
            } catch (error) {
              setEnquiryState({ busy: false, type: 'error', text: error?.message || 'Unable to submit your enquiry right now. Please use Call or WhatsApp.' });
            }
          }} noValidate>
            <div className="form-title">Admission Enquiry</div>
            <label>Student Name<input value={enquiryForm.studentName} onChange={(e) => setEnquiryForm((v) => ({ ...v, studentName: e.target.value }))} placeholder="Enter student name" autoComplete="name" /></label>
            <label>Parent / Guardian Name<input value={enquiryForm.parentName} onChange={(e) => setEnquiryForm((v) => ({ ...v, parentName: e.target.value }))} placeholder="Enter parent or guardian name" autoComplete="name" /></label>
            <div className="form-row">
              <label>Class<select value={enquiryForm.className} onChange={(e) => setEnquiryForm((v) => ({ ...v, className: e.target.value }))}><option value="" disabled>Select class</option>{['4','5','6','7','8','9','10','11','12'].map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>Phone<input value={enquiryForm.phone} onChange={(e) => setEnquiryForm((v) => ({ ...v, phone: e.target.value }))} placeholder="10-digit mobile number" inputMode="tel" autoComplete="tel" /></label>
            </div>
            <label>Message<textarea value={enquiryForm.message} onChange={(e) => setEnquiryForm((v) => ({ ...v, message: e.target.value }))} placeholder="Tell us what you would like to know..."></textarea></label>
            <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
              <label>Website<input value={enquiryForm.website} onChange={(e) => setEnquiryForm((v) => ({ ...v, website: e.target.value }))} tabIndex={-1} autoComplete="off" /></label>
            </div>
            {enquiryState.text ? <div className={enquiryState.type === 'error' ? 'form-note form-note-error' : 'form-note form-note-success'} role="status">{enquiryState.text}</div> : null}
            <button className="btn btn-primary btn-lg" type="submit" disabled={enquiryState.busy}>{enquiryState.busy ? 'Submitting…' : <>Submit Enquiry <span>→</span></>}</button>
            <small className="form-note">Your details are used only to respond to this admission enquiry.</small>
          </form>
        </div>
      </section>

      <section id="contact" className="section contact-section section-anchor">
        <div className="shell contact-grid">
          <div>
            <div className="section-kicker">CONTACT</div>
            <h2>Find EZEE VISION CHAMPUA.</h2>
            <p>Call or WhatsApp on any of the listed numbers. The same numbers are available for both Call and WhatsApp.</p>
          </div>
          <div className="contact-card">
            <div><span>COACHING</span><b>{profile.brandName}</b></div>
            <div><span>LOCATION</span><b>{profile.address}</b></div>
            {(profile.contactPhones || [profile.phone]).map((number, index) => {
              const whatsappNumber = (profile.whatsappNumbers || profile.contactPhones || [profile.whatsapp])[index] || number;
              return (
                <div key={`${number}-${index}`}>
                  <span>CONTACT {index + 1}</span>
                  <div style={{ display: 'grid', gap: 5 }}>
                    <a href={`tel:${String(number).replace(/[^0-9+]/g, '')}`}><b>☎ Call — {number}</b></a>
                    <a href={`https://wa.me/${String(whatsappNumber).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><b>◉ WhatsApp — {whatsappNumber}</b></a>
                  </div>
                </div>
              );
            })}
            {profile.email ? <div><span>EMAIL</span><a href={`mailto:${profile.email}`}><b>{profile.email}</b></a></div> : null}
            <div className="map-placeholder"><span>GOOGLE MAPS</span>{profile.mapUrl ? <a href={profile.mapUrl} target="_blank" rel="noreferrer"><b>Open location map →</b></a> : <b>Map link will appear after it is added in Admin.</b>}</div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="shell footer-grid">
          <div><div className="footer-brand">{profile.shortName} <span>{profile.locationLabel}</span></div><p>{profile.footerTagline}</p></div>
          <div className="footer-links"><button onClick={() => goTo('about')}>About</button><button onClick={() => goTo('classes')}>Classes</button><button onClick={() => goTo('faculty')}>Faculty</button><button onClick={() => goTo('contact')}>Contact</button></div>
          <div className="footer-social">{(profile.contactPhones || [profile.phone]).map((number, index) => <a key={`call-${number}-${index}`} href={`tel:${String(number).replace(/[^0-9+]/g, '')}`}>Call {index + 1}</a>)}{(profile.whatsappNumbers || profile.contactPhones || [profile.whatsapp]).map((number, index) => <a key={`wa-${number}-${index}`} href={`https://wa.me/${String(number).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp {index + 1}</a>)}{profile.youtube ? <a href={profile.youtube} target="_blank" rel="noreferrer">YouTube</a> : null}{profile.instagram ? <a href={profile.instagram} target="_blank" rel="noreferrer">Instagram</a> : null}</div>
        </div>
        <div className="shell footer-bottom"><span>© 2026 {profile.brandName}. All rights reserved.</span><span>Made With ❤️ By Shahid Sir</span></div>
      </footer>

      <div className="mobile-bar">
        <a href={`tel:${String((profile.contactPhones || [profile.phone])[0] || '').replace(/[^0-9+]/g, '')}`}>☎ <span>Call</span></a>
        <a href={`https://wa.me/${String((profile.whatsappNumbers || profile.contactPhones || [profile.whatsapp])[0] || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer">◉ <span>WhatsApp</span></a>
        <button onClick={() => goTo('contact')}>⌖ <span>All Contacts</span></button>
      </div>

      {enquiryModalOpen ? (
        <div
          className="ev-enquiry-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Admission enquiry form"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEnquiryModalOpen(false);
          }}
        >
          <div className="ev-enquiry-modal">
            <div className="ev-enquiry-modal-head">
              <div>
                <div className="ev-enquiry-modal-kicker">ADMISSION ENQUIRY</div>
                <h2>Register your interest</h2>
                <p>Fill in the details and the EZEE VISION CHAMPUA team can contact you.</p>
              </div>
              <button type="button" className="ev-enquiry-close" onClick={() => setEnquiryModalOpen(false)} aria-label="Close admission enquiry">×</button>
            </div>
            <form className="enquiry-form ev-enquiry-form" onSubmit={async (e) => {
              e.preventDefault();
              if (enquiryState.busy) return;
              if (enquiryForm.website) return;
              const studentName = enquiryForm.studentName.trim();
              const parentName = enquiryForm.parentName.trim();
              const className = enquiryForm.className.trim();
              const phone = enquiryForm.phone.trim();
              const message = enquiryForm.message.trim();
              if (!studentName || !parentName || !className || !phone) {
                setEnquiryState({ busy: false, type: 'error', text: 'Please fill Student Name, Parent / Guardian Name, Class and Phone.' });
                return;
              }
              if (!/^[0-9+()\-\s]{10,18}$/.test(phone)) {
                setEnquiryState({ busy: false, type: 'error', text: 'Please enter a valid phone number.' });
                return;
              }
              if (!firebaseConfigured || !db) {
                setEnquiryState({ busy: false, type: 'error', text: 'Enquiry service is temporarily unavailable. Please call or WhatsApp us.' });
                return;
              }
              setEnquiryState({ busy: true, type: '', text: '' });
              try {
                await addDoc(collection(db, 'enquiries'), {
                  studentName,
                  parentName,
                  className,
                  phone,
                  message,
                  createdAt: serverTimestamp(),
                  source: 'website-header',
                  status: 'new'
                });
                setEnquiryForm({ studentName: '', parentName: '', className: '', phone: '', message: '', website: '' });
                setEnquiryState({ busy: false, type: 'success', text: 'Thank you. Your admission enquiry has been received.' });
              } catch (error) {
                setEnquiryState({ busy: false, type: 'error', text: error?.message || 'Unable to submit your enquiry right now. Please use Call or WhatsApp.' });
              }
            }} noValidate>
              <label>Student Name<input value={enquiryForm.studentName} onChange={(e) => setEnquiryForm((v) => ({ ...v, studentName: e.target.value }))} placeholder="Enter student name" autoComplete="name" /></label>
              <label>Parent / Guardian Name<input value={enquiryForm.parentName} onChange={(e) => setEnquiryForm((v) => ({ ...v, parentName: e.target.value }))} placeholder="Enter parent or guardian name" autoComplete="name" /></label>
              <div className="form-row">
                <label>Class<select value={enquiryForm.className} onChange={(e) => setEnquiryForm((v) => ({ ...v, className: e.target.value }))}><option value="" disabled>Select class</option>{['4','5','6','7','8','9','10','11','12'].map((c) => <option key={c}>{c}</option>)}</select></label>
                <label>Phone<input value={enquiryForm.phone} onChange={(e) => setEnquiryForm((v) => ({ ...v, phone: e.target.value }))} placeholder="10-digit mobile number" inputMode="tel" autoComplete="tel" /></label>
              </div>
              <label>Message<textarea value={enquiryForm.message} onChange={(e) => setEnquiryForm((v) => ({ ...v, message: e.target.value }))} placeholder="Tell us what you would like to know..."></textarea></label>
              {enquiryState.text ? <div className={enquiryState.type === 'error' ? 'form-note form-note-error' : 'form-note form-note-success'} role="status">{enquiryState.text}</div> : null}
              <button className="btn btn-primary btn-lg" type="submit" disabled={enquiryState.busy}>{enquiryState.busy ? 'Submitting…' : <>Submit Enquiry <span>→</span></>}</button>
              <small className="form-note">Your details are used only to respond to this admission enquiry.</small>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
