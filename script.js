/* ============================================================
   GAIL'S 65TH BIRTHDAY INVITATION — script.js  v2
   ============================================================ */

'use strict';

/* ──────────────────────────────────────────────────────────────
   CONFIG
   ────────────────────────────────────────────────────────────── */
const CONFIG = {
  eventDate: new Date('2025-08-13T17:00:00'),
  rsvpDate:  'July 31',
  phone:     '3062202181',
  phoneDisplay: '306-220-2181',
  galleryPhotos: [
    'assets/gallery/photo1.jpg',
    'assets/gallery/photo2.jpg',
    'assets/gallery/photo3.jpg',
    'assets/gallery/photo4.jpg',
    'assets/gallery/photo5.jpg',
    'assets/gallery/photo6.jpg',
  ],
  quoteDelay:    2200,
  quoteDuration: 3200,
  confettiDelay:  400,
};


/* ──────────────────────────────────────────────────────────────
   PARTICLES
   ────────────────────────────────────────────────────────────── */
let particleCtx, particleAnimId;
const motes = [];

function initParticles() {
  const canvas = document.getElementById('particles');
  if (!canvas) return;
  particleCtx = canvas.getContext('2d');
  resizeCanvas();
  for (let i = 0; i < 55; i++) spawnMote(true);
  animateParticles();
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const c = document.getElementById('particles');
  if (!c) return;
  c.width  = window.innerWidth;
  c.height = window.innerHeight;
}

function spawnMote(scatter) {
  motes.push({
    x:  scatter ? Math.random() * window.innerWidth  : Math.random() * window.innerWidth,
    y:  scatter ? Math.random() * window.innerHeight : window.innerHeight + 8,
    r:  Math.random() * 1.8 + .4,
    vy: -(Math.random() * .55 + .2),
    vx: (Math.random() - .5) * .25,
    alpha: Math.random() * .45 + .1,
    twinkleSpeed:  Math.random() * .018 + .006,
    twinkleOffset: Math.random() * Math.PI * 2,
    gold: Math.random() > .35,
  });
}

function animateParticles() {
  if (!particleCtx) return;
  const w = particleCtx.canvas.width, h = particleCtx.canvas.height;
  particleCtx.clearRect(0, 0, w, h);
  const t = performance.now() / 1000;
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.x += m.vx; m.y += m.vy;
    const alpha = m.alpha * (.6 + .4 * Math.sin(t * m.twinkleSpeed * 60 + m.twinkleOffset));
    particleCtx.beginPath();
    particleCtx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    particleCtx.fillStyle = m.gold
      ? `rgba(201,168,76,${alpha})`
      : `rgba(240,223,160,${alpha * .7})`;
    particleCtx.fill();
    if (m.y < -10) { motes.splice(i, 1); spawnMote(false); }
  }
  particleAnimId = requestAnimationFrame(animateParticles);
}

function killParticles() {
  cancelAnimationFrame(particleAnimId);
  const c = document.getElementById('particles');
  if (c && particleCtx) particleCtx.clearRect(0, 0, c.width, c.height);
}


/* ──────────────────────────────────────────────────────────────
   WEB AUDIO — paper rustle
   ────────────────────────────────────────────────────────────── */
let audioCtx;

function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playPaperRustle() {
  try {
    ensureAudioCtx();
    const duration = 1.2;
    const bufLen = audioCtx.sampleRate * duration;
    const buf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);

    const src  = audioCtx.createBufferSource();
    src.buffer = buf;
    const bp   = audioCtx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3400; bp.Q.value = .7;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(.22, audioCtx.currentTime + .08);
    gain.gain.exponentialRampToValueAtTime(.001, audioCtx.currentTime + duration);

    src.connect(bp); bp.connect(gain); gain.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + duration);
  } catch (e) { /* silently skip */ }
}


/* ──────────────────────────────────────────────────────────────
   WEB AUDIO — ambient music toggle
   ────────────────────────────────────────────────────────────── */
let musicNodes = null;
let musicPlaying = false;

function initMusic() {
  const btn = document.getElementById('musicToggle');
  if (btn) btn.addEventListener('click', toggleMusic);
}

