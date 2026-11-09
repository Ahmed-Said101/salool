const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const port = Number(process.env.PORT) || 4190;
const shopFile = path.join(root, 'assets', 'data', 'shop.json');
const ordersFile = path.join(root, 'data', 'orders.json');
const statuses = ['new', 'confirmed', 'preparing', 'out', 'delivered', 'failed', 'cancelled'];
const paymentStatuses = ['pending', 'paid'];

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon'
};

function loadShop() {
  return JSON.parse(fs.readFileSync(shopFile, 'utf8'));
}

function publicShop(shop) {
  const copy = JSON.parse(JSON.stringify(shop));
  delete copy.contact.dashboardPin;
  return copy;
}

function loadOrders() {
  try {
    const data = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  fs.mkdirSync(path.dirname(ordersFile), { recursive: true });
  const tmp = ordersFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(orders, null, 2));
  fs.renameSync(tmp, ordersFile);
}

function dashboardPin(shop) {
  return String(process.env.DASHBOARD_PIN || shop.contact.dashboardPin || '');
}

function pinMatches(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected || ''));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(body);
}

function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const buckets = new Map();
function allow(ip, name, max, windowMs) {
  const key = name + ':' + ip;
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= max;
}

function clean(value, max = 80) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function localDate(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function localTime(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return pad(date.getHours()) + ':' + pad(date.getMinutes());
}

function parseDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return null;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function dayDiff(from, to) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86400000);
}

function orderNumber(orders, shop) {
  const prefix = (shop.brand.initial || 'H').toUpperCase();
  let max = 1000;
  for (const order of orders) {
    const match = new RegExp('^' + prefix + '-(\\d+)$').exec(order.id || '');
    if (match) max = Math.max(max, Number(match[1]));
  }
  return prefix + '-' + (max + 1);
}

function publicOrder(order) {
  return {
    id: order.id,
    status: order.status,
    createdAt: order.createdAt,
    deliveryDate: order.deliveryDate,
    slotLabel: order.slotLabel,
    recipientName: order.recipient?.name || '',
    zoneName: order.recipient?.zoneName || '',
    itemCount: (order.items || []).reduce((sum, item) => sum + Number(item.qty || 0), 0),
    total: order.total,
    currency: order.currency,
    paymentStatus: order.paymentStatus,
    giftMessage: order.giftMessage || ''
  };
}

function validateOrder(body, shop) {
  const customer = body.customer || {};
  const recipient = body.recipient || {};
  const ordering = shop.ordering;

  const senderName = clean(customer.name, 60);
  const senderPhone = clean(customer.phone, 30);
  const senderEmail = clean(customer.email, 90);
  if (senderName.length < 2) return { error: 'Add your name' };
  if (digits(senderPhone).length < 7) return { error: 'Add a valid phone or WhatsApp number' };
  if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) return { error: 'Check your email address' };

  const recipientName = clean(recipient.name, 60);
  const recipientPhone = clean(recipient.phone, 30);
  const zoneId = clean(recipient.zone, 40);
  const address = clean(recipient.address, 160);
  if (recipientName.length < 2) return { error: "Add the recipient's name" };
  if (digits(recipientPhone).length < 7) return { error: "Add the recipient's phone number" };
  const zone = (ordering.zones || []).find(z => z.id === zoneId);
  if (!zone) return { error: 'Choose the delivery area' };
  if (address.length < 5) return { error: 'Add a landmark or street for the courier' };

  const deliveryDay = parseDay(body.deliveryDate);
  if (!deliveryDay) return { error: 'Choose a delivery date' };
  const today = new Date();
  const diff = dayDiff(today, deliveryDay);
  const maxDays = Number(ordering.maxDaysAhead) || 60;
  if (diff < 0) return { error: 'Choose a date from today onwards' };
  if (diff > maxDays) return { error: 'Choose a date within ' + maxDays + ' days' };
  if (diff === 0 && localTime() >= String(ordering.sameDayCutoff || '15:00')) {
    return { error: 'Same-day orders close at ' + (ordering.sameDayCutoff || '15:00') + '. Choose tomorrow.' };
  }

  const slot = (ordering.slots || []).find(s => s.id === body.slot);
  if (!slot) return { error: 'Choose a delivery window' };

  const payment = body.payment === 'evc' ? 'evc' : body.payment === 'card' ? 'card' : '';
  if (!payment) return { error: 'Choose how you want to pay' };

  const itemsInput = Array.isArray(body.items) ? body.items : [];
  if (!itemsInput.length) return { error: 'Your gift box is empty' };
  const items = [];
  for (const line of itemsInput) {
    const product = (shop.products || []).find(p => p.id === line.id);
    if (!product) return { error: 'One of the gifts is no longer available' };
    const qty = Math.floor(Number(line.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > 20) return { error: 'Check the quantities' };
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty,
      lineTotal: Math.round(product.price * qty * 100) / 100
    });
  }

  const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
  if (subtotal < Number(ordering.minOrder || 0)) {
    return { error: 'Minimum order is ' + ordering.currency + Number(ordering.minOrder) };
  }
  const freeOver = Number(ordering.freeDeliveryOver) || 0;
  const deliveryFee = freeOver && subtotal >= freeOver ? 0 : Number(zone.fee) || 0;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  const giftMessage = clean(body.giftMessage, 240);
  const note = clean(body.note, 160);
  const anonymous = body.anonymous === true || body.anonymous === 'true';

  return {
    order: {
      customer: { name: senderName, phone: senderPhone, email: senderEmail },
      recipient: { name: recipientName, phone: recipientPhone, zone: zone.id, zoneName: zone.name, address },
      deliveryDate: body.deliveryDate,
      slot: slot.id,
      slotLabel: slot.label + ' · ' + slot.time,
      payment,
      giftMessage,
      anonymous,
      items,
      subtotal,
      deliveryFee,
      total,
      currency: ordering.currency
    }
  };
}

