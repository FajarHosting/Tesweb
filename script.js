const participantsInput = document.getElementById('participantsInput');
const addParticipantsBtn = document.getElementById('addParticipantsBtn');
const participantCountSpan = document.getElementById('participantCount');
const wheelCanvas = document.getElementById('wheelCanvas');
const spinBtn = document.getElementById('spinBtn');
const winnerNameSpan = document.getElementById('winnerName');
const ctx = wheelCanvas.getContext('2d');

let participants = [];
let wheelSpinning = false; // Status apakah roda sedang berputar

// Fungsi untuk menggambar roda
function drawWheel() {
    const numSegments = participants.length;
    const arcSize = (2 * Math.PI) / numSegments;
    const radius = wheelCanvas.width / 2;

    ctx.clearRect(0, 0, wheelCanvas.width, wheelCanvas.height);

    for (let i = 0; i < numSegments; i++) {
        const angle = i * arcSize;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, angle, angle + arcSize);
        ctx.lineTo(radius, radius);
        ctx.closePath();

        // Warna segmen bergantian
        ctx.fillStyle = i % 2 === 0 ? '#ffda79' : '#ffb96a';
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.translate(radius, radius);
        ctx.rotate(angle + arcSize / 2); // Putar ke tengah segmen
        ctx.textAlign = 'right';
        ctx.fillStyle = '#333';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(participants[i], radius - 10, 10); // Teks peserta
        ctx.restore();
    }

    // Gambar lingkaran tengah
    ctx.beginPath();
    ctx.arc(radius, radius, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.stroke();

    // Gambar penunjuk (pointer)
    ctx.beginPath();
    ctx.moveTo(radius + 20, 0); // Posisi di atas roda
    ctx.lineTo(radius - 20, 0);
    ctx.lineTo(radius, 40);
    ctx.closePath();
    ctx.fillStyle = '#dc3545';
    ctx.fill();
}

// Fungsi untuk menambahkan peserta dari textarea
addParticipantsBtn.addEventListener('click', () => {
    const input = participantsInput.value.trim();
    if (input) {
        // Pisahkan dengan koma atau baris baru
        const newParticipants = input.split(/[\n,]+/).map(name => name.trim()).filter(name => name !== '');
        participants = participants.concat(newParticipants);
        participantsInput.value = ''; // Kosongkan input setelah ditambahkan
        updateParticipantCount();
        drawWheel(); // Gambar ulang roda dengan peserta baru
        spinBtn.disabled = participants.length < 2; // Nonaktifkan spin jika peserta kurang dari 2
    }
});

// Fungsi untuk mengupdate jumlah peserta
function updateParticipantCount() {
    participantCountSpan.textContent = participants.length;
}

// Inisialisasi awal
updateParticipantCount();
drawWheel();
spinBtn.disabled = participants.length < 2;

// Logika spin wheel
spinBtn.addEventListener('click', () => {
    if (wheelSpinning || participants.length === 0) return;

    wheelSpinning = true;
    spinBtn.disabled = true;
    winnerNameSpan.textContent = 'Memutar...';

    const numSegments = participants.length;
    const arcSize = (2 * Math.PI) / numSegments;

    // Hitung posisi kemenangan acak
    const randomIndex = Math.floor(Math.random() * numSegments);
    // Sudut target untuk berhenti
    const spinAngle = -(randomIndex * arcSize + arcSize / 2) * (180 / Math.PI); // Convert to degrees and make it negative for clockwise spin

    // Tambahkan putaran ekstra agar terlihat lebih realistis
    const totalSpinAngle = spinAngle - Math.floor(Math.random() * 360) - (360 * 5); // 5 putaran penuh ekstra

    // Animasi putaran
    let currentRotation = 0;
    let startTime = null;
    const duration = 5000; // Durasi putaran dalam milidetik (5 detik)

    function animateSpin(timestamp) {
        if (!startTime) startTime = timestamp;
        const progress = (timestamp - startTime) / duration;

        if (progress < 1) {
            // Animasi easing out (roda melambat)
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic easeOut
            currentRotation = easedProgress * totalSpinAngle;

            wheelCanvas.style.transform = `rotate(${currentRotation}deg)`;
            requestAnimationFrame(animateSpin);
        } else {
            // Hentikan putaran
            wheelCanvas.style.transform = `rotate(${totalSpinAngle}deg)`;
            const winner = participants[randomIndex];
            winnerNameSpan.textContent = winner;
            wheelSpinning = false;
            spinBtn.disabled = false;
        }
    }

    requestAnimationFrame(animateSpin);
});
