/**
 * InfoBarang / TemuIn - Shared Campus Database & Secure Auth Server
 * 
 * Server backend mandiri berbasis Node.js standar (tanpa dependensi eksternal).
 * Mengimplementasikan:
 *   - Token-Based Authentication (JWT dengan HMAC-SHA256)
 *   - Public Endpoints: GET /api/health, POST /login, POST /api/login
 *   - Protected Endpoints: GET /items, GET /claims, GET /programs, GET /data, POST /sync
 *   - Enforce Authorization: Bearer <token> (mengembalikan 401 Unauthorized jika tidak valid)
 * 
 * Cara menjalankan:
 * npm run backend
 * atau
 * node ./scripts/server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'shared_campus_db.json');
const JWT_SECRET = process.env.JWT_SECRET || 'temuin-campus-jwt-secret-key-2026-auth';

// ─────────────────────────────────────────────────────────
// JWT HELPERS (Menggunakan built-in Node crypto, RFC 7519)
// ─────────────────────────────────────────────────────────

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Membuat JWT Access Token standar (HS256)
 */
function createJwt(payload, expiresInSeconds = 86400) {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verifikasi JWT Token. Mengembalikan decoded payload atau null jika invalid/expired.
 */
function verifyJwt(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, signature] = parts;

    // Verifikasi signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSignature) {
      console.warn('[JWT Auth] Invalid token signature');
      return null;
    }

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson);

    // Cek kedaluwarsa token
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn('[JWT Auth] Token sudah expired');
      return null;
    }

    return payload;
  } catch (err) {
    console.warn('[JWT Auth] Gagal memverifikasi token:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// DATABASE MOCK
// ─────────────────────────────────────────────────────────

function getInitialDb() {
  return {
    items: [
      {
        id: '1',
        title: 'KTM & Lanyard a.n Nabila Putri',
        category: 'KTM & Kartu',
        type: 'found',
        status: 'TERSEDIA',
        foundStatus: 'TERSEDIA',
        statusColor: '#15803D',
        date: 'Hari ini • 10:15 WIB',
        location: 'Perpustakaan Pusat Lantai 2 (Meja Belajar)',
        faculty: 'Fakultas Ilmu Komputer',
        description:
          'Kartu Tanda Mahasiswa (KTM) a.n Nabila Putri (NIM: 2210511***), lanyard biru dongker, dan kartu e-money. Dititipkan di meja resepsionis perpustakaan.',
        reward: null,
        reporter: 'Riko (Petugas Perpus)',
        image:
          'https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?q=80&w=600&auto=format&fit=crop',
        createdAt: new Date().toISOString(),
      },
      {
        id: '2',
        title: 'Kalkulator Saintifik Casio fx-991EX',
        category: 'Alat Kuliah',
        type: 'lost',
        status: 'DALAM PENCARIAN',
        lostStatus: 'DALAM PENCARIAN',
        verificationStatus: 'Disetujui',
        statusColor: '#B91C1C',
        date: 'Kemarin • 15:40 WIB',
        location: 'Gedung Kuliah Bersama (GKB) Ruang 402',
        faculty: 'Fakultas Teknik',
        description:
          'Kalkulator Casio warna hitam putih dengan stiker barcode jurusan di bagian tutup belakang. Sangat dibutuhkan untuk praktikum.',
        reward: 'Traktir Kopi / Makan Siang',
        reporter: 'Fajar Nugraha (Mhs Teknik Sipil)',
        image:
          'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: '3',
        title: 'Kunci Motor Honda Vario + Gantungan Lab',
        category: 'Kunci Kendaraan',
        type: 'found',
        status: 'TERSEDIA',
        foundStatus: 'TERSEDIA',
        statusColor: '#15803D',
        date: '23 Sep • 08:30 WIB',
        location: 'Parkiran Sepeda Motor Gedung Dosen',
        faculty: 'Semua Fakultas',
        description:
          'Kunci remote keyless dengan gantungan akrilik bertuliskan "Lab Jaringan". Ditemukan tergantung di slot jok motor dan diamankan di Pos Keamanan.',
        reward: null,
        reporter: 'Pak Joko (Satpam Kampus)',
        image:
          'https://images.unsplash.com/photo-1616422285623-13ff0162193c?q=80&w=600&auto=format&fit=crop',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: '4',
        title: 'Jaket Almamater & Binder Catatan',
        category: 'Pakaian & Buku',
        type: 'lost',
        status: 'DALAM PENCARIAN',
        lostStatus: 'DALAM PENCARIAN',
        verificationStatus: 'Disetujui',
        statusColor: '#B91C1C',
        date: '22 Sep • 17:00 WIB',
        location: 'Kantin Pusat / Gazebo Mahasiswa',
        faculty: 'Fakultas Ekonomi & Bisnis',
        description:
          'Jaket Almamater ukuran L, di dalamnya terdapat binder catatan mata kuliah Akuntansi Biaya serta flashdisk 32GB.',
        reward: 'Ada Imbalan',
        reporter: 'Dina Safitri (FEB 2024)',
        image:
          'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=600&auto=format&fit=crop',
        createdAt: new Date(Date.now() - 259200000).toISOString(),
      },
    ],
    claims: [
      {
        id: 'claim-1',
        itemId: '1',
        itemTitle: 'KTM & Lanyard a.n Nabila Putri',
        itemCategory: 'KTM & Kartu',
        itemImage:
          'https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?q=80&w=600&auto=format&fit=crop',
        studentName: 'Nabila Putri',
        studentNim: '2210511045',
        studentFaculty: 'Fakultas Ilmu Komputer',
        studentPhone: '081234567890',
        proofDetails: 'KTM atas nama saya, gantungan lanyard warna navy.',
        idCardImage:
          'https://images.unsplash.com/photo-1578357078586-491adf1aa5ba?q=80&w=600&auto=format&fit=crop',
        status: 'Menunggu Verifikasi',
        createdAt: 'Hari ini • 11:00 WIB',
      },
    ],
    programs: [
      {
        id: 'prog-1',
        title: 'Layanan Pengembalian KTM & Barang Akademik Kampus',
        description: 'Biro Keamanan dan Kemahasiswaan memfasilitasi pengambilan KTM dan kartu akses yang tertinggal di area perpustakaan dan ruang ujian.',
        category: 'Akademik',
        status: 'Aktif',
      },
      {
        id: 'prog-2',
        title: 'Posko Serah Terima Barang Temuan Wisuda & Dies Natalis',
        description: 'Posko terpadu di Gedung Rektorat untuk menampung barang-barang peserta wisuda yang tertinggal.',
        category: 'Event Kampus',
        status: 'Aktif',
      },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (!parsed.programs) {
        parsed.programs = getInitialDb().programs;
      }
      return parsed;
    }
  } catch (err) {
    console.error('[Backend] Gagal membaca DB_FILE:', err);
  }
  const initDb = getInitialDb();
  saveDatabase(initDb);
  return initDb;
}

function saveDatabase(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Backend] Gagal menyimpan DB_FILE:', err);
  }
}

