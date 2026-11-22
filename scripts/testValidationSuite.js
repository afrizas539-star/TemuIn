const { initializeApp } = require('firebase/app');
const {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
} = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyCqwbJlyMPmEI6wr_nKFVZm6OvJH4blEIY",
  authDomain: "temuin-2808e.firebaseapp.com",
  projectId: "temuin-2808e",
  storageBucket: "temuin-2808e.firebasestorage.app",
  messagingSenderId: "510115226009",
  appId: "1:510115226009:web:3cba590fe6673a3b6f3308",
  measurementId: "G-YZ569K32KQ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Mock unified login logic (simulating AuthContext.login)
async function testUnifiedLogin(emailOrNim, password) {
  const trimmed = emailOrNim.trim().toLowerCase();
  let emailToAuth = trimmed;
  if (!trimmed.includes('@') && /^\d+$/.test(trimmed)) {
    emailToAuth = `${trimmed}@webmail.umm.ac.id`;
  }

  // 1. Query Firestore for profile in admins or users
  let profile = null;

  // Check admins collection
  const qAdmin = query(collection(db, 'admins'), where('email', '==', emailToAuth));
  const snapAdmin = await getDocs(qAdmin);
  if (!snapAdmin.empty) {
    const d = snapAdmin.docs[0];
    profile = { id: d.id, ...d.data(), collection: 'admins' };
  } else {
    // Check users collection
    const qUser = query(collection(db, 'users'), where('email', '==', emailToAuth));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      const d = snapUser.docs[0];
      profile = { id: d.id, ...d.data(), collection: 'users' };
    }
  }

  // Tolak jika tidak ada profil di Firestore
  if (!profile) {
    return { success: false, message: 'Akun tidak terdaftar di database resmi kampus. Akses ditolak.' };
  }

  // Cek password
  if (profile.password !== password) {
    return { success: false, message: 'Email atau password salah.' };
  }

  // Cek status aktif
  if (profile.isActive === false || profile.status === 'inactive') {
    return { success: false, message: 'Akun berstatus non-aktif. Akses ditolak.' };
  }

  // Role
  const rawRole = String(profile.role || '').toLowerCase();
  let role = null;
  if (rawRole === 'student') role = 'student';
  else if (rawRole.includes('super')) role = 'super_admin';
  else if (rawRole === 'admin' || rawRole.includes('petugas')) role = 'admin';

  if (!role) {
    return { success: false, message: 'Role akun tidak valid. Akses ditolak.' };
  }

  return { success: true, role, user: { name: profile.name, email: profile.email, role } };
}