function buildMusicNodes() {
  ensureAudioCtx();
  const master = audioCtx.createGain();
  master.gain.value = 0;
  master.connect(audioCtx.destination);

  // Soft pad chord (Ab major voicing)
  const freqs = [207.65, 261.63, 311.13, 415.30, 523.25];
  freqs.forEach(f => {
    const o = audioCtx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f + (Math.random() - .5) * .6;
    const g = audioCtx.createGain();
    g.gain.value = .055 / freqs.length;
    o.connect(g); g.connect(master);
    o.start();
  });

  // Quiet breath layer
  const bufLen = audioCtx.sampleRate * 4;
  const noiseBuf = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) nd[i] = (Math.random() * 2 - 1) * .012;
  const noise = audioCtx.createBufferSource();
  noise.buffer = noiseBuf; noise.loop = true;
  const nLp = audioCtx.createBiquadFilter();
  nLp.type = 'lowpass'; nLp.frequency.value = 320;
  noise.connect(nLp); nLp.connect(master);
  noise.start();

  musicNodes = { master };
}

function toggleMusic() {
  ensureAudioCtx();
  const btn  = document.getElementById('musicToggle');
  const icon = document.getElementById('musicIcon');
  if (!musicNodes) buildMusicNodes();

  if (musicPlaying) {
    musicNodes.master.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.5);
    musicPlaying = false;
    if (btn)  btn.classList.remove('is-playing');
    if (icon) icon.textContent = '♪';
  } else {
    musicNodes.master.gain.linearRampToValueAtTime(.9, audioCtx.currentTime + 2);
    musicPlaying = true;
    if (btn)  btn.classList.add('is-playing');
    if (icon) icon.textContent = '♫';
  }
}


/* ──────────────────────────────────────────────────────────────
   CONFETTI
   ────────────────────────────────────────────────────────────── */
function fireConfetti() {
  if (typeof confetti !== 'function') return;
  const gold = ['#c9a84c','#dfc070','#f0dfa0','#b8922e','#faf6ef'];
  const origin = { y: .65 };
  confetti({ particleCount:55, spread:55, startVelocity:38, colors:gold, origin:{ x:.25, ...origin } });
  setTimeout(() => confetti({ particleCount:55, spread:55, startVelocity:38, colors:gold, origin:{ x:.75, ...origin } }), 220);
  setTimeout(() => confetti({ particleCount:30, spread:75, startVelocity:28, colors:gold, scalar:.75, origin:{ x:.5, ...origin } }), 480);
}


/* ──────────────────────────────────────────────────────────────
   ENVELOPE ANIMATION
   ────────────────────────────────────────────────────────────── */
let envelopeOpened = false;

function initEnvelope() {
  const env = document.querySelector('.envelope');
  if (!env) return;
  env.addEventListener('click', openEnvelope);
  env.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openEnvelope(); });
  env.setAttribute('role','button');
  env.setAttribute('tabindex','0');
}

async function openEnvelope() {
  if (envelopeOpened) return;
  envelopeOpened = true;

  const seal   = document.querySelector('.wax-seal');
  const flap   = document.querySelector('.env-flap');
  const card   = document.querySelector('.env-card');
  const veil   = document.querySelector('.quote-veil');
  const tapCue = document.querySelector('.tap-cue');

  if (tapCue) tapCue.style.opacity = '0';
  document.querySelector('.envelope')?.classList.add('is-opening');

  playPaperRustle();

  seal?.classList.add('is-breaking');
  await delay(500);

  playPaperRustle();
  flap?.classList.add('is-open');
  await delay(700);

  card?.classList.add('is-rising');
  await delay(1800);

  if (veil) {
    veil.classList.add('is-visible');
    await delay(CONFIG.quoteDuration);
    veil.classList.remove('is-visible');
    await delay(900);
  }

  transitionToInvitation();
}

function transitionToInvitation() {
  const landing    = document.getElementById('scene-landing');
  const invitation = document.getElementById('scene-invitation');

  landing.style.transition    = 'opacity 1.1s ease';
  landing.style.opacity       = '0';
  landing.style.pointerEvents = 'none';

  setTimeout(() => {
    landing.classList.remove('scene--active');
    invitation.classList.add('scene--active');
    document.body.style.overflow = 'auto';
    killParticles();
    setTimeout(fireConfetti, CONFIG.confettiDelay);
    initScrollReveal();
    initCountdown();
    initParallax();
    initGallery();
    applyGuestPersonalization();
  }, 1100);
}


/* ──────────────────────────────────────────────────────────────
   COUNTDOWN
   ────────────────────────────────────────────────────────────── */
