(() => {
  const doc = document.documentElement;
  doc.classList.add('js');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ---------- Mobile drawer ---------- */
  const nav = $('.nav');
  const burger = $('.nav__burger');
  const drawer = $('#drawer');
  const drawerOpen = () => burger.getAttribute('aria-expanded') === 'true';
  const setDrawer = (open) => {
    burger.setAttribute('aria-expanded', open);
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    drawer.hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-scrolled', open || scrollY > 40);
  };
  burger.addEventListener('click', () => setDrawer(!drawerOpen()));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a')) setDrawer(false); });
  matchMedia('(min-width: 961px)').addEventListener('change', (e) => { if (e.matches && drawerOpen()) setDrawer(false); });

  /* ---------- Nav: solid on scroll, hide on scroll-down ---------- */
  const fab = $('.fab');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-scrolled', y > 40);
    nav.classList.toggle('is-hidden', y > 600 && y > lastY && !drawerOpen());
    fab.classList.toggle('is-visible', y > innerHeight * 0.8);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Current section highlight ---------- */
  const links = $$('.nav__links a');
  const sectionObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('is-current', a.getAttribute('href') === '#' + en.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  links.forEach((a) => { const s = $(a.getAttribute('href')); if (s) sectionObs.observe(s); });

  /* ---------- Live showroom status (Harare, CAT / UTC+2) ---------- */
  const status = $('#status');
  const updateStatus = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Harare' }));
    const day = now.getDay();
    const mins = now.getHours() * 60 + now.getMinutes();
    const hours = { 1: [540, 960], 2: [540, 960], 3: [540, 960], 4: [540, 960], 5: [540, 960], 6: [480, 780] };
    const today = hours[day];
    const open = today && mins >= today[0] && mins < today[1];
    const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
    let sub;
    if (open) sub = `Until ${fmt(today[1])} today`;
    else if (today && mins < today[0]) sub = `Opens ${fmt(today[0])} today`;
    else {
      let d = (day + 1) % 7; while (!hours[d]) d = (d + 1) % 7;
      const name = d === (day + 1) % 7 ? 'tomorrow' : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d];
      sub = `Opens ${name} at ${fmt(hours[d][0])}`;
    }
    status.classList.toggle('is-open', !!open);
    $('#status-title').textContent = open ? 'Showroom open' : 'Showroom closed';
    $('#status-sub').textContent = sub;
    $('.hero__addr').hidden = !open;
  };
  try { updateStatus(); setInterval(updateStatus, 60000); } catch (_) { /* keep static fallback */ }

  /* ---------- Reveal on scroll (with stagger) ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revealObs.unobserve(en.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  const reveals = $$('.reveal');
  reveals.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains('reveal'));
    el.style.setProperty('--delay', `${Math.min(siblings.indexOf(el), 6) * 0.085}s`);
    revealObs.observe(el);
  });
  // Observers drop entries on fast flicks and End-key jumps: sweep anything already passed
  let sweepQueued = false;
  addEventListener('scroll', () => {
    if (sweepQueued) return;
    sweepQueued = true;
    requestAnimationFrame(() => {
      sweepQueued = false;
      reveals.forEach((el) => {
        if (!el.classList.contains('is-in') && el.getBoundingClientRect().top < innerHeight) { el.classList.add('is-in'); revealObs.unobserve(el); }
      });
    });
  }, { passive: true });

  /* ---------- Count-up ---------- */
  $$('[data-count]').forEach((el) => {
    const target = +el.dataset.count;
    if (reduceMotion) { el.textContent = target; return; }
    const obs = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      obs.disconnect();
      el.textContent = '0';
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min((t - t0) / 1600, 1);
        el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    obs.observe(el);
  });

  /* ---------- Hero carousel ---------- */
  const slides = $$('.hero__slide');
  const dots = $$('.hero__dot');
  const dotsWrap = $('.hero__dots');
  const slideLabel = $('.hero__slide-label');
  const SLIDE_MS = 7000;
  let current = 0;
  let slideTimer = null;
  doc.style.setProperty('--slide-ms', `${SLIDE_MS}ms`);
  const goTo = (i) => {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle('is-active', k === current));
    dots.forEach((d, k) => {
      d.classList.toggle('is-active', k === current);
      d.classList.toggle('is-done', k < current);
      if (k === current) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
    });
    slideLabel.textContent = slides[current].dataset.label;
  };
  const autoplay = () => {
    clearInterval(slideTimer);
    if (reduceMotion || document.hidden) return;
    slideTimer = setInterval(() => goTo(current + 1), SLIDE_MS);
  };
  dots.forEach((d, k) => d.addEventListener('click', () => { goTo(k); autoplay(); }));
  document.addEventListener('visibilitychange', autoplay);
  if (reduceMotion) dotsWrap.classList.add('is-paused');
  autoplay();

  /* ---------- Hero parallax ---------- */
  const heroMedia = $('[data-parallax]');
  if (heroMedia && !reduceMotion) {
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = Math.min(scrollY, innerHeight);
        heroMedia.style.transform = `translate3d(0, ${y * 0.18}px, 0) scale(${1 + y * 0.00012})`;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---------- Videos: play only while visible ---------- */
  const videos = $$('video');
  const vidObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      const v = en.target;
      if (en.isIntersecting && !v.dataset.userPaused && !reduceMotion) {
        if (v.preload === 'none') v.preload = 'auto';
        v.play().catch(() => {});
      } else v.pause();
    });
  }, { threshold: 0.25 });
  videos.forEach((v) => { v.removeAttribute('autoplay'); vidObs.observe(v); });

  const toggle = $('[data-video-toggle]');
  if (toggle) {
    const v = $('.reel__video');
    toggle.addEventListener('click', () => {
      if (v.paused) { delete v.dataset.userPaused; v.play(); }
      else { v.dataset.userPaused = '1'; v.pause(); }
    });
    const sync = () => {
      toggle.innerHTML = `<svg class="ico"><use href="#i-${v.paused ? 'play' : 'pause'}"/></svg>`;
      toggle.setAttribute('aria-label', v.paused ? 'Play video' : 'Pause video');
    };
    v.addEventListener('play', sync); v.addEventListener('pause', sync); sync();
  }

  /* ---------- Project filter ---------- */
  const chips = $$('.chip');
  const tiles = $$('.tile');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    chips.forEach((c) => { c.classList.toggle('is-active', c === chip); c.setAttribute('aria-selected', c === chip); });
    const f = chip.dataset.filter;
    tiles.forEach((t) => {
      const show = f === 'all' || t.dataset.cat.split(' ').includes(f);
      t.classList.toggle('is-hidden', !show);
      if (show) { t.classList.remove('is-in'); requestAnimationFrame(() => t.classList.add('is-in')); }
    });
  }));

  /* ---------- Lightbox ---------- */
  const lb = $('#lightbox');
  const lbImg = $('img', lb);
  const lbCap = $('figcaption', lb);
  let lbIndex = 0;
  let lastFocus = null;
  const visibleTiles = () => tiles.filter((t) => !t.classList.contains('is-hidden')).map((t) => $('[data-lightbox]', t));
  const show = (i) => {
    const list = visibleTiles();
    lbIndex = (i + list.length) % list.length;
    const b = list[lbIndex];
    lbImg.src = b.dataset.lightbox;
    lbImg.alt = $('img', b).alt;
    lbCap.innerHTML = b.dataset.caption;
  };
  const openLb = (btn) => {
    lastFocus = btn;
    show(visibleTiles().indexOf(btn));
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    $('.lightbox__close', lb).focus();
  };
  const closeLb = () => { lb.hidden = true; document.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
  $$('[data-lightbox]').forEach((b) => b.addEventListener('click', () => openLb(b)));
  $('.lightbox__close', lb).addEventListener('click', closeLb);
  $('.lightbox__prev', lb).addEventListener('click', () => show(lbIndex - 1));
  $('.lightbox__next', lb).addEventListener('click', () => show(lbIndex + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb) closeLb(); });
  addEventListener('keydown', (e) => {
    if (lb.hidden) { if (e.key === 'Escape' && drawerOpen()) setDrawer(false); return; }
    if (e.key === 'Escape') closeLb();
    if (e.key === 'ArrowLeft') show(lbIndex - 1);
    if (e.key === 'ArrowRight') show(lbIndex + 1);
  });

  /* ---------- Rail arrows ---------- */
  const rail = $('.rail');
  $$('[data-scroll]').forEach((b) => b.addEventListener('click', () => {
    const card = $('.room', rail);
    rail.scrollBy({ left: (+b.dataset.scroll) * (card.offsetWidth + 18), behavior: reduceMotion ? 'auto' : 'smooth' });
  }));

  /* ---------- Enquiry form → WhatsApp ---------- */
  const form = $('#enquiry');
  const note = $('#form-note');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const name = (data.get('name') || '').trim();
    const nameField = form.elements.name.closest('.field');
    if (!name) {
      nameField.classList.add('is-invalid');
      note.textContent = 'Please add your name so we know who we are chatting to.';
      form.elements.name.focus();
      return;
    }
    nameField.classList.remove('is-invalid');
    const spaces = data.getAll('space').join(', ') || 'Not specified';
    const lines = [
      `Hi EMK Kitchens, I'm ${name}.`,
      `I'd like to discuss: ${spaces}.`,
      data.get('location') && `Location: ${data.get('location')}`,
      data.get('budget') && `Budget: ${data.get('budget')}`,
      data.get('phone') && `Phone: ${data.get('phone')}`,
      data.get('message') && `\n${data.get('message')}`,
    ].filter(Boolean);
    const url = `https://wa.me/263774551982?text=${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank', 'noopener');
    note.textContent = 'Opening WhatsApp… attach your floor plan in the chat if you have one.';
  });

  /* ---------- Map: reveal the embed only once it has loaded ---------- */
  const mapFrame = $('.map iframe');
  if (mapFrame) mapFrame.addEventListener('load', () => mapFrame.classList.add('is-loaded'));

  $('#year').textContent = new Date().getFullYear();
})();