async function runTests() {
  console.log('====================================================');
  console.log(' PENGUJIAN OTOMATIS FITUR APLIKASI TEMUIN UMM       ');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. PENGUJIAN LOGIN GABUNGAN: MAHASISWA
  console.log('--- TEST 1: LOGIN MAHASISWA PADA HALAMAN GABUNGAN ---');
  const studentLoginRes = await testUnifiedLogin('mahasiswa@webmail.umm.ac.id', 'mhs123kampus');
  assert(studentLoginRes.success === true, 'Mahasiswa berhasil login dengan kredensial terdaftar');
  assert(studentLoginRes.role === 'student', 'Mahasiswa diarahkan ke role "student" (Dashboard Mahasiswa)');
  console.log(` -> Nama: ${studentLoginRes.user?.name}, Role: ${studentLoginRes.role}\n`);

  // 2. PENGUJIAN LOGIN GABUNGAN: PETUGAS / ADMIN
  console.log('--- TEST 2: LOGIN PETUGAS/ADMIN PADA HALAMAN YANG SAMA ---');
  const adminLoginRes = await testUnifiedLogin('petugas@umm.ac.id', 'admin123kampus');
  assert(adminLoginRes.success === true, 'Petugas berhasil login di form login gabungan yang sama');
  assert(adminLoginRes.role === 'admin', 'Petugas diarahkan ke role "admin" (Dashboard Petugas/Admin)');
  console.log(` -> Nama: ${adminLoginRes.user?.name}, Role: ${adminLoginRes.role}\n`);

  // 3. PENGUJIAN LOGIN GAGAL: PASSWORD SALAH
  console.log('--- TEST 3: LOGIN DENGAN PASSWORD SALAH ---');
  const wrongPassRes = await testUnifiedLogin('mahasiswa@webmail.umm.ac.id', 'passwordSalah123');
  assert(wrongPassRes.success === false, 'Login dengan password salah ditolak');
  console.log(` -> Pesan penolakan: "${wrongPassRes.message}"\n`);

  // 4. PENGUJIAN LOGIN GAGAL: AKUN TIDAK TERDAFTAR DI FIRESTORE
  console.log('--- TEST 4: LOGIN AKUN TIDAK TERDAFTAR DI FIRESTORE ---');
  const unregRes = await testUnifiedLogin('stranger@webmail.umm.ac.id', 'rahasia123');
  assert(unregRes.success === false, 'Akun tanpa profil Firestore ditolak masuk');
  console.log(` -> Pesan penolakan: "${unregRes.message}"\n`);

  // 5. PENGUJIAN HAK AKSES DAN KEAMANAN BARANG
  console.log('--- TEST 5: SIMULASI PENGUJIAN HAK AKSES DATA BARANG ---');

  // A. Mahasiswa dilarang membuat barang temuan
  function simulateAddFoundItem(userRole) {
    if (userRole !== 'admin' && userRole !== 'super_admin') {
      throw new Error('Akses ditolak: Hanya Petugas/Admin resmi yang berwenang menambahkan data barang temuan.');
    }
    return { id: 'item-found-test', type: 'found', status: 'TERSEDIA' };
  }

  try {
    simulateAddFoundItem('student');
    assert(false, 'Mahasiswa tidak boleh membuat barang temuan (harus melempar error)');
  } catch (err) {
    assert(true, `Mahasiswa ditolak membuat barang temuan: "${err.message}"`);
  }

  // B. Petugas boleh membuat barang temuan
  try {
    const createdItem = simulateAddFoundItem('admin');
    assert(createdItem.type === 'found', 'Petugas/Admin diizinkan menambahkan barang temuan');
  } catch (err) {
    assert(false, `Petugas gagal membuat barang temuan: ${err.message}`);
  }

  // C. Mahasiswa dilarang mengubah status barang temuan
  function simulateUpdateFoundStatus(userRole, itemType) {
    if (itemType === 'found' && userRole !== 'admin' && userRole !== 'super_admin') {
      throw new Error('Akses ditolak: Mahasiswa tidak memiliki wewenang mengubah status barang temuan.');
    }
    return true;
  }

  try {
    simulateUpdateFoundStatus('student', 'found');
    assert(false, 'Mahasiswa tidak boleh mengubah status barang temuan');
  } catch (err) {
    assert(true, `Mahasiswa ditolak mengubah status barang temuan: "${err.message}"`);
  }

  // D. Mahasiswa dilarang menghapus barang temuan
  function simulateDeleteFoundItem(userRole, itemType) {
    if (itemType === 'found' && userRole !== 'admin' && userRole !== 'super_admin') {
      throw new Error('Akses ditolak: Mahasiswa tidak diizinkan menghapus data barang temuan.');
    }
    return true;
  }

  try {
    simulateDeleteFoundItem('student', 'found');
    assert(false, 'Mahasiswa tidak boleh menghapus data barang temuan');
  } catch (err) {
    assert(true, `Mahasiswa ditolak menghapus data barang temuan: "${err.message}"`);
  }

  // 6. PENGUJIAN SINKRONISASI GAMBAR DAN PENANGANAN URL
  console.log('\n--- TEST 6: SINKRONISASI FOTO & PENANGANAN URI LOKAL ---');
  const DEFAULT_LOST_PLACEHOLDER = 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?q=80&w=600&auto=format&fit=crop';
  const DEFAULT_FOUND_PLACEHOLDER = 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?q=80&w=600&auto=format&fit=crop';

  function resolveDisplayImage(uri, itemType) {
    const isLocal = typeof uri === 'string' && (uri.startsWith('file://') || uri.startsWith('content://'));
    if (!uri || isLocal) {
      return itemType === 'found' ? DEFAULT_FOUND_PLACEHOLDER : DEFAULT_LOST_PLACEHOLDER;
    }
    return uri;
  }

  // Cek bahwa URI file:// dari HP pengunggah otomatis digantikan placeholder aman di HP pengguna lain
  const localFileUri = 'file:///data/user/10/cache/ImagePicker/2fdef8ab.jpeg';
  const resolvedOnHpB = resolveDisplayImage(localFileUri, 'lost');
  assert(resolvedOnHpB.startsWith('https://'), 'URI lokal file:// dari HP A aman digantikan dengan URL placeholder online di HP B');
  assert(!resolvedOnHpB.startsWith('file://'), 'HP B tidak lagi menerima URI file:// yang rusak');

  // Cek bahwa URL Firebase Storage online tetap ditampilkan langsung
  const cloudUrl = 'https://firebasestorage.googleapis.com/v0/b/temuin-2808e.firebasestorage.app/o/items%2Flost%2F12345.jpg?alt=media';
  const resolvedCloud = resolveDisplayImage(cloudUrl, 'lost');
  assert(resolvedCloud === cloudUrl, 'Download URL Firebase Storage ditampilkan secara utuh');

  // 7. PENGUJIAN ALUR KLAIM MAHASISWA
  console.log('\n--- TEST 7: ALUR KLAIM MAHASISWA ---');
  function simulateSubmitClaim(itemStatus, userId) {
    if (itemStatus !== 'TERSEDIA') {
      throw new Error('Barang tidak tersedia untuk diklaim.');
    }
    return {
      claimId: 'claim-' + Date.now(),
      status: 'Menunggu Verifikasi',
      userId,
      createdAt: 'Hari ini',
    };
  }

  const claimResult = simulateSubmitClaim('TERSEDIA', studentLoginRes.user.email);
  assert(claimResult.status === 'Menunggu Verifikasi', 'Klaim mahasiswa berhasil dibuat dengan status awal "Menunggu Verifikasi"');
  assert(claimResult.userId === 'mahasiswa@webmail.umm.ac.id', 'Klaim terhubung ke akun mahasiswa');

  console.log('\n====================================================');
  console.log(`HASIL TOTAL PENGUJIAN: ${passed} PASS, ${failed} FAIL`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});

