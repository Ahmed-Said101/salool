(() => {
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const statuses = [
    { id: 'new', label: 'New', short: 'New' },
    { id: 'preparing', label: 'Preparing', short: 'Preparing' },
    { id: 'ready', label: 'Ready', short: 'Ready' },
    { id: 'delivering', label: 'Out for delivery', short: 'Out' },
    { id: 'completed', label: 'Completed', short: 'Done' },
    { id: 'cancelled', label: 'Cancelled', short: 'Cancelled' }
  ];
  const labelOf = id => statuses.find(status => status.id === id)?.label || id;
  const openStatuses = ['new', 'preparing', 'ready', 'delivering'];

  const state = {
    pin: sessionStorage.getItem('dukaan-dash-pin') || '',
    shop: null,
    orders: [],
    status: 'all',
    range: 'today',
    search: '',
    sound: localStorage.getItem('dukaan-sound') !== 'off',
    seen: new Set(),
    loaded: false,
    timer: null,
    offline: false
  };

  const currency = () => state.shop?.ordering?.currency || '$';
  const money = value => currency() + Number(value || 0).toFixed(2);

  function escAttr(value) {
    return esc(value).replace(/\n/g, ' ');
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function initials(value) {
    return String(value || 'B').trim().charAt(0).toUpperCase();
  }

  async function loadShop() {
    try {
      const response = await fetch('/api/shop');
      if (!response.ok) return;
      state.shop = await response.json();
      const initial = initials(state.shop.brand.initial || state.shop.brand.name);
      ['gateMark', 'dashMark'].forEach(id => { $(id).textContent = initial; });
      ['gateName', 'dashName'].forEach(id => { $(id).textContent = state.shop.brand.name; });
      document.title = 'Orders — ' + state.shop.brand.name;
    } catch { /* offline is handled when orders load */ }
  }

  /* ---------- auth ---------- */
  function showGate(message) {
    clearInterval(state.timer);
    state.timer = null;
    $('dash').hidden = true;
    $('gate').hidden = false;
    if (message) {
      const error = $('gateError');
      error.textContent = message;
      error.hidden = false;
      $('gate').classList.add('shake');
      setTimeout(() => $('gate').classList.remove('shake'), 450);
    }
    setTimeout(() => $('pinInput').focus(), 120);
  }

  function lock() {
    sessionStorage.removeItem('dukaan-dash-pin');
    state.pin = '';
    state.loaded = false;
    state.orders = [];
    showGate('Your session ended. Enter the PIN again.');
  }

  async function login(event) {
    event.preventDefault();
    const pin = $('pinInput').value.trim();
    if (!pin) return;
    const button = $('gateBtn');
    button.disabled = true;
    button.textContent = 'Checking…';
    $('gateError').hidden = true;

    state.pin = pin;
    initAudio();

    try {
      await fetchOrders();
      sessionStorage.setItem('dukaan-dash-pin', pin);
      $('gate').hidden = true;
      $('dash').hidden = false;
      state.loaded = true;
      render();
      $('pinInput').value = '';
      startPolling();
      toast('Dashboard unlocked');
    } catch (err) {
      if (err.code === 401) {
        showGate('Wrong PIN. Try again.');
      } else {
        showGate('Cannot reach the server. Start it with “node server.js”.');
      }
      state.pin = '';
    } finally {
      button.disabled = false;
      button.textContent = 'Open dashboard';
    }
  }

  /* ---------- data ---------- */
  async function fetchOrders() {
    const response = await fetch('/api/orders?limit=500', {
      headers: { 'x-dashboard-pin': state.pin },
      cache: 'no-store'
    });
    if (response.status === 401) {
      const error = new Error('Unauthorized');
      error.code = 401;
      throw error;
    }
    if (!response.ok) throw new Error('Could not load orders');
    const data = await response.json();
    const incoming = data.orders || [];

    if (state.loaded && state.sound) {
      const fresh = incoming.filter(order => !state.seen.has(order.id) && order.status === 'new');
      if (fresh.length) beep();
    }
    incoming.forEach(order => state.seen.add(order.id));
    state.orders = incoming;
    state.loaded = true;
    state.offline = false;
    setLive(false);
    $('updated').textContent = 'Updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function setLive(offline) {
    $('live').classList.toggle('offline', offline);
    $('liveLabel').textContent = offline ? 'Offline' : 'Live';
  }

  function startPolling() {
    clearInterval(state.timer);
    state.timer = setInterval(() => {
      if (document.hidden) return;
      refresh(true);
    }, 8000);
  }

  async function refresh(silent) {
    try {
      await fetchOrders();
      render();
    } catch (err) {
      if (err.code === 401) return lock();
      if (!silent) toast('Could not refresh. Check the server.');
      setLive(true);
    }
  }

  /* ---------- filtering ---------- */
  function startOfToday() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function inRange(order) {
    if (state.range === 'all') return true;
    const created = new Date(order.createdAt);
    if (state.range === 'week') return created >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return created >= startOfToday();
  }

  function matchesSearch(order) {
    const query = state.search.trim().toLowerCase();
    if (!query) return true;
    const haystack = [
      order.id,
      order.customer?.name,
      order.customer?.phone,
      order.address,
      order.note,
      ...(order.items || []).map(item => item.name)
    ].join(' ').toLowerCase();
    return haystack.includes(query);
  }

  function rangeOrders() {
    return state.orders.filter(inRange);
  }

  function visibleOrders() {
    return rangeOrders()
      .filter(order => state.status === 'all' || order.status === state.status)
      .filter(matchesSearch)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /* ---------- rendering ---------- */
  function render() {
    if (!state.shop) return;
    const range = rangeOrders();
    const valid = range.filter(order => order.status !== 'cancelled');
    const revenue = valid.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const open = range.filter(order => openStatuses.includes(order.status)).length;

    $('kpiOrders').textContent = range.length;
    $('kpiRevenue').textContent = money(revenue);
    $('kpiOpen').textContent = open;
    $('kpiAvg').textContent = valid.length ? money(revenue / valid.length) : money(0);
    $('kpiOrdersSub').textContent = state.range === 'today' ? 'today' : state.range === 'week' ? 'last 7 days' : 'all time';
    $('pageTitle').textContent = state.range === 'today' ? 'Today, at a glance.'
      : state.range === 'week' ? 'The last seven days.'
      : 'Every order.';

    renderChips(range);
    renderOrders();
  }

  function renderChips(range) {
    const counts = { all: range.length };
    statuses.forEach(status => { counts[status.id] = 0; });
    range.forEach(order => { if (counts[order.status] != null) counts[order.status] += 1; });

    const chips = [{ id: 'all', label: 'All' }, ...statuses];
    $('statusChips').innerHTML = chips.map(chip => `
      <button class="chip ${state.status === chip.id ? 'active' : ''}" type="button"
        data-status-filter="${chip.id}" aria-pressed="${state.status === chip.id}">
        ${esc(chip.label)} <span class="n">${counts[chip.id] || 0}</span>
      </button>
    `).join('');
  }

  function relativeTime(iso) {
    const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 45) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
    return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
  }

  function nextStep(order) {
    if (order.status === 'new') return { status: 'preparing', label: 'Start' };
    if (order.status === 'preparing') return { status: 'ready', label: 'Ready' };
    if (order.status === 'ready') return order.fulfilment === 'pickup'
      ? { status: 'completed', label: 'Handed over' }
      : { status: 'delivering', label: 'On the way' };
    if (order.status === 'delivering') return { status: 'completed', label: 'Delivered' };
    return null;
  }

  function renderOrders() {
    const orders = visibleOrders();
    const container = $('orders');
    $('empty').hidden = orders.length > 0;

    if (!orders.length) {
      const range = rangeOrders();
      $('empty').innerHTML = range.length
        ? '<b>Nothing in this view.</b><span>Try another status or clear the search.</span>'
        : '<b>No orders yet.</b><span>Orders placed on the storefront appear here within a few seconds.</span>';
      container.innerHTML = '';
      return;
    }

    container.innerHTML = orders.map(order => {
      const phone = String(order.customer?.phone || '').replace(/[^\d+]/g, '');
      const items = (order.items || []).map(item => `${item.qty} × ${item.name}`).join(', ');
      const step = nextStep(order);
      const itemCount = (order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
      const waText = encodeURIComponent(`Hello ${order.customer?.name || ''}, about your order ${order.id} from ${state.shop.brand.name}.`);
      const wa = phone ? 'https://wa.me/' + phone.replace(/\D/g, '') + '?text=' + waText : '';

      return `
        <article class="order ${order.status === 'new' ? 'is-new' : ''}" data-status="${esc(order.status)}" data-id="${escAttr(order.id)}">
          <div class="o-id">
            <b>${esc(order.id)}${order.status === 'new' ? '<span class="new-tag">NEW</span>' : ''}</b>
            <span>${new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · ${relativeTime(order.createdAt)}</span>
          </div>
          <div class="o-cust">
            <b>${esc(order.customer?.name)}</b>
            <a href="tel:${escAttr(phone)}">${esc(order.customer?.phone)}</a>
            <div>
              <span class="tag">${order.fulfilment === 'delivery' ? 'Delivery' : 'Pickup'}</span>
              <span class="tag">${order.payment === 'evc' ? 'EVC' : 'Cash'}</span>
            </div>
            ${order.fulfilment === 'delivery' && order.address ? `<p class="addr">${esc(order.address)}</p>` : ''}
          </div>
          <div class="o-items">
            <p>${esc(items)}</p>
            ${order.note ? `<span class="note">Note: ${esc(order.note)}</span>` : ''}
          </div>
          <div class="o-money">
            <b>${money(order.total)}</b>
            <span>${itemCount} ${itemCount === 1 ? 'item' : 'items'}</span>
          </div>
          <div class="o-actions">
            <select class="status-select" data-set-status="${escAttr(order.id)}" aria-label="Status for ${escAttr(order.id)}">
              ${statuses.map(status => `<option value="${status.id}" ${order.status === status.id ? 'selected' : ''}>${esc(status.short)}</option>`).join('')}
            </select>
            ${step ? `<button class="next-btn ${order.status === 'new' ? '' : 'quiet'}" type="button" data-next="${escAttr(order.id)}">${esc(step.label)}</button>` : ''}
            ${wa ? `<a class="wa-link" href="${escAttr(wa)}" target="_blank" rel="noopener" aria-label="Message ${escAttr(order.customer?.name)} on WhatsApp">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.1-5.4A8.5 8.5 0 1 1 21 11.5Z"></path><path d="M8.5 9.5c0 3 2 5 5 5"></path></svg>
            </a>` : ''}
          </div>
        </article>`;
    }).join('');
  }

  /* ---------- updates ---------- */
  async function setStatus(order, status) {
    if (!order || order.status === status) return;
    try {
      const response = await fetch('/api/orders/' + encodeURIComponent(order.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-dashboard-pin': state.pin },
        body: JSON.stringify({ status })
      });
      if (response.status === 401) return lock();
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Update failed');
      Object.assign(order, data.order);
      render();
      toast(`${order.id} → ${labelOf(status)}`);
    } catch (err) {
      toast(err.message || 'Could not update the order');
      refresh(true);
    }
  }

  function exportCsv() {
    const orders = visibleOrders();
    if (!orders.length) return toast('Nothing to export in this view');
    const header = ['Order', 'Placed', 'Status', 'Name', 'Phone', 'Type', 'Address', 'Items', 'Subtotal', 'Delivery', 'Total', 'Payment', 'Note'];
    const rows = orders.map(order => [
      order.id,
      new Date(order.createdAt).toLocaleString(),
      labelOf(order.status),
      order.customer?.name || '',
      order.customer?.phone || '',
      order.fulfilment,
      order.address || '',
      (order.items || []).map(item => `${item.qty} x ${item.name}`).join('; '),
      order.subtotal,
      order.deliveryFee,
      order.total,
      order.payment,
      order.note || ''
    ]);
    const csv = '\uFEFF' + [header, ...rows]
      .map(row => row.map(cell => '"' + String(cell == null ? '' : cell).replace(/"/g, '""') + '"').join(','))
      .join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'orders-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast(`${orders.length} orders exported`);
  }

  /* ---------- sound ---------- */
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
    if (audioCtx.state === 'suspended') audioCtx.resume();
    [0, 0.18].forEach((offset, index) => {
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = index ? 880 : 660;
      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + offset + 0.16);
      oscillator.connect(gain).connect(audioCtx.destination);
      oscillator.start(audioCtx.currentTime + offset);
      oscillator.stop(audioCtx.currentTime + offset + 0.18);
    });
  }

  /* ---------- events ---------- */
  function wire() {
    $('pinForm').addEventListener('submit', login);
    $('rangeSelect').addEventListener('change', event => {
      state.range = event.target.value;
      render();
    });
    $('searchInput').addEventListener('input', event => {
      state.search = event.target.value;
      render();
    });
    $('refreshBtn').addEventListener('click', () => refresh(false));
    $('exportBtn').addEventListener('click', exportCsv);
    $('lockBtn').addEventListener('click', lock);

    $('soundBtn').addEventListener('click', () => {
      state.sound = !state.sound;
      localStorage.setItem('dukaan-sound', state.sound ? 'on' : 'off');
      paintSound();
      if (state.sound) { initAudio(); beep(); }
    });

    document.addEventListener('change', event => {
      const select = event.target.closest('[data-set-status]');
      if (!select) return;
      const order = state.orders.find(item => item.id === select.dataset.setStatus);
      setStatus(order, select.value);
    });

    $('statusChips').addEventListener('click', event => {
      const chip = event.target.closest('[data-status-filter]');
      if (!chip) return;
      state.status = chip.dataset.statusFilter;
      renderChips(rangeOrders());
      renderOrders();
    });

    $('orders').addEventListener('click', event => {
      const button = event.target.closest('[data-next]');
      if (!button) return;
      const order = state.orders.find(item => item.id === button.dataset.next);
      const step = nextStep(order || {});
      if (order && step) setStatus(order, step.status);
    });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && state.pin) refresh(true);
    });
  }

  function paintSound() {
    $('soundBtn').textContent = state.sound ? 'Sound on' : 'Sound off';
    $('soundBtn').setAttribute('aria-pressed', String(state.sound));
  }

  async function init() {
    wire();
    paintSound();
    await loadShop();
    if (!state.shop) {
      state.shop = { brand: { name: 'Store', initial: 'S' }, ordering: { currency: '$' } };
    }
    if (state.pin) {
      try {
        await fetchOrders();
        $('gate').hidden = true;
        $('dash').hidden = false;
        render();
        startPolling();
      } catch (err) {
        if (err.code === 401) {
          sessionStorage.removeItem('dukaan-dash-pin');
          state.pin = '';
          showGate('Enter the PIN to continue.');
        } else {
          showGate('Cannot reach the server. Start it with “node server.js”.');
        }
      }
    } else {
      showGate();
    }
  }

  init();
})();
