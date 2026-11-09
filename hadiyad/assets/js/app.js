/* U Dir Hadiyad — storefront logic */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const state = {
    shop: null,
    cart: new Map(),
    category: 'all',
    occasion: '',
    search: '',
    lastOrder: null
  };

  const money = n => '$' + Number(n).toFixed(2);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = s => String(s || '').replace(/\D/g, '');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function dayString(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    const pad = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function prettyDay(value) {
    const parts = String(value || '').split('-').map(Number);
    if (parts.length !== 3) return value;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function nowMinutes() {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function toMinutes(hhmm) {
    const [h, m] = String(hhmm || '0:0').split(':').map(Number);
    return h * 60 + m;
  }

  /* ---------------- cart storage ---------------- */
  function cartKey() {
    const slug = (state.shop.brand.name || 'hadiyad').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return 'hadiyad-cart-' + slug;
  }

  function saveCart() {
    try {
      localStorage.setItem(cartKey(), JSON.stringify(Array.from(state.cart.entries())));
    } catch (error) {
      /* storage unavailable */
    }
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(cartKey());
      if (!raw) return;
      const valid = new Set(state.shop.products.map(p => p.id));
      JSON.parse(raw).forEach(([id, qty]) => {
        if (valid.has(id) && Number(qty) > 0) state.cart.set(id, Math.min(20, Math.floor(Number(qty))));
      });
    } catch (error) {
      /* ignore corrupt cart */
    }
  }

  function product(id) {
    return state.shop.products.find(p => p.id === id);
  }

  function cartLines() {
    const lines = [];
    state.cart.forEach((qty, id) => {
      const p = product(id);
      if (p) lines.push({ product: p, qty, lineTotal: Math.round(p.price * qty * 100) / 100 });
    });
    return lines;
  }

  function cartSubtotal() {
    return Math.round(cartLines().reduce((sum, l) => sum + l.lineTotal, 0) * 100) / 100;
  }

  function zoneFeeFor(subtotal, zoneId) {
    const o = state.shop.ordering;
    const freeOver = Number(o.freeDeliveryOver) || 0;
    if (freeOver && subtotal >= freeOver) return 0;
    const zone = (o.zones || []).find(z => z.id === zoneId);
    return zone ? Number(zone.fee) || 0 : Number(o.deliveryFee) || 0;
  }

  /* ---------------- render: shell ---------------- */
  function renderShell() {
    const { brand, contact, ordering, hours, location } = state.shop;
    document.title = brand.name + ' — Send a gift to ' + brand.city;
    $('brandInitial').textContent = brand.initial || brand.name.slice(0, 1);
    $('brandName').textContent = brand.name;
    $('brandCity').textContent = brand.city;
    $('footInitial').textContent = brand.initial || brand.name.slice(0, 1);
    $('footName').textContent = brand.name;
    $('footBrand').textContent = brand.name;
    $('footTag').textContent = brand.tagline;
    $('heroEyebrow').textContent = brand.city + ' · Same-day gifting';

    const [first, ...rest] = brand.tagline.split('. ');
    $('heroTitle').innerHTML = rest.length
      ? '<span>' + esc(first) + '.</span><em>' + esc(rest.join('. ')) + '</em>'
      : '<span>' + esc(brand.tagline) + '</span>';

    $('cutoffFact').textContent = 'Same-day before ' + ordering.sameDayCutoff;
    $('cutoffInline').textContent = ordering.sameDayCutoff;
    $('freeFact').textContent = money(ordering.freeDeliveryOver);
    $('paymentFact').textContent = 'Card link or EVC';

    const wa = 'https://wa.me/' + digits(contact.whatsapp);
    $('waLink').href = wa;
    $('footWa').href = wa;
    $('footWa').textContent = 'WhatsApp ' + contact.phoneDisplay;
    const tel = 'tel:+252' + digits(contact.whatsapp).replace(/^252/, '');
    $('footPhone').href = tel;
    $('footPhone').textContent = contact.phoneDisplay;
    $('footEmail').href = 'mailto:' + contact.email;
    $('footEmail').textContent = contact.email;
    $('footHours').textContent = hours.label;
    $('year').textContent = new Date().getFullYear();

    const area = location.address.split(',').pop().trim();
    $('visitTitle').textContent = area + ', ' + brand.city;
    $('visitAddress').innerHTML = esc(location.address) + '<br>' + esc(location.city);
    $('visitHours').textContent = hours.label;
    $('mapsLink').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(location.mapsQuery || location.address);
    $('mapFallbackName').textContent = brand.name;
    $('mapFallbackAddress').innerHTML = esc(location.address) + '<br>' + esc(location.city);

    const frame = $('mapFrame');
    frame.addEventListener('load', () => {
      if (frame.src && frame.src.indexOf('https://maps.google.com/') === 0) frame.classList.add('loaded');
    });
    frame.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(location.mapsQuery || location.address) + '&z=14&output=embed';

    const open = nowMinutes() >= toMinutes(hours.open) && nowMinutes() < toMinutes(hours.close);
    const pill = $('openPill');
    pill.querySelector('span').textContent = open ? 'Delivering now' : 'Closed · opens ' + hours.open;
    pill.classList.toggle('shut', !open);
  }

  function renderZones() {
    const o = state.shop.ordering;
    const base = Number(o.deliveryFee) || 0;
    $('zoneList').innerHTML = o.zones.map(z => {
      const fee = Number(z.fee) || 0;
      const note = z.id === 'other' ? 'Outskirts, quoted first'
        : fee === 0 ? 'Free route'
          : fee > base ? 'Longer route · allow extra time'
            : 'Standard courier route';
      return `
      <li>
        <span><b>${esc(z.name)}</b><br><small>${note}</small></span>
        <b>${fee === 0 ? 'Free' : money(fee)}</b>
      </li>`;
    }).join('');

    $('slotList').innerHTML = o.slots.map(s => `
      <li><b>${esc(s.label)}</b><span>${esc(s.time)}</span></li>`).join('');

    $('recZone').innerHTML = o.zones.map(z =>
      `<option value="${esc(z.id)}">${esc(z.name)} · ${money(z.fee)}</option>`).join('');

    $('slotPicker').innerHTML = o.slots.map((s, i) => `
      <label class="slot-opt">
        <input type="radio" name="slot" value="${esc(s.id)}"${i === 1 ? ' checked' : ''}>
        <span><b>${esc(s.label)}</b><small>${esc(s.time)}</small></span>
      </label>`).join('');
  }

  function renderFilters() {
    const { categories, occasions } = state.shop;
    $('occasionChips').innerHTML = occasions.map(o => `
      <button class="occasion${o.id === state.occasion ? ' active' : ''}" type="button" data-occasion="${esc(o.id)}">
        <b>${esc(o.name)}</b><span id="occ-count-${esc(o.id)}"></span>
      </button>`).join('') + `
      <button class="occasion${state.occasion ? '' : ' active'}" type="button" data-occasion="">Show all gifts</button>`;

    $('categoryChips').innerHTML = '<button class="chip active" type="button" data-cat="all">All</button>'
      + categories.map(c => `<button class="chip" type="button" data-cat="${esc(c.id)}">${esc(c.name)}</button>`).join('');

    occasions.forEach(o => {
      const count = state.shop.products.filter(p => (p.occasions || []).includes(o.id)).length;
      const el = $('occ-count-' + o.id);
      if (el) el.textContent = count + (count === 1 ? ' gift' : ' gifts');
    });
  }

  function visibleProducts() {
    const q = state.search.trim().toLowerCase();
    return state.shop.products.filter(p => {
      if (state.category !== 'all' && p.category !== state.category) return false;
      if (state.occasion && !(p.occasions || []).includes(state.occasion)) return false;
      if (q && !(p.name + ' ' + p.desc).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  function categoryName(id) {
    const c = state.shop.categories.find(x => x.id === id);
    return c ? c.name : '';
  }

  function occasionNames(ids) {
    return (ids || []).map(id => {
      const o = (state.shop.occasions || []).find(x => x.id === id);
      return o ? o.name : null;
    }).filter(Boolean);
  }

  function renderProducts() {
    const list = visibleProducts();
    const cat = state.shop.categories.find(c => c.id === state.category);
    const occ = (state.shop.occasions || []).find(o => o.id === state.occasion);
    let label = list.length + (list.length === 1 ? ' gift' : ' gifts');
    if (cat) label += ' · ' + cat.name;
    if (occ) label += ' · ' + occ.name;
    $('resultCount').textContent = label;
    $('giftEmpty').hidden = list.length > 0;

    $('giftGrid').innerHTML = list.map(p => {
      const qty = state.cart.get(p.id) || 0;
      return `
      <article class="gift-card reveal" data-id="${esc(p.id)}">
        <div class="gift-media">
          ${p.badge ? `<span class="gift-badge">${esc(p.badge)}</span>` : ''}
          <img src="assets/img/${esc(p.img)}" alt="${esc(p.name)}" loading="lazy">
        </div>
        <div class="gift-body">
          <span class="gift-cat">${esc(categoryName(p.category))}</span>
          <h3>${esc(p.name)}</h3>
          <p class="gift-desc">${esc(p.desc)}</p>
          <div class="gift-tags">${occasionNames(p.occasions).slice(0, 3).map(t => `<span>${esc(t)}</span>`).join('')}</div>
          <div class="gift-foot">
            <span class="gift-price">${money(p.price)}</span>
            <button class="add-btn${qty ? ' in' : ''}" type="button" data-add="${esc(p.id)}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
              ${qty ? 'In gift box · ' + qty : 'Add to gift box'}
            </button>
          </div>
        </div>
      </article>`;
    }).join('');

    requestAnimationFrame(() => {
      $('giftGrid').querySelectorAll('.reveal').forEach(el => observer.observe(el));
    });
  }

  /* ---------------- render: cart ---------------- */
  function renderCart() {
    const lines = cartLines();
    const subtotal = cartSubtotal();
    const o = state.shop.ordering;
    const body = $('cartBody');

    if (!lines.length) {
      body.innerHTML = `
        <div class="cart-empty">
          <p>Your gift box is empty.</p>
          <button class="btn btn-glass" type="button" id="cartBrowse">Browse the gifts</button>
        </div>`;
    } else {
      body.innerHTML = lines.map(({ product: p, qty, lineTotal }) => `
        <div class="cart-item" data-id="${esc(p.id)}">
          <img class="ci-img" src="assets/img/${esc(p.img)}" alt="">
          <div class="ci-main">
            <div class="ci-top">
              <h3>${esc(p.name)}</h3>
              <button class="ci-remove" type="button" data-remove="${esc(p.id)}">Remove</button>
            </div>
            <div class="ci-bottom">
              <span class="ci-price">${money(lineTotal)}</span>
              <div class="stepper">
                <button type="button" data-dec="${esc(p.id)}" aria-label="One fewer ${esc(p.name)}">−</button>
                <span>${qty}</span>
                <button type="button" data-inc="${esc(p.id)}" aria-label="One more ${esc(p.name)}">+</button>
              </div>
            </div>
          </div>
        </div>`).join('');
    }

    const count = lines.reduce((s, l) => s + l.qty, 0);
    $('cartSubtotal').textContent = money(subtotal);
    $('cartDelivery').textContent = subtotal >= Number(o.freeDeliveryOver || 0) && Number(o.freeDeliveryOver) > 0
      ? 'Free'
      : 'from ' + money(o.deliveryFee);

    const hint = $('cartHint');
    if (!lines.length) hint.textContent = '';
    else if (subtotal < Number(o.minOrder || 0)) hint.textContent = 'Add ' + money(Number(o.minOrder) - subtotal) + ' to reach the ' + money(o.minOrder) + ' minimum.';
    else if (subtotal < Number(o.freeDeliveryOver || 0)) hint.textContent = money(Number(o.freeDeliveryOver) - subtotal) + ' more for free delivery.';
    else hint.textContent = 'Free delivery unlocked.';

    const canCheckout = lines.length > 0 && subtotal >= Number(o.minOrder || 0);
    $('checkoutBtn').disabled = !canCheckout;
    $('checkoutBtn').textContent = canCheckout ? 'Checkout · ' + money(subtotal) : 'Checkout';
    $('cartCount').textContent = count;
    $('mobileBarCount').textContent = count + (count === 1 ? ' gift' : ' gifts');
    $('mobileBarTotal').textContent = money(subtotal);
    $('mobileBar').hidden = count === 0;
    renderProducts();
  }

  function bumpCount() {
    const el = $('cartCount');
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function addToCart(id) {
    const p = product(id);
    if (!p) return;
    const next = Math.min(20, (state.cart.get(id) || 0) + 1);
    state.cart.set(id, next);
    saveCart();
    renderCart();
    bumpCount();
    toast(p.name + ' added to your gift box');
  }

  function setQty(id, qty) {
    if (qty <= 0) state.cart.delete(id);
    else state.cart.set(id, Math.min(20, qty));
    saveCart();
    renderCart();
  }

  let toastTimer;
  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ---------------- drawer / modal ---------------- */
  let lastFocus = null;
  function showScrim() {
    const scrim = $('scrim');
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('show'));
  }
  function hideScrim() {
    const scrim = $('scrim');
    scrim.classList.remove('show');
    setTimeout(() => {
      if (!$('cart').classList.contains('open') && $('checkoutModal').hidden) scrim.hidden = true;
    }, 320);
  }
  function openCart() {
    lastFocus = document.activeElement;
    $('cart').classList.add('open');
    $('cart').setAttribute('aria-hidden', 'false');
    $('cartBtn').setAttribute('aria-expanded', 'true');
    showScrim();
    document.body.classList.add('is-locked');
    setTimeout(() => $('cartClose').focus(), 240);
  }
  function closeCart(silent) {
    $('cart').classList.remove('open');
    $('cart').setAttribute('aria-hidden', 'true');
    $('cartBtn').setAttribute('aria-expanded', 'false');
    if (silent) return;
    hideScrim();
    document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }

  function currentSlot() {
    return document.querySelector('input[name="slot"]:checked')?.value || state.shop.ordering.slots[0].id;
  }
  function currentPayment() {
    return document.querySelector('input[name="payment"]:checked')?.value || 'card';
  }

  function checkoutTotals() {
    const subtotal = cartSubtotal();
    const fee = zoneFeeFor(subtotal, $('recZone').value);
    return { lines: cartLines(), subtotal, fee, total: Math.round((subtotal + fee) * 100) / 100 };
  }

  function renderSummary() {
    const { lines, subtotal, fee, total } = checkoutTotals();
    $('checkoutSummary').innerHTML = lines.map(l => `
      <div class="sum-line"><span>${l.qty} × ${esc(l.product.name)}</span><b>${money(l.lineTotal)}</b></div>`).join('')
      + `<div class="sum-line"><span>Subtotal</span><b>${money(subtotal)}</b></div>
         <div class="sum-line"><span>Delivery</span><b>${fee === 0 ? 'Free' : money(fee)}</b></div>
         <div class="sum-total"><span>Total</span><b>${money(total)}</b></div>`;
    $('placeOrderBtn').textContent = 'Place order · ' + money(total);
  }

  function setupCheckout() {
    const o = state.shop.ordering;
    const cutoff = toMinutes(o.sameDayCutoff);
    const sameDayOpen = nowMinutes() < cutoff;
    const minDay = dayString(sameDayOpen ? 0 : 1);
    const dateInput = $('deliveryDate');
    dateInput.min = minDay;
    dateInput.max = dayString(Number(o.maxDaysAhead) || 60);
    dateInput.value = minDay;
  }

  function openCheckout() {
    if (!cartLines().length) return;
    $('formError').hidden = true;
    $('checkoutFormView').hidden = false;
    $('successView').hidden = true;
    setupCheckout();
    renderSummary();
    closeCart(true);
    $('checkoutModal').hidden = false;
    showScrim();
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => {
      $('checkoutModal').classList.add('show');
      document.querySelector('.modal-card').scrollTop = 0;
      setTimeout(() => $('senderName').focus({ preventScroll: true }), 260);
    });
  }

  function closeCheckout() {
    $('checkoutModal').classList.remove('show');
    document.body.classList.remove('is-locked');
    setTimeout(() => {
      $('checkoutModal').hidden = true;
      hideScrim();
    }, 300);
  }

  function fieldOf(input) {
    return input.closest('.field');
  }
  function markField(input, bad) {
    const field = fieldOf(input);
    if (field) field.classList.toggle('bad', bad);
    return bad;
  }
  function formError(message) {
    const el = $('formError');
    el.textContent = message;
    el.hidden = false;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  /* ---------------- place order ---------------- */
  async function placeOrder(event) {
    event.preventDefault();
    $('formError').hidden = true;
    const senderName = $('senderName'), senderPhone = $('senderPhone'), senderEmail = $('senderEmail');
    const recName = $('recName'), recPhone = $('recPhone'), recAddress = $('recAddress');
    const dateInput = $('deliveryDate');

    let bad = false;
    bad = markField(senderName, senderName.value.trim().length < 2) || bad;
    bad = markField(senderPhone, digits(senderPhone.value).length < 7) || bad;
    bad = markField(senderEmail, !!senderEmail.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail.value.trim())) || bad;
    bad = markField(recName, recName.value.trim().length < 2) || bad;
    bad = markField(recPhone, digits(recPhone.value).length < 7) || bad;
    bad = markField(recAddress, recAddress.value.trim().length < 5) || bad;
    bad = markField(dateInput, !dateInput.value) || bad;
    if (bad) return formError('Check the highlighted fields before placing the order.');

    const { total } = checkoutTotals();
    const payload = {
      customer: { name: senderName.value, phone: senderPhone.value, email: senderEmail.value },
      recipient: { name: recName.value, phone: recPhone.value, zone: $('recZone').value, address: recAddress.value },
      deliveryDate: dateInput.value,
      slot: currentSlot(),
      payment: currentPayment(),
      giftMessage: $('giftMessage').value,
      anonymous: $('anonymous').checked,
      note: $('noteField').value,
      items: cartLines().map(l => ({ id: l.product.id, qty: l.qty }))
    };

    $('placeOrderBtn').disabled = true;
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not place the order');
      state.lastOrder = data.order;
      state.cart.clear();
      saveCart();
      renderCart();
      showSuccess(data.order, payload);
    } catch (error) {
      formError(error.message);
    } finally {
      $('placeOrderBtn').disabled = false;
    }
  }

  function showSuccess(order, payload) {
    const contact = state.shop.contact;
    const first = order ? (payload.customer.name || '').trim().split(' ')[0] : '';
    $('checkoutFormView').hidden = true;
    $('successView').hidden = false;
    $('successName').textContent = first || 'friend';
    $('successTitle').textContent = 'Thank you, ' + (first || 'friend') + '.';
    $('successLead').textContent = payload.payment === 'card'
      ? 'We will send a secure payment link to ' + payload.customer.phone + ' on WhatsApp, then call ' + payload.recipient.name + ' to agree a time.'
      : 'We will confirm the EVC payment, then call ' + payload.recipient.name + ' to agree the delivery time.';

    $('successId').textContent = order.id;
    $('successTotal').textContent = money(order.total);
    $('successRows').innerHTML = `
      <div><span>Recipient</span><b>${esc(order.recipientName)}</b></div>
      <div><span>Area</span><b>${esc(order.zoneName)}</b></div>
      <div><span>When</span><b>${esc(prettyDay(order.deliveryDate))} · ${esc(order.slotLabel)}</b></div>
      <div><span>Gifts</span><b>${order.itemCount} item${order.itemCount === 1 ? '' : 's'}</b></div>
      <div><span>Payment</span><b>${payload.payment === 'card' ? 'Card link' : 'EVC Plus'} · unpaid</b></div>`;

    const payBox = $('payBox');
    if (payload.payment === 'evc') {
      payBox.innerHTML = `
        <p><b>Send ${money(order.total)}</b> to ${esc(contact.evcNumber)} (${esc(contact.evcName)}).</p>
        <p>Use <b>${esc(order.id)}</b> as the reference.</p>
        <button class="copy-btn" type="button" id="copyPay">Copy payment details</button>`;
    } else {
      payBox.innerHTML = `
        <p><b>Card payment link</b> — sent to ${esc(payload.customer.phone)} on WhatsApp within a few minutes.</p>
        <p>Nothing is charged until you open that link. Orders are only dispatched once payment is confirmed.</p>
        <button class="copy-btn" type="button" id="copyPay">Copy order details</button>`;
    }

    $('successFine').textContent = 'Keep ' + order.id + ' — you need it and your phone number to track the delivery.';

    const summary = [
      'Order ' + order.id,
      order.itemCount + ' gift(s) · ' + money(order.total),
      'For ' + order.recipientName + ' (' + order.zoneName + ')',
      prettyDay(order.deliveryDate) + ' · ' + order.slotLabel,
      payload.giftMessage ? 'Card: ' + payload.giftMessage : 'Card: (none)',
      payload.payment === 'card' ? 'Payment: card link please' : 'Payment: EVC, reference ' + order.id
    ].join('\n');
    $('successWa').href = 'https://wa.me/' + digits(contact.whatsapp) + '?text=' + encodeURIComponent(summary);
    $('successTrack').dataset.id = order.id;
    $('successTrack').dataset.phone = payload.customer.phone;
    document.querySelector('.modal-card').scrollTop = 0;
  }

  function resetForm() {
    $('checkoutForm').reset();
    $('msgCounter').textContent = '0 / 240';
    document.querySelectorAll('.field.bad').forEach(el => el.classList.remove('bad'));
  }

  /* ---------------- tracking ---------------- */
  const flow = [
    { id: 'new', label: 'Order received' },
    { id: 'confirmed', label: 'Payment confirmed' },
    { id: 'preparing', label: 'Gift bought and wrapped' },
    { id: 'out', label: 'Courier on the way' },
    { id: 'delivered', label: 'Delivered with photo' }
  ];

  async function trackOrder(id, phone) {
    const res = await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, phone })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lookup failed');
    return data.order;
  }

  function renderTrack(order) {
    const index = flow.findIndex(s => s.id === order.status);
    const dead = order.status === 'cancelled' || order.status === 'failed';
    const headline = dead
      ? (order.status === 'cancelled' ? 'This order was cancelled' : 'The delivery did not go through')
      : order.status === 'new'
        ? (order.paymentStatus === 'paid' ? 'We have your order' : 'Waiting for payment')
        : order.status === 'delivered'
          ? 'Delivered — enjoy the photo'
          : 'Your gift is on its way';
    const statusLabel = dead
      ? (order.status === 'cancelled' ? 'Cancelled' : 'Not delivered')
      : (flow[index] || flow[0]).label;
    $('trackResult').hidden = false;
    $('trackResult').innerHTML = `
      <h3>${headline}</h3>
      <p class="tr-id">Order ${esc(order.id)} · ${esc(statusLabel)}</p>
      ${dead ? '' : `<ul class="tr-steps">${flow.map((s, i) => `
        <li class="${i < index ? 'done' : ''}${i === index ? ' now' : ''}"><i></i><span>${esc(s.label)}</span></li>`).join('')}</ul>`}
      <div class="tr-meta">
        <div><span>Recipient</span><b>${esc(order.recipientName)}</b></div>
        <div><span>Area</span><b>${esc(order.zoneName)}</b></div>
        <div><span>When</span><b>${esc(prettyDay(order.deliveryDate))} · ${esc(order.slotLabel)}</b></div>
        <div><span>Gifts</span><b>${order.itemCount}</b></div>
        <div><span>Total</span><b>${money(order.total)}</b></div>
        <div><span>Payment</span><b>${order.paymentStatus === 'paid' ? 'Paid' : 'Awaiting payment'}</b></div>
      </div>
      ${order.giftMessage ? `<p class="tr-msg">"${esc(order.giftMessage)}"</p>` : ''}
      <p class="fine" style="margin-top:18px">Questions about this order? WhatsApp ${esc(state.shop.contact.phoneDisplay)} and quote ${esc(order.id)}.</p>`;
  }

  async function handleTrack(event) {
    event.preventDefault();
    $('trackError').hidden = true;
    const id = $('trackId').value.trim().toUpperCase();
    const phone = $('trackPhone').value.trim();
    if (!id || digits(phone).length < 7) {
      $('trackError').textContent = 'Enter your order number and the phone you ordered with.';
      $('trackError').hidden = false;
      return;
    }
    $('trackBtn').disabled = true;
    try {
      const order = await trackOrder(id, phone);
      renderTrack(order);
    } catch (error) {
      $('trackError').textContent = error.message;
      $('trackError').hidden = false;
      $('trackResult').hidden = true;
    } finally {
      $('trackBtn').disabled = false;
    }
  }

  /* ---------------- events ---------------- */
  function bindEvents() {
    document.addEventListener('click', event => {
      const add = event.target.closest('[data-add]');
      if (add) return addToCart(add.dataset.add);

      const inc = event.target.closest('[data-inc]');
      if (inc) return setQty(inc.dataset.inc, (state.cart.get(inc.dataset.inc) || 0) + 1);

      const dec = event.target.closest('[data-dec]');
      if (dec) return setQty(dec.dataset.dec, (state.cart.get(dec.dataset.dec) || 0) - 1);

      const remove = event.target.closest('[data-remove]');
      if (remove) return setQty(remove.dataset.remove, 0);

      if (event.target.closest('#cartBrowse')) {
        closeCart();
        $('gifts').scrollIntoView({ behavior: 'smooth' });
      }

      const chip = event.target.closest('#categoryChips .chip');
      if (chip) {
        state.category = chip.dataset.cat;
        document.querySelectorAll('#categoryChips .chip').forEach(c => c.classList.toggle('active', c === chip));
        return renderProducts();
      }

      const occ = event.target.closest('#occasionChips .occasion');
      if (occ) {
        state.occasion = occ.dataset.occasion;
        document.querySelectorAll('#occasionChips .occasion').forEach(c => c.classList.toggle('active', c === occ));
        renderProducts();
        return $('gifts').scrollIntoView({ behavior: 'smooth' });
      }

      if (event.target.closest('#copyPay')) {
        const text = $('payBox').innerText.replace(/\s+/g, ' ').trim();
        navigator.clipboard?.writeText(text).then(() => toast('Copied — paste it into your payment app'));
      }
    });

    $('searchInput').addEventListener('input', event => {
      state.search = event.target.value;
      renderProducts();
    });

    $('giftMessage').addEventListener('input', event => {
      $('msgCounter').textContent = event.target.value.length + ' / 240';
    });

    $('recZone').addEventListener('change', renderSummary);
    $('checkoutBtn').addEventListener('click', openCheckout);
    $('cartBtn').addEventListener('click', openCart);
    $('cartClose').addEventListener('click', () => closeCart());
    $('mobileBar').addEventListener('click', openCart);
    $('modalClose').addEventListener('click', closeCheckout);
    $('checkoutModal').addEventListener('click', event => {
      if (event.target === $('checkoutModal')) closeCheckout();
    });
    $('scrim').addEventListener('click', () => {
      if (!$('checkoutModal').hidden) return;
      closeCart();
    });
    $('checkoutForm').addEventListener('submit', placeOrder);
    $('trackForm').addEventListener('submit', handleTrack);

    $('newOrderBtn').addEventListener('click', () => {
      resetForm();
      closeCheckout();
      setTimeout(() => $('gifts').scrollIntoView({ behavior: 'smooth' }), 260);
    });

    $('successTrack').addEventListener('click', () => {
      const btn = $('successTrack');
      $('trackId').value = btn.dataset.id || '';
      $('trackPhone').value = btn.dataset.phone || '';
      closeCheckout();
      setTimeout(async () => {
        $('track').scrollIntoView({ behavior: 'smooth' });
        await sleep(400);
        handleTrack(new Event('submit'));
      }, 300);
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!$('checkoutModal').hidden) closeCheckout();
      else if ($('cart').classList.contains('open')) closeCart();
      else if ($('mobileMenu').classList.contains('open')) closeMobileMenu();
    });

    $('menuToggle').addEventListener('click', () => {
      const open = $('mobileMenu').classList.contains('open');
      if (open) closeMobileMenu();
      else openMobileMenu();
    });
    $('mobileMenu').addEventListener('click', event => {
      if (event.target.tagName === 'A') closeMobileMenu();
    });

    let lastScroll = 0;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      document.querySelector('.site-head').classList.toggle('stuck', y > 24);
      if (y < lastScroll - 6) closeMobileMenu();
      lastScroll = y;
    }, { passive: true });
  }

  function openMobileMenu() {
    $('mobileMenu').classList.add('open');
    $('mobileMenu').setAttribute('aria-hidden', 'false');
    $('menuToggle').setAttribute('aria-expanded', 'true');
  }
  function closeMobileMenu() {
    $('mobileMenu').classList.remove('open');
    $('mobileMenu').setAttribute('aria-hidden', 'true');
    $('menuToggle').setAttribute('aria-expanded', 'false');
  }

  /* ---------------- reveal ---------------- */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: .12 });

  /* ---------------- boot ---------------- */
  async function boot() {
    try {
      const res = await fetch('/api/shop');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Shop data unavailable');
      state.shop = data.shop;
    } catch (error) {
      document.body.innerHTML = '<main class="wrap" style="padding:120px 0"><h1 style="font-family:Lora,serif">The gift list is offline.</h1><p style="color:#6c5a62;margin-top:12px">' + esc(error.message) + '</p></main>';
      return;
    }
    loadCart();
    renderShell();
    renderZones();
    renderFilters();
    renderCart();
    bindEvents();
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  boot();
})();
