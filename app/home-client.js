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
          box-sizing: border-box;
        }
        .ev-topbar {
          position: relative;
          z-index: 40;
          background: linear-gradient(135deg, #063d91 0%, #0754b7 52%, #063d91 100%);
          color: #fff;
          box-shadow: 0 8px 22px rgba(3, 27, 73, .14);
        }
        .ev-topbar-inner {
          width: min(1240px, 100%);
          margin: 0 auto;
          min-height: 54px;
          padding: 6px 18px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
        }
        .ev-phone-list {
          min-width: 0;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: center;
          gap: 7px;
          overflow: hidden;
          white-space: nowrap;
        }
        .ev-phone-link {
          min-width: 0;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          overflow: hidden;
          color: #fff;
          text-decoration: none;
          font-size: clamp(8.5px, 1.05vw, 12px);
          font-weight: 800;
          line-height: 1;
          letter-spacing: .005em;
          white-space: nowrap;
          text-overflow: clip;
          transition: opacity .16s ease, transform .16s ease;
        }
        .ev-phone-link::before {
          content: '☎';
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          color: #ffd52a;
          background: rgba(255,255,255,.09);
          font-size: 10px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.17);
        }
        .ev-phone-link:hover { opacity: .86; }
        .ev-phone-link:active { transform: translateY(1px); opacity: .70; }
        .ev-download-btn {
          width: 100px;
          min-width: 100px;
          height: 40px;
          padding: 0 9px;
          border: 1px solid rgba(255,255,255,.20);
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: linear-gradient(145deg, #16ad15 0%, #078b0d 100%);
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .01em;
          white-space: nowrap;
          cursor: pointer;
          box-shadow: 0 6px 12px rgba(2, 66, 2, .22), inset 0 1px 0 rgba(255,255,255,.23), inset 0 -3px 0 rgba(0,0,0,.10);
          transition: transform .15s ease, opacity .15s ease;
        }
        .ev-download-btn .ev-download-icon { font-size: 14px; line-height: 1; }
        .ev-download-btn:active { transform: translateY(2px) scale(.99); opacity: .80; }
        .ev-main-header {
          position: sticky;
          top: 0;
          z-index: 35;
          background: rgba(255,255,255,.98);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-bottom: 1px solid rgba(8,43,91,.08);
          box-shadow: 0 7px 22px rgba(13,41,83,.07);
        }
        .ev-main-header-inner {
          width: min(1240px, 100%);
          margin: 0 auto;
          min-height: 66px;
          padding: 7px 18px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto 46px;
          align-items: center;
          gap: 8px;
        }
        .ev-brand {
          min-width: 0;
          width: max-content;
          max-width: 100%;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
          text-align: left;
        }
        .ev-brand-mark {
          flex: 0 0 auto;
          width: 44px;
          height: 44px;
          display: block;
          object-fit: contain;
          object-position: center;
          border-radius: 12px;
          filter: drop-shadow(0 5px 9px rgba(4,47,105,.17));
        }
        .ev-brand-copy {
          min-width: 0;
          display: flex;
          align-items: center;
        }
        .ev-brand-copy strong {
          display: block;
          max-width: 100%;
          overflow: hidden;
          color: #081a39;
          font-size: clamp(15px, 2vw, 21px);
          line-height: 1;
          letter-spacing: -.045em;
          text-transform: uppercase;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .ev-brand-copy small { display: none; }
        .ev-register-btn {
          flex: 0 0 auto;
          min-height: 40px;
          padding: 0 16px;
          border: 1px solid rgba(0,111,0,.13);
          border-radius: 999px;
          background: linear-gradient(145deg, #14b319 0%, #079c10 52%, #07870b 100%);
          color: #fff;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: .10em;
          text-transform: uppercase;
          white-space: nowrap;
          box-shadow: 0 7px 16px rgba(7,133,13,.18), inset 0 2px 0 rgba(255,255,255,.20), inset 0 -3px 0 rgba(0,0,0,.10);
          cursor: pointer;
          transition: transform .15s ease, opacity .15s ease;
        }
        .ev-register-btn:active { transform: translateY(2px) scale(.99); opacity: .78; }
        .ev-menu-btn {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 5px;
          padding: 10px;
          border: 0;
          border-radius: 13px;
          background: rgba(7,44,93,.04);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.86), 0 5px 15px rgba(20,55,93,.06);
          cursor: pointer;
          transition: transform .15s ease, background .15s ease, opacity .15s ease;
        }
        .ev-menu-btn span {
          display: block;
          width: 24px;
          height: 3px;
          border-radius: 99px;
          background: #0a1630;
        }
        .ev-menu-btn:active { transform: scale(.96); opacity: .72; background: rgba(7,44,93,.08); }
        .ev-menu {
          max-width: 1240px;
          margin: 0 auto;
          padding: 0 18px 11px;
        }
        .ev-menu-panel {
          display: grid;
          grid-template-columns: repeat(6, minmax(0,1fr));
          gap: 7px;
          padding: 9px;
          border: 1px solid rgba(9,50,104,.09);
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 15px 30px rgba(10,38,79,.09);
        }
        .ev-menu-panel button {
          min-height: 42px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #0c2247;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: background .15s ease, transform .15s ease, opacity .15s ease;
        }
        .ev-menu-panel button:hover { background: #eef5ff; }
        .ev-menu-panel button:active { transform: translateY(1px); opacity: .68; }
        @media (max-width: 700px) {
          .ev-topbar-inner { min-height: 48px; padding: 5px 9px; gap: 7px; }
          .ev-phone-list { gap: 5px; }
          .ev-phone-link { font-size: 8px; gap: 3px; }
          .ev-phone-link::before { width: 17px; height: 17px; font-size: 9px; }
          .ev-download-btn { width: 94px; min-width: 94px; height: 36px; padding: 0 7px; border-radius: 11px; font-size: 9px; }
          .ev-download-btn .ev-download-icon { font-size: 13px; }
          .ev-main-header-inner { min-height: 61px; padding: 6px 9px; grid-template-columns: minmax(0,1fr) auto 42px; gap: 6px; }
          .ev-brand { gap: 7px; width: 100%; }
          .ev-brand-mark { width: 41px; height: 41px; border-radius: 11px; }
          .ev-brand-copy strong { font-size: 15px; letter-spacing: -.05em; }
          .ev-register-btn { min-height: 37px; padding: 0 12px; font-size: 9px; letter-spacing: .08em; }
          .ev-menu-btn { width: 42px; height: 42px; border-radius: 11px; padding: 9px; }
          .ev-menu-btn span { width: 23px; height: 3px; }
          .ev-menu { padding: 0 9px 9px; }
          .ev-menu-panel { grid-template-columns: repeat(2,minmax(0,1fr)); }
        }
        @media (max-width: 430px) {
          .ev-topbar-inner { grid-template-columns: minmax(0,1fr) 92px; }
          .ev-phone-list { gap: 3px; }
          .ev-phone-link { font-size: 7.4px; gap: 2px; font-weight: 850; }
          .ev-phone-link::before { width: 16px; height: 16px; font-size: 8px; }
          .ev-download-btn { width: 92px; min-width: 92px; height: 35px; font-size: 8.5px; padding: 0 5px; }
          .ev-download-btn .ev-download-icon { font-size: 12px; }
          .ev-main-header-inner { grid-template-columns: minmax(0,1fr) auto 42px; }
          .ev-brand-copy strong { font-size: 14px; }
          .ev-brand-mark { width: 39px; height: 39px; }
          .ev-register-btn { min-height: 36px; padding: 0 10px; font-size: 8.2px; }
        }
        @media (max-width: 360px) {
          .ev-topbar-inner { grid-template-columns: minmax(0,1fr) 88px; }
          .ev-phone-link { font-size: 7px; }
          .ev-download-btn { width: 88px; min-width: 88px; font-size: 8px; }
          .ev-main-header-inner { grid-template-columns: minmax(0,1fr) auto 38px; gap: 5px; }
          .ev-brand-mark { width: 36px; height: 36px; }
          .ev-brand-copy strong { font-size: 12.5px; }
          .ev-register-btn { min-height: 34px; padding: 0 8px; font-size: 7.5px; letter-spacing: .06em; }
          .ev-menu-btn { width: 38px; height: 38px; }
          .ev-menu-btn span { width: 21px; }
        }
      `}</style>

      <style>{`
        .ev-enquiry-overlay {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: grid;
          place-items: center;
          padding: 16px 10px 22px;
          background: rgba(0, 0, 0, .68);
          backdrop-filter: blur(3px);
          -webkit-backdrop-filter: blur(3px);
          overscroll-behavior: contain;
        }
        .ev-enquiry-stage {
          position: relative;
          width: min(520px, calc(100vw - 30px));
        }
        .ev-enquiry-modal {
          position: relative;
          width: 100%;
          max-height: min(70vh, 610px);
          overflow: hidden;
          border: 1px solid rgba(10, 52, 108, .12);
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 36px 90px rgba(0,0,0,.34), 0 10px 26px rgba(4, 47, 105, .12), inset 0 1px 0 rgba(255,255,255,.94);
          scrollbar-width: thin;
          scrollbar-color: rgba(10, 54, 112, .24) transparent;
        }
        .ev-enquiry-banner-wrap {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: 24px 24px 0 0;
          background: #061c3f;
        }
        .ev-enquiry-banner {
          width: 100%;
          display: block;
          aspect-ratio: 3.35 / 1;
          object-fit: cover;
          object-position: center;
        }
        .ev-enquiry-close {
          position: absolute;
          top: -46px;
          right: 0;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          color: #fff;
          font-size: 34px;
          font-weight: 400;
          line-height: 1;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          text-shadow: 0 2px 10px rgba(0,0,0,.55);
        }
        .ev-enquiry-close:active { transform: scale(.90); opacity: .72; }
        .ev-enquiry-modal-body {
          max-height: calc(min(70vh, 610px) - 174px);
          overflow-y: auto;
          padding: 15px 17px 17px;
          background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
          overscroll-behavior: contain;
        }
        .ev-enquiry-modal-label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 6px;
          color: #0b5cbb;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .18em;
          text-transform: uppercase;
        }
        .ev-enquiry-modal-label::before {
          content: '';
          width: 18px;
          height: 2.5px;
          border-radius: 999px;
          background: linear-gradient(90deg, #0b5cbb, #1d8bff);
        }
        .ev-enquiry-modal-title {
          margin: 0;
          color: #0a1c3d;
          font-size: clamp(19px, 3.1vw, 23px);
          line-height: 1.04;
          letter-spacing: -.045em;
        }
        .ev-enquiry-modal-subtitle {
          margin: 6px 0 12px;
          color: #63748f;
          font-size: 12px;
          line-height: 1.42;
        }
        .ev-enquiry-form {
          display: grid;
          gap: 8px;
          margin: 0;
        }
        .ev-enquiry-form label {
          display: grid;
          gap: 5px;
          color: #223a62;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .07em;
          text-transform: uppercase;
        }
        .ev-enquiry-form .form-row {
          display: grid;
          grid-template-columns: 1fr 1.15fr;
          gap: 12px;
        }
        .ev-enquiry-form input,
        .ev-enquiry-form textarea,
        .ev-enquiry-form select {
          width: 100%;
          min-height: 42px;
          padding: 0 11px;
          border: 1.5px solid rgba(18, 34, 58, .40);
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: #172842;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0;
          text-transform: none;
          user-select: text;
          -webkit-user-select: text;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.92), 0 2px 7px rgba(8, 33, 73, .03);
          transition: border-color .15s ease, box-shadow .15s ease, transform .15s ease;
        }
        .ev-enquiry-form textarea {
          min-height: 62px;
          padding-top: 10px;
          padding-bottom: 10px;
          resize: vertical;
        }
        .ev-enquiry-form input::placeholder,
        .ev-enquiry-form textarea::placeholder {
          color: #7b8799;
          opacity: 1;
          font-weight: 500;
        }
        .ev-enquiry-form input:focus,
        .ev-enquiry-form textarea:focus,
        .ev-enquiry-form select:focus {
          border-color: #1769d2;
          box-shadow: 0 0 0 3px rgba(23, 105, 210, .10), inset 0 1px 0 rgba(255,255,255,.95);
        }
        .ev-enquiry-form > .btn,
        .ev-enquiry-form button[type='submit'] {
          width: 100%;
          min-height: 44px;
          margin-top: 2px;
          border-radius: 10px;
          background: linear-gradient(145deg, #0c4a85 0%, #063665 55%, #052d59 100%);
          box-shadow: 0 10px 20px rgba(5, 48, 93, .22), inset 0 1px 0 rgba(255,255,255,.16), inset 0 -3px 0 rgba(0,0,0,.15);
          color: #fff;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: .01em;
        }
        .ev-enquiry-form > .btn:active,
        .ev-enquiry-form button[type='submit']:active { transform: translateY(2px); opacity: .82; }
        .ev-enquiry-form .form-note { font-size: 10px; line-height: 1.35; }
        @media (max-width: 560px) {
          .ev-enquiry-overlay { padding: 12px 8px 18px; }
          .ev-enquiry-stage { width: min(520px, calc(100vw - 16px)); }
          .ev-enquiry-modal { width: 100%; max-height: 68vh; border-radius: 18px; }
          .ev-enquiry-banner-wrap { border-radius: 18px 18px 0 0; }
          .ev-enquiry-close { top: -40px; right: -1px; width: 34px; height: 34px; font-size: 30px; }
          .ev-enquiry-modal-body { max-height: calc(68vh - 150px); padding: 13px 13px 15px; }
          .ev-enquiry-modal-label { font-size: 8.5px; margin-bottom: 5px; }
          .ev-enquiry-modal-title { font-size: 21px; }
          .ev-enquiry-modal-subtitle { font-size: 11px; margin: 5px 0 10px; }
          .ev-enquiry-form { gap: 8px; }
          .ev-enquiry-form .form-row { grid-template-columns: 1fr; gap: 8px; }
          .ev-enquiry-form input,
          .ev-enquiry-form textarea,
          .ev-enquiry-form select { min-height: 42px; font-size: 13px; padding-left: 10px; padding-right: 10px; }
          .ev-enquiry-form textarea { min-height: 60px; }
          .ev-enquiry-form > .btn,
          .ev-enquiry-form button[type='submit'] { min-height: 43px; font-size: 13px; }
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
              <img className="ev-brand-mark" src="/ezee-vision-logo.png" alt="EZEE VISION CHAMPUA logo" />
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


      <style>{`
        .ev-home-hero {
          position: relative;
          overflow: hidden;
          background:
            linear-gradient(rgba(0, 160, 95, .095) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 160, 95, .095) 1px, transparent 1px),
            linear-gradient(180deg, #effff7 0%, #e6fff2 100%);
          background-size: 54px 54px, 54px 54px, 100% 100%;
          padding: clamp(32px, 7vw, 72px) 18px 0;
          scroll-margin-top: 120px;
          min-height: auto;
          isolation: isolate;
        }
        .ev-home-shell {
          width: min(1180px, 100%);
          margin: 0 auto;
          text-align: center;
        }
        .ev-home-kicker {
          margin: 0 auto 14px;
          color: #009b5f;
          font-size: clamp(30px, 8vw, 72px);
          line-height: .98;
          font-weight: 900;
          letter-spacing: -.055em;
          max-width: 920px;
          text-wrap: balance;
        }
        .ev-home-subheadline {
          width: min(920px, 100%);
          margin: 0 auto;
          color: #101923;
          font-size: clamp(15px, 2.4vw, 22px);
          line-height: 1.55;
          font-weight: 560;
          letter-spacing: .015em;
          text-wrap: balance;
        }
        .ev-home-actions {
          display: flex;
          justify-content: center;
          align-items: center;
          flex-wrap: wrap;
          gap: 14px;
          margin: 24px auto 0;
        }
        .ev-home-action {
          min-width: 178px;
          min-height: 54px;
          padding: 0 28px;
          border-radius: 16px;
          border: 1.5px solid #05aa6b;
          font-size: 16px;
          font-weight: 850;
          letter-spacing: -.01em;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: transform .16s ease, opacity .16s ease, box-shadow .16s ease;
        }
        .ev-home-action-primary {
          color: #fff;
          background: linear-gradient(145deg, #08bd75 0%, #00a864 55%, #009457 100%);
          box-shadow: 0 13px 24px rgba(0, 153, 88, .18), inset 0 1px 0 rgba(255,255,255,.25), inset 0 -3px 0 rgba(0,0,0,.09);
        }
        .ev-home-action-secondary {
          color: #0a261c;
          background: rgba(255,255,255,.88);
          box-shadow: 0 9px 18px rgba(0, 105, 66, .06), inset 0 1px 0 rgba(255,255,255,.92);
        }
        .ev-home-action:active {
          transform: translateY(2px) scale(.99);
          opacity: .78;
        }
        .ev-teachers-stage {
          position: relative;
          width: min(930px, 100%);
          margin: 18px auto 0;
          height: clamp(290px, 45vw, 560px);
          overflow: hidden;
        }
        .ev-teachers-stage::before {
          content: '';
          position: absolute;
          width: min(540px, 78vw);
          height: min(540px, 78vw);
          left: 50%;
          bottom: -36%;
          transform: translateX(-50%);
          border-radius: 48%;
          background: radial-gradient(circle, rgba(8, 190, 113, .19) 0%, rgba(8, 190, 113, .07) 54%, rgba(8, 190, 113, 0) 72%);
          pointer-events: none;
        }
        .ev-green-element {
          position: absolute;
          pointer-events: none;
          filter: drop-shadow(0 10px 18px rgba(0,122,70,.10));
        }
        .ev-green-diamond {
          width: 150px;
          height: 240px;
          left: 50%;
          bottom: 25px;
          transform: translateX(-50%) rotate(45deg);
          border-radius: 22px;
          background: linear-gradient(160deg, #00c977 0%, #06aa66 64%, #058d56 100%);
          opacity: .95;
        }
        .ev-green-ring {
          width: 250px;
          height: 250px;
          left: 50%;
          bottom: -60px;
          transform: translateX(-50%);
          border-radius: 50%;
          border: 18px solid rgba(0, 178, 103, .18);
        }
        .ev-green-block-left,
        .ev-green-block-right {
          width: 92px;
          height: 170px;
          bottom: 66px;
          border-radius: 28px;
          background: linear-gradient(180deg, rgba(0, 198, 118, .92), rgba(0, 149, 87, .75));
        }
        .ev-green-block-left { left: 10%; transform: rotate(-13deg); }
        .ev-green-block-right { right: 10%; transform: rotate(13deg); }
        .ev-teacher {
          position: absolute;
          bottom: 0;
          display: block;
          width: auto;
          user-select: none;
          -webkit-user-select: none;
          pointer-events: none;
          object-fit: contain;
          filter: drop-shadow(0 16px 28px rgba(0, 73, 43, .19));
        }
        .ev-teacher-left {
          left: 5%;
          height: 87%;
          z-index: 2;
        }
        .ev-teacher-center {
          left: 50%;
          transform: translateX(-50%);
          height: 98%;
          z-index: 4;
        }
        .ev-teacher-right {
          right: 4%;
          height: 82%;
          z-index: 3;
        }
        .ev-scholarship-bar {
          position: relative;
          width: calc(100% + 36px);
          margin: 0 -18px;
          overflow: hidden;
          background: repeating-linear-gradient(
            -45deg,
            #087a4b 0,
            #087a4b 13px,
            #096f45 13px,
            #096f45 26px
          );
          border-top: 1px solid rgba(255,255,255,.15);
          border-bottom: 1px solid rgba(0,0,0,.10);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.09), 0 -5px 16px rgba(0, 91, 53, .08);
        }
        .ev-scholarship-track {
          display: flex;
          width: max-content;
          min-width: 100%;
          animation: evScholarshipMove 18s linear infinite;
        }
        .ev-scholarship-text {
          flex: 0 0 auto;
          padding: 15px 34px;
          color: #fff;
          font-size: clamp(14px, 2.2vw, 21px);
          line-height: 1.2;
          font-weight: 900;
          letter-spacing: .01em;
          white-space: nowrap;
          text-shadow: 0 2px 6px rgba(0,0,0,.14);
        }
        @keyframes evScholarshipMove {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (max-width: 720px) {
          .ev-home-hero {
            padding: 28px 12px 0;
          }
          .ev-home-kicker {
            font-size: clamp(30px, 9vw, 52px);
            max-width: 100%;
          }
          .ev-home-subheadline {
            font-size: clamp(14px, 4vw, 18px);
            line-height: 1.52;
          }
          .ev-home-actions {
            gap: 10px;
            margin-top: 20px;
          }
          .ev-home-action {
            min-width: 0;
            flex: 1 1 155px;
            min-height: 50px;
            padding: 0 16px;
            border-radius: 14px;
            font-size: 14px;
          }
          .ev-teachers-stage {
            height: 300px;
            margin-top: 10px;
          }
          .ev-teacher-left { left: -1%; height: 76%; }
          .ev-teacher-center { height: 95%; }
          .ev-teacher-right { right: -1%; height: 71%; }
          .ev-green-diamond { width: 112px; height: 190px; bottom: 18px; }
          .ev-green-ring { width: 180px; height: 180px; bottom: -34px; border-width: 13px; }
          .ev-green-block-left, .ev-green-block-right { width: 58px; height: 118px; bottom: 47px; }
          .ev-scholarship-bar { width: calc(100% + 24px); margin: 0 -12px; }
          .ev-scholarship-text { padding: 13px 26px; font-size: 14px; }
        }
        @media (max-width: 390px) {
          .ev-home-kicker { font-size: 29px; }
          .ev-home-subheadline { font-size: 13px; }
          .ev-home-action { flex-basis: 145px; font-size: 13px; min-height: 47px; }
          .ev-teachers-stage { height: 270px; }
          .ev-teacher-left { left: -7%; height: 73%; }
          .ev-teacher-center { height: 94%; }
          .ev-teacher-right { right: -8%; height: 68%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ev-scholarship-track { animation-duration: 32s; }
        }
      `}</style>
      <section id="home" className="ev-home-hero section-anchor">
        <div className="ev-home-shell">
          <h1 className="ev-home-kicker">Your Trusted Offline Coaching for Class 4th to 12th</h1>
          <p className="ev-home-subheadline">Building strong concepts from School foundations to Board Exam Success through dedicated Smart classroom teaching, Fully Air Conditioned Classroom, Live CCTV Monitoring with Personal attention, and regular Test series.</p>

          <div className="ev-home-actions">
            <button className="ev-home-action ev-home-action-primary" type="button" onClick={openAdmission}>Register Now</button>
            <button className="ev-home-action ev-home-action-secondary" type="button" onClick={() => goTo('classes')}>Explore Classes</button>
          </div>

          <div className="ev-teachers-stage" aria-label="EZEE VISION CHAMPUA teaching team">
            <div className="ev-green-element ev-green-diamond" aria-hidden="true"></div>
            <div className="ev-green-element ev-green-ring" aria-hidden="true"></div>
            <div className="ev-green-element ev-green-block-left" aria-hidden="true"></div>
            <div className="ev-green-element ev-green-block-right" aria-hidden="true"></div>

            <img className="ev-teacher ev-teacher-left" src="/teachers/teacher-1-v2.png?v=20260927-1" alt="EZEE VISION CHAMPUA teacher" draggable="false" />
            <img className="ev-teacher ev-teacher-center" src="/teachers/teacher-2.png?v=20260927-1" alt="EZEE VISION CHAMPUA teacher" draggable="false" />
            <img className="ev-teacher ev-teacher-right" src="/teachers/teacher-3.png?v=20260927-1" alt="EZEE VISION CHAMPUA teacher" draggable="false" />
          </div>

          <div className="ev-scholarship-bar" aria-label="Scholarship announcement">
            <div className="ev-scholarship-track">
              <div className="ev-scholarship-text">Get Upto 100% Scholarship with Our Dedicated Scholarship Test</div>
              <div className="ev-scholarship-text">Get Upto 100% Scholarship with Our Dedicated Scholarship Test</div>
              <div className="ev-scholarship-text">Get Upto 100% Scholarship with Our Dedicated Scholarship Test</div>
              <div className="ev-scholarship-text">Get Upto 100% Scholarship with Our Dedicated Scholarship Test</div>
            </div>
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

      <style>{`
        .ev-footer-brand-wrap { display:flex; align-items:center; gap:10px; }
        .ev-footer-logo { width:42px; height:42px; object-fit:contain; flex:0 0 auto; filter:drop-shadow(0 4px 8px rgba(4,47,105,.13)); }
        @media (max-width:560px) { .ev-footer-logo { width:36px; height:36px; } }
      `}</style>

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
          <div>
            <div className="ev-footer-brand-wrap">
              <img className="ev-footer-logo" src="/ezee-vision-logo.png" alt="EZEE VISION CHAMPUA logo" />
              <div className="footer-brand">{profile.shortName} <span>{profile.locationLabel}</span></div>
            </div>
            <p>{profile.footerTagline}</p>
          </div>
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
          <div className="ev-enquiry-stage">
            <button type="button" className="ev-enquiry-close" onClick={() => setEnquiryModalOpen(false)} aria-label="Close admission enquiry">×</button>
            <div className="ev-enquiry-modal">
              <div className="ev-enquiry-banner-wrap">
                <img
                  className="ev-enquiry-banner"
                  src="/enquiry-banner.png"
                  alt="EZEE VISION CHAMPUA admission banner"
                />
              </div>
            <div className="ev-enquiry-modal-body">
              <div className="ev-enquiry-modal-label">Admission Enquiry</div>
              <h2 className="ev-enquiry-modal-title">Join EZEE VISION CHAMPUA</h2>
              <p className="ev-enquiry-modal-subtitle">Share your details and our coaching team will contact you regarding classes, batches and admission information.</p>
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
          </div>
        </div>
      ) : null}
    </main>
  );
}
