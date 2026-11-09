/* ============================================================
   U Dir Hadiyad — delivery dashboard
   ============================================================ */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const digits = s => String(s || '').replace(/\D+/g, '');
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const STATUSES = [
    { id: 'new', label: 'New' },
    { id: 'confirmed', label: 'Confirmed' },
    { id: 'preparing', label: 'Wrapping' },
    { id: 'out', label: 'On the road' },
    { id: 'delivered', label: 'Delivered' },
    { id: 'failed', label: 'Failed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];
  const FLOW = ['new', 'confirmed', 'preparing', 'out', 'delivered'];
  const DEAD = ['failed', 'cancelled'];
  const PIN_KEY = 'hadiyad-dash-pin';
  const REFRESH_MS = 25000;

  const state = {
    pin: localStorage.getItem(PIN_KEY) || '',
    shop: null,
    orders: [],
    seen: JSON.parse(localStorage.getItem(PIN_KEY + '-seen') || '[]'),
    status: 'all',
    day: 'all',
    zone: 'all',
    search: '',
    openId: null,
    sound: localStorage.getItem(PIN_KEY + '-sound') !== 'off',
    timer: null,
    lastLoad: 0
  };

  const money = n => (state.shop ? state.shop.ordering.currency : '$') + Number(n || 0).toFixed(2);
  const statusLabel = id => (STATUSES.find(s => s.id === id) || { label: id }).label;

  /* ---------------- dates ---------------- */
  function dayString(date = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }
  function parseDay(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function offsetDay(days) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
  }
  function prettyDay(value) {
    const d = parseDay(value);
    if (!d) return '—';
    if (dayString(d) === dayString(new Date())) return 'Today';
    if (dayString(d) === dayString(offsetDay(1))) return 'Tomorrow';
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function clockTime(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  }
  function isLate(order) {
    if (DEAD.includes(order.status) || order.status === 'delivered') return false;
    const d = parseDay(order.deliveryDate);
    return d && d < offsetDay(0);
  }

  /* ---------------- api ---------------- */
  async function api(path, options = {}) {
    const res = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', 'x-dashboard-pin': state.pin, ...(options.headers || {}) }
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { const error = new Error(data.error || 'Wrong PIN'); error.auth = true; throw error; }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  async function load(quiet) {
    try {
      const [shopData, orderData] = await Promise.all([
        state.shop ? Promise.resolve({ shop: state.shop }) : api('/api/shop'),
        api('/api/orders')
      ]);
      if (!state.shop) {
        state.shop = shopData.shop;
        renderShell();
        renderZoneFilter();
      }
      const previous = state.orders.map(o => o.id).join(',');
      state.orders = orderData.orders || [];
      const fresh = state.orders.filter(o => o.status === 'new' && !state.seen.includes(o.id));
      if (fresh.length && previous !== state.orders.map(o => o.id).join(',')) {
        beep();
        toast(fresh.length === 1 ? 'New gift order: ' + fresh[0].id : fresh.length + ' new gift orders');
      }
      state.seen = Array.from(new Set(state.seen.concat(state.orders.map(o => o.id)))).slice(-200);
      localStorage.setItem(PIN_KEY + '-seen', JSON.stringify(state.seen));
      state.lastLoad = Date.now();
      renderKpis();
      renderChips();
      renderOrders();
      if (state.openId) {
        const still = state.orders.find(o => o.id === state.openId);
        still ? renderPanel(still) : closePanel();
      }
      $('live').classList.remove('offline');
      $('liveLabel').textContent = 'Live';
      stamp();
    } catch (error) {
      if (error.auth) return lock();
      $('live').classList.add('offline');
      $('liveLabel').textContent = 'Offline';
      $('updated').textContent = 'Could not reach the server — retrying';
      if (!quiet) toast(error.message || 'Could not load orders');
    }
  }

  function stamp() {
    const secs = Math.round((Date.now() - state.lastLoad) / 1000);
    $('updated').textContent = 'Updated ' + (secs < 5 ? 'just now' : secs + 's ago') +
      ' · ' + new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  /* ---------------- gate ---------------- */
  function lock() {
    localStorage.removeItem(PIN_KEY);
    state.pin = '';
    state.orders = [];
    state.shop = null;
    clearInterval(state.timer);
    $('dash').hidden = true;
    $('gate').hidden = false;
    closePanel();
    setTimeout(() => $('pinInput').focus(), 120);
  }

  async function tryPin(pin) {
    state.pin = pin;
    try {
      await api('/api/orders');
      localStorage.setItem(PIN_KEY, pin);
      $('gate').hidden = true;
      $('dash').hidden = false;
      await load();
      clearInterval(state.timer);
      state.timer = setInterval(() => load(true), REFRESH_MS);
    } catch (error) {
      state.pin = '';
      if (error.auth) return gateError('That PIN is not right.');
      gateError(error.message || 'Could not reach the server.');
    }
  }

  function gateError(message) {
    $('gateError').textContent = message;
    $('gateError').hidden = false;
    $('gate').classList.add('shake');
    setTimeout(() => $('gate').classList.remove('shake'), 420);
    $('pinInput').select();
  }

  /* ---------------- shell ---------------- */
  function renderShell() {
    const brand = state.shop.brand;
    $('gateMark').textContent = brand.initial;
    $('dashMark').textContent = brand.initial;
    $('gateName').textContent = brand.name;
    $('dashName').textContent = brand.name;
    document.title = 'Deliveries — ' + brand.name;
    $('soundBtn').textContent = state.sound ? 'Sound on' : 'Sound off';
    $('soundBtn').setAttribute('aria-pressed', String(state.sound));
  }

  function renderZoneFilter() {
    $('zoneSelect').innerHTML = '<option value="all">All areas</option>' +
      (state.shop.ordering.zones || []).map(z => `<option value="${esc(z.id)}">${esc(z.name)}</option>`).join('');
    $('zoneSelect').value = state.zone;
  }

  /* ---------------- kpis ---------------- */
  function renderKpis() {
    const today = dayString(new Date());
    const dueToday = state.orders.filter(o => o.deliveryDate === today && !DEAD.includes(o.status) && o.status !== 'delivered');
    const unpaid = state.orders.filter(o => o.paymentStatus !== 'paid' && !DEAD.includes(o.status));
    const revenue = state.orders.filter(o => o.paymentStatus === 'paid' && o.status !== 'cancelled')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
    const week = dayString(offsetDay(-7));
    const done = state.orders.filter(o => o.status === 'delivered' && String(o.deliveryDate) >= week);
    const late = dueToday.filter(isLate).length;

    $('kpiToday').textContent = dueToday.length;
    $('kpiTodaySub').textContent = late ? late + ' past the date — chase them' : 'to buy, wrap and send';
    $('kpiUnpaid').textContent = unpaid.length;
    $('kpiUnpaidSub').textContent = unpaid.length ? 'not dispatched yet' : 'everything is paid';
    $('kpiRevenue').textContent = money(revenue);
    $('kpiDone').textContent = done.length;

    $('kpiToday').closest('.kpi').classList.toggle('alarm', late > 0);
    $('kpiUnpaid').closest('.kpi').classList.toggle('alarm', unpaid.length > 3);
  }

  /* ---------------- filters ---------------- */
  function renderChips() {
    const buckets = [
      { id: 'all', label: 'All', count: state.orders.length },
      ...FLOW.map(id => ({ id, label: statusLabel(id), count: state.orders.filter(o => o.status === id).length })),
      { id: 'problem', label: 'Issues', count: state.orders.filter(o => DEAD.includes(o.status)).length }
    ];
    $('statusChips').innerHTML = buckets.map(b => `
      <button class="chip${state.status === b.id ? ' active' : ''}" type="button" data-status="${esc(b.id)}">
        ${esc(b.label)}<span class="n">${b.count}</span>
      </button>`).join('');
  }

  function filtered() {
    const q = state.search.trim().toLowerCase();
    const today = dayString(new Date());
    const tomorrow = dayString(offsetDay(1));
    const weekEnd = dayString(offsetDay(7));

    return state.orders.filter(o => {
      if (state.status === 'problem') { if (!DEAD.includes(o.status)) return false; }
      else if (state.status !== 'all' && o.status !== state.status) return false;

      if (state.day === 'today' && o.deliveryDate !== today) return false;
      if (state.day === 'tomorrow' && o.deliveryDate !== tomorrow) return false;
      if (state.day === 'week' && (String(o.deliveryDate) < today || String(o.deliveryDate) > weekEnd)) return false;
      if (state.day === 'late' && !isLate(o)) return false;

      if (state.zone !== 'all' && o.recipient?.zone !== state.zone) return false;

      if (q) {
        const hay = [
          o.id, o.customer?.name, o.customer?.phone, o.customer?.email,
          o.recipient?.name, o.recipient?.phone, o.recipient?.address, o.recipient?.zoneName,
          o.courier, (o.items || []).map(i => i.name).join(' ')
        ].join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const rank = o => (isLate(o) ? 0 : DEAD.includes(o.status) ? 4 : o.status === 'delivered' ? 3 : 1);
      const r = rank(a) - rank(b);
      if (r) return r;
      return String(a.deliveryDate).localeCompare(String(b.deliveryDate)) || String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  /* ---------------- rows ---------------- */
  function renderOrders() {
    const list = filtered();
    $('empty').hidden = list.length > 0;
    $('orders').innerHTML = list.map(o => {
      const items = (o.items || []);
      const qty = items.reduce((s, i) => s + Number(i.qty || 0), 0);
      const unpaid = o.paymentStatus !== 'paid' && !DEAD.includes(o.status);
      return `
      <article class="order${state.seen.slice(-1)[0] === o.id ? ' is-fresh' : ''}${isLate(o) ? ' late' : ''}" data-id="${esc(o.id)}" data-status="${esc(o.status)}" tabindex="0" role="button" aria-label="Open ${esc(o.id)} for ${esc(o.recipient?.name || '')}">
        <div class="o-id">
          <b>${esc(o.id)}</b>
          <span>${esc(clockTime(o.createdAt))}</span>
        </div>
        <div class="o-when">
          <b${isLate(o) ? ' class="late-tag"' : ''}>${esc(prettyDay(o.deliveryDate))}${isLate(o) ? ' · overdue' : ''}</b>
          <span>${esc(o.slotLabel || '')}${o.courier ? ' · ' + esc(o.courier) : ''}</span>
        </div>
        <div class="o-recip">
          <b>${esc(o.recipient?.name || '—')}</b>
          <span>${esc(o.recipient?.zoneName || '')} · ${esc(o.recipient?.address || '')}</span>
          <span class="tag">${esc(statusLabel(o.status))}</span>
          ${unpaid ? '<span class="tag unpaid">Unpaid</span>' : ''}
          ${o.anonymous ? '<span class="tag">Anonymous</span>' : ''}
        </div>
        <div class="o-gifts">
          <p>${qty} × ${esc(items.map(i => i.name).join(', '))}</p>
          ${o.giftMessage ? `<span class="msg">“${esc(o.giftMessage.slice(0, 70))}${o.giftMessage.length > 70 ? '…' : ''}”</span>` : ''}
        </div>
        <div class="o-money">
          <b>${money(o.total)}</b>
          <span>${esc(o.payment === 'evc' ? 'EVC' : 'Card')}</span>
        </div>
      </article>`;
    }).join('');
  }

  /* ---------------- panel ---------------- */
  function openPanel(id) {
    const order = state.orders.find(o => o.id === id);
    if (!order) return;
    state.openId = id;
    renderPanel(order);
    $('panel').classList.add('open');
    $('panel').setAttribute('aria-hidden', 'false');
    $('scrim').hidden = false;
    requestAnimationFrame(() => $('scrim').classList.add('show'));
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('panelClose').focus(), 240);
  }

  function closePanel() {
    state.openId = null;
    $('panel').classList.remove('open');
    $('panel').setAttribute('aria-hidden', 'true');
    $('scrim').classList.remove('show');
    setTimeout(() => { $('scrim').hidden = true; }, 280);
    document.body.style.overflow = '';
  }

  function renderPanel(o) {
    const contact = state.shop.contact;
    const items = o.items || [];
    const qty = items.reduce((s, i) => s + Number(i.qty || 0), 0);
    const senderWa = 'https://wa.me/' + digits(o.customer?.phone);
    const recWa = 'https://wa.me/' + digits(o.recipient?.phone);

    $('panelId').textContent = o.id;
    $('panelName').textContent = o.recipient?.name || 'Recipient';
    $('panelSub').textContent = 'Placed ' + clockTime(o.createdAt) + ' · ' + statusLabel(o.status);

    $('panelScroll').innerHTML = `
      <div class="d-block">
        <p class="block-title">Delivery</p>
        <div class="d-row"><span>When</span><b>${esc(prettyDay(o.deliveryDate))} · ${esc(o.slotLabel || '—')}</b></div>
        <div class="d-row"><span>Area</span><b>${esc(o.recipient?.zoneName || '—')}</b></div>
        <div class="d-row"><span>Landmark</span><b>${esc(o.recipient?.address || '—')}</b></div>
        <div class="d-row"><span>Courier</span><b>${o.courier ? esc(o.courier) : 'Not assigned'}</b></div>
        ${isLate(o) ? '<p class="d-note" style="border-color:rgba(230,161,132,.5)">Past the delivery date and not marked delivered. Call the recipient before anything else.</p>' : ''}
      </div>

      <div class="d-block">
        <p class="block-title">Recipient</p>
        <div class="d-row"><span>Phone</span><b>${esc(o.recipient?.phone || '—')}</b></div>
        <div class="contact-row">
          <a class="link-btn" href="tel:${esc(digits(o.recipient?.phone))}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6.5 3.5 9 4l1 3.5-1.8 1.4a12 12 0 0 0 5.9 5.9l1.4-1.8 3.5 1 .5 2.5a2 2 0 0 1-2.2 2.4C11.4 20.3 3.7 12.6 3.1 5.7A2 2 0 0 1 5.5 3.5Z"/></svg>
            Call
          </a>
          <a class="link-btn wa" href="${esc(recWa)}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.1 8L3 21l1-4.9A9 9 0 1 1 21 12Z"/></svg>
            WhatsApp them
          </a>
          <button class="link-btn" type="button" data-copy="${esc(o.recipient?.phone || '')}">Copy number</button>
        </div>
      </div>

      <div class="d-block">
        <p class="block-title">The sender</p>
        <div class="d-row"><span>Name</span><b>${esc(o.customer?.name || '—')}${o.anonymous ? ' (asked to stay anonymous)' : ''}</b></div>
        <div class="d-row"><span>Phone</span><b>${esc(o.customer?.phone || '—')}</b></div>
        <div class="d-row"><span>Email</span><b>${esc(o.customer?.email || '—')}</b></div>
        <div class="contact-row">
          <a class="link-btn wa" href="${esc(senderWa)}?text=${encodeURIComponent('Hi ' + (o.customer?.name || '').split(' ')[0] + ', this is about your gift order ' + o.id + ' for ' + (o.recipient?.name || '') + '.')}" target="_blank" rel="noopener">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 12a9 9 0 0 1-13.1 8L3 21l1-4.9A9 9 0 1 1 21 12Z"/></svg>
            WhatsApp sender
          </a>
          ${o.customer?.email ? `<a class="link-btn" href="mailto:${esc(o.customer.email)}?subject=${encodeURIComponent('Your gift order ' + o.id)}">Email receipt</a>` : ''}
        </div>
      </div>

      <div class="d-block">
        <p class="block-title">Card message</p>
        ${o.giftMessage
          ? `<div class="card-preview"><p>“${esc(o.giftMessage)}”</p><small>${o.anonymous ? 'From your family' : 'Signed: ' + esc(o.customer?.name || '')}</small></div>`
          : '<p class="d-note">No card message on this order.</p>'}
      </div>

      <div class="d-block">
        <p class="block-title">Gifts (${qty})</p>
        <div class="line-items">
          ${items.map(i => `<div class="line-item"><span>${i.qty} × ${esc(i.name)}</span><b>${money(i.lineTotal)}</b></div>`).join('')}
          <div class="line-item"><span>Subtotal</span><b>${money(o.subtotal)}</b></div>
          <div class="line-item"><span>Delivery · ${esc(o.recipient?.zoneName || '')}</span><b>${Number(o.deliveryFee) === 0 ? 'Free' : money(o.deliveryFee)}</b></div>
          <div class="line-item total"><span>Total</span><b>${money(o.total)}</b></div>
        </div>
      </div>

      <div class="d-block">
        <p class="block-title">Payment</p>
        <div class="d-row"><span>Method</span><b>${o.payment === 'evc' ? 'EVC Plus' : 'Card link'}</b></div>
        <div class="pay-toggle">
          <button class="pay-btn${o.paymentStatus === 'paid' ? ' on' : ''}" type="button" data-pay="paid">Paid</button>
          <button class="pay-btn${o.paymentStatus !== 'paid' ? ' on' : ''}" type="button" data-pay="pending">Awaiting payment</button>
        </div>
        ${o.payment === 'evc' ? `<p class="d-note">EVC reference: <b>${esc(o.id)}</b> · send ${money(o.total)} to ${esc(contact.evcNumber)}.</p>` : ''}
      </div>

      ${o.note ? `<div class="d-block"><p class="block-title">Note from the sender</p><p class="d-note">${esc(o.note)}</p></div>` : ''}

      <div class="d-block">
        <p class="block-title">Photo proof</p>
        <p class="d-note">When it lands, send the photo to the sender on WhatsApp — that is what makes them order again. <a class="link-btn" href="${esc(senderWa)}" target="_blank" rel="noopener" style="margin-left:4px">Open chat</a></p>
      </div>`;

    $('courierInput').value = o.courier || '';
    $('statusFlow').innerHTML = FLOW.map(id => {
      const current = o.status === id;
      const next = !current && id === FLOW[FLOW.indexOf(o.status) + 1];
      return `<button class="flow-btn${current ? ' current' : ''}${next ? ' next' : ''}" type="button" data-set="${id}">${esc(statusLabel(id))}${next ? '<small>next</small>' : ''}</button>`;
    }).join('') + `
      <button class="flow-btn danger" type="button" data-set="failed">Failed</button>
      <button class="flow-btn danger" type="button" data-set="cancelled">Cancelled</button>`;
  }

  /* ---------------- writes ---------------- */
  async function patch(id, body, message) {
    try {
      const data = await api('/api/orders/' + encodeURIComponent(id), { method: 'PATCH', body: JSON.stringify(body) });
      const index = state.orders.findIndex(o => o.id === id);
      if (index > -1) state.orders[index] = data.order;
      renderKpis();
      renderChips();
      renderOrders();
      if (state.openId === id) renderPanel(data.order);
      if (message) toast(message);
    } catch (error) {
      if (error.auth) return lock();
      toast(error.message || 'Could not save');
    }
  }

  /* ---------------- csv ---------------- */
  function csvCell(value) {
    const s = String(value == null ? '' : value);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function exportCsv() {
    const list = filtered();
    if (!list.length) return toast('Nothing to export with these filters');
    const columns = [
      ['Order', o => o.id], ['Status', o => o.status], ['Payment', o => o.paymentStatus],
      ['Method', o => o.payment], ['Date', o => o.deliveryDate], ['Window', o => o.slotLabel],
      ['Recipient', o => o.recipient?.name], ['Recipient phone', o => o.recipient?.phone],
      ['Area', o => o.recipient?.zoneName], ['Landmark', o => o.recipient?.address],
      ['Sender', o => o.customer?.name], ['Sender phone', o => o.customer?.phone],
      ['Sender email', o => o.customer?.email], ['Anonymous', o => o.anonymous ? 'yes' : 'no'],
      ['Items', o => (o.items || []).map(i => i.qty + 'x ' + i.name).join(' | ')],
      ['Subtotal', o => Number(o.subtotal || 0).toFixed(2)], ['Delivery fee', o => Number(o.deliveryFee || 0).toFixed(2)],
      ['Total', o => Number(o.total || 0).toFixed(2)], ['Courier', o => o.courier || ''],
      ['Card message', o => o.giftMessage || ''], ['Note', o => o.note || ''],
      ['Placed', o => o.createdAt]
    ];
    const rows = [columns.map(c => c[0]).join(',')].concat(
      list.map(o => columns.map(c => csvCell(c[1](o))).join(','))
    );
    const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hadiyad-orders-' + dayString() + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast(list.length + ' order' + (list.length === 1 ? '' : 's') + ' exported');
  }

  /* ---------------- sound + toast ---------------- */
  let audioCtx = null;
  function initAudio() {
    if (audioCtx) return;
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) audioCtx = new Audio();
  }
  function beep() {
    if (!state.sound) return;
    initAudio();
    if (!audioCtx) return;
    [0, 0.22].forEach((offset, index) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = index ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.14, audioCtx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + offset + 0.18);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + offset);
      osc.stop(audioCtx.currentTime + offset + 0.2);
    });
  }
  let toastTimer = null;
  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  /* ---------------- events ---------------- */
  function bindEvents() {
    $('pinForm').addEventListener('submit', event => {
      event.preventDefault();
      $('gateError').hidden = true;
      const pin = $('pinInput').value.trim();
      if (!pin) return gateError('Enter the staff PIN.');
      initAudio();
      tryPin(pin);
    });

    $('lockBtn').addEventListener('click', lock);
    $('refreshBtn').addEventListener('click', () => { load(); toast('Orders refreshed'); });
    $('exportBtn').addEventListener('click', exportCsv);
    $('soundBtn').addEventListener('click', () => {
      state.sound = !state.sound;
      localStorage.setItem(PIN_KEY + '-sound', state.sound ? 'on' : 'off');
      $('soundBtn').textContent = state.sound ? 'Sound on' : 'Sound off';
      $('soundBtn').setAttribute('aria-pressed', String(state.sound));
      if (state.sound) { initAudio(); beep(); }
    });

    $('statusChips').addEventListener('click', event => {
      const chip = event.target.closest('[data-status]');
      if (!chip) return;
      state.status = chip.dataset.status;
      renderChips();
      renderOrders();
    });
    $('daySelect').addEventListener('change', event => { state.day = event.target.value; renderOrders(); });
    $('zoneSelect').addEventListener('change', event => { state.zone = event.target.value; renderOrders(); });
    $('searchInput').addEventListener('input', event => { state.search = event.target.value; renderOrders(); });

    $('orders').addEventListener('click', event => {
      const row = event.target.closest('.order');
      if (row) openPanel(row.dataset.id);
    });
    $('orders').addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('.order');
      if (row) { event.preventDefault(); openPanel(row.dataset.id); }
    });

    $('panelClose').addEventListener('click', closePanel);
    $('scrim').addEventListener('click', closePanel);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (state.openId) return closePanel();
        if (!$('gate').hidden) $('pinInput').focus();
      }
      if (event.key.toLowerCase() === 'r' && (event.metaKey || event.ctrlKey) && !$('dash').hidden) {
        event.preventDefault();
        load();
        toast('Orders refreshed');
      }
    });

    $('statusFlow').addEventListener('click', event => {
      const btn = event.target.closest('[data-set]');
      if (!btn || !state.openId) return;
      const id = btn.dataset.set;
      patch(state.openId, { status: id }, 'Marked as ' + statusLabel(id).toLowerCase());
      if (id === 'delivered' && state.sound) { initAudio(); beep(); }
    });

    $('panelScroll').addEventListener('click', async event => {
      const pay = event.target.closest('[data-pay]');
      if (pay && state.openId) {
        return patch(state.openId, { paymentStatus: pay.dataset.pay }, pay.dataset.pay === 'paid' ? 'Payment marked as received' : 'Payment set to awaiting');
      }
      const copy = event.target.closest('[data-copy]');
      if (copy) {
        const value = copy.dataset.copy;
        try { await navigator.clipboard.writeText(value); toast('Number copied'); }
        catch (error) { toast('Copy is blocked in this browser'); }
      }
    });

    $('courierSave').addEventListener('click', () => {
      if (!state.openId) return;
      patch(state.openId, { courier: $('courierInput').value.trim() }, $('courierInput').value.trim() ? 'Courier saved' : 'Courier cleared');
    });
    $('courierInput').addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); $('courierSave').click(); }
    });

    setInterval(stamp, 10000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.pin && Date.now() - state.lastLoad > REFRESH_MS) load(true);
    });
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    bindEvents();
    if (state.pin) {
      try {
        await api('/api/orders');
        $('gate').hidden = true;
        $('dash').hidden = false;
        await load();
        state.timer = setInterval(() => load(true), REFRESH_MS);
        return;
      } catch (error) {
        if (error.auth) localStorage.removeItem(PIN_KEY);
        state.pin = '';
      }
    }
    $('pinInput').focus();
  }

  boot();
})();
