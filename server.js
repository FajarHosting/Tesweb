const express = require('express');
const axios = require('axios'); // Untuk panggil API Order Kuota
const cors = require('cors'); // Untuk mengizinkan request dari frontend
const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Izinkan semua origin (untuk development, sesuaikan untuk produksi)
app.use(express.json()); // Untuk parsing body JSON

// --- KONFIGURASI SERVER ---
const ORDERKUOTA_API_KEY = "RAHASIA_API_KEY_ORDERKUOTA_ANDA";
const ORDERKUOTA_BASE_URL = "https://api.orderkuota.com/v1"; // Ganti dengan URL API Order Kuota yg benar
const WEBSITE_INTERNAL_API_KEY = "KUNCI_API_RAHASIA_UNTUK_BOT_WA_ANDA"; // API Key untuk bot WA

// --- DATABASE (SANGAT DISARANKAN) ---
// Untuk menyimpan data transaksi, status panel, dll.
// Contoh: let transactions = {}; // Ini hanya untuk demo, gunakan database sungguhan (MySQL, PostgreSQL, MongoDB)

// === Endpoint Proxy untuk Order Kuota (agar API Key aman) ===
app.get('/orderkuota-proxy/provider', async (req, res) => {
    try {
        // Ini hanya contoh, API Order Kuota mungkin pakai POST atau parameter berbeda
        const response = await axios.post(`${ORDERKUOTA_BASE_URL}/provider`, { // Asumsi API provider pakai POST
            apikey: ORDERKUOTA_API_KEY,
            // parameter lain jika ada
        });
        res.json(response.data); // Teruskan respons dari Order Kuota
    } catch (error) {
        console.error("Error fetching providers from Order Kuota:", error.message);
        res.status(500).json({ success: false, message: "Gagal mengambil data provider dari layanan eksternal." });
    }
});

app.get('/orderkuota-proxy/produk', async (req, res) => {
    const { provider_id } = req.query;
    if (!provider_id) {
        return res.status(400).json({ success: false, message: "Parameter provider_id dibutuhkan." });
    }
    try {
        const response = await axios.post(`${ORDERKUOTA_BASE_URL}/produk`, { // Asumsi API produk pakai POST
            apikey: ORDERKUOTA_API_KEY,
            provider_id: provider_id
        });
        res.json(response.data);
    } catch (error) {
        console.error("Error fetching produk from Order Kuota:", error.message);
        res.status(500).json({ success: false, message: "Gagal mengambil data produk." });
    }
});


// === Endpoint untuk Transaksi dari Frontend Web ===
app.post('/api/v1/buat-transaksi', async (req, res) => {
    const { type, ram, username, nomor_wa, provider_id, tujuan, server_id, produk_id, price, nama_produk } = req.body;
    const trxId = `TRX-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    let totalBayar = price; // Harga dasar

    // Simulasi biaya tambahan atau unik
    const fee = Math.floor(Math.random() * 200) + 50; // Biaya random 50-249
    totalBayar += fee;

    console.log("Menerima permintaan transaksi:", req.body);

    // TODO: Integrasi dengan Payment Gateway untuk generate QRIS dinamis berdasarkan `totalBayar`
    // Contoh respons setelah generate QRIS dari payment gateway:
    // const paymentGatewayResponse = await somePaymentGateway.createQRIS(trxId, totalBayar);
    // const qrImageUrl = paymentGatewayResponse.qr_url;
    // const expiredAt = paymentGatewayResponse.expired_at;

    // Untuk SEKARANG, kita pakai QRIS statis atau dari API deposit Anda jika ada
    // Jika API deposit Anda ada di `https://api.fajar-store.com/api/v1/deposit/create`
    // Anda bisa panggil itu di sini.
    // Untuk contoh ini, kita akan merujuk ke dokumentasi API deposit yang Anda berikan sebelumnya.

    try {
        // Menggunakan endpoint deposit yang Anda berikan sebelumnya
        const depositApiResponse = await axios.get(`https://api.fajar-store.com/api/v1/deposit/create?nominal=${price}&apikey=YOUR_DEPOSIT_API_KEY`); // Ganti YOUR_DEPOSIT_API_KEY

        if (depositApiResponse.data && depositApiResponse.data.success) {
            const depositData = depositApiResponse.data.data;

            // Simpan data transaksi (ke database)
            // transactions[depositData.reff_id] = { ...req.body, status: 'pending', total_bayar: depositData.nominal + depositData.fee, deposit_api_data: depositData };

            console.log("Transaksi dibuat:", depositData.reff_id);
            res.json({
                success: true,
                message: "Permintaan transaksi dibuat. Silakan lakukan pembayaran.",
                data: {
                    id: depositData.reff_id, // Ini akan jadi ID transaksi utama
                    total_bayar: depositData.nominal + depositData.fee, // Total dari API deposit
                    qr_image: depositData.qr_image, // QR dari API deposit
                    expired_at: depositData.expired_at
                }
            });
        } else {
            throw new Error(depositApiResponse.data.message || "Gagal membuat deposit via API eksternal");
        }
    } catch (error) {
        console.error("Error creating transaction/deposit:", error.message);
        res.status(500).json({ success: false, message: `Gagal memproses transaksi: ${error.message}` });
    }
});

