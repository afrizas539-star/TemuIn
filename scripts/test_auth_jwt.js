/**
 * Test script untuk memverifikasi implementasi JWT Authentication & Protected Endpoints
 */

const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json, raw: body });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Memulai Pengujian Sprint 04 - JWT Authentication & Protected Endpoints...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName} ${detail ? '- ' + detail : ''}`);
      failed++;
    }
  }

  try {
    // 1. Health check (Public)
    const healthRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/health',
      method: 'GET',
    });
    assert(healthRes.status === 200, '1. GET /api/health mengembalikan 200 OK');

    // 2. Request ke protected endpoint tanpa token (harus 401)
    const noTokenRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/items',
      method: 'GET',
    });
    assert(
      noTokenRes.status === 401,
      '2. GET /api/items tanpa token ditolak (401 Unauthorized)',
      `Status: ${noTokenRes.status}`
    );

    // 3. Request ke protected endpoint dengan token salah (harus 401)
    const invalidTokenRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/items',
      method: 'GET',
      headers: {
        Authorization: 'Bearer token_palsu_ngawur.123.456',
      },
    });
    assert(
      invalidTokenRes.status === 401,
      '3. GET /api/items dengan token salah ditolak (401 Unauthorized)',
      `Status: ${invalidTokenRes.status}`
    );

    // 4. Login dengan kredensial salah (harus 401)
    const wrongLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin.kampus@gmail.com', password: 'password_salah' }
    );
    assert(
      wrongLoginRes.status === 401,
      '4. POST /login dengan password salah ditolak (401 Unauthorized)',
      `Status: ${wrongLoginRes.status}`
    );

    // 5. Login berhasil sebagai Mahasiswa
    const studentLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: '2210511045', password: 'mhs123' }
    );
    assert(
      studentLoginRes.status === 200 &&
        studentLoginRes.data.access_token &&
        studentLoginRes.data.user.role === 'student',
      '5. POST /login Mahasiswa sukses & mengembalikan JWT access_token',
      `Token didapat: ${!!studentLoginRes.data?.access_token}`
    );

    const studentToken = studentLoginRes.data?.access_token;

    // 6. Akses protected /api/items dengan Authorization: Bearer <token>
    const itemsRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/items',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    assert(
      itemsRes.status === 200 && Array.isArray(itemsRes.data.items),
      '6. GET /api/items dengan Bearer token berhasil (200 OK)',
      `Jumlah item: ${itemsRes.data?.items?.length}`
    );

    // 7. Akses protected /api/claims dengan Authorization: Bearer <token>
    const claimsRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/claims',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    assert(
      claimsRes.status === 200 && Array.isArray(claimsRes.data.claims),
      '7. GET /api/claims dengan Bearer token berhasil (200 OK)',
      `Jumlah klaim: ${claimsRes.data?.claims?.length}`
    );

    // 8. Akses protected /api/programs dengan Authorization: Bearer <token>
    const programsRes = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/api/programs',
      method: 'GET',
      headers: {
        Authorization: `Bearer ${studentToken}`,
      },
    });
    assert(
      programsRes.status === 200 && Array.isArray(programsRes.data.programs),
      '8. GET /api/programs dengan Bearer token berhasil (200 OK)',
      `Jumlah programs: ${programsRes.data?.programs?.length}`
    );

    // 9. Login berhasil sebagai Admin
    const adminLoginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin.kampus@gmail.com', password: 'admin123kampus' }
    );
    assert(
      adminLoginRes.status === 200 &&
        adminLoginRes.data.access_token &&
        adminLoginRes.data.user.role === 'admin',
      '9. POST /api/login Admin sukses & mengembalikan JWT access_token',
      `Role: ${adminLoginRes.data?.user?.role}`
    );

    console.log(`\n========================================`);
    console.log(`Ringkasan: ${passed} LULUS, ${failed} GAGAL`);
    console.log(`========================================`);
  } catch (err) {
    console.error('Pengujian error:', err);
  }
}

// Jalankan server jika belum berjalan, lalu tes
const { fork } = require('child_process');
const serverProc = fork('./scripts/server.js', [], { silent: true });

setTimeout(async () => {
  await runTests();
  serverProc.kill();
  process.exit(0);
}, 1000);
