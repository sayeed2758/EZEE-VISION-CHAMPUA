'use client';

import { useState } from 'react';

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

const updates = [
  { label: 'Admissions', title: 'Enquiry open for Classes 4–12', text: 'Contact the team for batch timing and admission information.' },
  { label: 'Academics', title: 'Regular practice and revision', text: 'Structured support to keep learning consistent throughout the session.' },
  { label: 'Community', title: 'Growing student community', text: 'Nearly 150 students have joined the EZEE VISION CHAMPUA journey in the first five months.' }
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);

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
              <strong>EZEE VISION</strong>
              <small>CHAMPUA</small>
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
            <a className="btn btn-outline desktop-cta" href="https://wa.me/919999999999" target="_blank" rel="noreferrer">WhatsApp</a>
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
            <div className="eyebrow"><span className="dot"></span> COACHING FOR CLASSES 4–12</div>
            <h1>Learn better.<br /><span>Grow stronger.</span></h1>
            <p className="hero-text">
              A focused learning environment built around <b>concept clarity, regular practice and personal attention.</b>
            </p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => goTo('admission')}>Get Admission Info <span>→</span></button>
              <button className="btn btn-ghost btn-lg" onClick={() => goTo('classes')}>Explore Classes <span>↘</span></button>
            </div>
            <div className="hero-note">
              <span className="mini-people"><i>4</i><i>1</i><i>2</i></span>
              <span><b>Nearly 150 students</b> have joined the journey in the first 5 months.</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="EZEE VISION CHAMPUA learning visual">
            <div className="visual-card visual-main">
              <div className="visual-top">
                <span>EZEE VISION CHAMPUA</span>
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
                  <div className="figure-card">4–12</div>
                </div>
              </div>
              <div className="visual-footer"><span>Student-focused coaching</span><span>Champua</span></div>
            </div>
            <div className="floating-stat stat-one"><b>150</b><span>students</span></div>
            <div className="floating-stat stat-two"><b>5 mo.</b><span>journey</span></div>
            <div className="floating-chip">FOCUSED LEARNING</div>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="shell trust-grid">
          <div><strong>5 Months</strong><span>of focused growth</span></div>
          <div><strong>~150</strong><span>students joined</span></div>
          <div><strong>4–12</strong><span>classes supported</span></div>
          <div><strong>Student-first</strong><span>learning approach</span></div>
        </div>
      </section>

      <section id="about" className="section section-anchor">
        <div className="shell two-col">
          <div>
            <div className="section-kicker">ABOUT EZEE VISION</div>
            <h2>A growing coaching community with a clear purpose.</h2>
          </div>
          <div className="section-copy">
            <p>
              EZEE VISION CHAMPUA was started with a simple idea: create a focused, student-centred learning environment where students can understand concepts, practise regularly and move forward with confidence.
            </p>
            <p>
              In its first five months, the coaching community has grown to nearly 150 students. The next chapter is about building the same consistency at a larger scale — without losing the personal attention that makes learning meaningful.
            </p>
          </div>
        </div>

        <div className="shell journey">
          <div className="journey-line"></div>
          <div className="journey-item"><span>01</span><b>Started</b><p>A clear vision for student-focused learning.</p></div>
          <div className="journey-item highlight"><span>02</span><b>5 Months</b><p>Nearly 150 students in the growing community.</p></div>
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
            {classGroups.map((item) => (
              <article className="class-card" key={item.title}>
                <div className="class-top"><span>{item.tag}</span><span>↗</span></div>
                <div className="class-number">{item.title.split(' ')[1]}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div className="class-subjects">{item.subjects}</div>
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
        <div className="shell faculty-grid">
          <div className="faculty-portrait">
            <div className="portrait-ring"></div>
            <div className="portrait-avatar">SS</div>
            <div className="portrait-caption"><span>FOUNDER • EDUCATOR</span><b>EZEE VISION CHAMPUA</b></div>
          </div>
          <div className="faculty-copy">
            <div className="section-kicker light">MEET THE EDUCATOR</div>
            <h2>Teaching with clarity, structure and a human touch.</h2>
            <p>
              The teaching approach at EZEE VISION CHAMPUA is centred on making concepts easier to understand, creating consistent practice and helping students build confidence step by step.
            </p>
            <div className="faculty-meta">
              <div><span>Name</span><b>Sayeedur Rahman (Shahid)</b></div>
              <div><span>Role</span><b>Teacher • Content Creator • Educator</b></div>
            </div>
            <button className="btn btn-light" onClick={() => goTo('contact')}>Connect With EZEE VISION →</button>
          </div>
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

      <section id="gallery" className="section section-anchor">
        <div className="shell">
          <div className="section-head">
            <div>
              <div className="section-kicker">GALLERY</div>
              <h2>A glimpse of the EZEE VISION journey.</h2>
            </div>
            <p>Real classroom moments, activities and achievements can be added here through the future admin panel.</p>
          </div>
          <div className="gallery-grid">
            <div className="gallery-card large"><span>CLASSROOM</span><b>Focused learning in action</b></div>
            <div className="gallery-card warm"><span>ACTIVITIES</span><b>Learning beyond the notebook</b></div>
            <div className="gallery-card dark"><span>COMMUNITY</span><b>Students • Teachers • Growth</b></div>
            <div className="gallery-card tall"><span>ACHIEVEMENTS</span><b>Celebrate every milestone</b></div>
          </div>
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
            {updates.map((item) => (
              <article className="update-card" key={item.title}>
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
              <a href="tel:+919999999999"><span>Call</span><b>+91 99999 99999</b></a>
              <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer"><span>WhatsApp</span><b>Chat with EZEE VISION</b></a>
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
            <div><span>COACHING</span><b>EZEE VISION CHAMPUA</b></div>
            <div><span>LOCATION</span><b>Champua, Odisha</b></div>
            <div><span>PHONE</span><b>+91 99999 99999</b></div>
            <div className="map-placeholder"><span>GOOGLE MAPS</span><b>Map integration ready for Phase 2</b></div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="shell footer-grid">
          <div><div className="footer-brand">EZEE VISION <span>CHAMPUA</span></div><p>Quality Education. Personal Attention. Better Learning.</p></div>
          <div className="footer-links"><button onClick={() => goTo('about')}>About</button><button onClick={() => goTo('classes')}>Classes</button><button onClick={() => goTo('faculty')}>Faculty</button><button onClick={() => goTo('contact')}>Contact</button></div>
          <div className="footer-social"><a href="https://wa.me/919999999999" target="_blank" rel="noreferrer">WhatsApp</a><a href="#">YouTube</a><a href="#">Instagram</a></div>
        </div>
        <div className="shell footer-bottom"><span>© 2026 EZEE VISION CHAMPUA. All rights reserved.</span><span>Made With ❤️ By Shahid Sir</span></div>
      </footer>

      <div className="mobile-bar">
        <a href="tel:+919999999999">☎ <span>Call</span></a>
        <a href="https://wa.me/919999999999" target="_blank" rel="noreferrer">◉ <span>WhatsApp</span></a>
        <button onClick={() => goTo('admission')}>✦ <span>Admission</span></button>
      </div>
    </main>
  );
}
