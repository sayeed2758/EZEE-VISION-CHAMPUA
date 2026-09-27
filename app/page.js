'use client';

import { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
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

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
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
    phone: '+91 99999 99999', whatsapp: '919999999999', email: '', address: 'Champua, Odisha', mapUrl: '',
    facebook: '', instagram: '', youtube: '', telegram: '', footerTagline: 'Quality Education. Personal Attention. Better Learning.'
  });
  const [publishedUpdates, setPublishedUpdates] = useState(DEFAULT_UPDATES);
  const [publishedGallery, setPublishedGallery] = useState(DEFAULT_GALLERY);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryPaused, setGalleryPaused] = useState(false);
  const [publishedFaculty, setPublishedFaculty] = useState([]);
  const [publishedClasses, setPublishedClasses] = useState(classGroups);

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
    if (!firebaseConfigured || !db) return;

    Promise.all([
      getDoc(doc(db, 'siteContent', 'profile')).then((snapshot) => {
        if (snapshot.exists()) {
          setProfile((current) => ({ ...current, ...snapshot.data() }));
        }
      }).catch(() => {}),
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

  return (
    <main>
      <header className="site-header">
        <div className="shell nav-wrap">
          <button className="brand" onClick={() => goTo('home')} aria-label="Go to home">
            <span className="brand-mark">EV</span>
            <span className="brand-copy">
              <strong>{profile.shortName}</strong>
              <small>{profile.locationLabel}</small>
            </span>
          </button>

          <nav className={menuOpen ? 'nav-links open' : 'nav-links'} aria-label="Primary navigation">
            {[
              ['about', 'About'],
              ['classes', 'Classes'],
              ['faculty', 'Faculty'],
              ['results', 'Results'],
              ['gallery', 'Gallery'],
              ['contact', 'Contact']
            ].map(([id, label]) => (
              <button key={id} onClick={() => goTo(id)}>{label}</button>
            ))}
          </nav>

          <div className="nav-actions">
            <a className="btn btn-outline desktop-cta" href={`https://wa.me/${String(profile.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <button className="btn btn-primary desktop-cta" onClick={() => goTo('admission')}>Admission Enquiry</button>
            <button className="menu-btn" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu" aria-expanded={menuOpen}>
              <span></span><span></span><span></span>
            </button>
          </div>
        </div>
      </header>

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
              <button className="btn btn-primary btn-lg" onClick={() => goTo('admission')}>Get Admission Info <span>→</span></button>
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
        <div className="shell results-wrap">
          <div className="results-copy">
            <div className="section-kicker">RESULTS & ACHIEVEMENTS</div>
            <h2>Every improvement is worth recognising.</h2>
            <p>
              This space is ready for verified student marks, board achievements, school results and other academic milestones as the coaching community grows.
            </p>
          </div>
          <div className="achievement-panel">
            <div className="achieve-card"><span>Academic</span><b>Achievements</b><small>Verified student highlights</small></div>
            <div className="achieve-card"><span>Board</span><b>Results</b><small>Year-wise performance</small></div>
            <div className="achieve-card"><span>Student</span><b>Progress</b><small>Consistency and growth</small></div>
          </div>
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
            {testimonials.map((item) => (
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
                <span>{item.label}</span><h3>{item.title}</h3><p>{item.text}</p><button onClick={() => goTo('admission')}>Know more →</button>
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
              <a href={`tel:${profile.phone.replace(/[^0-9+]/g, '')}`}><span>Call</span><b>{profile.phone}</b></a>
              <a href={`https://wa.me/${String(profile.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"><span>WhatsApp</span><b>Chat with EZEE VISION</b></a>
            </div>
          </div>
          <form className="enquiry-form" onSubmit={(e) => e.preventDefault()}>
            <div className="form-title">Admission Enquiry</div>
            <label>Student Name<input placeholder="Enter student name" /></label>
            <label>Parent / Guardian Name<input placeholder="Enter parent or guardian name" /></label>
            <div className="form-row">
              <label>Class<select defaultValue=""><option value="" disabled>Select class</option>{['4','5','6','7','8','9','10','11','12'].map((c) => <option key={c}>{c}</option>)}</select></label>
              <label>Phone<input placeholder="10-digit mobile number" inputMode="numeric" /></label>
            </div>
            <label>Message<textarea placeholder="Tell us what you would like to know..."></textarea></label>
            <button className="btn btn-primary btn-lg" type="submit">Submit Enquiry <span>→</span></button>
            <small className="form-note">Phase 1 demo form — backend enquiry storage will be added in the Admin phase.</small>
          </form>
        </div>
      </section>

      <section id="contact" className="section contact-section section-anchor">
        <div className="shell contact-grid">
          <div>
            <div className="section-kicker">CONTACT</div>
            <h2>Find EZEE VISION CHAMPUA.</h2>
            <p>Keep your address, phone, WhatsApp and map location updated here so parents can reach the coaching easily.</p>
          </div>
          <div className="contact-card">
            <div><span>COACHING</span><b>{profile.brandName}</b></div>
            <div><span>LOCATION</span><b>{profile.address}</b></div>
            <div><span>PHONE</span><b>{profile.phone}</b></div>
            <div className="map-placeholder"><span>GOOGLE MAPS</span>{profile.mapUrl ? <a href={profile.mapUrl} target="_blank" rel="noreferrer"><b>Open location map →</b></a> : <b>Map link will appear after it is added in Admin.</b>}</div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="shell footer-grid">
          <div><div className="footer-brand">{profile.shortName} <span>{profile.locationLabel}</span></div><p>{profile.footerTagline}</p></div>
          <div className="footer-links"><button onClick={() => goTo('about')}>About</button><button onClick={() => goTo('classes')}>Classes</button><button onClick={() => goTo('faculty')}>Faculty</button><button onClick={() => goTo('contact')}>Contact</button></div>
          <div className="footer-social"><a href={`https://wa.me/${String(profile.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">WhatsApp</a>{profile.youtube ? <a href={profile.youtube} target="_blank" rel="noreferrer">YouTube</a> : null}{profile.instagram ? <a href={profile.instagram} target="_blank" rel="noreferrer">Instagram</a> : null}</div>
        </div>
        <div className="shell footer-bottom"><span>© 2026 {profile.brandName}. All rights reserved.</span><span>Made With ❤️ By Shahid Sir</span></div>
      </footer>

      <div className="mobile-bar">
        <a href={`tel:${profile.phone.replace(/[^0-9+]/g, '')}`}>☎ <span>Call</span></a>
        <a href={`https://wa.me/${String(profile.whatsapp).replace(/\D/g, '')}`} target="_blank" rel="noreferrer">◉ <span>WhatsApp</span></a>
        <button onClick={() => goTo('admission')}>✦ <span>Admission</span></button>
      </div>
    </main>
  );
}