function initCountdown() {
  const el = document.getElementById('countdown');
  if (!el) return;
  el.style.display = 'block';
  tick();
  setInterval(tick, 1000);

  function tick() {
    const diff = CONFIG.eventDate - Date.now();
    if (diff <= 0) {
      ['cd-days','cd-hours','cd-mins'].forEach(id => { const e = document.getElementById(id); if(e) e.textContent = '0'; });
      return;
    }
    const days  = Math.floor(diff / 864e5);
    const hours = Math.floor((diff % 864e5) / 36e5);
    const mins  = Math.floor((diff % 36e5)  / 6e4);
    document.getElementById('cd-days').textContent  = days;
    document.getElementById('cd-hours').textContent = hours;
    document.getElementById('cd-mins').textContent  = String(mins).padStart(2,'0');
  }
}


/* ──────────────────────────────────────────────────────────────
   PARALLAX
   ────────────────────────────────────────────────────────────── */
function initParallax() {
  const portrait = document.querySelector('.portrait');
  if (!portrait || window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  portrait.classList.add('parallax-active');
  const scene = document.getElementById('scene-invitation');
  scene.addEventListener('scroll', () => {
    portrait.style.transform = `translateY(${scene.scrollTop * .12}px)`;
  }, { passive: true });
}


/* ──────────────────────────────────────────────────────────────
   SCROLL REVEAL
   ────────────────────────────────────────────────────────────── */
function initScrollReveal() {
  const targets = document.querySelectorAll('.reveal');
  if (!targets.length) return;
  const root = document.getElementById('scene-invitation');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); }
    });
  }, { root, rootMargin:'0px 0px -40px 0px', threshold:.12 });
  targets.forEach(t => io.observe(t));
}


/* ──────────────────────────────────────────────────────────────
   GALLERY
   ────────────────────────────────────────────────────────────── */
function initGallery() {
  const section = document.getElementById('gallery');
  const grid    = document.getElementById('galleryGrid');
  const lb      = document.getElementById('galleryLightbox');
  const lbImg   = document.getElementById('galleryLbImg');
  const lbClose = document.getElementById('galleryLbClose');
  if (!section || !grid) return;

  CONFIG.galleryPhotos.forEach((src, i) => {
    const img = new Image();
    img.onload = () => {
      section.removeAttribute('hidden');
      const item = document.createElement('div');
      item.className = 'gallery-item reveal';
      const el = document.createElement('img');
      el.src = src; el.alt = `A memory with Gail`;
      el.loading = 'lazy';
      item.appendChild(el);
      item.addEventListener('click', () => openLb(src));
      grid.appendChild(item);

      const root = document.getElementById('scene-invitation');
      const io = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
      }, { root, threshold:.1 });
      io.observe(item);
    };
    img.src = src;
  });

  function openLb(src) {
    if (!lb || !lbImg) return;
    lbImg.src = src;
    lb.classList.add('is-open');
    document.addEventListener('keydown', escLb);
  }
  function closeLb() {
    if (!lb) return;
    lb.classList.remove('is-open');
    document.removeEventListener('keydown', escLb);
  }
  function escLb(e) { if (e.key === 'Escape') closeLb(); }

  if (lb) lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });
  if (lbClose) lbClose.addEventListener('click', closeLb);
  window.invitation = window.invitation || {};
  window.invitation.closeLightbox = closeLb;
}


/* ──────────────────────────────────────────────────────────────
   GUEST PERSONALIZATION  (?guest=Name&message=Text)
   ────────────────────────────────────────────────────────────── */
function applyGuestPersonalization() {
  const params  = new URLSearchParams(window.location.search);
  const guest   = params.get('guest');
  const message = params.get('message');

  if (guest) {
    const eyebrow = document.querySelector('.inv__eyebrow');
    if (eyebrow) eyebrow.textContent = `An Invitation for ${decodeURIComponent(guest)}`;
    const rsvpField = document.getElementById('rsvp-name');
    if (rsvpField) rsvpField.value = decodeURIComponent(guest);
  }

  if (message) {
    const msgEl = document.getElementById('personalMsg');
    const txt   = document.getElementById('personalMsgText');
    if (msgEl && txt) {
      txt.textContent = decodeURIComponent(message);
      msgEl.removeAttribute('hidden');
    }
  }
}


