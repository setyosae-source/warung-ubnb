/**
 * UBNB PPOB Proxy Server
 * VPS: 163.61.58.162 | Port: 3000
 * Lokasi: /home/ubnb/ubnb-proxy/index.js
 *
 * v2.1.1 (10 Mei 2026) — Sync produk fix
 *   - Fix BUG: UPSERT tanpa on_conflict → seluruh batch gagal kalau ada
 *     produk lama (unique key conflict). Tambahkan ?on_conflict=supplier_id,sku_supplier
 *     supaya merge-duplicates jalan dengan benar.
 *
 * v2.1.0 (08 Mei 2026) — Webhook signature fix
 *   - HMAC-SHA1 signature verification dari header X-Hub-Signature
 *   - Raw body capture untuk HMAC computation
 *   - Fix bug: processed=true tidak ter-update di webhook log
 *   - Mode lenient: signature invalid tidak block update transaksi (log warning saja)
 *
 * PHASE 1 endpoints (existing):
 *   GET  /health
 *   POST /api/digiflazz/cek-saldo
 *   POST /api/digiflazz/price-list
 *   POST /api/digiflazz/transaction
 *   POST /api/digiflazz/transaction/inquiry-pln
 *
 * PHASE 3 endpoints:
 *   POST /api/digiflazz/sync-products
 *   POST /api/digiflazz/execute-transaction
 *   POST /webhook/digiflazz             — callback status transaksi dari Digiflazz
 */

const express = require('express');
const crypto  = require('crypto');
const https   = require('https');

const app = express();

// Capture raw body untuk verifikasi HMAC signature webhook
// (req.rawBody dipakai di /webhook/digiflazz)
app.use(express.json({
  verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); }
}));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, x-proxy-secret');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ═══════════════════════════════════════════════════════════════
// CONFIG — dari environment variables (lebih aman dari hardcode)
// Set via: export PROXY_SECRET=xxx (atau di systemd service file)
// ═══════════════════════════════════════════════════════════════
const PROXY_SECRET     = process.env.PROXY_SECRET     || 'ff5df76d658e9aa0323fef16513a4aefca715b9abb337e532fde39d374e1369f';
const DIGIFLAZZ_USER   = process.env.DIGIFLAZZ_USER   || 'meleveDVl4xg';
const DIGIFLAZZ_APIKEY = process.env.DIGIFLAZZ_APIKEY || 'b4df73f8-0dd7-5e77-bbd1-9ef7addc2fdc';
const DIGIFLAZZ_MODE   = process.env.DIGIFLAZZ_MODE   || 'prod';       // 'dev' | 'prod'
const SUPABASE_URL     = process.env.SUPABASE_URL      || 'https://skltbmcrqutevmtcxqxj.supabase.co';
const SUPABASE_KEY     = process.env.SUPABASE_KEY      || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNrbHRibWNycXV0ZXZtdGN4cXhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzM5ODIsImV4cCI6MjA5MTI0OTk4Mn0._nogUZg5UylVyP45QTGYw69u76pNxGryj9hZORIfE_A';
const PORT             = process.env.PORT              || 3000;

// Webhook secret — defaults to PROXY_SECRET (configured sama di Digiflazz dashboard)
// Bisa di-rotate ke secret terpisah dengan set env DIGIFLAZZ_WEBHOOK_SECRET
const DIGIFLAZZ_WEBHOOK_SECRET = process.env.DIGIFLAZZ_WEBHOOK_SECRET || PROXY_SECRET;

const DIGIFLAZZ_BASE   = 'https://api.digiflazz.com/v1';
const IS_DEV           = DIGIFLAZZ_MODE === 'dev';

