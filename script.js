/* ============================================================
   GAIL'S 65TH BIRTHDAY INVITATION — script.js
   ============================================================

   Architecture: all public methods live on window.invitation
   so the HTML onclick attributes stay tidy and future features
   can be added without touching existing code.

   Sections:
     1. Configuration
     2. Initialization
     3. Particle system
     4. Envelope animation sequence
     5. Scene transition
     6. Scroll-reveal (IntersectionObserver)
     7. Add to Calendar (ICS generator)
     8. Guest personalization (URL param)
     9. Future expansion stubs
   ============================================================ */

'use strict';

/* ════════════════════════════════════════════════════════════
   1. CONFIGURATION
   Edit these values to personalize the invitation.
   ════════════════════════════════════════════════════════════ */
const CONFIG = {
  // Guest name shown on the envelope.
  // Override per-guest via URL: ?guest=Sarah+Smith
  defaultGuestName: 'Valued Guest',

  // Event details for the ICS calendar file
  event: {
    title:       "Gail's 65th Birthday Celebration",
    // Local Saskatchewan time (America/Regina, UTC−6, no DST)
    startLocal:  '20260813T170000',   // Aug 13 2026 5:00 PM
    endLocal:    '20260814T000000',   // Aug 14 2026 12:00 AM
    timezone:    'America/Regina',
    location:    '103A–310 Wellman Crescent, Clavet, SK',
    description: [
      'Join us for an evening of food, laughter and refreshments.',
      'Beer, wine coolers, and dinner provided.',
      '8:00 PM: Transportation to Vic Lam Cavern, Clavet Motor Inn.',
      'Celebrate with music, drinks, and great company until midnight.',
      '12:00 AM: Return transportation to Gail\'s residence provided.',
      'Please RSVP by July 31 — Call Gail: 306-220-2181.',
      'No gifts please. Your presence is the greatest gift of all.',
    ].join('\\n'),
  },

  // Animation timing (milliseconds) — tweak to taste
  timing: {
    sealBreakDelay:  0,      // time after tap before seal breaks
    flapOpenDelay:   360,    // after seal break starts
    cardRiseDelay:   700,    // after flap starts opening
    quoteShowDelay:  1100,   // after card starts rising (~halfway up)
    quoteDuration:   2800,   // how long quote stays fully visible
    quoteFadeOut:    900,    // fade-out duration
    sceneTransition: 700,    // pause after quote before scene switch
  },
};


/* ════════════════════════════════════════════════════════════
   2. INITIALIZATION
   ════════════════════════════════════════════════════════════ */
window.invitation = {};

document.addEventListener('DOMContentLoaded', () => {
  // Apply guest name from URL or default
  applyGuestName();

  // Gold particle background
  initParticles();

  // Wire scroll-reveal for the invitation scene
  initScrollReveal();

  // Expose public API
  window.invitation.openEnvelope  = openEnvelope;
  window.invitation.handleKey     = handleEnvelopeKey;
  window.invitation.addToCalendar = addToCalendar;
});


/* ════════════════════════════════════════════════════════════
   3. PARTICLE SYSTEM
   Tiny gold motes drift gently upward against the dark bg.
   Canvas is killed when the invitation scene opens.
   ════════════════════════════════════════════════════════════ */
