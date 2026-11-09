/* ============================================================
   SALOOL CAFÉ — interaction layer
   ============================================================ */
(function(){
  'use strict';

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.documentElement.classList.add('js');

  /* ---------- data helpers ---------- */
  const money = n => '$' + Number(n).toFixed(2);
  const catLabel = key => (CATEGORIES.find(c => c.key === key) || {}).label || key;
  const catNote = key => (CATEGORIES.find(c => c.key === key) || {}).note || '';
  const productById = id => PRODUCTS.find(p => p.id === String(id));
  const STORE_URL = /Android/i.test(navigator.userAgent)
    ? 'https://play.google.com/store/apps/details?id=com.salool.app&hl=en-US'
    : 'https://apps.apple.com/gb/app/salool-cafe/id6754592682';
  const joinRewards = $('#joinRewards');
  if (joinRewards) joinRewards.href = STORE_URL;

  /* ---------- promo bar ---------- */
  const promo = $('#promo');
  const PROMO_KEEP = 80;
  let promoRevealed = false;
  let promoSticky = false;

  function applyPromo(){
    if (!promo) return;
    const show = promoRevealed && !promoSticky && window.scrollY < PROMO_KEEP;
    promo.classList.toggle('is-in', show);
    promo.setAttribute('aria-hidden', show ? 'false' : 'true');
    document.documentElement.style.setProperty('--promo-h', show ? promo.offsetHeight + 'px' : '0px');
  }
  function revealPromo(){
    if (!promo || promoRevealed) return;
    promoRevealed = true;
    requestAnimationFrame(applyPromo);
  }
  function promoOffset(){
    return (promo && promo.classList.contains('is-in')) ? promo.offsetHeight : 0;
  }
  if (promo){
    const cta = $('#promoCta');
    if (cta) cta.href = STORE_URL;
    let dismissed = false;
    try { dismissed = localStorage.getItem('salool_promo') === 'off'; } catch(e){}
    if (dismissed){
      promo.remove();
      promoSticky = true;
    } else {
      document.body.classList.add('has-promo');
      document.documentElement.style.setProperty('--promo-h', '0px');
      window.addEventListener('resize', applyPromo);
      $('#promoClose').addEventListener('click', () => {
        promoSticky = true;
        applyPromo();
        document.body.classList.remove('has-promo');
        try { localStorage.setItem('salool_promo', 'off'); } catch(e){}
        setTimeout(() => { if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 750);
      });
    }
  }

  const GROUPS = [
    { key: 'all', label: 'All' },
    { key: 'bestsellers', label: 'Bestsellers' },
    { key: 'hot', label: 'Hot Coffee', cats: ['Hot Coffee'] },
    { key: 'iced', label: 'Iced Coffee', cats: ['Iced Coffee'] },
    { key: 'frappe', label: 'Frappés', cats: ['Frappes'] },
    { key: 'matcha', label: 'Matcha', cats: ['Matcha'] },
    { key: 'tea', label: 'Tea', cats: ['Hot Tea', 'Iced Tea'] },
    { key: 'refresh', label: 'Refreshers', cats: ['Refresher'] },
    { key: 'smoothie', label: 'Smoothies', cats: ['Smoothies'] },
    { key: 'bakery', label: 'Bakery', cats: ['pastry_kobac', 'Sandwiches', 'EGG EX'] },
    { key: 'cake', label: 'Cakes', cats: ['Cakes'] },
    { key: 'bottles', label: 'Cold Bottles', cats: ['Bottle Drinks'] }
  ];

  const state = {
    filter: 'all',
    expanded: false,
    branch: localStorage.getItem('salool_branch') || 'Salool Kobac',
    order: loadOrder(),
    activeProduct: null,
    activeSize: null
  };

  function loadOrder(){
    try {
      const raw = JSON.parse(localStorage.getItem('salool_order_v1') || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch(e){ return [] }
  }
  function saveOrder(){
    localStorage.setItem('salool_order_v1', JSON.stringify(state.order));
  }
  const orderTotal = () => state.order.reduce((sum, i) => sum + i.price * i.qty, 0);
  const orderCount = () => state.order.reduce((sum, i) => sum + i.qty, 0);

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg){
    const el = $('#toast');
    el.innerHTML = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2800);
  }

  /* ---------- preloader ---------- */
  const preloader = $('#preloader');
  const countEl = $('.preloader-count');
  const lineEl = $('.preloader-line span');
  let loaded = false;

  function runPreloader(){
    if (!preloader || reduced){ finishPreloader(true); return; }
    const tl = gsap.timeline();
    tl.to('.preloader-mark', {opacity:1, scale:1, duration:.9, ease:'power3.out'})
      .to('.preloader-word', {opacity:1, y:0, duration:.8, ease:'power3.out'}, '-=.6')
      .to(lineEl, {scaleX:1, duration:1.5, ease:'power2.inOut'}, '-=.4');

    let n = 0;
    const tick = setInterval(() => {
      n = Math.min(100, n + Math.ceil(Math.random() * 8));
      countEl.textContent = String(n).padStart(2, '0');
      if (n >= 100) clearInterval(tick);
    }, 90);

    const done = () => {
      if (loaded) return;
      loaded = true;
      clearInterval(tick);
      countEl.textContent = '100';
      setTimeout(finishPreloader, 350);
    };
    if (document.readyState === 'complete') setTimeout(done, 1100);
    else window.addEventListener('load', () => setTimeout(done, 500), {once:true});
    setTimeout(done, 4200);
  }

  function finishPreloader(instant){
    revealPromo();
    if (!preloader) return;
    countEl.textContent = '100';
    if (instant){
      preloader.classList.add('is-done');
      document.body.classList.remove('is-locked');
      heroIntro();
      return;
    }
    gsap.timeline()
      .to('.preloader-inner', {y:-24, opacity:0, duration:.5, ease:'power2.in'})
      .to(preloader, {yPercent:-100, duration:1, ease:'power4.inOut'}, '-=.15')
      .add(() => {
        preloader.classList.add('is-done');
        document.body.classList.remove('is-locked');
        heroIntro();
      });
  }

  function heroIntro(){
    if (reduced){
      gsap.set('.hero-title .line > span, .hero-lead, .hero-cta, .hero .eyebrow', {opacity:1, y:0});
      return;
    }
    const tl = gsap.timeline({defaults:{ease:'power4.out'}});
    tl.to('.hero-title .line > span', {y:0, duration:1.25, stagger:.13}, .1)
      .to('.hero .eyebrow', {opacity:1, y:0, duration:.9}, .5)
      .to('.hero-lead', {opacity:1, y:0, duration:.9}, .75)
      .to('.hero-cta', {opacity:1, y:0, duration:.9}, .9)
      .fromTo('.hero-rail-inner > *', {opacity:0, y:22}, {opacity:1, y:0, duration:.9, stagger:.08}, 1)
      .fromTo('.hero-aside .script', {opacity:0, x:30}, {opacity:1, x:0, duration:1.2}, 1.1);
  }

  document.body.classList.add('is-locked');
  runPreloader();

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (window.Lenis && !reduced){
    lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t))
    });
    if (window.ScrollTrigger){
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = time => { lenis.raf(time); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }

  function scrollToTarget(target){
    const navEl = $('#nav');
    const chrome = (navEl ? navEl.offsetHeight : 0) + promoOffset();
    if (lenis) lenis.scrollTo(target, {offset: -chrome, duration: 1.4});
    else {
      const el = typeof target === 'string' ? $(target) : target;
      if (el) el.scrollIntoView({behavior: reduced ? 'auto' : 'smooth', block:'start'});
    }
  }

  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      if (href === '#order'){ e.preventDefault(); closeMobile(); openOrder(); return; }
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      closeMobile();
      scrollToTarget(target);
    });
  });

  /* ---------- nav + progress ---------- */
  const nav = $('#nav');
  const progress = $('.scroll-progress span');
  let lastY = 0;

  function onScroll(y){
    nav.classList.toggle('is-scrolled', y > 60);
    applyPromo();
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    lastY = y;
  }
  if (lenis) lenis.on('scroll', e => onScroll(e.scroll));
  window.addEventListener('scroll', () => onScroll(window.scrollY), {passive:true});
  onScroll(window.scrollY);

  /* ---------- mobile menu ---------- */
  const mobileMenu = $('#mobileMenu');
  const menuToggle = $('#menuToggle');
  let mobileOpen = false;

  function openMobile(){
    mobileOpen = true;
    mobileMenu.classList.add('is-open');
    mobileMenu.setAttribute('aria-hidden','false');
    menuToggle.setAttribute('aria-expanded','true');
    menuToggle.setAttribute('aria-label','Close menu');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
  }
  function closeMobile(){
    if (!mobileOpen) return;
    mobileOpen = false;
    mobileMenu.classList.remove('is-open');
    mobileMenu.setAttribute('aria-hidden','true');
    menuToggle.setAttribute('aria-expanded','false');
    menuToggle.setAttribute('aria-label','Open menu');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
  }
  menuToggle.addEventListener('click', () => mobileOpen ? closeMobile() : openMobile());
  $('#mobileClose').addEventListener('click', closeMobile);
  $$('#mobileMenu a[href^="#"]').forEach(a => a.addEventListener('click', closeMobile));

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduced){
    $$('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .18;
        const y = (e.clientY - r.top - r.height / 2) * .28;
        gsap.to(btn, {x, y, duration:.5, ease:'power3.out'});
      });
      btn.addEventListener('mouseleave', () => {
        gsap.to(btn, {x:0, y:0, duration:.7, ease:'elastic.out(1,.4)'});
      });
    });
  }

  /* ---------- hero video ---------- */
  const video = $('#heroVideo');
  function initVideo(){
    const src = video.dataset.src;
    if (!src) return;
    video.src = src;
    video.preload = 'auto';
    const play = () => {
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    };
    video.addEventListener('canplay', () => {
      video.classList.add('is-ready');
      play();
    }, {once:true});
    if (reduced){ video.remove(); }
  }
  if (video){
    if ('IntersectionObserver' in window){
      const vo = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting){ initVideo(); vo.disconnect(); }
      }, {rootMargin:'200px'});
      vo.observe(video);
    } else initVideo();
  }

  /* ---------- steam canvas ---------- */
  (function steam(){
    if (reduced) return;
    const canvas = $('#steam');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 2);
    let particles = [];
    let visible = true;

    function resize(){
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      const count = window.innerWidth < 720 ? 16 : 30;
      particles = Array.from({length: count}, () => spawn(true));
    }
    function spawn(initial){
      return {
        x: w * (.58 + Math.random() * .3),
        y: h * (initial ? Math.random() : (.66 + Math.random() * .12)),
        r: 22 + Math.random() * 60,
        vy: .18 + Math.random() * .38,
        vx: (Math.random() - .5) * .16,
        a: .03 + Math.random() * .07,
        life: initial ? Math.random() * 300 : 0,
        max: 300 + Math.random() * 240
      };
    }
    function draw(){
      if (!visible) return;
      ctx.clearRect(0,0,w,h);
      for (let i = 0; i < particles.length; i++){
        const p = particles[i];
        p.life++;
        p.y -= p.vy;
        p.x += p.vx + Math.sin((p.y + p.life) * .008) * .12;
        p.r += .08;
        if (p.life > p.max || p.y < h * .18) particles[i] = spawn(false);
        const alpha = Math.sin(Math.min(1, p.life / p.max) * Math.PI) * p.a;
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
        g.addColorStop(0, `rgba(255,236,205,${alpha})`);
        g.addColorStop(1, 'rgba(255,236,205,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }
    window.addEventListener('resize', () => { clearTimeout(canvas._t); canvas._t = setTimeout(resize, 180); });
    resize();
    if ('IntersectionObserver' in window){
      new IntersectionObserver(e => { visible = e[0].isIntersecting; if (visible) requestAnimationFrame(draw); }, {threshold:0}).observe(canvas);
    }
    requestAnimationFrame(draw);
  })();

  /* ---------- opening hours ---------- */
  function mogadishuNow(){
    try {
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone:'Africa/Mogadishu', weekday:'short', hour:'2-digit', minute:'2-digit', hour12:false
      }).formatToParts(new Date());
      const get = t => (parts.find(p => p.type === t) || {}).value;
      return { day:get('weekday'), h:parseInt(get('hour'),10), m:parseInt(get('minute'),10) };
    } catch(e){
      const d = new Date();
      return {day:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()], h:d.getHours(), m:d.getMinutes()};
    }
  }
  function isOpen(){
    const {day,h,m} = mogadishuNow();
    const mins = h * 60 + m;
    if (day === 'Fri') return mins >= 9*60 && mins < 24*60;
    return mins >= 6*60+30 && mins < 23*60+30;
  }
  function updateStatus(){
    const open = isOpen();
    const chip = $('#navStatus');
    if (chip){
      chip.classList.toggle('is-closed', !open);
      const t = chip.querySelector('span');
      if (t) t.textContent = open ? 'Open now' : 'Closed';
    }
    $$('[data-branch-status]').forEach(el => {
      el.classList.toggle('is-closed', !open);
      el.textContent = open ? 'Open now' : 'Closed now';
    });
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- live map previews ---------- */
  const mapFrames = $$('.map-live[data-map-src]');
  if (mapFrames.length){
    const loadMap = f => {
      if (!navigator.onLine || f.dataset.mapLoaded) return;
      f.dataset.mapLoaded = '1';
      f.addEventListener('load', () => {
        const box = f.closest('.branch-map');
        setTimeout(() => box.classList.add('is-live'), 900);
      }, { once:true });
      f.src = f.dataset.mapSrc;
    };
    if ('IntersectionObserver' in window){
      const io = new IntersectionObserver(entries => {
        entries.forEach(en => { if (en.isIntersecting){ loadMap(en.target); io.unobserve(en.target); } });
      }, { rootMargin:'400px 0px' });
      mapFrames.forEach(f => io.observe(f));
    } else mapFrames.forEach(loadMap);
  }

  /* ---------- render menu ---------- */
  const featuredRail = $('#featuredRail');
  const menuGrid = $('#menuGrid');
  const filtersEl = $('#filters');

  function cardHTML(p, featured){
    const badge = p.badge ? `<span class="${featured ? 'feat-badge' : 'menu-badge'}">${p.badge === 'bestseller' ? 'Bestseller' : p.badge}</span>` : '';
    const cat = catLabel(p.category);
    if (featured){
      return `<article class="feat-card" data-open="${p.id}">
        <div class="feat-media">
          ${badge}
          <img src="${p.image}" alt="${p.name}" loading="lazy" width="330" height="340">
          <button class="feat-add" data-add="${p.id}" aria-label="Add ${p.name} to order">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <div class="feat-info">
          <div><h3>${p.name}</h3><p>${cat}</p></div>
          <span class="feat-price">${money(p.price)}</span>
        </div>
      </article>`;
    }
    return `<article class="menu-card" data-open="${p.id}">
      <div class="menu-media">
        ${badge}
        <img src="${p.image}" alt="${p.name}" loading="lazy" width="330" height="330">
        <button class="menu-add" data-add="${p.id}" aria-label="Add ${p.name} to order">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
      <div class="menu-info">
        <div><h3>${p.name}</h3><small>${cat}</small></div>
        <span class="menu-price">${money(p.price)}</span>
      </div>
    </article>`;
  }

  if (featuredRail){
    const feat = PRODUCTS.filter(p => p.featured);
    featuredRail.innerHTML = feat.map(p => cardHTML(p, true)).join('');
  }

  if (filtersEl){
    filtersEl.innerHTML = GROUPS.map(g => {
      const count = g.key === 'all' ? PRODUCTS.length
        : g.key === 'bestsellers' ? PRODUCTS.filter(p => p.featured).length
        : PRODUCTS.filter(p => (g.cats || []).includes(p.category)).length;
      return `<button class="filter-btn${g.key === state.filter ? ' is-active' : ''}" data-filter="${g.key}" role="tab" aria-selected="${g.key === state.filter}">${g.label}<span>${count}</span></button>`;
    }).join('');
  }

  function filteredProducts(){
    if (state.filter === 'bestsellers') return PRODUCTS.filter(p => p.featured);
    const g = GROUPS.find(x => x.key === state.filter);
    return g && g.cats ? PRODUCTS.filter(p => g.cats.includes(p.category)) : PRODUCTS;
  }

  function renderGrid(){
    if (!menuGrid) return;
    const items = filteredProducts();
    const preview = !state.expanded && items.length > 2;
    const shown = preview ? items.slice(0, 2) : items;
    menuGrid.classList.toggle('is-preview', preview);
    menuGrid.innerHTML = shown.map(p => cardHTML(p, false)).join('');
    const count = $('#menuCount');
    if (count) count.textContent = items.length + (items.length === 1 ? ' item' : ' items');
    const more = $('#menuMore');
    if (more){
      more.hidden = items.length <= 2;
      more.setAttribute('aria-expanded', String(state.expanded));
      const label = more.querySelector('span');
      if (label) label.textContent = state.expanded ? 'Show fewer items' : `Show all ${items.length} items`;
    }
    if (window.gsap && !reduced){
      gsap.fromTo(menuGrid.children, {opacity:0, y:26}, {opacity:1, y:0, duration:.7, stagger:.035, ease:'power3.out', overwrite:true, clearProps:'transform'});
    }
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  if (filtersEl){
    filtersEl.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      state.filter = btn.dataset.filter;
      state.expanded = false;
      $$('.filter-btn', filtersEl).forEach(b => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', on);
      });
      renderGrid();
    });
  }

  const moreBtn = $('#menuMore');
  if (moreBtn){
    moreBtn.addEventListener('click', () => {
      state.expanded = !state.expanded;
      renderGrid();
      if (!state.expanded) scrollToTarget('#filters');
    });
  }

  renderGrid();

  /* feature rail arrows */
  const featPrev = $('#featPrev');
  const featNext = $('#featNext');
  function railStep(dir){
    if (!featuredRail) return;
    const card = featuredRail.querySelector('.feat-card');
    const step = card ? card.getBoundingClientRect().width + 14 : 300;
    featuredRail.scrollBy({left: dir * step * 2, behavior:'smooth'});
  }
  if (featPrev) featPrev.addEventListener('click', () => railStep(-1));
  if (featNext) featNext.addEventListener('click', () => railStep(1));

  if (featuredRail){
    let down = false, startX = 0, startScroll = 0, moved = false;
    featuredRail.addEventListener('pointerdown', e => {
      down = true; moved = false; startX = e.clientX; startScroll = featuredRail.scrollLeft;
      featuredRail.classList.add('is-dragging');
    });
    featuredRail.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      featuredRail.scrollLeft = startScroll - dx;
    });
    const up = () => { down = false; featuredRail.classList.remove('is-dragging'); };
    featuredRail.addEventListener('pointerup', up);
    featuredRail.addEventListener('pointerleave', up);
    featuredRail.addEventListener('click', e => {
      if (moved){ e.preventDefault(); e.stopPropagation(); moved = false; }
    }, true);
  }

  /* ---------- add to order ---------- */
  function addToOrder(product, size, price){
    const key = product.id + '|' + (size || 'one');
    const found = state.order.find(i => i.key === key);
    if (found) found.qty++;
    else state.order.push({key, id:product.id, name:product.name, size:size || '', price:Number(price ?? product.price), qty:1, image:product.image});
    saveOrder();
    updateTray();
    toast(`<b>${product.name}</b> added to your order`);
  }

  function updateTray(){
    const tray = $('#orderTray');
    if (!tray) return;
    const n = orderCount();
    tray.hidden = n === 0;
    if (n === 0){ tray.classList.remove('is-visible'); return; }
    $('.ot-count', tray).textContent = n;
    $('.ot-total', tray).textContent = money(orderTotal());
    requestAnimationFrame(() => tray.classList.add('is-visible'));
  }

  document.addEventListener('click', e => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn){
      e.preventDefault(); e.stopPropagation();
      const p = productById(addBtn.dataset.add);
      if (p) addToOrder(p, null, p.price);
      return;
    }
    const open = e.target.closest('[data-open]');
    if (open){
      const p = productById(open.dataset.open);
      if (p) openProduct(p);
    }
  });

  /* ---------- product modal ---------- */
  const productModal = $('#productModal');
  let lastFocus = null;

  function openProduct(p){
    state.activeProduct = p;
    lastFocus = document.activeElement;
    $('#pImage').src = p.image;
    $('#pImage').alt = p.name;
    $('#pName').textContent = p.name;
    $('#pCat').textContent = catLabel(p.category);
    $('#pDesc').textContent = catNote(p.category);
    $('#pPrice').textContent = money(p.price);

    const sizesEl = $('#pSizes');
    const sizes = p.sizes && p.sizes.length ? p.sizes : [{size:'One size', price:p.price}];
    state.activeSize = sizes[0];
    sizesEl.innerHTML = sizes.map((s, i) =>
      `<button type="button" class="${i === 0 ? 'is-active' : ''}" data-size="${i}">${s.size} <b>${money(s.price)}</b></button>`
    ).join('');
    sizesEl.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        sizesEl.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.activeSize = sizes[Number(btn.dataset.size)];
        $('#pPrice').textContent = money(state.activeSize.price);
      });
    });

    productModal.classList.add('is-open');
    productModal.setAttribute('aria-hidden','false');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
    setTimeout(() => $('.modal-close', productModal).focus(), 60);
  }
  function closeProduct(){
    productModal.classList.remove('is-open');
    productModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
    if (lastFocus) lastFocus.focus({preventScroll:true});
  }
  if (productModal){
    $$('[data-close-product]', productModal).forEach(el => el.addEventListener('click', closeProduct));
    $('#pAdd').addEventListener('click', () => {
      if (!state.activeProduct) return;
      addToOrder(state.activeProduct, state.activeSize.size, state.activeSize.price);
      closeProduct();
    });
    productModal.addEventListener('keydown', e => { if (e.key === 'Escape') closeProduct(); });
  }

  /* ---------- order modal ---------- */
  const orderModal = $('#orderModal');
  const modalItems = $('#modalItems');
  const modalTotal = $('#modalTotal');

  function renderOrderModal(){
    if (!orderModal) return;
    if (state.order.length === 0){
      modalItems.innerHTML = '<p class="empty">Your order is empty — add something from the menu, or order directly in the app.</p>';
    } else {
      modalItems.innerHTML = state.order.map(i => `
        <div class="modal-item">
          <img src="${i.image}" alt="">
          <span>${i.name}${i.size ? `<small>${i.size}</small>` : ''}</span>
          <b>${money(i.price * i.qty)}</b>
          <button data-remove="${i.key}" aria-label="Remove ${i.name}">✕</button>
        </div>`).join('');
    }
    modalTotal.textContent = money(orderTotal());
    $$('.modal-branch', orderModal).forEach(b => b.classList.toggle('is-active', b.dataset.branch === state.branch));
    const link = $('#modalAppLink');
    if (link) link.href = STORE_URL;
  }

  function openOrder(){
    if (!orderModal) return;
    renderOrderModal();
    orderModal.classList.add('is-open');
    orderModal.setAttribute('aria-hidden','false');
    document.body.classList.add('is-locked');
    if (lenis) lenis.stop();
    setTimeout(() => $('.modal-close', orderModal).focus(), 60);
  }
  function closeOrder(){
    orderModal.classList.remove('is-open');
    orderModal.setAttribute('aria-hidden','true');
    document.body.classList.remove('is-locked');
    if (lenis) lenis.start();
  }

  if (orderModal){
    $$('[data-close-modal]', orderModal).forEach(el => el.addEventListener('click', closeOrder));
    $('#orderTray').addEventListener('click', openOrder);
    orderModal.addEventListener('click', e => {
      const remove = e.target.closest('[data-remove]');
      if (remove){
        state.order = state.order.filter(i => i.key !== remove.dataset.remove);
        saveOrder(); updateTray(); renderOrderModal();
        return;
      }
      const b = e.target.closest('.modal-branch');
      if (b){
        state.branch = b.dataset.branch;
        localStorage.setItem('salool_branch', state.branch);
        $$('.modal-branch', orderModal).forEach(x => x.classList.toggle('is-active', x === b));
      }
    });
    $('#copyOrder').addEventListener('click', async () => {
      const lines = state.order.map(i => `${i.qty}× ${i.name}${i.size ? ' (' + i.size + ')' : ''} — ${money(i.price * i.qty)}`);
      const text = `Salool Café order — ${state.branch}\n` + (lines.length ? lines.join('\n') : 'No items selected') + `\nTotal: ${money(orderTotal())}\nOrder in the Salool app.`;
      try {
        await navigator.clipboard.writeText(text);
        toast('Order list <b>copied</b>');
      } catch(err){
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        toast('Order list <b>copied</b>');
      }
    });
    orderModal.addEventListener('keydown', e => { if (e.key === 'Escape') closeOrder(); });
  }

  /* branch pills in menu */
  function syncBranchPills(){
    $$('.branch-pill').forEach(b => {
      const name = b.dataset.branch === 'Kobac' ? 'Salool Kobac'
        : b.dataset.branch === 'Banadir' ? 'Salool Banadir' : 'Salool Ventuna October';
      b.classList.toggle('is-active', name === state.branch);
    });
  }
  syncBranchPills();
  $$('.branch-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.branch = btn.dataset.branch === 'Kobac' ? 'Salool Kobac'
        : btn.dataset.branch === 'Banadir' ? 'Salool Banadir' : 'Salool Ventuna October';
      localStorage.setItem('salool_branch', state.branch);
      $$('.branch-pill').forEach(b => b.classList.toggle('is-active', b === btn));
      toast(`Ordering from <b>${state.branch}</b> — same prices at all 3 branches`);
    });
  });

  updateTray();

  /* ---------- contact form ---------- */
  const form = $('#contactForm');
  if (form){
    form.addEventListener('submit', e => {
      e.preventDefault();
      const data = new FormData(form);
      const name = (data.get('name') || '').trim();
      const email = (data.get('email') || '').trim();
      const subject = data.get('subject');
      const message = (data.get('message') || '').trim();
      if (!name || !email || !message){
        $('#formNote').textContent = 'Please fill in your name, email and message.';
        return;
      }
      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      const href = `mailto:support@salool.com?subject=${encodeURIComponent('[Website] ' + subject)}&body=${encodeURIComponent(body)}`;
      $('#formNote').textContent = 'Opening your email app — or write to support@salool.com directly.';
      window.location.href = href;
    });
  }

  /* ---------- gallery lightbox ---------- */
  const lightbox = $('#lightbox');
  if (lightbox){
    $$('.g-item').forEach(item => {
      item.addEventListener('click', () => {
        const img = item.querySelector('img');
        const cap = item.querySelector('figcaption');
        $('#lightboxImg').src = img.src;
        $('#lightboxImg').alt = img.alt;
        $('#lightboxCap').textContent = cap ? cap.textContent.replace(/^\d+\s*/, '') : '';
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden','false');
        document.body.classList.add('is-locked');
        if (lenis) lenis.stop();
      });
    });
    function closeLightbox(){
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden','true');
      document.body.classList.remove('is-locked');
      if (lenis) lenis.start();
    }
    $('#lightboxClose').addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });
    lightbox.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
  }

  /* ---------- scroll animations ---------- */
  function initScrollAnimations(){
    if (!window.gsap || !window.ScrollTrigger) {
      $$('.section-title,.eyebrow,.section-head-side,.story-copy > *,.rewards-copy > *,.app-copy > *,.contact-copy > *,.gift-copy > *').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    if (reduced){
      gsap.set('.section-title,.eyebrow,.section-head-side,.story-copy > *,.rewards-copy > *,.app-copy > *,.contact-copy > *,.gift-copy > *', {opacity:1, y:0});
      return;
    }

    const revealSel = '.section-title, .eyebrow, .section-head-side, .story-copy > *, .rewards-copy > *, .app-copy > *, .contact-copy > *, .gift-copy > *';
    gsap.utils.toArray(revealSel).forEach(el => {
      if (el.closest('.hero') || el.closest('.preloader')) return;
      gsap.fromTo(el, {opacity:0, y:32}, {
        opacity:1, y:0, duration:.95, ease:'power3.out',
        scrollTrigger:{trigger:el, start:'top 90%', once:true}
      });
    });

    /* images reveal */
    gsap.utils.toArray('.story-img').forEach(el => {
      gsap.fromTo(el, {opacity:0, y:44}, {
        opacity:1, y:0, duration:1, ease:'power3.out',
        scrollTrigger:{trigger:el, start:'top 88%', once:true}
      });
    });
    gsap.utils.toArray('.branch-card, .gift-card, .rewards-card, .app-panel').forEach(el => {
      gsap.fromTo(el, {opacity:0}, {
        opacity:1, duration:1, ease:'power2.out',
        scrollTrigger:{trigger:el, start:'top 90%', once:true}
      });
    });

    /* parallax images */
    gsap.utils.toArray('.story-img img').forEach(img => {
      gsap.to(img, {yPercent:-7, ease:'none', scrollTrigger:{trigger:img.parentElement, start:'top bottom', end:'bottom top', scrub:true}});
    });
    const interludeImg = $('.interlude-media img');
    if (interludeImg){
      gsap.fromTo(interludeImg, {yPercent:-6}, {yPercent:6, ease:'none', scrollTrigger:{trigger:'.interlude', start:'top bottom', end:'bottom top', scrub:true}});
    }

    /* hero parallax */
    gsap.to('.hero-media', {yPercent:12, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}});
    gsap.to('.hero-copy', {yPercent:-8, opacity:.35, ease:'none', scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}});

    /* counters */
    $$('.story-stats strong[data-count]').forEach(el => {
      const end = Number(el.dataset.count);
      const obj = {v:0};
      gsap.to(obj, {v:end, duration:1.6, ease:'power2.out', scrollTrigger:{trigger:el, start:'top 90%', once:true},
        onUpdate(){ el.textContent = Math.round(obj.v); }});
    });

    /* gallery horizontal pin */
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const track = $('#galleryTrack');
      const section = $('#gallery');
      if (!track || !section) return;
      const getScroll = () => Math.max(0, track.scrollWidth - window.innerWidth + 40);
      const tween = gsap.to(track, {
        x: () => -getScroll(),
        ease:'none',
        scrollTrigger:{
          trigger: section,
          start:'top top',
          end: () => '+=' + getScroll(),
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
      return () => tween.kill();
    });

    /* section title underline? subtle */
    ScrollTrigger.refresh();
  }
  window.addEventListener('load', () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });
  setTimeout(() => { if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 1200);
  initScrollAnimations();

  /* hero rail reveal initial state */
  if (!reduced && window.gsap){
    gsap.set('.hero .eyebrow, .hero-lead, .hero-cta', {opacity:0, y:24});
    gsap.set('.hero-rail-inner > *', {opacity:0});
  }

  /* expose for debugging */
  window.__salool = { state, openOrder };
})();
