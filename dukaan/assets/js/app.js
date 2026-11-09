(() => {
  const state = {
    shop: null,
    cart: new Map(),
    category: 'all',
    search: '',
    storageKey: 'dukaan-cart',
    pendingOrder: null
  };

  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const money = value => {
    const currency = state.shop?.ordering?.currency || '$';
    return currency + Number(value || 0).toFixed(2);
  };

  const productById = id => state.shop?.products.find(product => product.id === id);

  function cartLines() {
    return [...state.cart.entries()]
      .map(([id, qty]) => {
        const product = productById(id);
        return product ? { product, qty, lineTotal: product.price * qty } : null;
      })
      .filter(Boolean);
  }

  function cartTotals() {
    const subtotal = cartLines().reduce((sum, line) => sum + line.lineTotal, 0);
    const ordering = state.shop.ordering;
    const freeOver = Number(ordering.freeDeliveryOver) || 0;
    const fee = freeOver && subtotal >= freeOver ? 0 : Number(ordering.deliveryFee) || 0;
    return {
      subtotal,
      fee,
      total: subtotal + fee,
      count: cartLines().reduce((sum, line) => sum + line.qty, 0),
      minOrder: Number(ordering.minOrder) || 0
    };
  }

  function saveCart() {
    try {
      localStorage.setItem(state.storageKey, JSON.stringify([...state.cart.entries()]));
    } catch { /* storage unavailable */ }
  }

  function loadCart() {
    try {
      const raw = JSON.parse(localStorage.getItem(state.storageKey) || '[]');
      state.cart = new Map(raw.filter(([id, qty]) => productById(id) && Number.isInteger(qty) && qty > 0));
    } catch {
      state.cart = new Map();
    }
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  function applyShop() {
    const { brand, contact, ordering, hours, location } = state.shop;
    const initial = (brand.initial || brand.name.charAt(0)).toUpperCase();

    document.title = `${brand.name} — ${brand.tagline}`;
    ['brandMark', 'footMark'].forEach(id => { $(id).textContent = initial; });
    ['brandName', 'footName', 'footName2'].forEach(id => { $(id).textContent = brand.name; });
    $('brandCity').textContent = brand.city;
    $('footTagline').textContent = brand.tagline;
    $('heroPlace').textContent = brand.city;
    $('heroLead').textContent = brand.about;
    $('aboutText').textContent = brand.about;
    $('heroHours').textContent = hours.label;
    $('heroPrep').textContent = `Delivery ${ordering.prepTime}`;
    $('hoursFact').textContent = hours.label.replace(/^open daily\s*·\s*/i, '');
    $('deliveryFact').textContent = ordering.deliveryArea || 'Ask us';
    $('minOrderFact').textContent = money(ordering.minOrder);
    $('feeFact').textContent = money(ordering.deliveryFee);
    $('freeFact').textContent = money(ordering.freeDeliveryOver);
    $('choiceDelivery').textContent = ordering.prepTime;
    $('year').textContent = new Date().getFullYear();

    const [first, ...rest] = brand.tagline.split('. ');
    $('heroTitle').innerHTML = rest.length
      ? `<span>${esc(first)}.</span><em>${esc(rest.join('. '))}</em>`
      : `<span>${esc(brand.tagline)}</span>`;

    const area = location.address.split(',').pop().trim();
    $('visitTitle').textContent = `${area}, ${brand.city}`;
    $('visitAddress').innerHTML = `${esc(location.address)}<br>${esc(location.city)}`;
    $('visitHours').textContent = hours.label;

    $('mapsLink').href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(location.mapsQuery || location.address);
    $('mapFallbackName').textContent = brand.name;
    $('mapFallbackAddress').innerHTML = `${esc(location.address)}<br>${esc(location.city)}`;
    const mapFrame = $('mapFrame');
    mapFrame.addEventListener('load', () => {
      if (mapFrame.src && mapFrame.src.startsWith('https://maps.google.com/')) mapFrame.classList.add('loaded');
    });
    mapFrame.src = 'https://maps.google.com/maps?q=' + encodeURIComponent(location.mapsQuery || location.address) + '&z=14&output=embed';

    const phoneDigits = '+252' + String(contact.whatsapp).replace(/\D/g, '').replace(/^252/, '');
    $('callLink').href = 'tel:' + phoneDigits;
    $('footPhone').href = 'tel:' + phoneDigits;
    $('footPhone').textContent = contact.phoneDisplay;
    $('footEmail').href = 'mailto:' + contact.email;
    $('footEmail').textContent = contact.email;
    $('footWhatsApp').href = 'https://wa.me/' + String(contact.whatsapp).replace(/\D/g, '');

    $('payNumber').textContent = contact.evcNumber;
    $('payName').textContent = contact.evcName;

    state.storageKey = 'dukaan-cart-' + brand.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    setOpenStatus();
  }

  function setOpenStatus() {
    const { open, close } = state.shop.hours;
    const toMinutes = value => {
      const [h, m] = String(value).split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = toMinutes(open);
    const end = toMinutes(close);
    const isOpen = end > start ? minutes >= start && minutes < end : minutes >= start || minutes < end;

    const pill = $('openPill');
    pill.classList.toggle('closed', !isOpen);
    $('openLabel').textContent = isOpen ? 'Open now' : 'Closed';
    pill.title = state.shop.hours.label;
  }

  function renderFilters() {
    const filters = [{ id: 'all', name: 'Everything' }, ...state.shop.categories];
    $('filters').innerHTML = filters.map(category => `
      <button class="filter ${category.id === state.category ? 'active' : ''}" type="button"
        data-category="${esc(category.id)}" aria-pressed="${category.id === state.category}">${esc(category.name)}</button>
    `).join('');
  }

  function renderFeatured() {
    const featured = state.shop.products.filter(product => product.img);
    $('featured').innerHTML = featured.map(product => `
      <article class="feat-card">
        <img src="${esc(product.img)}" alt="${esc(product.name)}" loading="lazy">
        <div class="feat-shade" aria-hidden="true"></div>
        ${product.badge ? `<span class="feat-badge">${esc(product.badge)}</span>` : ''}
        <div class="feat-body">
          <span class="feat-cat">${esc(categoryName(product.cat))}</span>
          <h3>${esc(product.name)}</h3>
          <p>${esc(product.desc)}</p>
        </div>
        <div class="feat-buy">
          <span class="price">${money(product.price)}</span>
          <button class="add-btn" type="button" data-add="${esc(product.id)}" aria-label="Add ${esc(product.name)} to order">+</button>
        </div>
      </article>
    `).join('');
  }

  function categoryName(id) {
    return state.shop.categories.find(category => category.id === id)?.name || '';
  }

  function visibleProducts() {
    const query = state.search.trim().toLowerCase();
    return state.shop.products.filter(product => {
      const inCategory = state.category === 'all' || product.cat === state.category;
      const matches = !query || `${product.name} ${product.desc} ${categoryName(product.cat)}`.toLowerCase().includes(query);
      return inCategory && matches;
    });
  }

  function renderMenu() {
    const products = visibleProducts();
    $('menuGrid').innerHTML = products.map(product => `
      <article class="menu-card">
        <div class="menu-main">
          <div class="menu-title">
            <h3>${esc(product.name)}</h3>
            ${product.badge ? `<span class="badge">${esc(product.badge)}</span>` : ''}
          </div>
          <p>${esc(product.desc)}</p>
        </div>
        <div class="menu-buy">
          <span class="price">${money(product.price)}</span>
          <button class="add-btn" type="button" data-add="${esc(product.id)}" aria-label="Add ${esc(product.name)} to order">+</button>
        </div>
      </article>
    `).join('');

    $('menuCount').textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'}`;
    $('menuEmpty').hidden = products.length > 0;
  }

  function renderCart() {
    const lines = cartLines();
    const totals = cartTotals();
    const body = $('cartBody');

    if (!lines.length) {
      body.innerHTML = `
        <div class="cart-empty">
          <p>Your basket is empty.</p>
          <button class="btn btn-ghost" type="button" id="cartBrowse">Browse the menu</button>
        </div>`;
    } else {
      body.innerHTML = lines.map(({ product, qty }) => `
        <div class="cart-item" data-id="${esc(product.id)}">
          ${product.img ? `<img class="ci-img" src="${esc(product.img)}" alt="">` : ''}
          <div class="ci-main">
          <div class="ci-top">
            <h3>${esc(product.name)}</h3>
            <button class="ci-remove" type="button" data-remove="${esc(product.id)}">Remove</button>
          </div>
          <div class="ci-bottom">
            <span class="ci-price">${money(product.price * qty)}</span>
            <div class="stepper">
              <button type="button" data-dec="${esc(product.id)}" aria-label="Decrease ${esc(product.name)}">−</button>
              <span aria-label="Quantity">${qty}</span>
              <button type="button" data-inc="${esc(product.id)}" aria-label="Increase ${esc(product.name)}">+</button>
            </div>
          </div>
          </div>
        </div>
      `).join('');
    }

    $('cartSubtotal').textContent = money(totals.subtotal);
    $('cartDelivery').textContent = totals.fee === 0 && totals.subtotal > 0
      ? 'Free'
      : `from ${money(state.shop.ordering.deliveryFee)}`;

    const hint = $('cartHint');
    if (!lines.length) {
      hint.textContent = '';
    } else if (totals.subtotal < totals.minOrder) {
      hint.textContent = `Add ${money(totals.minOrder - totals.subtotal)} to reach the ${money(totals.minOrder)} minimum.`;
    } else if (totals.fee > 0) {
      hint.textContent = `Add ${money(Number(state.shop.ordering.freeDeliveryOver) - totals.subtotal)} for free delivery.`;
    } else {
      hint.textContent = 'Free delivery unlocked.';
    }

    const canCheckout = lines.length > 0 && totals.subtotal >= totals.minOrder;
    $('checkoutBtn').disabled = !canCheckout;
    $('checkoutBtn').textContent = canCheckout ? `Checkout · ${money(totals.subtotal)}` : 'Checkout';

    const count = totals.count;
    $('cartCount').textContent = count;
    $('mobileBarCount').textContent = `${count} ${count === 1 ? 'item' : 'items'}`;
    $('mobileBarTotal').textContent = money(totals.subtotal);
    $('mobileBar').hidden = count === 0;
  }

  function bumpCount() {
    const el = $('cartCount');
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  }

  function addToCart(id, qty = 1) {
    const product = productById(id);
    if (!product) return;
    const next = Math.min(20, (state.cart.get(id) || 0) + qty);
    state.cart.set(id, next);
    saveCart();
    renderCart();
    bumpCount();
    toast(`${product.name} added to your order`);
  }

  function changeQty(id, delta) {
    const next = (state.cart.get(id) || 0) + delta;
    if (next < 1) state.cart.delete(id);
    else state.cart.set(id, Math.min(20, next));
    saveCart();
    renderCart();
  }

  function removeLine(id) {
    state.cart.delete(id);
    saveCart();
    renderCart();
    toast('Removed from your order');
  }

  let lastFocus = null;

  function openCart() {
    lastFocus = document.activeElement;
    $('cart').classList.add('open');
    $('cart').setAttribute('aria-hidden', 'false');
    $('cartBtn').setAttribute('aria-expanded', 'true');
    showScrim();
    document.body.classList.add('is-locked');
    setTimeout(() => $('cartClose').focus(), 250);
  }

  function closeCart(silent = false) {
    $('cart').classList.remove('open');
    $('cart').setAttribute('aria-hidden', 'true');
    $('cartBtn').setAttribute('aria-expanded', 'false');
    if (silent) return;
    hideScrim();
    document.body.classList.remove('is-locked');
    if (lastFocus) lastFocus.focus();
  }

  function showScrim() {
    const scrim = $('scrim');
    scrim.hidden = false;
    requestAnimationFrame(() => scrim.classList.add('show'));
  }

  function hideScrim() {
    const scrim = $('scrim');
    scrim.classList.remove('show');
    setTimeout(() => { if (!$('cart').classList.contains('open') && $('checkoutModal').hidden) scrim.hidden = true; }, 300);
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

  function currentFulfilment() {
    return document.querySelector('input[name="fulfilment"]:checked')?.value || 'delivery';
  }

  function checkoutTotals(fulfilment = currentFulfilment()) {
    const lines = cartLines();
    const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
    const ordering = state.shop.ordering;
    const freeOver = Number(ordering.freeDeliveryOver) || 0;
    const fee = fulfilment === 'pickup' || (freeOver && subtotal >= freeOver) ? 0 : Number(ordering.deliveryFee) || 0;
    return { lines, subtotal, fee, total: subtotal + fee };
  }

  function renderCheckoutSummary() {
    const { lines, subtotal, fee, total } = checkoutTotals();
    const fulfilment = currentFulfilment();
    $('checkoutSummary').innerHTML = lines.map(line => `
      <div class="sum-line"><span>${line.qty} × ${esc(line.product.name)}</span><b>${money(line.lineTotal)}</b></div>
    `).join('') + `
      <div class="sum-line"><span>Subtotal</span><b>${money(subtotal)}</b></div>
      <div class="sum-line"><span>${fulfilment === 'pickup' ? 'Pickup' : 'Delivery'}</span><b>${fee === 0 ? 'Free' : money(fee)}</b></div>
      <div class="sum-total"><span>Total</span><b>${money(total)}</b></div>`;

    $('placeOrderBtn').textContent = `Place order · ${money(total)}`;
    $('placeOrderBtn').dataset.total = total.toFixed(2);
  }

  function syncFulfilmentCopy() {
    const pickup = currentFulfilment() === 'pickup';
    $('checkoutTitle').textContent = pickup ? 'Coming to collect it?' : 'Where should we send it?';
    $('addressField').hidden = pickup;
    $('cashHint').textContent = pickup ? 'Pay at pickup' : 'Pay on delivery';
    $('evcHint').textContent = pickup ? 'Send before pickup' : 'Send before delivery';
  }

  function openCheckout() {
    if (!cartLines().length) return;
    $('formError').hidden = true;
    syncFulfilmentCopy();
    $('checkoutFormView').hidden = false;
    $('successView').hidden = true;
    renderCheckoutSummary();
    closeCart(true);
    $('checkoutModal').hidden = false;
    showScrim();
    document.body.classList.add('is-locked');
    requestAnimationFrame(() => {
      $('checkoutModal').classList.add('show');
      setTimeout(() => $('custName').focus(), 250);
    });
  }

  function closeCheckout() {
    $('checkoutModal').classList.remove('show');
    document.body.classList.remove('is-locked');
    setTimeout(() => {
      $('checkoutModal').hidden = true;
      hideScrim();
    }, 280);
  }

  function setFieldError(field, invalid) {
    field.classList.toggle('invalid', invalid);
  }

  async function placeOrder(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const nameInput = $('custName');
    const phoneInput = $('custPhone');
    const addressInput = $('custAddress');
    const fulfilment = currentFulfilment();
    const payment = document.querySelector('input[name="payment"]:checked')?.value || 'evc';
    const error = $('formError');
    const button = $('placeOrderBtn');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const address = addressInput.value.trim();

    setFieldError(nameInput.closest('.field'), name.length < 2);
    setFieldError(phoneInput.closest('.field'), !/^\+?[\d\s()-]{6,24}$/.test(phone));
    setFieldError(addressInput.closest('.field'), fulfilment === 'delivery' && address.length < 5);

    if (name.length < 2) return showFormError('Please enter your name.');
    if (!/^\+?[\d\s()-]{6,24}$/.test(phone)) return showFormError('Please enter a valid phone number.');
    if (fulfilment === 'delivery' && address.length < 5) return showFormError('Please add a delivery address.');

    const payload = {
      customer: { name, phone },
      fulfilment,
      address,
      payment,
      note: $('custNote').value.trim(),
      items: cartLines().map(line => ({ id: line.product.id, qty: line.qty }))
    };

    button.disabled = true;
    button.textContent = 'Placing order…';
    error.hidden = true;

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not place your order.');
      showOrderSuccess(data.order);
    } catch (err) {
      showFormError(err.message || 'Could not place your order. Please try again.');
      renderCheckoutSummary();
    } finally {
      button.disabled = false;
    }
  }

  function showFormError(message) {
    const error = $('formError');
    error.textContent = message;
    error.hidden = false;
    error.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function showOrderSuccess(order) {
    state.pendingOrder = order;
    const { contact, ordering } = state.shop;

    $('checkoutFormView').hidden = true;
    $('successView').hidden = false;
    $('successId').textContent = order.id;
    $('successName').textContent = order.customer.name.split(' ')[0];
    $('successTotal').textContent = money(order.total);
    $('successLead').textContent = order.fulfilment === 'delivery'
      ? `We’ll call ${order.customer.phone} if we need you. Delivery takes about ${ordering.prepTime}.`
      : `We’ll call ${order.customer.phone} when it’s ready for pickup — about ${ordering.prepTime}.`;

    $('ticketLines').innerHTML = `
      <div><span>${order.items.reduce((sum, item) => sum + item.qty, 0)} items</span><b>${money(order.subtotal)}</b></div>
      ${order.deliveryFee > 0 ? `<div><span>Delivery</span><b>${money(order.deliveryFee)}</b></div>` : ''}
      <div><span>Payment</span><b>${order.payment === 'evc' ? 'EVC Plus' : 'Cash'}</b></div>
      <div><span>${order.fulfilment === 'delivery' ? 'Deliver to' : 'Pickup'}</span><b>${order.fulfilment === 'delivery' ? esc(order.address) : 'In store'}</b></div>
    `;

    const payBox = $('payBox');
    payBox.hidden = order.payment !== 'evc';
    $('payAmount').textContent = money(order.total);
    $('payRef').textContent = order.id;
    $('successNote').textContent = order.payment === 'evc'
      ? 'Send the total, then keep your order number. We start as soon as the payment lands.'
      : `Pay ${money(order.total)} in cash when you ${order.fulfilment === 'delivery' ? 'receive' : 'pick up'} your order.`;

    const lines = [
      `New order ${order.id}`,
      `Name: ${order.customer.name}`,
      `Phone: ${order.customer.phone}`,
      order.fulfilment === 'delivery' ? `Address: ${order.address}` : 'Pickup in store',
      '',
      ...order.items.map(item => `${item.qty} × ${item.name} — ${money(item.lineTotal)}`),
      '',
      `Subtotal: ${money(order.subtotal)}`,
      order.deliveryFee > 0 ? `Delivery: ${money(order.deliveryFee)}` : 'Delivery: Free',
      `Total: ${money(order.total)}`,
      `Payment: ${order.payment === 'evc' ? 'EVC Plus' : 'Cash'}`,
      order.note ? `Note: ${order.note}` : ''
    ].filter(Boolean).join('\n');

    $('whatsappBtn').href = 'https://wa.me/' + String(contact.whatsapp).replace(/\D/g, '') + '?text=' + encodeURIComponent(lines);

    state.cart.clear();
    saveCart();
    renderCart();
    bumpCount();
    setTimeout(() => $('successId').scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 80);
  }

  function copyPayment() {
    const order = state.pendingOrder;
    if (!order) return;
    const { contact } = state.shop;
    const text = `EVC Plus: ${contact.evcNumber} (${contact.evcName}) — ${money(order.total)} — ref ${order.id}`;
    const done = () => toast('Payment details copied');
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
    function fallbackCopy() {
      const area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); done(); } catch { toast('Could not copy — select the number manually'); }
      area.remove();
    }
  }

  function resetForm() {
    $('checkoutForm').reset();
    $('addressField').hidden = false;
    $('formError').hidden = true;
    renderCheckoutSummary();
  }

  function wireEvents() {
    $('cartBtn').addEventListener('click', openCart);
    $('mobileBar').addEventListener('click', openCart);
    $('cartClose').addEventListener('click', closeCart);
    $('scrim').addEventListener('click', () => {
      if ($('checkoutModal').hidden) closeCart();
    });

    $('menuToggle').addEventListener('click', () => {
      if ($('mobileMenu').classList.contains('open')) closeMobileMenu();
      else openMobileMenu();
    });

    document.querySelectorAll('#mobileMenu a').forEach(link => link.addEventListener('click', closeMobileMenu));
    $('mobileOrderLink').addEventListener('click', closeMobileMenu);

    document.addEventListener('click', event => {
      const add = event.target.closest('[data-add]');
      if (add) return addToCart(add.dataset.add);

      const inc = event.target.closest('[data-inc]');
      if (inc) return changeQty(inc.dataset.inc, 1);

      const dec = event.target.closest('[data-dec]');
      if (dec) return changeQty(dec.dataset.dec, -1);

      const remove = event.target.closest('[data-remove]');
      if (remove) return removeLine(remove.dataset.remove);

      const filter = event.target.closest('[data-category]');
      if (filter) {
        state.category = filter.dataset.category;
        renderFilters();
        renderMenu();
        return;
      }

      if (event.target.id === 'cartBrowse') {
        closeCart();
        $('menu').scrollIntoView({ behavior: 'smooth' });
      }
    });

    $('searchInput').addEventListener('input', event => {
      state.search = event.target.value;
      renderMenu();
    });

    $('checkoutBtn').addEventListener('click', openCheckout);
    $('modalClose').addEventListener('click', closeCheckout);
    $('checkoutModal').addEventListener('click', event => {
      if (event.target === $('checkoutModal')) closeCheckout();
    });

    document.querySelectorAll('input[name="fulfilment"]').forEach(radio => {
      radio.addEventListener('change', () => {
        syncFulfilmentCopy();
        renderCheckoutSummary();
      });
    });

    $('checkoutForm').addEventListener('submit', placeOrder);
    $('copyPay').addEventListener('click', copyPayment);
    $('newOrderBtn').addEventListener('click', () => {
      resetForm();
      closeCheckout();
      setTimeout(() => $('menu').scrollIntoView({ behavior: 'smooth' }), 260);
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (!$('checkoutModal').hidden) return closeCheckout();
      if ($('cart').classList.contains('open')) return closeCart();
      if ($('mobileMenu').classList.contains('open')) return closeMobileMenu();
    });

    const onScroll = () => $('siteHead').classList.toggle('scrolled', window.scrollY > 24);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        });
      }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
      document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    } else {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    }
  }

  async function init() {
    wireEvents();
    try {
      const response = await fetch('/api/shop');
      if (!response.ok) throw new Error('Menu unavailable');
      state.shop = await response.json();
      applyShop();
      loadCart();
      renderFilters();
      renderFeatured();
      renderMenu();
      renderCart();
    } catch {
      $('menuGrid').innerHTML = '';
      $('menuEmpty').hidden = false;
      $('menuEmpty').textContent = 'The menu could not load. Start the server with “node server.js” and refresh.';
      $('menuCount').textContent = '';
      $('checkoutBtn').disabled = true;
      $('cartCount').textContent = '0';
    }
  }

  init();
})();