let db = loadDatabase();

// ─────────────────────────────────────────────────────────
// SERVER & ROUTER
// ─────────────────────────────────────────────────────────

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/$/, '') || '/';

  // Helper untuk membaca request body
  function getBody(callback) {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const json = body ? JSON.parse(body) : {};
        callback(null, json);
      } catch (err) {
        callback(err, null);
      }
    });
  }

  // ── 1. PUBLIC ENDPOINT: Health check ──
  if ((pathname === '/api/health' || pathname === '/health') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        status: 'ok',
        service: 'InfoBarang / TemuIn Secure Auth API',
        serverTime: new Date().toISOString(),
        itemsCount: db.items.length,
        claimsCount: db.claims.length,
      })
    );
    return;
  }

  // ── 2. PUBLIC ENDPOINT: Login & JWT Token Retrieval (Task 01) ──
  if ((pathname === '/api/login' || pathname === '/login') && req.method === 'POST') {
    getBody((err, payload) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        return;
      }

      const identifier = (payload.email || payload.identifier || '').trim();
      const password = (payload.password || '').trim();

      if (!identifier || !password) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            success: false,
            error: 'Email/NIM dan password wajib diisi',
          })
        );
        return;
      }

      const lowerId = identifier.toLowerCase();
      let matchedUser = null;

      // Cek apakah akun Admin
      if (
        lowerId === 'admin.kampus@gmail.com' ||
        lowerId.includes('admin') ||
        lowerId.includes('petugas')
      ) {
        // Password valid admin
        if (password === 'admin123kampus' || password === 'admin123') {
          matchedUser = {
            id: 'admin-1',
            name: 'Petugas Keamanan Kampus',
            email: lowerId.includes('@') ? lowerId : 'admin.kampus@gmail.com',
            role: 'admin',
            phone: '081298765432',
            photo:
              'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop',
          };
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Password akun admin salah' }));
          return;
        }
      } else {
        // Akun Mahasiswa
        if (password === 'mhs123') {
          const nim = lowerId.includes('@') ? '2210511045' : lowerId;
          matchedUser = {
            id: `mhs-${nim}`,
            name: nim === '2210511045' ? 'Nabila Putri Aryani' : 'Mahasiswa Kampus',
            email: lowerId.includes('@') ? lowerId : `${nim}@mahasiswa.kampus.ac.id`,
            role: 'student',
            nim: nim,
            faculty: 'Fakultas Ilmu Komputer',
            phone: '081234567890',
            photo:
              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
          };
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Password akun mahasiswa salah' }));
          return;
        }
      }

      // Buat JWT Token
      const token = createJwt({
        sub: matchedUser.id,
        email: matchedUser.email,
        role: matchedUser.role,
        name: matchedUser.name,
      });

      console.log(`[Backend Auth] Login sukses untuk: ${matchedUser.email} (${matchedUser.role})`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          access_token: token,
          token_type: 'Bearer',
          expires_in: 86400,
          user: matchedUser,
        })
      );
    });
    return;
  }

  // ─────────────────────────────────────────────────────────
  // MIDDLEWARE: PROTECTED ENDPOINTS AUTH VERIFICATION
  // ─────────────────────────────────────────────────────────

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.warn(`[Backend Auth] Ditolak 401: Tidak ada Authorization Bearer header ke ${pathname}`);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Akses ditolak. Header Authorization: Bearer <token> wajib disertakan.',
        code: 401,
      })
    );
    return;
  }

  const token = authHeader.substring(7).trim();
  const decodedUser = verifyJwt(token);

  if (!decodedUser) {
    console.warn(`[Backend Auth] Ditolak 401: Token JWT tidak valid atau kadaluarsa untuk ${pathname}`);
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Token JWT kadaluarsa atau tidak valid.',
        code: 401,
      })
    );
    return;
  }

  // ── Protected Endpoint: GET Items ──
  if ((pathname === '/api/items' || pathname === '/items') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, items: db.items }));
    return;
  }

  // ── Protected Endpoint: GET Claims ──
  if ((pathname === '/api/claims' || pathname === '/claims') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, claims: db.claims }));
    return;
  }

  // ── Protected Endpoint: GET Programs ──
  if ((pathname === '/api/programs' || pathname === '/programs') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, programs: db.programs || [] }));
    return;
  }

  // ── Protected Endpoint: GET Full Data (items + claims) ──
  if ((pathname === '/api/data' || pathname === '/data') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(db));
    return;
  }

  // ── Protected Endpoint: GET Item Detail by ID ──
  const itemMatch = pathname.match(/^\/(?:api\/)?items\/([a-zA-Z0-9_-]+)$/);
  if (itemMatch && req.method === 'GET') {
    const itemId = itemMatch[1];
    const item = db.items.find((i) => String(i.id) === String(itemId));
    if (item) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(item));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Item tidak ditemukan' }));
    }
    return;
  }

  // ── Protected Endpoint: POST Sync Data ──
  if ((pathname === '/api/sync' || pathname === '/sync') && req.method === 'POST') {
    getBody((err, payload) => {
      if (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON payload' }));
        return;
      }

      if (payload.items) {
        db.items = payload.items;
      }
      if (payload.claims) {
        db.claims = payload.claims;
      }
      db.updatedAt = new Date().toISOString();
      saveDatabase(db);

      console.log(
        `[Backend Sync] Sukses sync oleh ${decodedUser.email}! Items: ${db.items.length}, Claims: ${db.claims.length}`
      );
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, updatedAt: db.updatedAt }));
    });
    return;
  }

  // Default 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint tidak ditemukan' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(`📡 InfoBarang / TemuIn JWT Secure Auth Server running!`);
  console.log(`🌐 Local:   http://localhost:${PORT}`);
  console.log(`📱 Android: http://10.0.2.2:${PORT}`);
  console.log(`🔐 Auth:    POST /login & POST /api/login`);
  console.log(`🛡️  Secure:  Authorization: Bearer <token> required`);
  console.log(`📁 DB File: ${DB_FILE}`);
  console.log(`====================================================`);
});
