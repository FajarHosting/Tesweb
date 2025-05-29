document.addEventListener('DOMContentLoaded', () => {
    const panelForm = document.getElementById('panel-form');
    const topupForm = document.getElementById('topup-form');
    const providerSelect = document.getElementById('topup-provider');
    const nominalSelect = document.getElementById('topup-nominal');

    const paymentSection = document.getElementById('payment-section');
    const qrisImage = document.getElementById('qris-image');
    const totalPembayaranEl = document.getElementById('total-pembayaran');
    const idTransaksiEl = document.getElementById('id-transaksi');
    const cekStatusBtn = document.getElementById('cek-status-pembayaran');
    const batalkanBtn = document.getElementById('batalkan-pembayaran');
    const resultMessageEl = document.getElementById('result-message');

    // --- KONFIGURASI (HARUSNYA DISIMPAN DI BACKEND) ---
    const ORDERKUOTA_API_BASE_URL = 'https://api.domainanda.com/orderkuota-proxy'; // URL PROXY BACKEND ANDA
    // const YOUR_ORDERKUOTA_API_KEY = 'API_KEY_ORDER_KUOTA_ANDA'; // INI HARUSNYA DI BACKEND
    const YOUR_WEBSITE_API_ENDPOINT = 'https://webkamu.com/api/v1/buat-transaksi'; // API backend Anda untuk buat transaksi & QRIS
    const YOUR_WEBSITE_API_STATUS_ENDPOINT = 'https://webkamu.com/api/v1/status-transaksi';
    const YOUR_WEBSITE_API_CANCEL_ENDPOINT = 'https://webkamu.com/api/v1/batal-transaksi';

    let currentTrxId = null; // Untuk menyimpan ID transaksi saat ini
    let currentApiEndpoint = ''; // Untuk menyimpan endpoint status API Order Kuota jika perlu

    // Fungsi untuk menampilkan pesan
    function showMessage(message, type = 'info') {
        resultMessageEl.textContent = message;
        resultMessageEl.className = `message-box ${type}`;
        resultMessageEl.style.display = 'block';
        setTimeout(() => {
            resultMessageEl.style.display = 'none';
        }, 5000);
    }

    // --- LOGIKA BELI PANEL ---
    if (panelForm) {
        panelForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(panelForm);
            const data = Object.fromEntries(formData.entries());
            data.type = 'panel'; // Tandai tipe transaksi

            // Harga berdasarkan RAM (bisa dibuat lebih dinamis)
            const prices = { "1GB": 5000, "2GB": 10000, "4GB": 18000, "unlimited": 25000 };
            data.price = prices[data.ram] || 5000;

            showMessage('Memproses pembelian panel...', 'info');
            try {
                // Panggil API backend ANDA untuk membuat transaksi dan mendapatkan QRIS
                const response = await fetch(YOUR_WEBSITE_API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (result.success && result.data) {
                    currentTrxId = result.data.id; // atau result.data.reff_id
                    idTransaksiEl.textContent = currentTrxId;
                    totalPembayaranEl.textContent = `Rp ${result.data.total_bayar.toLocaleString('id-ID')}`;
                    qrisImage.src = result.data.qr_image; // URL QRIS dari API Anda
                    paymentSection.style.display = 'block';
                    panelForm.reset();
                    showMessage('Silakan lakukan pembayaran.', 'info');
                } else {
                    showMessage(`Gagal membuat transaksi panel: ${result.message || 'Error tidak diketahui'}`, 'error');
                }
            } catch (error) {
                showMessage(`Error: ${error.message}`, 'error');
            }
        });
    }

    // --- LOGIKA TOP UP ---
    // Fungsi untuk memuat provider dari API Order Kuota (via backend proxy Anda)
    async function loadProviders() {
        if (!providerSelect) return;
        try {
            // Panggilan ini HARUSNYA ke backend Anda, yang kemudian memanggil Order Kuota
            const response = await fetch(`${ORDERKUOTA_API_BASE_URL}/provider`);
            // Contoh di atas `/provider` adalah endpoint di backend Anda yg meneruskan ke OrderKuota
            // Body request ke backend Anda:
            // { "action": "provider", "apikey": "YOUR_ORDERKUOTA_API_KEY_FROM_BACKEND" }

            const result = await response.json();
            if (result.success && result.data) {
                providerSelect.innerHTML = '<option value="">-- Pilih Provider --</option>';
                result.data.forEach(provider => {
                    const option = document.createElement('option');
                    option.value = provider.id; // Asumsi API mengembalikan ID provider
                    option.textContent = `${provider.nama} (${provider.tipe || ''})`;
                    providerSelect.appendChild(option);
                });
            } else {
                providerSelect.innerHTML = '<option value="">Gagal memuat provider</option>';
                showMessage(`Gagal memuat provider: ${result.message || ''}`, 'error');
            }
        } catch (error) {
            providerSelect.innerHTML = '<option value="">Error memuat provider</option>';
            showMessage(`Error memuat provider: ${error.message}`, 'error');
        }
    }

    // Fungsi untuk memuat produk/nominal berdasarkan provider
    async function loadProducts(providerId) {
        if (!nominalSelect) return;
        nominalSelect.innerHTML = '<option value="">Memuat produk...</option>';
        if (!providerId) {
            nominalSelect.innerHTML = '<option value="">Pilih provider dulu...</option>';
            return;
        }
        try {
            // Panggilan ini HARUSNYA ke backend Anda
            const response = await fetch(`${ORDERKUOTA_API_BASE_URL}/produk?provider_id=${providerId}`);
            // Contoh di atas `/produk` adalah endpoint di backend Anda yg meneruskan ke OrderKuota
            // Body request ke backend Anda:
            // { "action": "produk", "provider_id": providerId, "apikey": "YOUR_ORDERKUOTA_API_KEY_FROM_BACKEND" }

            const result = await response.json();
            if (result.success && result.data) {
                nominalSelect.innerHTML = '<option value="">-- Pilih Nominal/Produk --</option>';
                result.data.forEach(produk => {
                    const option = document.createElement('option');
                    option.value = produk.kode; // atau produk.id
                    option.textContent = `${produk.nama_produk} - Rp ${parseInt(produk.harga).toLocaleString('id-ID')}`;
                    option.dataset.price = produk.harga; // Simpan harga
                    nominalSelect.appendChild(option);
                });
            } else {
                nominalSelect.innerHTML = '<option value="">Gagal memuat produk</option>';
                showMessage(`Gagal memuat produk: ${result.message || ''}`, 'error');
            }
        } catch (error) {
            nominalSelect.innerHTML = '<option value="">Error memuat produk</option>';
            showMessage(`Error memuat produk: ${error.message}`, 'error');
        }
    }

    if (providerSelect) {
        providerSelect.addEventListener('change', (e) => {
            loadProducts(e.target.value);
        });
    }

    if (topupForm) {
        topupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(topupForm);
            const data = Object.fromEntries(formData.entries());
            data.type = 'topup'; // Tandai tipe transaksi

            const selectedNominal = nominalSelect.options[nominalSelect.selectedIndex];
            data.price = selectedNominal.dataset.price ? parseInt(selectedNominal.dataset.price) : 0;
            data.nama_produk = selectedNominal.textContent.split(' - Rp')[0]; // Ambil nama produk

            if (data.price <= 0) {
                showMessage('Pilih nominal yang valid.', 'error');
                return;
            }

            showMessage('Memproses permintaan top up...', 'info');
            try {
                // Panggil API backend ANDA untuk membuat transaksi dan mendapatkan QRIS
                const response = await fetch(YOUR_WEBSITE_API_ENDPOINT, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const result = await response.json();

                if (result.success && result.data) {
                    currentTrxId = result.data.id; // atau result.data.reff_id
                    idTransaksiEl.textContent = currentTrxId;
                    totalPembayaranEl.textContent = `Rp ${result.data.total_bayar.toLocaleString('id-ID')}`;
                    qrisImage.src = result.data.qr_image; // URL QRIS dari API Anda
                    paymentSection.style.display = 'block';
                    topupForm.reset();
                    nominalSelect.innerHTML = '<option value="">Pilih provider dulu...</option>';
                    showMessage('Silakan lakukan pembayaran.', 'info');
                } else {
                    showMessage(`Gagal membuat transaksi top up: ${result.message || 'Error tidak diketahui'}`, 'error');
                }
            } catch (error) {
                showMessage(`Error: ${error.message}`, 'error');
            }
        });
    }

    // --- LOGIKA PEMBAYARAN ---
    if (cekStatusBtn) {
        cekStatusBtn.addEventListener('click', async () => {
            if (!currentTrxId) {
                showMessage('Tidak ada ID transaksi untuk dicek.', 'error');
                return;
            }
            showMessage(`Mengecek status transaksi ${currentTrxId}...`, 'info');
            try {
                // Panggil API backend ANDA untuk cek status
                const response = await fetch(`${YOUR_WEBSITE_API_STATUS_ENDPOINT}?trxid=${currentTrxId}`);
                const result = await response.json();

                if (result.success && result.data) {
                    showMessage(`Status Transaksi ${currentTrxId}: ${result.data.status.toUpperCase()}. ${result.message || ''}`, 'success');
                    if (result.data.status === 'success' || result.data.status === 'sukses') {
                        paymentSection.style.display = 'none';
                        currentTrxId = null;
                        // Di sini Anda bisa tambahkan logika untuk mengirim detail ke WA jika sukses
                        // Misalnya, jika ini topup, dan backend Anda sudah order ke OrderKuota:
                        // if (result.data.detail_order_kuota) {
                        //    let detailMsg = `Top Up Berhasil!\nSN/Ref: ${result.data.detail_order_kuota.sn}\nPesan: ${result.data.detail_order_kuota.message}`;
                        //    showMessage(detailMsg, 'success');
                        // }
                    } else if (result.data.status === 'cancel' || result.data.status === 'error' || result.data.status === 'gagal') {
                         paymentSection.style.display = 'none';
                         currentTrxId = null;
                    }
                } else {
                    showMessage(`Gagal cek status: ${result.message || 'Error tidak diketahui'}`, 'error');
                }
            } catch (error) {
                showMessage(`Error cek status: ${error.message}`, 'error');
            }
        });
    }

    if (batalkanBtn) {
        batalkanBtn.addEventListener('click', async () => {
             if (!currentTrxId) {
                showMessage('Tidak ada ID transaksi untuk dibatalkan.', 'error');
                return;
            }
            showMessage(`Membatalkan transaksi ${currentTrxId}...`, 'info');
             try {
                // Panggil API backend ANDA untuk membatalkan
                const response = await fetch(YOUR_WEBSITE_API_CANCEL_ENDPOINT, {
                    method: 'POST', // Atau GET sesuai API Anda
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ trxid: currentTrxId })
                });
                const result = await response.json();

                if (result.success) {
                    showMessage(`Transaksi ${currentTrxId} berhasil dibatalkan. ${result.message || ''}`, 'success');
                    paymentSection.style.display = 'none';
                    currentTrxId = null;
                } else {
                    showMessage(`Gagal membatalkan transaksi: ${result.message || 'Error tidak diketahui'}`, 'error');
                }
            } catch (error) {
                showMessage(`Error membatalkan transaksi: ${error.message}`, 'error');
            }
        });
    }


    // Panggil loadProviders saat halaman dimuat
    loadProviders();
});