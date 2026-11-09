const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const port = Number(process.env.PORT) || 4180;
const shopFile = path.join(root, 'assets', 'data', 'shop.json');
const ordersFile = path.join(root, 'data', 'orders.json');
const statuses = ['new', 'preparing', 'ready', 'delivering', 'completed', 'cancelled'];

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
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

function dashboardPin(shop) {
  return String(process.env.DASHBOARD_PIN || shop.contact.dashboardPin || '');
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

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', chunk => {
      size += chunk.length;
      if (size > 64 * 1024) {
        reject(new Error('Payload too large'));
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

function pinMatches(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected || ''));
  return b.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
}

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const list = (hits.get(ip) || []).filter(t => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 500) hits.clear();
  return list.length > 30;
}

function clean(value, max) {
  return String(value == null ? '' : value).trim().slice(0, max);
}

function money(value) {
  return Math.round(value * 100) / 100;
}

function validateOrder(body, shop) {
  if (!body || typeof body !== 'object') return { error: 'Missing order details' };

  const customer = body.customer || {};
  const name = clean(customer.name, 60);
  const phone = clean(customer.phone, 24);
  if (name.length < 2) return { error: 'Please enter your name' };
  if (!/^\+?[\d\s()-]{6,24}$/.test(phone)) return { error: 'Please enter a valid phone number' };

  const fulfilment = body.fulfilment === 'pickup' ? 'pickup' : body.fulfilment === 'delivery' ? 'delivery' : '';
  if (!fulfilment) return { error: 'Choose delivery or pickup' };
  const address = clean(body.address, 160);
  if (fulfilment === 'delivery' && address.length < 5) return { error: 'Delivery address is required' };
  if (fulfilment === 'delivery' && shop.ordering.delivery === false) return { error: 'Delivery is unavailable' };
  if (fulfilment === 'pickup' && shop.ordering.pickup === false) return { error: 'Pickup is unavailable' };

  const payment = body.payment === 'cash' ? 'cash' : body.payment === 'evc' ? 'evc' : '';
  if (!payment) return { error: 'Choose a payment method' };

  if (!Array.isArray(body.items) || !body.items.length) return { error: 'Your cart is empty' };
  if (body.items.length > 40) return { error: 'Too many items' };

  const catalog = new Map(shop.products.map(p => [p.id, p]));
  const merged = new Map();
  for (const line of body.items) {
    const id = clean(line && line.id, 60);
    const qty = Number(line && line.qty);
    if (!catalog.has(id)) return { error: 'An item in your cart is no longer available' };
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return { error: 'Invalid item quantity' };
    merged.set(id, (merged.get(id) || 0) + qty);
  }

  const items = [...merged.entries()].map(([id, qty]) => {
    const product = catalog.get(id);
    return { id, name: product.name, price: product.price, qty, lineTotal: money(product.price * qty) };
  });

  const subtotal = money(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const minimum = Number(shop.ordering.minOrder) || 0;
  if (subtotal < minimum) return { error: `Minimum order is ${shop.ordering.currency}${minimum.toFixed(2)}` };

  let deliveryFee = 0;
  if (fulfilment === 'delivery') {
    const freeOver = Number(shop.ordering.freeDeliveryOver) || 0;
    deliveryFee = freeOver && subtotal >= freeOver ? 0 : Number(shop.ordering.deliveryFee) || 0;
  }
  const total = money(subtotal + deliveryFee);

  return {
    order: {
      customer: { name, phone },
      fulfilment,
      address: fulfilment === 'delivery' ? address : '',
      note: clean(body.note, 200),
      payment,
      items,
      subtotal,
      deliveryFee,
      total,
      currency: shop.ordering.currency || '$'
    }
  };
}

function nextOrderNumber(orders, shop) {
  const prefix = (shop.brand.initial || 'O').toUpperCase();
  let max = 1000;
  for (const order of orders) {
    const match = new RegExp('^' + prefix + '-(\\d+)$').exec(order.id || '');
    if (match) max = Math.max(max, Number(match[1]));
  }
  return prefix + '-' + (max + 1);
}

async function handleApi(req, res, url) {
  const shop = loadShop();
  const pin = dashboardPin(shop);

  if (url.pathname === '/api/shop' && req.method === 'GET') {
    return sendJson(res, 200, publicShop(shop));
  }

  if (url.pathname === '/api/orders' && req.method === 'POST') {
    const ip = req.socket.remoteAddress || 'unknown';
    if (rateLimited(ip)) return sendJson(res, 429, { error: 'Too many orders. Please try again shortly.' });

    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }

    const result = validateOrder(body, shop);
    if (result.error) return sendJson(res, 400, { error: result.error });

    const orders = loadOrders();
    const now = new Date().toISOString();
    const order = {
      id: nextOrderNumber(orders, shop),
      createdAt: now,
      updatedAt: now,
      status: 'new',
      ...result.order
    };
    orders.push(order);
    saveOrders(orders);
    return sendJson(res, 201, { order });
  }

  if (url.pathname === '/api/orders' && req.method === 'GET') {
    if (!pinMatches(req.headers['x-dashboard-pin'], pin)) return sendJson(res, 401, { error: 'Invalid PIN' });
    const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);
    const status = url.searchParams.get('status');
    let orders = loadOrders();
    if (status && statuses.includes(status)) orders = orders.filter(order => order.status === status);
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return sendJson(res, 200, { orders: orders.slice(0, limit) });
  }

  const patch = /^\/api\/orders\/([^/]+)$/.exec(url.pathname);
  if (patch && req.method === 'PATCH') {
    if (!pinMatches(req.headers['x-dashboard-pin'], pin)) return sendJson(res, 401, { error: 'Invalid PIN' });

    let body;
    try {
      body = await readBody(req);
    } catch (err) {
      return sendJson(res, 400, { error: err.message });
    }

    if (!body || !statuses.includes(body.status)) return sendJson(res, 400, { error: 'Unknown status' });

    const orders = loadOrders();
    const id = decodeURIComponent(patch[1]);
    const order = orders.find(item => item.id === id);
    if (!order) return sendJson(res, 404, { error: 'Order not found' });

    order.status = body.status;
    order.updatedAt = new Date().toISOString();
    saveOrders(orders);
    return sendJson(res, 200, { order });
  }

  return sendJson(res, 404, { error: 'Not found' });
}

function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/dashboard' || pathname === '/dashboard/') pathname = '/dashboard.html';

  if (pathname.startsWith('/data/') || pathname === '/assets/data/shop.json' || pathname === '/server.js') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }

  const file = path.join(root, pathname);
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Forbidden');
  }

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found: ' + pathname);
    }

    const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const cache = pathname.startsWith('/assets/img/') || pathname.startsWith('/assets/fonts/')
      ? 'public, max-age=86400'
      : 'no-cache';
    const range = req.headers.range;

    if (range && stat.size > 0) {
      const match = /bytes=(\d*)-(\d*)/.exec(range);
      let start = match && match[1] ? parseInt(match[1], 10) : 0;
      let end = match && match[2] ? parseInt(match[2], 10) : stat.size - 1;
      if (!Number.isFinite(start)) start = 0;
      if (!Number.isFinite(end) || end >= stat.size) end = stat.size - 1;
      if (start > end) {
        res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': cache
      });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': cache
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    serveStatic(req, res, url);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Server error' });
    else res.end();
  }
});

server.listen(port, () => {
  console.log(`Bilan Café template running at http://localhost:${port}`);
  console.log(`Dashboard: http://localhost:${port}/dashboard`);
});