/* ──────────────────────────────────────────────────────────────
   RSVP MODAL
   ────────────────────────────────────────────────────────────── */
function initRSVP() {
  const form = document.getElementById('rsvpForm');
  if (form) form.addEventListener('submit', handleRSVPSubmit);
}

function openRSVP() {
  const modal = document.getElementById('rsvpModal');
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => { const f = document.getElementById('rsvp-name'); if (f) f.focus(); }, 100);
  document.addEventListener('keydown', rsvpEsc);
}

function closeRSVP() {
  const modal = document.getElementById('rsvpModal');
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', rsvpEsc);
}

function rsvpEsc(e) { if (e.key === 'Escape') closeRSVP(); }

function selectAttending(btn) {
  document.querySelectorAll('.rsvp-attending__btn').forEach(b => b.classList.remove('is-selected'));
  btn.classList.add('is-selected');
  document.getElementById('rsvp-attending').value = btn.dataset.val;
}

function handleRSVPSubmit(e) {
  e.preventDefault();
  const name     = document.getElementById('rsvp-name')?.value.trim()    || '';
  const attending= document.getElementById('rsvp-attending')?.value       || '';
  const guests   = document.getElementById('rsvp-guests')?.value          || '1';
  const msg      = document.getElementById('rsvp-msg')?.value.trim()      || '';

  if (!name) { alert('Please enter your name.'); return; }

  const body = [
    `Name: ${name}`,
    `Attending: ${attending || 'Not specified'}`,
    `Number of guests: ${guests}`,
    msg ? `Message: ${msg}` : '',
  ].filter(Boolean).join('\n');

  window.location.href = `mailto:?body=${encodeURIComponent(body)}&subject=${encodeURIComponent("RSVP – Gail's 65th Birthday")}`;

  const card = document.querySelector('.rsvp-modal__card');
  if (card) {
    const headline = attending === 'No' ? "We'll miss you!" : "We can't wait to celebrate!";
    const subline  = attending === 'No' ? 'Thank you for letting us know.' : 'See you on August 13th.';
    card.innerHTML = '<div style="text-align:center;padding:2rem 1rem">'
      + '<p style="font-family:\'Cormorant Garamond\',serif;font-size:2rem;font-style:italic;color:#221c16;margin-bottom:.5rem">' + headline + '</p>'
      + '<p style="font-family:\'Lato\',sans-serif;font-size:.82rem;letter-spacing:.1em;color:#7a6a58;margin-bottom:1.5rem">' + subline + '</p>'
      + '<button onclick="window.invitation.closeRSVP()" style="padding:.75rem 2rem;background:#8a6620;color:#faf6ef;border:none;border-radius:2px;font-family:\'Lato\',sans-serif;font-size:.72rem;letter-spacing:.2em;text-transform:uppercase;cursor:pointer">Close</button>'
      + '</div>';
  }
}


/* ──────────────────────────────────────────────────────────────
   ADD TO CALENDAR (ICS)
   ────────────────────────────────────────────────────────────── */
function addToCalendar() {
  const pad = n => String(n).padStart(2,'0');
  const fmt = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
  const start = new Date('2025-08-13T17:00:00');
  const end   = new Date('2025-08-14T00:00:01');
  const ics = [
    'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Gails65th//EN',
    'BEGIN:VEVENT',
    `DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,
    `SUMMARY:Gail's 65th Birthday Celebration`,
    'DESCRIPTION:Dinner at Villagio Condos\\, then dancing at Vic Lam Cavern at Clavet Motor Inn.',
    'LOCATION:103A–310 Wellman Crescent\\, Villagio Condos',
    'END:VEVENT','END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));
  a.download = 'gails-65th.ics';
  a.click(); URL.revokeObjectURL(a.href);
}


/* ──────────────────────────────────────────────────────────────
   UTILITY
   ────────────────────────────────────────────────────────────── */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }


/* ──────────────────────────────────────────────────────────────
   PUBLIC API
   ────────────────────────────────────────────────────────────── */
window.invitation = {
  openRSVP,
  closeRSVP,
  selectAttending,
  addToCalendar,
};


/* ──────────────────────────────────────────────────────────────
   INIT
   ────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const landing = document.getElementById('scene-landing');
  if (landing) landing.classList.add('scene--active');
  initParticles();
  initEnvelope();
  initMusic();
  initRSVP();
});