function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;

  // Honour prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d');
  let raf;
  let pool = [];

  const COUNT = window.innerWidth < 480 ? 45 : 70;

  // ── Resize ──────────────────────────────────────────────
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // ── Particle factory ────────────────────────────────────
  function makeParticle(randomY = false) {
    const maxLife = 220 + Math.random() * 280;
    return {
      x:        Math.random() * canvas.width,
      y:        randomY ? Math.random() * canvas.height : canvas.height + 12,
      size:     Math.random() * 1.8 + 0.4,
      vx:       (Math.random() - 0.5) * 0.18,
      vy:       -(Math.random() * 0.35 + 0.12),
      alpha:    0,
      maxAlpha: Math.random() * 0.45 + 0.12,
      life:     randomY ? Math.random() * maxLife : 0,
      maxLife,
    };
  }

  // Seed initial pool with random vertical positions
  for (let i = 0; i < COUNT; i++) pool.push(makeParticle(true));

  // ── Draw loop ───────────────────────────────────────────
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pool.forEach((p, i) => {
      // Move
      p.x  += p.vx + Math.sin(p.life * 0.03) * 0.06;
      p.y  += p.vy;
      p.life++;

      // Gentle wander
      p.vx += (Math.random() - 0.5) * 0.008;
      p.vx  = Math.max(-0.28, Math.min(0.28, p.vx));

      // Fade in / out
      const fadeFrames = 55;
      if (p.life < fadeFrames) {
        p.alpha = (p.life / fadeFrames) * p.maxAlpha;
      } else if (p.life > p.maxLife - fadeFrames) {
        p.alpha = ((p.maxLife - p.life) / fadeFrames) * p.maxAlpha;
      } else {
        p.alpha = p.maxAlpha;
      }

      // Recycle
      if (p.life >= p.maxLife || p.y < -20) {
        pool[i] = makeParticle(false);
        return;
      }

      // Draw: soft gold dot + cross sparkle on larger ones
      ctx.save();
      ctx.globalAlpha = p.alpha;

      const hue = 40 + Math.floor(Math.random() * 10);
      ctx.fillStyle = `hsl(${hue}, 62%, 64%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();

      if (p.size > 1.3) {
        ctx.strokeStyle = `hsla(${hue}, 80%, 82%, 0.45)`;
        ctx.lineWidth = 0.5;
        const arm = p.size * 2.2;
        ctx.beginPath();
        ctx.moveTo(p.x - arm, p.y); ctx.lineTo(p.x + arm, p.y);
        ctx.moveTo(p.x, p.y - arm); ctx.lineTo(p.x, p.y + arm);
        ctx.stroke();
      }

      ctx.restore();
    });

    raf = requestAnimationFrame(tick);
  }

  tick();

  // Expose stop function so the scene-transition can kill the canvas
  window.invitation._stopParticles = () => {
    cancelAnimationFrame(raf);
    // Brief fade-out, then hide
    canvas.style.transition = 'opacity 1.8s ease';
    canvas.style.opacity = '0';
    setTimeout(() => (canvas.style.display = 'none'), 1900);
  };
}


/* ════════════════════════════════════════════════════════════
   4. ENVELOPE ANIMATION SEQUENCE
   ════════════════════════════════════════════════════════════ */
let _envelopeOpened = false;

function handleEnvelopeKey(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openEnvelope();
  }
}

async function openEnvelope() {
  if (_envelopeOpened) return;
  _envelopeOpened = true;

  const T        = CONFIG.timing;
  const envelope = document.getElementById('envelope');
  const seal     = document.getElementById('waxSeal');
  const flap     = document.getElementById('envFlap');
  const card     = document.getElementById('envCard');
  const tapCue   = document.getElementById('tapCue');
  const quote    = document.getElementById('quoteVeil');

  // ── Lock envelope interactions ──────────────────────────
  envelope.classList.add('is-opening');
  envelope.removeAttribute('role');
  envelope.removeAttribute('tabindex');
  envelope.style.cursor = 'default';

  // Hide tap cue
  if (tapCue) {
    tapCue.style.transition = 'opacity .3s ease';
    tapCue.style.opacity = '0';
  }

  // ── Step 1: Seal breaks ──────────────────────────────────
  await delay(T.sealBreakDelay);
  seal.classList.add('is-breaking');

  // ── Step 2: Flap swings open ─────────────────────────────
  await delay(T.flapOpenDelay);
  flap.classList.add('is-open');

  // Allow card to overflow the envelope once flap is rotating
  // (envelope has overflow visible after a short grace period)
  setTimeout(() => {
    envelope.style.overflow = 'visible';
  }, 400);

  // ── Step 3: Card rises ───────────────────────────────────
  await delay(T.cardRiseDelay);
  card.classList.add('is-rising');

  // ── Step 4: Quote fades in at ~halfway point ─────────────
  await delay(T.quoteShowDelay);
  showQuote(quote);

  // ── Step 5: Quote fades out ──────────────────────────────
  await delay(T.quoteDuration);
  hideQuote(quote);

  // ── Step 6: Transition to invitation ─────────────────────
  await delay(T.quoteFadeOut + T.sceneTransition);
  transitionToInvitation();
}

function showQuote(el) {
  el.removeAttribute('aria-hidden');
  el.classList.add('is-visible');
}

function hideQuote(el) {
  el.style.transition = 'opacity .9s ease';
  el.style.opacity = '0';
  setTimeout(() => {
    el.setAttribute('aria-hidden', 'true');
    el.classList.remove('is-visible');
    el.style.opacity = '';
    el.style.transition = '';
  }, 950);
}


/* ════════════════════════════════════════════════════════════
   5. SCENE TRANSITION
   ════════════════════════════════════════════════════════════ */
function transitionToInvitation() {
  const landingScene     = document.getElementById('scene-landing');
  const invitationScene  = document.getElementById('scene-invitation');

  // Stop particles
  if (typeof window.invitation._stopParticles === 'function') {
    window.invitation._stopParticles();
  }

  // Fade landing out
  landingScene.style.transition = 'opacity 1s ease';
  landingScene.style.opacity    = '0';

  setTimeout(() => {
    // Take landing off screen
    landingScene.classList.remove('scene--active');
    landingScene.style.display = 'none';

    // Allow body to scroll for invitation
    document.body.style.overflow = '';

    // Prepare invitation scene
    invitationScene.style.opacity = '0';
    invitationScene.classList.add('scene--active');
    invitationScene.scrollTop = 0;

    // Fade in invitation
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        invitationScene.style.transition = 'opacity 1.2s ease';
        invitationScene.style.opacity    = '1';
      });
    });

    // Trigger scroll-reveal for elements already in view
    setTimeout(triggerRevealAll, 200);

  }, 1050);
}


/* ════════════════════════════════════════════════════════════
   6. SCROLL-REVEAL
   ════════════════════════════════════════════════════════════ */
let _revealObserver = null;

function initScrollReveal() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: just show everything
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
    return;
  }

  _revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger siblings slightly
          entry.target.style.transitionDelay = `${i * 60}ms`;
          entry.target.classList.add('is-visible');
          _revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -30px 0px' }
  );

  document.querySelectorAll('.reveal').forEach(el => _revealObserver.observe(el));
}

function triggerRevealAll() {
  // Re-check which elements are in view after scene switch
  document.querySelectorAll('.reveal:not(.is-visible)').forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 60) {
      setTimeout(() => el.classList.add('is-visible'), i * 80);
    }
  });
}


/* ════════════════════════════════════════════════════════════
   7. ADD TO CALENDAR (ICS)
   Generates a .ics file in-browser and triggers download.
   Works on iOS (opens in Calendar), Android, and desktop.
   ════════════════════════════════════════════════════════════ */
function addToCalendar() {
  const { event } = CONFIG;

  const ics = buildICS({
    title:    event.title,
    start:    event.startLocal,
    end:      event.endLocal,
    tz:       event.timezone,
    location: event.location,
    desc:     event.description,
  });

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href     = url;
  a.download = 'gails-65th-birthday.ics';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 150);
}

function buildICS({ title, start, end, tz, location, desc }) {
  const uid  = `gails-bday-2026-${Date.now()}@invitation.local`;
  const stamp = utcStamp();

  // ICS line folding: lines > 75 chars must be wrapped
  const fold = (str) => {
    const max = 75;
    if (str.length <= max) return str;
    let out = '';
    let i = 0;
    while (i < str.length) {
      if (i === 0) { out += str.slice(0, max); i = max; }
      else         { out += '\r\n ' + str.slice(i, i + max - 1); i += max - 1; }
    }
    return out;
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Gail 65th Birthday//Invitation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${tz}:${start}`,
    `DTEND;TZID=${tz}:${end}`,
    fold(`SUMMARY:${icsEsc(title)}`),
    fold(`LOCATION:${icsEsc(location)}`),
    fold(`DESCRIPTION:${icsEsc(desc)}`),
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'TRANSP:OPAQUE',
    // 1-hour reminder alarm
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:-PT1H',
    `DESCRIPTION:Reminder — ${icsEsc(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.join('\r\n');
}

function icsEsc(str) {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function utcStamp() {
  return new Date()
    .toISOString()
    .replace(/[-:.]/g, '')
    .slice(0, 15) + 'Z';
}


/* ════════════════════════════════════════════════════════════
   8. GUEST PERSONALIZATION
   Pass ?guest=FirstName+LastName in the URL to auto-fill
   the envelope address for each recipient.
   e.g. invitation.html?guest=Sarah+Smith
   ════════════════════════════════════════════════════════════ */
function applyGuestName() {
  const params = new URLSearchParams(window.location.search);
  const raw    = params.get('guest') || params.get('name') || '';
  const name   = raw.trim()
    ? decodeURIComponent(raw.trim())
    : CONFIG.defaultGuestName;

  const el = document.getElementById('guestName');
  if (el) el.textContent = name;
}


/* ════════════════════════════════════════════════════════════
   9. FUTURE EXPANSION STUBS
   These are commented-out shells. Uncomment and implement
   when you're ready to add each feature.
   ════════════════════════════════════════════════════════════ */

/*
── RSVP FORM ───────────────────────────────────────────────
  function initRSVPForm(formSelector, endpoint) {
    // Wire up a <form> to Formspree / Netlify Forms / custom endpoint
    // Fields: name, attending (yes/no), dietaryNeeds, message
    const form = document.querySelector(formSelector);
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      await fetch(endpoint, { method: 'POST', body: JSON.stringify(data),
                              headers: { 'Content-Type': 'application/json' } });
      // Show confirmation message
    });
  }
*/

/*
── COUNTDOWN TIMER ─────────────────────────────────────────
  function initCountdown(selector, targetDate) {
    const el = document.querySelector(selector);
    if (!el) return;
    const tick = () => {
      const diff = targetDate - Date.now();
      if (diff <= 0) { el.textContent = "It's time to celebrate!"; return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      el.textContent = `${d}d ${h}h ${m}m`;
    };
    tick();
    setInterval(tick, 60000);
  }
  // Usage: initCountdown('#countdown', new Date('2026-08-13T17:00:00-06:00'));
*/

/*
── PHOTO GALLERY ────────────────────────────────────────────
  function initGallery(selector, photos) {
    // Lazy-load a lightbox gallery of photos
    // photos = [{ src, thumb, caption }]
  }
*/

/*
── MUSIC TOGGLE ─────────────────────────────────────────────
  function initMusicToggle(audioSrc) {
    const audio = new Audio(audioSrc);
    audio.loop = true;
    const btn = document.getElementById('music-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      audio.paused ? audio.play() : audio.pause();
      btn.textContent = audio.paused ? '♪ Play Music' : '■ Pause Music';
    });
  }
*/

/*
── CONFETTI ─────────────────────────────────────────────────
  function launchConfetti() {
    // Integrate canvas-confetti (npm: canvas-confetti)
    // import confetti from 'https://cdn.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.browser.min.js'
    // confetti({ particleCount: 120, spread: 70, colors: ['#c9a84c','#faf6ef','#e8d5a3'] });
  }
*/

/*
── ANALYTICS ────────────────────────────────────────────────
  function initAnalytics(gaId) {
    const s = document.createElement('script');
    s.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    s.async = true;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', gaId);
  }
*/


/* ════════════════════════════════════════════════════════════
   UTILITY
   ════════════════════════════════════════════════════════════ */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
