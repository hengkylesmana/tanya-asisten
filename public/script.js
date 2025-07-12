// Fungsionalitas JavaScript untuk RASA
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi konstanta elemen DOM
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const statusDiv = document.getElementById('status');
    const startOverlay = document.getElementById('start-overlay');
    const startQolbuBtn = document.getElementById('start-qolbu-btn');
    const startCurhatBtn = document.getElementById('start-curhat-btn');
    const startTestBtn = document.getElementById('start-test-btn');
    const startDoctorBtn = document.getElementById('start-doctor-btn');
    const header = document.querySelector('header');
    
    // PENAMBAHAN: Elemen untuk fitur unggah gambar
    const uploadBtn = document.getElementById('upload-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');

    const qolbuInfoBox = document.getElementById('qolbu-info-box');
    const qolbuInfoClose = document.getElementById('qolbu-info-close');
    const doctorInfoBox = document.getElementById('doctor-info-box');
    const doctorInfoClose = document.getElementById('doctor-info-close');

    // State aplikasi
    let conversationHistory = []; 
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;
    let currentMode = 'assistant';
    // PENAMBAHAN: State untuk menyimpan data gambar yang diunggah
    let uploadedImageData = null; 

    // State untuk Tes Kepribadian
    let isTesting = false;
    let currentTestType = null; // 'stifin', 'mbti', atau 'selection'
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;

    // Basis Data Kecerdasan Tes (TIDAK BERUBAH)
    const fullTestData = {
        stifin: {
            questions: [
                { question: "Saat belajar hal baru, Anda lebih suka:", options: [ { text: "Menghafal fakta dan detail penting.", type: "S" }, { text: "Memahami logika dan rumus di baliknya.", type: "T" }, { text: "Mencari konsep besar dan polanya.", type: "I" }, { text: "Mendiskusikannya dengan teman atau guru.", type: "F" }, { text: "Langsung mencoba dan praktik.", type: "In" } ] },
                { question: "Film atau cerita seperti apa yang paling Anda nikmati?", options: [ { text: "Kisah nyata atau dokumenter yang faktual.", type: "S" }, { text: "Cerita detektif atau strategi yang penuh teka-teki.", type: "T" }, { text: "Fiksi ilmiah atau fantasi dengan dunia yang unik.", type: "I" }, { text: "Drama yang menyentuh perasaan dan hubungan antar tokoh.", type: "F" }, { text: "Petualangan seru dengan banyak aksi.", type: "In" } ] },
                { question: "Jika Anda memiliki uang lebih, Anda akan menggunakannya untuk:", options: [ { text: "Menabung atau investasi yang aman dan jelas hasilnya.", type: "S" }, { text: "Membeli barang berkualitas tinggi yang tahan lama.", type: "T" }, { text: "Berinvestasi pada ide bisnis baru yang berisiko tapi potensial.", type: "I" }, { text: "Mentraktir teman dan keluarga atau berdonasi.", type: "F" }, { text: "Mencoba pengalaman baru seperti traveling atau kursus singkat.", type: "In" } ] },
                { question: "Dalam kerja kelompok, peran Anda seringkali menjadi:", options: [ { text: "Pencatat detail dan memastikan semua sesuai data.", type: "S" }, { text: "Penentu strategi dan memastikan semuanya logis.", type: "T" }, { text: "Pemberi ide-ide kreatif dan out-of-the-box.", type: "I" }, { text: "Penjaga keharmonisan dan motivator tim.", type: "F" }, { text: "Penghubung dan penengah jika ada masalah.", type: "In" } ] },
                { question: "Ketika dihadapkan pada masalah, apa yang pertama kali Anda lakukan?", options: [ { text: "Mencari data dan fakta konkret yang pernah terjadi.", type: "S" }, { text: "Menganalisis sebab-akibat dan mencari solusi paling logis.", type: "T" }, { text: "Membayangkan berbagai kemungkinan dan ide-ide baru.", type: "I" }, { text: "Memikirkan dampaknya pada orang lain dan mencari harmoni.", type: "F" }, { text: "Merespon secara spontan dan beradaptasi dengan keadaan.", type: "In" } ] },
                { question: "Mana yang lebih menggambarkan diri Anda?", isDriveQuestion: true, options: [ { text: "Energi dan ide saya lebih sering muncul dari dalam diri. Saya memikirkannya dulu baru beraksi.", type: "i" }, { text: "Saya mendapatkan energi dan ide dari interaksi dengan dunia luar. Saya lebih suka langsung mencoba.", type: "e" } ] }
            ],
            results: {
                Si: { explanation: "Hasil tes Anda adalah **Sensing introvert (Si)**.\n\n- **Sensing (S)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan kelima panca indera dan memproses informasi secara konkret. Anda adalah seorang yang praktis dan fokus pada fakta.\n- **introvert (i)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari dalam ke luar, membuat Anda cenderung berpikir dulu sebelum bertindak dan memiliki stamina serta daya ingat yang kuat.", title: "Sensing introvert (Si) - Sang Penyimpan yang Tekun", potensiDiri: "Anda adalah 'kamus berjalan' yang andal, dengan daya ingat kuat untuk fakta dan detail. Sebagai pekerja keras yang ulet, disiplin, dan efisien, Anda hebat dalam mengeksekusi tugas. Anda percaya diri dan lebih suka menjadi pelaku langsung di lapangan daripada hanya merancang.", caraBelajar: "Paling efektif dengan pengulangan dan praktik. Merekam informasi melalui gerakan (misalnya menulis catatan) dan menggunakan alat peraga akan sangat membantu memperkuat ingatan otot dan visual Anda.", profesi: "Keuangan (Akuntan, Bankir), Sejarawan, Atlet, Tentara, Ahli Bahasa, Dokter, Pilot, Manajer Produksi, dan peran apa pun yang membutuhkan ketelitian dan daya tahan tinggi." },
                Se: { explanation: "Hasil tes Anda adalah **Sensing extrovert (Se)**.\n\n- **Sensing (S)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan kelima panca indera dan memproses informasi secara konkret. Anda adalah seorang yang praktis dan fokus pada fakta.\n- **extrovert (e)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari luar ke dalam, membuat Anda terpicu oleh lingkungan dan pengalaman langsung.", title: "Sensing extrovert (Se) - Sang Peluang yang Gesit", potensiDiri: "Anda sangat pandai menangkap peluang yang ada di depan mata. Sebagai pembelajar yang cepat dari pengalaman ('learning by doing'), Anda berkembang dalam lingkungan yang dinamis. Anda cenderung menikmati hidup, dermawan, dan membutuhkan stimulus dari luar untuk bergerak.", caraBelajar: "Teori harus diikuti dengan praktik langsung. Anda belajar paling cepat dengan terjun langsung, mencoba, dan mengalami sendiri. Menandai bacaan dan menggunakan visual akan membantu Anda.", profesi: "Wirausaha (Pedagang), Sales & Marketing, Entertainer, Bisnis Perhotelan, Fotografer, Presenter, Event Organizer, dan semua profesi yang membutuhkan respons cepat terhadap peluang." },
                Ti: { explanation: "Hasil tes Anda adalah **Thinking introvert (Ti)**.\n\n- **Thinking (T)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan logika dan penalaran objektif untuk membuat keputusan.\n- **introvert (i)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari dalam ke luar, membuat Anda menjadi pemikir yang mendalam, mandiri, dan fokus pada spesialisasi.", title: "Thinking introvert (Ti) - Sang Pakar yang Logis", potensiDiri: "Anda adalah seorang pakar atau spesialis sejati yang berpikir mendalam. Dengan 'tangan dingin', Anda mampu menyelesaikan masalah yang rumit secara sistematis. Anda sangat mandiri, teguh pada prinsip logika, dan kadang terlihat keras kepala karena keyakinan pada analisis Anda.", caraBelajar: "Fokus pada 'mengapa' di balik setiap informasi. Anda perlu menalar isi bacaan untuk menemukan logika dan intisarinya. Anda menyukai kerangka berpikir yang jelas dan efisien, serta mampu belajar mandiri dengan sangat baik.", profesi: "Ahli Riset & Teknologi, IT (Programmer, System Analyst), Insinyur, Ahli Strategi, Auditor, Konsultan Manajemen, Dokter Spesialis, Pembuat Kebijakan." },
                Te: { explanation: "Hasil tes Anda adalah **Thinking extrovert (Te)**.\n\n- **Thinking (T)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan logika dan penalaran objektif untuk membuat keputusan.\n- **extrovert (e)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari luar ke dalam, membuat Anda terdorong untuk mengorganisir lingkungan dan sistem secara efektif untuk mencapai tujuan.", title: "Thinking extrovert (Te) - Sang Komandan yang Efektif", potensiDiri: "Anda adalah seorang komandan atau manajer yang hebat. Kekuatan Anda terletak pada kemampuan mengelola sistem, sumber daya, dan organisasi secara efektif untuk melipatgandakan hasil. Anda objektif, adil, tegas, dan suka mengendalikan proses agar berjalan sesuai rencana.", caraBelajar: "Membutuhkan tujuan yang jelas dan langkah-langkah yang logis. Anda belajar dengan membuat struktur dan skema dari materi. Anda lebih suka gambaran besar yang sistematis daripada detail yang terlalu dalam.", profesi: "Eksekutif/CEO, Manajer Proyek, Birokrat, Pembuat Kebijakan, Manufaktur, Bisnis Properti, Ahli Hukum, Pemimpin Militer." },
                Ii: { explanation: "Hasil tes Anda adalah **Intuiting introvert (Ii)**.\n\n- **Intuiting (I)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan indra keenam (intuisi) dan imajinasi untuk melihat pola dan kemungkinan.\n- **introvert (i)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari dalam ke luar, menghasilkan ide-ide orisinal, murni, dan visioner dari dalam diri Anda.", title: "Intuiting introvert (Ii) - Sang Penggagas yang Visioner", potensiDiri: "Anda adalah penggagas sejati, pencipta ide-ide baru yang orisinal dan berkualitas tinggi. Sebagai seorang perfeksionis yang visioner, Anda mampu melihat jauh ke depan. Anda lebih nyaman bekerja di balik layar sebagai konseptor atau pencetus tren.", caraBelajar: "Belajar dengan memahami konsep besar di baliknya. Ilustrasi, grafis, film, dan cerita inspiratif akan memicu imajinasi Anda. Anda tidak terlalu suka menghafal, tetapi ingin tahu 'gambaran besarnya'.", profesi: "Peneliti Sains Murni, Penulis Sastra, Sutradara, Arsitek, Desainer, Investor, Pencipta Lagu, Entrepreneur di bidang inovasi, Filsuf." },
                Ie: { explanation: "Hasil tes Anda adalah **Intuiting extrovert (Ie)**.\n\n- **Intuiting (I)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan indra keenam (intuisi) dan imajinasi untuk melihat pola dan kemungkinan.\n- **extrovert (e)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari luar ke dalam, membuat Anda pandai merakit dan membumikan ide-ide besar agar diterima pasar.", title: "Intuiting extrovert (Ie) - Sang Inovator yang Adaptif", potensiDiri: "Anda adalah seorang pembaharu yang pandai merakit berbagai ide menjadi sebuah inovasi yang relevan dengan pasar. Anda mampu memprediksi tren bisnis dan 'mendaratkan' ide-ide besar menjadi sesuatu yang konkret dan bisa dijual. Kreativitas Anda bersifat aplikatif.", caraBelajar: "Belajar dengan merumuskan tema dan menghubungkan berbagai ide. Menggunakan peraga bongkar-pasang atau mempelajari studi kasus akan sangat efektif. Anda suka mengeksplorasi banyak hal untuk dirakit menjadi sesuatu yang baru.", profesi: "Wirausaha/Investor, Marketing & Periklanan, Konsultan Bisnis, Cinematografer, Detektif, Bidang Lifestyle & Mode, Business Development." },
                Fi: { explanation: "Hasil tes Anda adalah **Feeling introvert (Fi)**.\n\n- **Feeling (F)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan perasaan dan emosi untuk memahami orang dan membuat keputusan.\n- **introvert (i)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari dalam ke luar, memancarkan pengaruh dan kharisma kepemimpinan yang kuat dari dalam diri.", title: "Feeling introvert (Fi) - Sang Pemimpin yang Berkharisma", potensiDiri: "Anda adalah pemimpin alami yang kharismatik. Kekuatan Anda datang dari pengaruh kuat yang terpancar dari dalam. Anda mampu menyentuh emosi orang lain, memiliki visi yang jauh ke depan, populer, dan pandai meyakinkan orang untuk mengikuti ideologi Anda.", caraBelajar: "Anda adalah pendengar yang baik. Setelah mendengar, Anda perlu waktu untuk merefleksikan dan merasakan koneksinya. Anda akan sangat termotivasi jika materi relevan dengan nilai-nilai yang Anda yakini.", profesi: "Politisi, Negarawan, Pemimpin Organisasi/Yayasan, Psikolog, Motivator, Trainer/Public Speaker, Budayawan, Aktivis." },
                Fe: { explanation: "Hasil tes Anda adalah **Feeling extrovert (Fe)**.\n\n- **Feeling (F)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan perasaan dan emosi untuk memahami orang dan membuat keputusan.\n- **extrovert (e)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari luar ke dalam, membuat Anda terdorong untuk membangun hubungan, membina, dan mengayomi orang lain.", title: "Feeling extrovert (Fe) - Sang Pembina yang Peduli", potensiDiri: "Anda adalah seorang 'king-maker', mentor, atau pemilik yang hebat dalam membangun hubungan dan menggembleng orang lain menuju kesuksesan. Kemampuan sosial Anda luar biasa. Anda lebih suka bekerja di belakang layar, memastikan tim Anda solid dan berprestasi.", caraBelajar: "Melalui interaksi. Berdiskusi dengan guru atau teman, serta kerja kelompok, adalah cara belajar yang paling efektif. Anda menyerap energi dan pemahaman dari komunikasi dua arah.", profesi: "Psikolog/Konselor, Ahli Komunikasi/Humas, Diplomat, HRD (Personalia), Coach/Mentor, Manajer Komunitas." },
                In: { explanation: "Hasil tes Anda adalah **Insting (In)**.\n\n- **Insting (In)** adalah Mesin Kecerdasan (MK) Anda yang unik. Berada di otak tengah, Anda memiliki naluri yang tajam, kemampuan serba bisa, dan mudah beradaptasi di berbagai situasi. Anda adalah juru damai yang responsif, penyeimbang alami di antara tipe lainnya.", title: "Insting (In) - Sang Penyeimbang yang Serba Bisa", potensiDiri: "Anda adalah juru damai yang responsif dan pandai beradaptasi. Dengan naluri yang tajam, Anda seringkali tahu apa yang harus dilakukan tanpa perlu analisis panjang. Sebagai seorang generalis, Anda bisa diandalkan di banyak bidang dan sering menjadi penengah yang baik.", caraBelajar: "Anda belajar secara holistik. Pahami kesimpulan atau gambaran besarnya terlebih dahulu, baru kemudian masuk ke rincian (deduktif). Belajar paling baik dalam suasana tenang, damai, dan harmonis.", profesi: "Mediator, Jurnalis, Chef, Musisi, Aktivis Kemanusiaan/Agama, Pelayan Masyarakat, Terapis, dan sangat cocok sebagai 'tangan kanan' atau partner di berbagai posisi." }
            }
        },
        mbti: { /* Data MBTI tidak berubah */ }
    };

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
    }

    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg failed: ', err));
            });
        }
        updateButtonVisibility();

        startQolbuBtn.addEventListener('click', () => initializeApp({ isQolbu: true }));
        startCurhatBtn.addEventListener('click', () => initializeApp({ isAssistant: true }));
        startTestBtn.addEventListener('click', () => initializeApp({ isTest: true }));
        startDoctorBtn.addEventListener('click', () => initializeApp({ isDoctor: true }));
        
        qolbuInfoClose.addEventListener('click', () => { qolbuInfoBox.style.display = 'none'; });
        doctorInfoClose.addEventListener('click', () => { doctorInfoBox.style.display = 'none'; });

        header.addEventListener('click', () => window.location.reload());
        sendBtn.addEventListener('click', handleSendMessage);
        voiceBtn.addEventListener('click', toggleMainRecording);
        endChatBtn.addEventListener('click', handleCancelResponse);
        
        // PENAMBAHAN: Event listener untuk tombol dan input unggah gambar
        uploadBtn.addEventListener('click', () => imageUploadInput.click());
        imageUploadInput.addEventListener('change', handleImageUpload);

        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
            updateButtonVisibility();
        });

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        if (recognition) {
            recognition.onresult = (event) => {
                userInput.value = event.results[0][0].transcript;
                updateButtonVisibility(); 
            };
            recognition.onstart = () => {
                isRecording = true;
                voiceBtn.classList.add('recording');
                statusDiv.textContent = "Saya mendengarkan...";
                updateButtonVisibility();
            };
            recognition.onend = () => {
                isRecording = false;
                voiceBtn.classList.remove('recording');
                statusDiv.textContent = "";
                updateButtonVisibility();
                if (currentMode === 'assistant' && userInput.value.trim()) {
                    handleSendMessage();
                }
            };
            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                statusDiv.textContent = "Maaf, saya tidak bisa mendengar.";
            };
        }
    }
    
    // PENAMBAHAN: Fungsi untuk menangani unggahan gambar
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageData = {
                base64: e.target.result.split(',')[1], // Ambil hanya data base64
                mimeType: file.type,
                dataUrl: e.target.result // URL data lengkap untuk pratinjau
            };
            displayImagePreview();
        };
        reader.readAsDataURL(file);
    }

    // PENAMBAHAN: Fungsi untuk menampilkan pratinjau gambar
    function displayImagePreview() {
        if (!uploadedImageData) {
            imagePreviewContainer.innerHTML = '';
            imagePreviewContainer.style.display = 'none';
            return;
        }
        imagePreviewContainer.style.display = 'flex';
        imagePreviewContainer.innerHTML = `
            <img src="${uploadedImageData.dataUrl}" alt="Pratinjau Gambar">
            <button title="Hapus Gambar">&times;</button>
        `;
        imagePreviewContainer.querySelector('button').addEventListener('click', () => {
            uploadedImageData = null;
            imageUploadInput.value = ''; // Reset input file
            displayImagePreview();
        });
    }

    function initializeApp(mode = {}) {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if(audioContext.state === 'suspended') audioContext.resume();
            } catch(e) { console.error("Web Audio API tidak didukung."); }
        }
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        conversationHistory = [];
        
        // PERUBAHAN: Reset gambar saat memulai mode baru
        uploadedImageData = null;
        displayImagePreview();
        
        qolbuInfoBox.style.display = 'none';
        doctorInfoBox.style.display = 'none';
        
        isTesting = mode.isTest || false;
        currentMode = mode.isQolbu ? 'qolbu' : (mode.isTest ? 'psychologist' : (mode.isDoctor ? 'doctor' : 'assistant'));
        
        const headerTitle = document.getElementById('header-title');
        const headerSubtitle = document.getElementById('header-subtitle');
        let welcomeMessage = "";

        if (mode.isQolbu) {
            headerTitle.textContent = "Asisten Qolbu";
            headerSubtitle.textContent = "Menjawab dengan Rujukan Islami";
            qolbuInfoBox.style.display = 'block';
            welcomeMessage = "Assalamualaikum, Bosku. Saya Asisten Qolbu siap menbantu.";
        } else if (mode.isTest) {
            headerTitle.textContent = "Tes Kepribadian";
            headerSubtitle.textContent = "Saya akan memandu Anda, Bosku";
            initiateTestSelection();
            return; 
        } else if (mode.isDoctor) {
            headerTitle.textContent = "Tanya ke Dokter AI";
            headerSubtitle.textContent = "Saya siap membantu, Bosku";
            doctorInfoBox.style.display = 'block';
            welcomeMessage = "Selamat datang, Bosku. Saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu?";
        } else {
            headerTitle.textContent = "Asisten Pribadi";
            headerSubtitle.textContent = "Siap melayani, Bosku";
            welcomeMessage = "Selamat datang, Bosku. Saya, asisten pribadi Anda, siap mendengarkan. Ada yang bisa saya bantu?";
        }
        
        displayMessage(welcomeMessage, 'ai');
        speakAsync(welcomeMessage);
        updateButtonVisibility();
    }
    
    // Fungsi tes kepribadian (initiateTestSelection, startActualTest, dll.) tidak diubah
    function initiateTestSelection() { /* ... kode asli ... */ }
    function startActualTest(type) { /* ... kode asli ... */ }
    function displayNextTestQuestion() { /* ... kode asli ... */ }
    function processTestAnswer(choice) { /* ... kode asli ... */ }
    function calculateAndDisplayResult(stifinDrive = null) { /* ... kode asli ... */ }
    
    async function handleSendMessage() {
        if (isRecording || isTesting) return;
        const userText = userInput.value.trim();
        // PERUBAHAN: Kirim pesan bahkan jika teks kosong tapi ada gambar
        if (!userText && !uploadedImageData) return;

        // PERUBAHAN: Tampilkan gambar di chat jika ada
        if (uploadedImageData) {
            displayMessage(uploadedImageData.dataUrl, 'user-image');
        }
        
        handleSendMessageWithText(userText);
        userInput.value = '';
        userInput.style.height = 'auto';
    }

    async function handleSendMessageWithText(text) {
        if (isTesting && currentTestType === 'selection') {
            displayMessage(text, 'user');
            const type = text.toLowerCase().includes('stifin') ? 'stifin' : 'mbti';
            startActualTest(type);
            return;
        }
        if (isTesting) {
            displayMessage(text, 'user');
            processTestAnswer(text);
            return;
        }

        // Tampilkan teks hanya jika ada
        if(text) {
            conversationHistory.push({ role: 'user', text: text });
            displayMessage(text, 'user');
        }
        updateButtonVisibility();
        await getAIResponse(text);
    }
    
    async function getAIResponse(prompt) {
        abortController = new AbortController();
        statusDiv.textContent = "Saya sedang berpikir...";
        updateButtonVisibility();

        // PERUBAHAN: Siapkan data gambar untuk dikirim
        const imagePayload = uploadedImageData;
        // Reset gambar setelah disiapkan untuk dikirim
        uploadedImageData = null; 
        displayImagePreview();

        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt, 
                    history: conversationHistory, 
                    mode: currentMode,
                    // PENAMBAHAN: Kirim data gambar ke backend
                    imageData: imagePayload ? imagePayload.base64 : null,
                    mimeType: imagePayload ? imagePayload.mimeType : null
                }),
                signal: abortController.signal
            });
            if (!apiResponse.ok) throw new Error(`Server error: ${apiResponse.status}`);
            const result = await apiResponse.json();
            const responseText = result.aiText || `Maaf, Bosku. Bisa diulangi lagi?`;
            
            if (responseText) {
                conversationHistory.push({ role: 'ai', text: responseText });
                displayMessage(responseText, 'ai');
                await speakAsync(responseText);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
               displayMessage(`Maaf, Bosku, ada gangguan koneksi atau respons dibatalkan.`, 'ai-system');
            }
        } finally {
            abortController = null;
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }
    
    function speakAsync(text) { /* ... kode asli tidak berubah ... */ }

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isThinking = !!abortController;
        const isInputDisabled = isTesting || isRecording || isThinking;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isTesting ? "Jawab melalui tombol..." : (isRecording ? "Mendengarkan..." : "Tulis pesan untuk saya, Bosku...");
        
        // PERUBAHAN: Logika tampilan tombol disesuaikan
        const showSendButton = isTyping || uploadedImageData;

        if (isInputDisabled) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'none';
            uploadBtn.style.display = 'none';
        } else if (showSendButton) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
            uploadBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
            uploadBtn.style.display = 'flex';
        }
        
        voiceBtn.disabled = isThinking || isTesting;
        uploadBtn.disabled = isThinking || isTesting; // Nonaktifkan upload saat AI berpikir
    }

    function handleCancelResponse() { /* ... kode asli tidak berubah ... */ }

    function toggleMainRecording() { /* ... kode asli tidak berubah ... */ }

    function simpleMarkdownToHTML(text) { /* ... kode asli tidak berubah ... */ }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        // PERUBAHAN: Menangani tipe pesan gambar
        if (sender === 'user-image') {
            messageElement.classList.add('chat-message', 'user-message');
            messageElement.innerHTML = `<img src="${message}" alt="Gambar dari user" onclick="window.open('${message}')">`;
            chatContainer.appendChild(messageElement);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return;
        }
        
        messageElement.classList.add('chat-message', `${sender}-message`);

        const buttonRegex = /\[(PILIHAN|TOMBOL):(.*?)\]/g;
        const buttons = [...message.matchAll(buttonRegex)];
        const cleanMessage = message.replace(buttonRegex, '').trim();
        
        // PERUBAHAN: Menangani pesan gambar dari AI (jika ada)
        if (cleanMessage.startsWith('data:image')) {
             messageElement.innerHTML = `<img src="${cleanMessage}" alt="Gambar dari AI" onclick="window.open('${cleanMessage}')">`;
        } else {
            messageElement.innerHTML = simpleMarkdownToHTML(cleanMessage);
        }

        if (buttons.length > 0) {
            const choiceContainer = document.createElement('div');
            choiceContainer.className = 'choice-container';
            buttons.forEach(match => {
                const options = match[2].split('|');
                options.forEach(optionText => {
                    const button = document.createElement('button');
                    button.className = 'choice-button';
                    button.textContent = optionText.trim();
                    button.onclick = () => {
                        choiceContainer.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
                        button.classList.add('selected');
                        handleSendMessageWithText(optionText.trim());
                    };
                    choiceContainer.appendChild(button);
                });
            });
            messageElement.appendChild(choiceContainer);
        }

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    init();
});