app.get('/api/v1/status-transaksi', async (req, res) => {
    const { trxid } = req.query;
    if (!trxid) return res.status(400).json({ success: false, message: "trxid dibutuhkan" });

    try {
        // Menggunakan endpoint status deposit yang Anda berikan
        const statusApiResponse = await axios.get(`https://api.fajar-store.com/api/v1/deposit/status?trxid=${trxid}&apikey=YOUR_DEPOSIT_API_KEY`); // Ganti YOUR_DEPOSIT_API_KEY

        if (statusApiResponse.data && statusApiResponse.data.success) {
            const statusData = statusApiResponse.data.data;
            // let transaction = transactions[trxid]; // Ambil dari DB

            // if (transaction && (statusData.status === 'success' || statusData.status === 'sukses')) {
                // transaction.status = 'success';
                // TODO: Jika sukses, proses order panel atau top up
                // if (transaction.type === 'panel') {
                //     console.log("Memproses pembuatan panel untuk:", transaction.username);
                //     // Panggil API Pterodactyl Anda di sini
                // } else if (transaction.type === 'topup') {
                //     console.log("Memproses topup untuk:", transaction.tujuan, "produk:", transaction.produk_id);
                //     // Panggil API Order Kuota di sini
                //     // const orderKuotaResponse = await axios.post(`${ORDERKUOTA_BASE_URL}/order`, {
                //     //     apikey: ORDERKUOTA_API_KEY,
                //     //     produk: transaction.produk_id,
                //     //     tujuan: transaction.tujuan,
                //     //     server_id: transaction.server_id || '', // Jika ada
                //     //     reff_id: trxid
                //     // });
                //     // transaction.order_kuota_detail = orderKuotaResponse.data;
                // }
            // }
            res.json({
                success: true,
                message: statusApiResponse.data.message,
                data: statusData
            });
        } else {
            throw new Error(statusApiResponse.data.message || "Gagal cek status deposit");
        }
    } catch (error) {
        console.error(`Error checking status for ${trxid}:`, error.message);
        res.status(500).json({ success: false, message: "Gagal cek status transaksi." });
    }
});

app.post('/api/v1/batal-transaksi', async (req, res) => { // Ubah ke POST jika perlu body
    const { trxid } = req.body; // Ambil dari body
    if (!trxid) return res.status(400).json({ success: false, message: "trxid dibutuhkan" });

    try {
        // Menggunakan endpoint cancel deposit yang Anda berikan
        const cancelApiResponse = await axios.get(`https://api.fajar-store.com/api/v1/deposit/cancel?trxid=${trxid}&apikey=YOUR_DEPOSIT_API_KEY`); // Ganti YOUR_DEPOSIT_API_KEY

        if (cancelApiResponse.data && cancelApiResponse.data.success) {
            // if (transactions[trxid]) transactions[trxid].status = 'cancelled'; // Update DB
            res.json({ success: true, message: "Transaksi berhasil dibatalkan." });
        } else {
            throw new Error(cancelApiResponse.data.message || "Gagal membatalkan deposit");
        }
    } catch (error) {
        console.error(`Error cancelling transaction ${trxid}:`, error.message);
        res.status(500).json({ success: false, message: "Gagal membatalkan transaksi." });
    }
});


// === ENDPOINT UNTUK BOT WHATSAPP ANDA ===
// Middleware untuk cek API Key dari bot WA
function authenticateBot(req, res, next) {
    const apiKey = req.headers['x-website-apikey']; // Atau dari query param: req.query.apikey
    if (apiKey && apiKey === WEBSITE_INTERNAL_API_KEY) {
        next();
    } else {
        res.status(401).json({ success: false, message: "Unauthorized: Invalid API Key for Bot" });
    }
}