// ═══════════════════════════════════════════════════════════════
// HELPER: MD5 signature untuk Digiflazz API request
// ═══════════════════════════════════════════════════════════════
function makeSignature(suffix) {
  return crypto.createHash('md5')
    .update(DIGIFLAZZ_USER + DIGIFLAZZ_APIKEY + suffix)
    .digest('hex');
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Forward POST ke Digiflazz
// ═══════════════════════════════════════════════════════════════
async function callDigiflazz(path, body) {
  const response = await fetch(DIGIFLAZZ_BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return response.json();
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Supabase REST API call dari Node.js
// ═══════════════════════════════════════════════════════════════
async function supabaseQuery(table, method = 'GET', body = null, params = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${params}`;
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : 'return=minimal'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (method === 'PATCH' || (method === 'GET' && res.status === 204)) return null;
  return res.json();
}

// ═══════════════════════════════════════════════════════════════
// MIDDLEWARE: Auth via x-proxy-secret header
// Tidak berlaku untuk /health dan /webhook/digiflazz
// ═══════════════════════════════════════════════════════════════
function authProxy(req, res, next) {
  const secret = req.headers['x-proxy-secret'];
  if (!secret || secret !== PROXY_SECRET) {
    return res.status(401).json({ error: 'Unauthorized', message: 'x-proxy-secret invalid' });
  }
  next();
}

// ═══════════════════════════════════════════════════════════════
// GET /health — health check (no auth)
// ═══════════════════════════════════════════════════════════════
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'UBNB PPOB Proxy',
    mode: DIGIFLAZZ_MODE,
    version: '2.1.1',
    timestamp: new Date().toISOString(),
    endpoints: [
      '/health',
      '/api/digiflazz/cek-saldo',
      '/api/digiflazz/price-list',
      '/api/digiflazz/transaction',
      '/api/digiflazz/transaction/inquiry-pln',
      '/api/digiflazz/sync-products',
      '/api/digiflazz/execute-transaction',
      '/webhook/digiflazz'
    ]
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /api/digiflazz/cek-saldo (existing)
// ═══════════════════════════════════════════════════════════════
app.post('/api/digiflazz/cek-saldo', authProxy, async (req, res) => {
  try {
    const sign = makeSignature('depo');
    const result = await callDigiflazz('/cek-saldo', {
      cmd: 'deposit',
      username: DIGIFLAZZ_USER,
      sign
    });
    res.json(result);
  } catch (e) {
    console.error('[cek-saldo]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/digiflazz/price-list (existing)
// ═══════════════════════════════════════════════════════════════
app.post('/api/digiflazz/price-list', authProxy, async (req, res) => {
  try {
    const sign = makeSignature('pricelist');
    const body = {
      cmd: req.body.cmd || 'prepaid',
      username: DIGIFLAZZ_USER,
      sign
    };
    if (req.body.code)     body.code     = req.body.code;
    if (req.body.category) body.category = req.body.category;
    if (req.body.brand)    body.brand    = req.body.brand;
    if (req.body.type)     body.type     = req.body.type;
    const result = await callDigiflazz('/price-list', body);
    res.json(result);
  } catch (e) {
    console.error('[price-list]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/digiflazz/transaction (existing)
// ═══════════════════════════════════════════════════════════════
app.post('/api/digiflazz/transaction', authProxy, async (req, res) => {
  try {
    const { ref_id, customer_no, buyer_sku_code, testing } = req.body;
    if (!ref_id || !customer_no || !buyer_sku_code) {
      return res.status(400).json({ error: 'ref_id, customer_no, buyer_sku_code wajib diisi' });
    }
    const sign = makeSignature(ref_id);
    const result = await callDigiflazz('/transaction', {
      username: DIGIFLAZZ_USER,
      buyer_sku_code,
      customer_no,
      ref_id,
      sign,
      testing: testing !== undefined ? testing : IS_DEV
    });
    res.json(result);
  } catch (e) {
    console.error('[transaction]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/digiflazz/transaction/inquiry-pln (existing)
// ═══════════════════════════════════════════════════════════════
app.post('/api/digiflazz/transaction/inquiry-pln', authProxy, async (req, res) => {
  try {
    const { customer_no, ref_id } = req.body;
    if (!customer_no) return res.status(400).json({ error: 'customer_no wajib diisi' });
    const refId = ref_id || `PLN-INQ-${Date.now()}`;
    const sign  = makeSignature(refId);
    const result = await callDigiflazz('/transaction', {
      username: DIGIFLAZZ_USER,
      buyer_sku_code: 'pln-inquiry',
      customer_no,
      ref_id: refId,
      sign,
      testing: IS_DEV
    });
    res.json(result);
  } catch (e) {
    console.error('[inquiry-pln]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/digiflazz/sync-products
// Import daftar produk dari Digiflazz ke ppob_produk Supabase
// Body: { cmd: 'prepaid'|'pasca', supplier_id: number }
// ═══════════════════════════════════════════════════════════════
app.post('/api/digiflazz/sync-products', authProxy, async (req, res) => {
  const startTime = Date.now();
  const cmd = req.body.cmd || 'prepaid';
  const supplierId = req.body.supplier_id;

  console.log(`[sync-products] Start — cmd:${cmd}, supplier_id:${supplierId}`);

  if (!supplierId) {
    return res.status(400).json({ error: 'supplier_id wajib diisi' });
  }

  try {
    // 1. Fetch price-list dari Digiflazz
    const sign = makeSignature('pricelist');
    const priceListResult = await callDigiflazz('/price-list', {
      cmd,
      username: DIGIFLAZZ_USER,
      sign
    });

    if (!priceListResult?.data || !Array.isArray(priceListResult.data)) {
      return res.status(502).json({
        error: 'Invalid response from Digiflazz',
        raw: priceListResult
      });
    }

    const products = priceListResult.data;
    console.log(`[sync-products] Got ${products.length} products from Digiflazz`);

    // 2. Load kategori dari Supabase untuk mapping
    const kategoriData = await supabaseQuery('ppob_kategori', 'GET', null, '?select=id,kode,nama');
    const kategoriMap  = {};
    if (Array.isArray(kategoriData)) {
      kategoriData.forEach(k => { kategoriMap[k.kode] = k.id; });
    }

    // 3. Load markup default dari setting
    const settingData = await supabaseQuery('ppob_setting', 'GET', null, '?key=eq.markup_default&select=value');
    const markupDefault = Number(settingData?.[0]?.value || 1500);

    // 4. Mapping kategori Digiflazz → ppob_kategori
    function mapKategori(product) {
      const cat = (product.category || '').toUpperCase();
      const brand = (product.brand || '').toUpperCase();

      if (cat.includes('PULSA') || brand.includes('PULSA'))         return kategoriMap['PULSA'];
      if (cat.includes('DATA') || cat.includes('PAKET'))            return kategoriMap['PAKET_DATA'];
      if (cat.includes('PLN') && cat.includes('PREPAID'))           return kategoriMap['TOKEN_PLN'];
      if (cat.includes('PLN') && cat.includes('POSTPAID'))          return kategoriMap['TAGIHAN_PLN'];
      if (cat.includes('PLN'))                                       return kategoriMap['TOKEN_PLN'];
      if (cat.includes('BPJS'))                                      return kategoriMap['BPJS'];
      if (cat.includes('PDAM') || cat.includes('AIR'))               return kategoriMap['PDAM'];
      if (cat.includes('TELKOM') || cat.includes('INDIHOME'))        return kategoriMap['TELKOM'];
      if (cat.includes('GAME') || cat.includes('VOUCHER'))           return kategoriMap['VOUCHER_GAME'];
      if (cat.includes('EMONEY') || cat.includes('E-MONEY') ||
          cat.includes('EWALLET') || cat.includes('GOPAY') ||
          cat.includes('OVO')  || cat.includes('DANA'))              return kategoriMap['E_MONEY'];
      if (cat.includes('FINANCE') || cat.includes('CICILAN'))        return kategoriMap['MULTIFINANCE'];
      return null;
    }

    // 5. Upsert ke Supabase (batch per 50)
    let inserted = 0, updated = 0, errors = 0;
    const now = new Date().toISOString();
    const BATCH = 50;

    for (let i = 0; i < products.length; i += BATCH) {
      const batch = products.slice(i, i + BATCH);
      const upsertRows = batch.map(p => {
        const hargaModal = Number(p.price || 0);
        const markup     = markupDefault;
        const hargaJual  = hargaModal + markup;
        const kategoriId = mapKategori(p);

        return {
          supplier_id: supplierId,
          kategori_id: kategoriId || null,
          sku_supplier: p.buyer_sku_code,
          nama_produk:  p.product_name,
          deskripsi:    p.desc || null,
          harga_modal:  hargaModal,
          markup:       markup,
          harga_jual:   hargaJual,
          tipe:         p.type === 'Pascabayar' ? 'pascabayar' : 'prabayar',
          multi:        p.multi === true,
          start_cut_off: p.start_cut_off || null,
          end_cut_off:   p.end_cut_off   || null,
          seller_status: p.seller_product_status !== false,
          buyer_status:  p.buyer_product_status  !== false,
          status:        (p.seller_product_status && p.buyer_product_status) ? 'aktif' : 'nonaktif',
          raw_supplier_data: p,
          last_sync_at: now,
          updated_at:   now
        };
      });

      try {
        // FIX v2.1.1: tambah ?on_conflict=supplier_id,sku_supplier
        // supaya Supabase tahu kolom mana untuk match upsert.
        // Tanpa ini, INSERT biasa → conflict unique key → seluruh batch gagal.
        const upsertRes = await fetch(
          `${SUPABASE_URL}/rest/v1/ppob_produk?on_conflict=supplier_id,sku_supplier`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates,return=minimal'
            },
            body: JSON.stringify(upsertRows)
          }
        );

        if (!upsertRes.ok) {
          const errBody = await upsertRes.text();
          console.error(`[sync-products] Batch ${i}-${i+BATCH} error:`, errBody);
          errors += batch.length;
        } else {
          inserted += batch.length;
        }
      } catch (batchErr) {
        console.error(`[sync-products] Batch ${i}-${i+BATCH} exception:`, batchErr.message);
        errors += batch.length;
      }

      // Jeda kecil antar batch biar tidak hammer DB
      if (i + BATCH < products.length) await new Promise(r => setTimeout(r, 100));
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[sync-products] Done — inserted:${inserted}, errors:${errors}, elapsed:${elapsed}s`);

    res.json({
      success: true,
      cmd,
      total_from_digiflazz: products.length,
      inserted,
      errors,
      elapsed_seconds: elapsed,
      markup_default: markupDefault,
      message: `Sync selesai: ${inserted} produk berhasil, ${errors} error`
    });

  } catch (e) {
    console.error('[sync-products]', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /webhook/digiflazz — v2.1.0 (signature fix)
// Callback status transaksi dari Digiflazz
//
// Headers yang di-handle:
//   X-Hub-Signature       : sha1=<hmac_sha1(raw_body, secret)>
//   X-Digiflazz-Event     : 'create' | 'update'
//   User-Agent            : 'Digiflazz-Hookshot' (prepaid) | 'Digiflazz-Pasca-Hookshot' (postpaid)
//
// Mode: LENIENT — signature invalid hanya log warning, transaksi tetap diupdate
// ═══════════════════════════════════════════════════════════════
app.post('/webhook/digiflazz', async (req, res) => {
  const payload = req.body;
  const receivedAt = new Date().toISOString();

  // Extract Digiflazz-specific headers
  const headerSig   = req.headers['x-hub-signature']     || null;
  const event       = req.headers['x-digiflazz-event']   || null;
  const userAgent   = req.headers['user-agent']          || null;

  console.log(`[webhook] Received — event=${event}, ua=${userAgent}, sig=${headerSig ? 'present' : 'missing'}`);
  console.log('[webhook] Payload:', JSON.stringify(payload).substring(0, 200));

  // Balas 200 dulu ke Digiflazz (prevent retry)
  res.json({ status: 'received', timestamp: receivedAt });

  // Proses async setelah reply
  try {
    // ═════════════════════════════════════════════════════════════
    // 1. Verifikasi signature HMAC-SHA1
    //    Format header: 'sha1=<hex>'
    //    HMAC = hmac_sha1(raw_body, DIGIFLAZZ_WEBHOOK_SECRET)
    // ═════════════════════════════════════════════════════════════
    let isValid = false;
    let expectedSig = null;
    if (headerSig && req.rawBody) {
      expectedSig = 'sha1=' + crypto
        .createHmac('sha1', DIGIFLAZZ_WEBHOOK_SECRET)
        .update(req.rawBody)
        .digest('hex');
      isValid = (headerSig === expectedSig);
      if (!isValid) {
        console.warn(`[webhook] Signature INVALID — got=${headerSig}, expected=${expectedSig}`);
      } else {
        console.log('[webhook] Signature OK ✓');
      }
    } else {
      console.warn('[webhook] No X-Hub-Signature header or rawBody — skipping verification');
    }

    const data = payload?.data;
    if (!data) {
      console.warn('[webhook] No data in payload');
      // Tetap log ke webhook_log walau payload kosong
      await supabaseQuery('ppob_webhook_log', 'POST', {
        ref_id: null,
        payload,
        signature: headerSig,
        signature_valid: isValid,
        processed: false,
        error_message: 'No data field in payload',
        created_at: receivedAt
      });
      return;
    }

    const refId   = data.ref_id;
    const status  = data.status;
    const sn      = data.sn || null;
    const rc      = data.rc || null;
    const message = data.message || null;

    // ═════════════════════════════════════════════════════════════
    // 2. Log webhook ke ppob_webhook_log (selalu log, sebelum proses)
    // ═════════════════════════════════════════════════════════════
    await supabaseQuery('ppob_webhook_log', 'POST', {
      ref_id: refId,
      payload,
      signature: headerSig,
      signature_valid: isValid,
      processed: false,
      created_at: receivedAt
    });

    if (!refId) {
      console.warn('[webhook] No ref_id in payload, logged but not processed');
      return;
    }

    // ═════════════════════════════════════════════════════════════
    // 3. Cari transaksi di ppob_transaksi by ref_id
    // ═════════════════════════════════════════════════════════════
    const trxData = await supabaseQuery(
      'ppob_transaksi', 'GET', null,
      `?ref_id=eq.${encodeURIComponent(refId)}&select=id,status`
    );

    if (!trxData || trxData.length === 0) {
      console.warn('[webhook] Transaksi tidak ditemukan untuk ref_id:', refId);
      // Update webhook log dengan error
      await supabaseQuery(
        'ppob_webhook_log',
        'PATCH',
        { error_message: `Transaksi not found for ref_id: ${refId}` },
        `?ref_id=eq.${encodeURIComponent(refId)}&processed=eq.false`
      );
      return;
    }

    const trx = trxData[0];

    // ═════════════════════════════════════════════════════════════
    // 4. Map status Digiflazz → status lokal
    // ═════════════════════════════════════════════════════════════
    const statusMap = {
      'Sukses':  'sukses',
      'sukses':  'sukses',
      'Gagal':   'gagal',
      'gagal':   'gagal',
      'Pending': 'proses',
      'pending': 'proses'
    };
    const newStatus = statusMap[status] || 'proses';

    // ═════════════════════════════════════════════════════════════
    // 5. Update ppob_transaksi
    // ═════════════════════════════════════════════════════════════
    const updateData = {
      status:       newStatus,
      sn:           sn,
      rc:           rc,
      message:      message,
      raw_response: data,
      updated_at:   receivedAt
    };
    if (newStatus === 'sukses') updateData.completed_at = receivedAt;

    await supabaseQuery(
      `ppob_transaksi?id=eq.${trx.id}`,
      'PATCH',
      updateData
    );

    // ═════════════════════════════════════════════════════════════
    // 6. (Note) Piutang tetap 'belum_bayar' sampai admin konfirmasi
    //     terima bayar. Tidak auto-lunas di sini.
    // ═════════════════════════════════════════════════════════════

    // ═════════════════════════════════════════════════════════════
    // 7. Update webhook log: processed=true + link ke transaksi
    //     ⚠️ FIX v2.1.0: tambahkan filter ?ref_id=eq.X&processed=eq.false
    //     (sebelumnya filter kosong → PATCH tidak match apapun)
    // ═════════════════════════════════════════════════════════════
    await supabaseQuery(
      'ppob_webhook_log',
      'PATCH',
      {
        processed: true,
        processed_at: receivedAt,
        transaksi_id: trx.id
      },
      `?ref_id=eq.${encodeURIComponent(refId)}&processed=eq.false`
    );

    console.log(`[webhook] Processed: ${refId} → ${newStatus} (SN: ${sn || 'none'}, sigValid: ${isValid})`);

  } catch (e) {
    console.error('[webhook] Processing error:', e.message);
    console.error(e.stack);
  }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/digiflazz/execute-transaction
// Eksekusi transaksi ke Digiflazz (dipanggil admin setelah verifikasi)
// Body: { transaksi_id: number }
// ═══════════════════════════════════════════════════════════════
app.post('/api/digiflazz/execute-transaction', authProxy, async (req, res) => {
  const { transaksi_id } = req.body;
  if (!transaksi_id) return res.status(400).json({ error: 'transaksi_id wajib diisi' });

  try {
    // 1. Load transaksi dari Supabase
    const trxData = await supabaseQuery(
      'ppob_transaksi', 'GET', null,
      `?id=eq.${transaksi_id}&select=*`
    );
    if (!trxData || trxData.length === 0) {
      return res.status(404).json({ error: 'Transaksi tidak ditemukan' });
    }
    const trx = trxData[0];

    // 2. Validasi status
    if (trx.status === 'sukses') {
      return res.status(409).json({ error: 'Transaksi sudah sukses', ref_id: trx.ref_id });
    }
    if (trx.status === 'proses') {
      return res.status(409).json({ error: 'Transaksi sedang diproses', ref_id: trx.ref_id });
    }

    // 3. Update status jadi 'proses'
    await supabaseQuery(
      `ppob_transaksi?id=eq.${transaksi_id}`,
      'PATCH',
      { status: 'proses', executed_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    );

    // 4. Kirim ke Digiflazz
    const sign = makeSignature(trx.ref_id);
    const digiResult = await callDigiflazz('/transaction', {
      username:       DIGIFLAZZ_USER,
      buyer_sku_code: trx.sku_supplier,
      customer_no:    trx.tujuan,
      ref_id:         trx.ref_id,
      sign,
      testing:        IS_DEV
    });

    console.log('[execute-transaction] Digiflazz response:', JSON.stringify(digiResult).substring(0, 200));

    const dData   = digiResult?.data || {};
    const status  = dData.status || 'Pending';
    const statusMap = { 'Sukses': 'sukses', 'sukses': 'sukses', 'Gagal': 'gagal', 'gagal': 'gagal' };
    const newStatus = statusMap[status] || 'proses';

    // 5. Update hasil ke transaksi
    await supabaseQuery(
      `ppob_transaksi?id=eq.${transaksi_id}`,
      'PATCH',
      {
        status:       newStatus,
        sn:           dData.sn || null,
        rc:           dData.rc || null,
        message:      dData.message || null,
        raw_response: dData,
        updated_at:   new Date().toISOString(),
        ...(newStatus === 'sukses' ? { completed_at: new Date().toISOString() } : {})
      }
    );

    res.json({
      success: true,
      transaksi_id,
      ref_id:   trx.ref_id,
      status:   newStatus,
      sn:       dData.sn || null,
      rc:       dData.rc || null,
      message:  dData.message || null,
      raw:      dData
    });

  } catch (e) {
    console.error('[execute-transaction]', e.message);
    // Rollback status ke pending jika error fatal
    await supabaseQuery(
      `ppob_transaksi?id=eq.${transaksi_id}`,
      'PATCH',
      { status: 'pending', updated_at: new Date().toISOString() }
    ).catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════
// 404 handler
// ═══════════════════════════════════════════════════════════════
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint tidak ditemukan',
    available: ['/health', '/api/digiflazz/*', '/webhook/digiflazz']
  });
});

// ═══════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
╔══════════════════════════════════════════╗
║   UBNB PPOB Proxy v2.1.1                ║
║   Port: ${PORT}  |  Mode: ${(DIGIFLAZZ_MODE + '          ').substring(0,10)}       ║
║   Supabase: skltbmcrqutevmtcxqxj        ║
║   Webhook signature: HMAC-SHA1          ║
╚══════════════════════════════════════════╝
  `);
});

module.exports = app;