async function handleApi(req, res, pathname) {
  const ip = req.socket.remoteAddress || 'unknown';
  const shop = loadShop();

  if (req.method === 'GET' && pathname === '/api/shop') {
    return sendJson(res, 200, { shop: publicShop(shop) });
  }

  if (req.method === 'POST' && pathname === '/api/orders') {
    if (!allow(ip, 'order', 8, 10 * 60 * 1000)) {
      return sendJson(res, 429, { error: 'Too many requests. Please try again in a few minutes.' });
    }
    let body;
    try {
      body = await readBody(req);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
    const result = validateOrder(body, shop);
    if (result.error) return sendJson(res, 400, { error: result.error });

    const orders = loadOrders();
    const now = new Date().toISOString();
    const order = {
      id: orderNumber(orders, shop),
      createdAt: now,
      updatedAt: now,
      status: 'new',
      paymentStatus: 'pending',
      courier: '',
      ...result.order
    };
    orders.push(order);
    saveOrders(orders);
    return sendJson(res, 201, { order: publicOrder(order) });
  }

  if (req.method === 'POST' && pathname === '/api/track') {
    if (!allow(ip, 'track', 30, 10 * 60 * 1000)) {
      return sendJson(res, 429, { error: 'Too many lookups. Please try again later.' });
    }
    let body;
    try {
      body = await readBody(req);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
    const id = clean(body.id, 20).toUpperCase();
    const phone = digits(body.phone);
    if (!id || phone.length < 7) return sendJson(res, 400, { error: 'Enter your order number and phone' });
    const order = loadOrders().find(o => o.id === id);
    if (!order) return sendJson(res, 404, { error: 'No order found with that number' });
    const senderPhone = digits(order.customer?.phone);
    const recipientPhone = digits(order.recipient?.phone);
    if (phone !== senderPhone && phone !== recipientPhone) {
      return sendJson(res, 404, { error: 'No order found with that number' });
    }
    return sendJson(res, 200, { order: publicOrder(order) });
  }

  if (pathname === '/api/orders' && req.method === 'GET') {
    if (!pinMatches(req.headers['x-dashboard-pin'], dashboardPin(shop))) {
      return sendJson(res, 401, { error: 'Wrong PIN' });
    }
    const orders = loadOrders().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return sendJson(res, 200, { orders });
  }

  const match = /^\/api\/orders\/([A-Za-z0-9-]+)$/.exec(pathname);
  if (match && req.method === 'PATCH') {
    if (!pinMatches(req.headers['x-dashboard-pin'], dashboardPin(shop))) {
      return sendJson(res, 401, { error: 'Wrong PIN' });
    }
    let body;
    try {
      body = await readBody(req);
    } catch (error) {
      return sendJson(res, 400, { error: error.message });
    }
    if (!body || typeof body !== 'object') return sendJson(res, 400, { error: 'Nothing to update' });

    const orders = loadOrders();
    const order = orders.find(o => o.id === match[1].toUpperCase());
    if (!order) return sendJson(res, 404, { error: 'Order not found' });

    if (body.status !== undefined) {
      if (!statuses.includes(body.status)) return sendJson(res, 400, { error: 'Unknown status' });
      order.status = body.status;
    }
    if (body.paymentStatus !== undefined) {
      if (!paymentStatuses.includes(body.paymentStatus)) return sendJson(res, 400, { error: 'Unknown payment status' });
      order.paymentStatus = body.paymentStatus;
    }
    if (body.courier !== undefined) {
      order.courier = clean(body.courier, 40);
    }
    order.updatedAt = new Date().toISOString();
    saveOrders(orders);
    return sendJson(res, 200, { order });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/dashboard') pathname = '/dashboard.html';
  if (pathname === '/credits') pathname = '/credits.html';

  if (pathname.startsWith('/data/') || pathname === '/assets/data/shop.json' || pathname === '/server.js') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }

  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Bad request');
  }
  const file = path.join(root, decoded);
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found: ' + decoded);
    }
    const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const isHtml = type.startsWith('text/html');
    const headers = {
      'Content-Type': type,
      'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    const range = req.headers.range;
    if (range) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range);
      let start = m?.[1] ? Number(m[1]) : 0;
      let end = m?.[2] ? Number(m[2]) : stat.size - 1;
      if (!Number.isFinite(start)) start = 0;
      if (!Number.isFinite(end) || end >= stat.size) end = stat.size - 1;
      if (start > end) {
        res.writeHead(416, { 'Content-Range': 'bytes */' + stat.size });
        return res.end();
      }
      res.writeHead(206, {
        ...headers,
        'Content-Range': 'bytes ' + start + '-' + end + '/' + stat.size,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1
      });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }

    res.writeHead(200, { ...headers, 'Content-Length': stat.size, 'Accept-Ranges': 'bytes' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = new URL(req.url, 'http://localhost').pathname;
  } catch {
    res.writeHead(400);
    return res.end('Bad request');
  }

  if (pathname.startsWith('/api/')) {
    handleApi(req, res, pathname).catch(error => {
      console.error(error);
      if (!res.headersSent) sendJson(res, 500, { error: 'Server error' });
    });
    return;
  }

  serveStatic(req, res, pathname);
});

server.listen(port, () => {
  console.log('U Dir Hadiyad running');
  console.log('Storefront: http://localhost:' + port + '/');
  console.log('Dashboard:  http://localhost:' + port + '/dashboard');
});