app.post('/api/bot/create-panel', authenticateBot, async (req, res) => {
    // Endpoint ini akan dipanggil oleh bot WhatsApp Anda
    const { ram, username, nomor_wa, requested_by_wa } = req.body;

    if (!ram || !username || !nomor_wa || !requested_by_wa) {
        return res.status(400).json({ success: false, message: "Parameter tidak lengkap (ram, username, nomor_wa, requested_by_wa dibutuhkan)." });
    }

    console.log(`[BOT API] Permintaan buat panel dari WA ${requested_by_wa} untuk user ${username} RAM ${ram}`);

    // TODO:
    // 1. Validasi data
    // 2. Hitung harga berdasarkan RAM
    // 3. Simpan permintaan ke database dengan status 'menunggu_pembayaran_wa'
    // 4. Berikan instruksi pembayaran ke bot WA (misalnya, link ke halaman pembayaran atau info transfer)
    //    Atau, jika bot WA Anda bisa menangani callback pembayaran, integrasikan itu.

    // Simulasi pembuatan panel (idealanya ini setelah pembayaran dikonfirmasi)
    // Panggil API Pterodactyl Anda di sini untuk membuat panel
    // const pterodactylResponse = await createPteroPanel(username, ram, ...);

    // Contoh respons ke bot WA
    res.json({
        success: true,
        message: `Permintaan panel untuk ${username} (RAM ${ram}) diterima. Silakan lanjutkan dengan pembayaran.`,
        // data: { panel_details: pterodactylResponse } // jika panel langsung dibuat
        data: {
            transaction_id_internal: `WA-PNL-${Date.now()}`,
            username: username,
            ram: ram,
            status_pembuatan: "Menunggu Konfirmasi Admin/Pembayaran", // Atau bisa otomatis jika pembayaran terintegrasi
            // info_pembayaran: "Silakan transfer Rp X ke nomor YYY."
        }
    });
});

app.post('/api/bot/topup', authenticateBot, async (req, res) => {
    // Endpoint ini akan dipanggil oleh bot WhatsApp Anda
    const { provider_id, produk_id, tujuan, server_id, nomor_wa, requested_by_wa } = req.body;

    if (!provider_id || !produk_id || !tujuan || !nomor_wa || !requested_by_wa) {
        return res.status(400).json({ success: false, message: "Parameter tidak lengkap." });
    }
    console.log(`[BOT API] Permintaan topup dari WA ${requested_by_wa} untuk ${tujuan}, produk ${produk_id}`);

    // TODO:
    // 1. Validasi data
    // 2. Dapatkan harga produk dari API Order Kuota (via proxy)
    // 3. Simpan permintaan ke database dengan status 'menunggu_pembayaran_wa'
    // 4. Berikan instruksi pembayaran ke bot WA

    // Simulasi setelah pembayaran dikonfirmasi, panggil API Order Kuota
    // const orderKuotaTrxId = `WA-TU-${Date.now()}`;
    // try {
    //     const orderResponse = await axios.post(`${ORDERKUOTA_BASE_URL}/order`, {
    //         apikey: ORDERKUOTA_API_KEY,
    //         produk: produk_id,
    //         tujuan: tujuan,
    //         server_id: server_id || '',
    //         reff_id: orderKuotaTrxId
    //     });

    //     if (orderResponse.data && (orderResponse.data.status === 'success' || orderResponse.data.status === 'pending')) {
    //         res.json({
    //             success: true,
    //             message: `Top up sedang diproses. Status: ${orderResponse.data.status}`,
    //             data: orderResponse.data
    //         });
    //     } else {
    //         throw new Error(orderResponse.data.message || "Gagal order ke layanan topup.");
    //     }
    // } catch (error) {
    //     console.error("[BOT API] Order Kuota Error:", error.message);
    //     res.status(500).json({ success: false, message: `Gagal memproses topup: ${error.message}` });
    // }

    res.json({
        success: true,
        message: `Permintaan topup untuk ${tujuan} produk ${produk_id} diterima. Silakan lanjutkan dengan pembayaran.`,
        data: {
            transaction_id_internal: `WA-TU-${Date.now()}`,
            status_pembuatan: "Menunggu Konfirmasi Admin/Pembayaran",
        }
    });
});


app.listen(port, () => {
    console.log(`Server Fajar Store berjalan di http://localhost:${port}`);
});