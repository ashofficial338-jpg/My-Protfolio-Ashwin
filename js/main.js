/* ==========================================================================
   Ashwin Kumar N — Portfolio interactions
   Libraries (loaded via CDN, all optional — the page works without them):
   GSAP + ScrollTrigger + Draggable, Lenis (smooth scroll)
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Helpers & environment ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const gsap = window.gsap;
  const hasGSAP = !!gsap;
  const hasST = hasGSAP && !!window.ScrollTrigger;
  const hasDraggable = hasGSAP && !!window.Draggable;
  const animate = hasGSAP && !reducedMotion;

  if (hasST) gsap.registerPlugin(window.ScrollTrigger);
  if (hasDraggable) gsap.registerPlugin(window.Draggable);

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };

  /* ---------- Smooth scrolling (Lenis) ---------- */
  let lenis = null;
  if (!reducedMotion && window.Lenis) {
    lenis = new window.Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });
    window.__lenis = lenis; // handy for debugging / programmatic scrolling
    if (hasGSAP) {
      if (hasST) lenis.on('scroll', window.ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  const scrollToTarget = (target) => {
    const navOffset = -(parseInt(getComputedStyle(root).getPropertyValue('--nav-h'), 10) || 72) + 4;
    if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : navOffset, duration: 1.4 });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    else window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + navOffset, behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  /* ---------- Year ---------- */
  $$('.year').forEach((el) => { el.textContent = new Date().getFullYear(); });

  /* ---------- Theme toggle (with circular reveal where supported) ---------- */
  const themeBtn = $('.theme-toggle');
  const metaTheme = $('meta[name="theme-color"]');
  const applyTheme = (theme) => {
    root.setAttribute('data-theme', theme);
    store.set('akn-theme', theme);
    if (metaTheme) metaTheme.setAttribute('content', theme === 'light' ? '#F5F4F0' : '#0B0B0F');
    themeBtn.setAttribute('aria-label', theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
    document.dispatchEvent(new CustomEvent('themechange'));
  };
  themeBtn.setAttribute('aria-label', root.dataset.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  themeBtn.addEventListener('click', () => {
    const next = root.dataset.theme === 'light' ? 'dark' : 'light';
    if (!document.startViewTransition || reducedMotion) return applyTheme(next);

    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    const transition = document.startViewTransition(() => applyTheme(next));
    transition.ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 750, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  });

  /* ---------- Split hero name into letters ---------- */
  const heroTitle = $('#hero-title');
  if (heroTitle) heroTitle.setAttribute('aria-label', "Hi, I'm Ashwin Kumar N");
  $$('[data-split]').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.textContent = '';
    el.setAttribute('aria-hidden', 'true');
    words.forEach((word, wi) => {
      const w = document.createElement('span');
      w.className = 'word';
      [...word].forEach((ch) => {
        const c = document.createElement('span');
        c.className = 'char';
        c.textContent = ch;
        w.appendChild(c);
      });
      el.appendChild(w);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  });

  /* ---------- Navigation ---------- */
  const nav = $('.nav');
  const navLinks = $$('.nav__link');
  const pill = $('.nav__pill');
  const burger = $('.nav__burger');
  const mobileMenu = $('#mobile-menu');
  let menuOpen = false;

  const movePill = (link) => {
    if (!pill) return;
    if (!link) { pill.style.opacity = '0'; return; }
    pill.style.opacity = '1';
    pill.style.width = `${link.offsetWidth}px`;
    pill.style.transform = `translateX(${link.offsetLeft}px)`;
  };

  // Active section highlight
  const sectionIds = ['about', 'skills', 'projects', 'experience', 'achievements', 'education', 'contact'];
  const linkFor = { achievements: 'experience' }; // sections without their own nav link
  const setActive = (id) => {
    const target = linkFor[id] || id;
    let active = null;
    navLinks.forEach((a) => {
      const on = a.getAttribute('href') === `#${target}`;
      a.classList.toggle('is-active', on);
      if (on) { a.setAttribute('aria-current', 'true'); active = a; } else a.removeAttribute('aria-current');
    });
    movePill(active);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sectionIds.forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
    const hero = $('#hero');
    if (hero) new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(null); }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
  }
  window.addEventListener('resize', () => movePill($('.nav__link.is-active')));

  // Mobile menu
  const menuLinks = $$('#mobile-menu a');
  const toggleMenu = (open) => {
    menuOpen = open;
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      mobileMenu.hidden = false;
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
      nav.classList.remove('is-hidden');
      if (animate) gsap.fromTo(menuLinks, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.05, ease: 'power3.out' });
      menuLinks[0] && menuLinks[0].focus({ preventScroll: true });
    } else {
      mobileMenu.hidden = true;
      document.body.style.overflow = '';
      if (lenis) lenis.start();
    }
  };
  burger.addEventListener('click', () => toggleMenu(!menuOpen));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) { toggleMenu(false); burger.focus(); }
  });
  window.addEventListener('resize', () => { if (menuOpen && innerWidth > 1100) toggleMenu(false); });

  // In-page anchor links (smooth + accessible focus)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const href = a.getAttribute('href');
    e.preventDefault(); // also stops placeholder "#" links from jumping/downloading
    if (href === '#') return;
    if (menuOpen) toggleMenu(false);
    if (href === '#hero' || href === '#top') { scrollToTarget(0); return; }
    const target = document.querySelector(href);
    if (!target) return;
    scrollToTarget(target);
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    history.replaceState(null, '', href);
  });

  /* ---------- Scroll: progress bar, nav state, back-to-top ring ---------- */
  const progressBar = $('.scroll-progress span');
  const topRing = $('.to-top__ring circle');
  const RING = 138.2;
  let lastY = window.scrollY;
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? clamp(y / max, 0, 1) : 0;
    progressBar.style.transform = `scaleX(${p})`;
    if (topRing) topRing.style.strokeDashoffset = String(RING * (1 - p));

    nav.classList.toggle('is-scrolled', y > 40);
    if (!menuOpen) nav.classList.toggle('is-hidden', y > lastY && y > 700);
    lastY = y;
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();
  if (topRing) { topRing.style.strokeDasharray = String(RING); topRing.style.strokeDashoffset = String(RING); }

  /* ---------- Custom cursor ---------- */
  if (finePointer && !reducedMotion) {
    root.classList.add('has-cursor');
    const cursor = $('.cursor');
    const dot = $('.cursor__dot');
    const ring = $('.cursor__ring');
    const label = $('.cursor__label');
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      cursor.classList.remove('is-hidden');
    }, { passive: true });

    let looping = false;
    const loop = () => {
      rx += (mx - rx) * 0.2;
      ry += (my - ry) * 0.2;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      if (Math.abs(mx - rx) > 0.1 || Math.abs(my - ry) > 0.1) requestAnimationFrame(loop);
      else looping = false;
    };
    window.addEventListener('mousemove', () => {
      if (!looping) { looping = true; requestAnimationFrame(loop); }
    }, { passive: true });

    const labels = { drag: 'Drag', view: 'View' };
    document.addEventListener('mouseover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const interactive = e.target.closest('a, button, .tab, label');
      if (labelled && labels[labelled.dataset.cursor]) {
        label.textContent = labels[labelled.dataset.cursor];
        cursor.classList.add('is-label');
        cursor.classList.remove('is-hover');
      } else if (interactive) {
        cursor.classList.add('is-hover');
        cursor.classList.remove('is-label');
      } else {
        cursor.classList.remove('is-hover', 'is-label');
      }
    });
    document.addEventListener('mousedown', () => cursor.classList.add('is-down'));
    document.addEventListener('mouseup', () => cursor.classList.remove('is-down'));
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && animate) {
    $$('[data-magnetic]').forEach((el) => {
      const strength = el.classList.contains('social') || el.classList.contains('to-top') ? 0.45 : 0.28;
      const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
      const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * strength);
        yTo((e.clientY - (r.top + r.height / 2)) * strength);
      });
      el.addEventListener('mouseleave', () => {
        gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1, 0.35)' });
      });
    });
  }

  /* ---------- 3D tilt cards ---------- */
  if (finePointer && animate) {
    $$('[data-tilt]').forEach((el) => {
      const glare = document.createElement('span');
      glare.className = 'tilt-glare';
      glare.setAttribute('aria-hidden', 'true');
      el.appendChild(glare);
      const max = el.classList.contains('project--flagship') ? 3.5 : 7;
      gsap.set(el, { transformPerspective: 1000 });
      const rxTo = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });
      const ryTo = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });

      el.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || el.classList.contains('no-tilt')) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        ryTo((px - 0.5) * max * 2);
        rxTo((0.5 - py) * max * 2);
        el.style.setProperty('--mx', `${px * 100}%`);
        el.style.setProperty('--my', `${py * 100}%`);
      });
      el.addEventListener('pointerleave', () => {
        rxTo(0); ryTo(0);
      });
    });
  }

  /* ---------- Hero: interactive particle network ---------- */
  const heroCanvas = () => {
    const canvas = $('.hero__canvas');
    const hero = $('#hero');
    if (!canvas || !canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const LINK = 120;
    const MOUSE_R = 170;
    let w = 0, h = 0, particles = [], rgb = '160,160,255';
    let running = true;
    const mouse = { x: -9999, y: -9999 };

    const readColor = () => {
      rgb = getComputedStyle(root).getPropertyValue('--particle').trim().replace(/\s+/g, '') || rgb;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(innerWidth < 720 ? 35 : 70, Math.floor((w * h) / 18000));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
      }));
    };

    const buckets = [[], [], []];
    const ALPHAS = [0.2, 0.12, 0.05];
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      buckets[0].length = buckets[1].length = buckets[2].length = 0;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!reducedMotion) {
          // Gentle repulsion from the cursor
          const dx = p.x - mouse.x, dy = p.y - mouse.y;
          const d = Math.hypot(dx, dy);
          if (d < MOUSE_R && d > 0) {
            const f = (1 - d / MOUSE_R) * 0.6;
            p.vx += (dx / d) * f * 0.12;
            p.vy += (dy / d) * f * 0.12;
          }
          p.vx *= 0.985; p.vy *= 0.985;
          // Keep a minimum drift so the field never freezes
          if (Math.abs(p.vx) < 0.05) p.vx += (Math.random() - 0.5) * 0.05;
          if (Math.abs(p.vy) < 0.05) p.vy += (Math.random() - 0.5) * 0.05;
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
          p.x = clamp(p.x, 0, w); p.y = clamp(p.y, 0, h);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},0.7)`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < LINK * LINK) {
            // Bucket lines by strength so we stroke 3 paths instead of hundreds
            const k = dist2 < LINK * LINK * 0.16 ? 0 : dist2 < LINK * LINK * 0.49 ? 1 : 2;
            buckets[k].push(p.x, p.y, q.x, q.y);
          }
        }

        // Lines to the cursor
        const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        if (md < MOUSE_R) {
          ctx.strokeStyle = `rgba(168,85,247,${(1 - md / MOUSE_R) * 0.55})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) {
        const b = buckets[k];
        if (!b.length) continue;
        ctx.strokeStyle = `rgba(${rgb},${ALPHAS[k]})`;
        ctx.beginPath();
        for (let n = 0; n < b.length; n += 4) { ctx.moveTo(b[n], b[n + 1]); ctx.lineTo(b[n + 2], b[n + 3]); }
        ctx.stroke();
      }
    };

    document.addEventListener('visibilitychange', () => { running = !document.hidden; });
    const loop = () => {
      if (running) draw();
      if (!reducedMotion) requestAnimationFrame(loop);
    };

    readColor();
    resize();
    loop();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); if (reducedMotion) draw(); }, 150);
    });
    document.addEventListener('themechange', () => { readColor(); if (reducedMotion) draw(); });

    hero.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

    // Pause when the hero is off-screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { running = e.isIntersecting; }).observe(hero);
    }

    // Subtle parallax of the code card with the mouse
    if (animate && finePointer) {
      const visual = $('[data-hero-visual]');
      const xTo = gsap.quickTo(visual, 'x', { duration: 1.2, ease: 'power3.out' });
      const yTo = gsap.quickTo(visual, 'y', { duration: 1.2, ease: 'power3.out' });
      hero.addEventListener('mousemove', (e) => {
        xTo((e.clientX / innerWidth - 0.5) * -24);
        yTo((e.clientY / innerHeight - 0.5) * -24);
      });
    }
  };
  heroCanvas();

  /* ---------- Rotating typewriter ---------- */
  const startTypewriter = () => {
    const el = $('.typewriter');
    if (!el) return;
    const words = ['Full Stack Developer', 'React.js Specialist', 'MERN Stack Engineer', 'Finance-to-Tech Problem Solver'];

    if (reducedMotion) {
      // No typing effect — swap whole phrases calmly
      let i = 0;
      setInterval(() => { i = (i + 1) % words.length; el.textContent = words[i]; }, 3000);
      return;
    }

    let wi = 0, ci = words[0].length, deleting = true;
    const tick = () => {
      const word = words[wi];
      let delay;
      if (deleting) {
        ci--;
        delay = 38;
        if (ci <= 0) { deleting = false; wi = (wi + 1) % words.length; delay = 350; }
      } else {
        ci++;
        delay = 75 + Math.random() * 40;
        if (ci >= words[wi].length) { deleting = true; delay = 1900; }
      }
      el.textContent = (deleting ? word : words[wi]).slice(0, Math.max(ci, 0));
      setTimeout(tick, delay);
    };
    setTimeout(tick, animate ? 5000 : 2500);
  };

  /* ---------- Skills: filter + draggable chips ---------- */
  const filterBtns = $$('.tab');
  const skillCards = $$('.skill-card');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filterBtns.forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      skillCards.forEach((card) => card.classList.toggle('is-dim', f !== 'all' && card.dataset.cat !== f));
      if (animate) {
        const chips = f === 'all' ? $$('.chip') : $$(`.skill-card[data-cat="${f}"] .chip`);
        gsap.fromTo(chips, { scale: 0.8, y: 8 }, { scale: 1, y: 0, duration: 0.7, stagger: 0.025, ease: 'back.out(2.5)', overwrite: 'auto' });
      }
    });
  });

  if (hasDraggable && finePointer) {
    $$('.chip').forEach((chip) => {
      chip.classList.add('is-draggable');
      const card = chip.closest('.skill-card');
      window.Draggable.create(chip, {
        type: 'x,y',
        bounds: '#skills',
        zIndexBoost: false,
        onPress() {
          card.classList.add('no-tilt');
          card.style.zIndex = '5';
          gsap.to(card, { rotationX: 0, rotationY: 0, duration: 0.4 });
          gsap.to(chip, { scale: 1.08, duration: 0.3, ease: 'power3.out' });
        },
        onDragStart() { chip.classList.add('is-dragging'); },
        onDrag() {
          gsap.to(chip, { rotation: clamp(this.deltaX * 1.8, -18, 18), duration: 0.35, overwrite: 'auto' });
        },
        onRelease() {
          chip.classList.remove('is-dragging');
          card.classList.remove('no-tilt');
          gsap.to(chip, {
            x: 0, y: 0, rotation: 0, scale: 1,
            duration: reducedMotion ? 0.2 : 1.2,
            ease: reducedMotion ? 'power2.out' : 'elastic.out(1, 0.35)',
            onComplete: () => { card.style.zIndex = ''; },
          });
        },
      });
    });
  } else {
    // Touch devices: chips float gently instead of being draggable (keeps scrolling smooth)
    const note = $('.skills .section-note');
    if (note) note.lastChild.textContent = ' Tap a category to focus the stack.';
    if (animate) {
      $$('.chip').forEach((chip, i) => {
        gsap.to(chip, { y: gsap.utils.random(-4, 4), duration: gsap.utils.random(2, 3.2), repeat: -1, yoyo: true, ease: 'sine.inOut', delay: i * 0.05 });
      });
    }
  }

  /* ---------- Counters ---------- */
  const counters = $$('[data-count]');
  const setFinal = (el) => { el.textContent = parseFloat(el.dataset.count).toFixed(+el.dataset.decimals || 0); };
  if (animate && hasST) {
    counters.forEach((el) => {
      const target = parseFloat(el.dataset.count);
      const dec = +el.dataset.decimals || 0;
      const obj = { v: 0 };
      window.ScrollTrigger.create({
        trigger: el,
        start: 'top 90%',
        once: true,
        onEnter: () => gsap.to(obj, { v: target, duration: 2.2, ease: 'power3.out', onUpdate: () => { el.textContent = obj.v.toFixed(dec); } }),
      });
    });
  } else {
    counters.forEach(setFinal);
  }

  /* ---------- Contact form ---------- */
  const form = $('.form');
  const success = $('.form-success');
  const EMAIL = 'ashofficial338@gmail.com';
  const rules = {
    name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
    email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Please enter a valid email address.'),
    message: (v) => (v.trim().length >= 10 ? '' : 'A few more words, please (10+ characters).'),
  };
  const validateField = (input) => {
    const msg = rules[input.name] ? rules[input.name](input.value) : '';
    const field = input.closest('.field');
    field.classList.toggle('is-invalid', !!msg);
    input.setAttribute('aria-invalid', String(!!msg));
    $('.field__error', field).textContent = msg;
    return !msg;
  };
  if (form) {
    const inputs = $$('input, textarea', form);
    inputs.forEach((input) => {
      input.addEventListener('blur', () => { if (input.value) validateField(input); });
      input.addEventListener('input', () => { if (input.closest('.field').classList.contains('is-invalid')) validateField(input); });
    });

    const btn = $('.form__submit', form);
    const btnText = $('.form__submit-text', form);

    const showSuccess = (mode) => {
      $('.form-success__text', success).textContent = mode === 'mailto'
        ? 'Your email app should open with the message ready. Just hit send and I\'ll get back to you soon.'
        : 'Thanks for reaching out. I\'ll get back to you soon.';
      const reveal = () => {
        form.hidden = true;
        success.hidden = false;
        requestAnimationFrame(() => success.classList.add('is-shown'));
        if (animate) gsap.from(success.children, { y: 20, opacity: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' });
        $('.form-success__reset', success).focus({ preventScroll: true });
      };
      if (animate) gsap.to(form, { opacity: 0, y: -20, duration: 0.4, onComplete: reveal });
      else reveal();
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const results = inputs.map(validateField);
      if (results.includes(false)) {
        inputs[results.indexOf(false)].focus();
        if (animate) gsap.fromTo(form, { x: -8 }, { x: 0, duration: 0.5, ease: 'elastic.out(1, 0.3)' });
        return;
      }

      btn.classList.add('is-loading');
      btnText.textContent = 'Sending';
      const data = new FormData(form);
      const endpoint = form.dataset.endpoint;

      try {
        if (endpoint) {
          const res = await fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          showSuccess('sent');
        } else {
          // No backend configured — hand off to the visitor's email client.
          const subject = `Portfolio enquiry from ${data.get('name')}`;
          const body = `${data.get('message')}\n\n— ${data.get('name')} (${data.get('email')})`;
          window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
          showSuccess('mailto');
        }
      } catch (err) {
        const field = $('.field:last-of-type', form);
        $('.field__error', field).textContent = `Something went wrong. Please email me directly at ${EMAIL}.`;
      } finally {
        btn.classList.remove('is-loading');
        btnText.textContent = 'Send Message';
      }
    });

    $('.form-success__reset', success).addEventListener('click', () => {
      form.reset();
      inputs.forEach((i) => { i.closest('.field').classList.remove('is-invalid'); i.removeAttribute('aria-invalid'); });
      success.classList.remove('is-shown');
      success.hidden = true;
      form.hidden = false;
      if (hasGSAP) gsap.fromTo(form, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: reducedMotion ? 0 : 0.6, ease: 'power3.out' });
      inputs[0].focus();
    });
  }

  /* ---------- Scroll-triggered animations ---------- */
  const setupScrollAnimations = () => {
    if (!animate || !hasST) return;

    $$('[data-reveal]').forEach((el) => {
      gsap.from(el, {
        y: 60, opacity: 0, duration: 1.2, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      });
    });

    $$('[data-reveal-stagger]').forEach((group) => {
      gsap.from(group.children, {
        y: 50, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: group, start: 'top 86%', once: true },
      });
    });

    // Section titles get an extra skew for character
    $$('.section-title').forEach((el) => {
      gsap.from(el, { skewY: 4, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    // Finance → Code journey
    gsap.from('.journey__row', {
      x: -30, opacity: 0, duration: 0.9, stagger: 0.12, ease: 'power3.out',
      scrollTrigger: { trigger: '.journey', start: 'top 75%', once: true },
    });
    gsap.fromTo('.journey__line span', { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.journey', start: 'top 80%', end: 'bottom 55%', scrub: true },
    });

    // Timeline: line draws on scroll, items slide in, dots light up
    gsap.to('.timeline__progress', {
      scaleY: 1, ease: 'none',
      scrollTrigger: { trigger: '.timeline', start: 'top 65%', end: 'bottom 65%', scrub: 0.6 },
    });
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 961px)', narrow: '(max-width: 960px)' }, (ctx) => {
      $$('.tl-item').forEach((item, i) => {
        const fromX = ctx.conditions.wide ? (i % 2 === 0 ? 70 : -70) : 40;
        gsap.from($('.tl-card', item), {
          x: fromX, opacity: 0, duration: 1.1, ease: 'power3.out',
          scrollTrigger: { trigger: item, start: 'top 82%', once: true },
        });
      });
    });
    $$('.tl-item').forEach((item) => {
      window.ScrollTrigger.create({
        trigger: item, start: 'top 65%',
        onEnter: () => item.classList.add('is-active'),
        onLeaveBack: () => item.classList.remove('is-active'),
      });
    });

    // Project mockups: gentle inner parallax
    $$('.project .mock').forEach((mock) => {
      gsap.fromTo(mock, { yPercent: 6 }, {
        yPercent: -6, ease: 'none',
        scrollTrigger: { trigger: mock.closest('.project'), start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });

    // Marquee skews with scroll velocity
    const marquee = $('.marquee__track');
    const skewTo = gsap.quickTo(marquee, 'skewX', { duration: 0.5, ease: 'power3.out' });
    window.ScrollTrigger.create({
      onUpdate: (self) => skewTo(clamp(self.getVelocity() / -300, -12, 12)),
    });

    // Footer name rises in
    gsap.from('.footer__big', {
      yPercent: 50, opacity: 0, ease: 'none',
      scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true },
    });
  };

  /* ---------- Intro: preloader → hero reveal ---------- */
  const preloader = $('.preloader');
  const removePreloader = () => {
    if (preloader) preloader.remove();
    document.body.classList.remove('is-loading');
  };

  if (!animate) {
    removePreloader();
    $$('.journey__line span').forEach((s) => { s.style.transform = 'none'; });
    $$('.timeline__progress').forEach((s) => { s.style.transform = 'none'; });
    $$('.tl-item').forEach((i) => i.classList.add('is-active'));
    startTypewriter();
    return;
  }

  document.body.classList.add('is-loading');
  if (lenis) lenis.stop();

  // Hero intro is built paused so its start state is applied before the curtain lifts
  gsap.set('.hero__name .char', { willChange: 'transform' });
  const intro = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' }, onComplete: () => gsap.set('.hero__name .char', { willChange: 'auto' }) })
    .from('.hero__name .char', { yPercent: 115, rotate: 6, duration: 1.2, stagger: 0.04 })
    .from('[data-hero-fade]', { y: 26, opacity: 0, duration: 1, stagger: 0.08, ease: 'power3.out' }, '-=0.85')
    .from('[data-hero-visual]', { y: 60, opacity: 0, scale: 0.94, duration: 1.4, ease: 'power3.out' }, '-=1.1')
    .from('.nav__inner', { y: -24, opacity: 0, duration: 0.9, ease: 'power3.out' }, '<')
    .from('.scroll-cue', { opacity: 0, y: 10, duration: 0.8 }, '-=0.6');

  const counter = { v: 0 };
  const countEl = $('.preloader__count');
  const barEl = $('.preloader__bar span');
  gsap.timeline()
    .to(counter, {
      v: 100, duration: 1.5, ease: 'power2.inOut',
      onUpdate: () => {
        countEl.textContent = String(Math.round(counter.v));
        barEl.style.transform = `scaleX(${counter.v / 100})`;
      },
    })
    .to('.preloader__inner', { opacity: 0, y: -20, duration: 0.45, ease: 'power2.in' })
    .to(preloader, { yPercent: -100, duration: 1, ease: 'power4.inOut' })
    .add(() => intro.play(), '-=0.45')
    .add(() => {
      removePreloader();
      if (lenis) lenis.start();
      setupScrollAnimations();
      window.ScrollTrigger && window.ScrollTrigger.refresh();
    });

  startTypewriter();
})();
