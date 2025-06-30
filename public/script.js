// Fungsionalitas JavaScript untuk RASA v2
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi konstanta elemen DOM
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const statusDiv = document.getElementById('status');
    const startOverlay = document.getElementById('start-overlay');
    const startCurhatBtn = document.getElementById('start-curhat-btn');
    const startTestBtn = document.getElementById('start-test-btn');
    const startDoctorBtn = document.getElementById('start-doctor-btn');
    const header = document.querySelector('header');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    const doctorInfoBox = document.getElementById('doctor-info-box');
    const doctorInfoClose = document.getElementById('doctor-info-close');
    
    // Inisialisasi state aplikasi
    let conversationHistory = []; 
    let speechVoices = [];
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;
    let isTesting = false;
    let currentTestType = null;
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;
    let currentMode = 'assistant'; // Default mode adalah asisten
    
    // Data untuk tes kepribadian (tidak diubah)
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
                Si: { explanation: "Hasil tes Anda adalah **Sensing introvert (Si)**...", title: "Sensing introvert (Si) - Sang Penyimpan yang Tekun", potensiDiri: "...", caraBelajar: "...", profesi: "..." },
                Se: { explanation: "Hasil tes Anda adalah **Sensing extrovert (Se)**...", title: "Sensing extrovert (Se) - Sang Peluang yang Gesit", potensiDiri: "...", caraBelajar: "...", profesi: "..." },
                Ti: { explanation: "Hasil tes Anda adalah **Thinking introvert (Ti)**...", title: "Thinking introvert (Ti) - Sang Pakar yang Logis", potensiDiri: "...", caraBelajar: "...", profesi: "..." },
                Te: { explanation: "Hasil tes Anda adalah **Thinking extrovert (Te)**...", title: "Thinking extrovert (Te) - Sang Komandan yang Efektif", potensiDiri: "...", caraBelajar: "...", profesi: "..." },
                Ii: { explanation: "Hasil tes Anda adalah **Intuiting introvert (Ii)**...", title: "Intuiting introvert (Ii) - Sang Penggagas yang Visioner", potensiDiri: "...", caraBelajar: "...", profesi: "..." },
                Ie: { explanation: "Hasil tes Anda adalah **Intuiting extrovert (Ie)**...", title: "Intuiting extrovert (Ie) - Sang Inovator yang Adaptif", potensiDiri: "...", caraBelajar: "...", profesi: "..." },
                Fi: { explanation: "Hasil tes Anda adalah **Feeling introvert (Fi)**...", title: "Feeling introvert (Fi) - Sang Pemimpin yang Berkharisma", potensiDiri: "...", caraBelajar: "...", profesi: "..." },
                Fe: { explanation: "Hasil tes Anda adalah **Feeling extrovert (Fe)**...", title: "Feeling extrovert (Fe) - Sang Pembina yang Peduli", potensiDiri: "...", caraBelajar: "...", profesi: "..." },
                In: { explanation: "Hasil tes Anda adalah **Insting (In)**...", title: "Insting (In) - Sang Penyeimbang yang Serba Bisa", potensiDiri: "...", caraBelajar: "...", profesi: "..." }
            }
        },
        mbti: { /* Data MBTI tidak berubah */ }
    };
    
    // Fungsi utama yang dijalankan saat halaman dimuat
    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                .then(registration => console.log('ServiceWorker registration successful'))
                .catch(err => console.log('ServiceWorker registration failed: ', err));
            });
        }
        loadVoices();
        displayInitialMessage();
        updateButtonVisibility();

        // Event listener untuk tombol di layar awal
        startCurhatBtn.addEventListener('click', () => initializeApp({ isAssistant: true }));
        startTestBtn.addEventListener('click', () => initializeApp({ isTest: true }));
        startDoctorBtn.addEventListener('click', () => initializeApp({ isDoctor: true }));
        
        doctorInfoClose.addEventListener('click', () => { doctorInfoBox.style.display = 'none'; });

        // Event listener untuk elemen interaktif di chat
        header.addEventListener('click', () => window.location.reload());
        sendBtn.addEventListener('click', handleSendMessage);
        voiceBtn.addEventListener('click', toggleMainRecording);
        endChatBtn.addEventListener('click', handleCancelResponse);
        
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
    }
    
    // Menginisialisasi mode aplikasi yang dipilih
    function initializeApp(mode = {}) {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if(audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            } catch(e) { console.error("Web Audio API tidak didukung."); }
        }
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        doctorInfoBox.style.display = 'none';
        
        if (mode.isTest) {
            currentMode = 'psychologist'; // Mode untuk tes tetap psikolog
            headerTitle.textContent = "Tes Kepribadian dan Potensi Diri";
            headerSubtitle.textContent = "Saya akan memandu Anda, Bosku";

            isTesting = true;
            currentTestType = 'selection';
            const introMessage = `Selamat datang di Tes Kepribadian, Bosku.\n\nTes ini menawarkan dua pendekatan untuk membantu Anda lebih mengenal diri:\n- **Pendekatan STIFIn:** Berbasis konsep kecerdasan genetik.\n- **Pendekatan MBTI:** Mengidentifikasi preferensi Anda dalam melihat dunia.\n\n---\n\n***Disclaimer:*** *Tes ini adalah pengantar. Untuk hasil yang komprehensif, disarankan untuk mengikuti tes di Layanan Psikologi Profesional.*\n\nSilakan pilih pendekatan yang ingin Anda gunakan:\n[PILIHAN:Pendekatan STIFIn|Pendekatan MBTI]`;
            
            displayMessage(introMessage, 'ai');
            speakAsync("Selamat datang di tes kepribadian, Bosku. Silakan pilih pendekatan yang ingin Anda gunakan.", true);

        } else if (mode.isDoctor) {
            currentMode = 'doctor';
            headerTitle.textContent = "Tanya ke Dokter AI";
            headerSubtitle.textContent = "Saya siap membantu, Bosku";
            
            doctorInfoBox.style.display = 'block';
            isTesting = false;
            const welcomeMessage = "Selamat datang, Bosku. Saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu?";
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage, true);

        } else { // PERUBAHAN: Mode default dan "Tanya ke Asisten Pribadi"
            currentMode = 'assistant';
            headerTitle.textContent = "Asisten Pribadi";
            headerSubtitle.textContent = "Siap melayani, Bosku";
            isTesting = false; 
            
            // PERUBAHAN: Sesi perkenalan dihapus, diganti sapaan langsung
            const welcomeMessage = "Selamat datang, Bosku. Saya, asisten pribadi Anda, siap mendengarkan. Ada yang bisa saya bantu?";
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage, true);
        }
    }

    // Fungsi initiateTest, displayNextTestQuestion, processTestAnswer, dan calculateAndDisplayResult tidak berubah secara signifikan
    // ... (Fungsi-fungsi tes tetap ada untuk fungsionalitas Tes Kepribadian)
    function initiateTest(type) {
        currentTestType = type;
        const questionsToAsk = (type === 'stifin')
            ? fullTestData.stifin.questions
            : fullTestData.mbti.questions;

        testData = { ...fullTestData[type], questions: questionsToAsk };
        testScores = {};
        currentTestQuestionIndex = 0;
        displayMessage(`Baik, Bosku. Mari kita mulai Tes ${type.toUpperCase()}. Jawablah beberapa pertanyaan berikut.`, 'ai-system');
        setTimeout(displayNextTestQuestion, 1000);
    }
    
    function displayNextTestQuestion() { /* ... logika tidak berubah ... */ }
    function processTestAnswer(choice) { /* ... logika tidak berubah ... */ }
    function calculateAndDisplayResult(stifinDrive = null) { /* ... logika tidak berubah ... */ }


    // Menangani pengiriman pesan dari user
    async function handleSendMessage() {
        if (isRecording || isTesting) return;
        const userText = userInput.value.trim();
        if (!userText) return;

        displayMessage(userText, 'user');
        
        userInput.value = '';
        userInput.style.height = 'auto';
        updateButtonVisibility();
        await getAIResponse(userText);
    }
    
    function handleSendMessageWithChoice(choice) {
        displayMessage(choice, 'user');
        if (isTesting) {
            if (currentTestType === 'selection') {
                const type = choice.toLowerCase().includes('stifin') ? 'stifin' : 'mbti';
                initiateTest(type);
            } else {
                processTestAnswer(choice);
            }
        } else {
            getAIResponse(choice);
        }
    }

    // Mengatur visibilitas tombol berdasarkan state
    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isInputDisabled = isTesting;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isInputDisabled ? "Jawab melalui tombol atau suara..." : "Tulis pesan untuk saya, Bosku...";

        if (isRecording || isInputDisabled) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'none';
        } else if (isTyping) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
        }
    }
    
    function handleCancelResponse() {
        if (abortController) abortController.abort();
        window.speechSynthesis.cancel();
        if (recognition) recognition.abort();
        isRecording = false;
        isTesting = false;
        currentTestType = null;
        voiceBtn.classList.remove('recording');
        statusDiv.textContent = "Proses dibatalkan.";
        updateButtonVisibility();
        setTimeout(() => { if (statusDiv.textContent === "Proses dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    
    // Fungsi untuk input suara
    function toggleMainRecording() {
        if (isTesting) return;
        if (isRecording) stopRecording();
        else startRecording();
    }

    function startRecording() { /* ... logika tidak berubah ... */ }
    function stopRecording() { /* ... logika tidak berubah ... */ }
    
    // Mengambil respons dari AI
    async function getAIResponse(prompt) {
        abortController = new AbortController();
        statusDiv.textContent = "Saya sedang berpikir...";
        updateButtonVisibility();
        
        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, history: conversationHistory, mode: currentMode }),
                signal: abortController.signal
            });
            if (!apiResponse.ok) throw new Error(`Server merespon dengan status ${apiResponse.status}`);
            const result = await apiResponse.json();
            const responseText = result.aiText || `Maaf, Bosku. Bisa diulangi lagi?`;
            
            if (responseText) {
                displayMessage(responseText, 'ai');
                await speakAsync(responseText, true);
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
               displayMessage(`Maaf, Bosku, sepertinya ada sedikit gangguan koneksi. Bisa ceritakan kembali?`, 'ai-system');
            }
        } finally {
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }

    // Fungsi untuk Text-to-Speech (TTS)
    function loadVoices() { /* ... logika tidak berubah ... */ }
    
    function speakAsync(text, isAIResponse = false) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) { resolve(); return; }
            window.speechSynthesis.cancel();
            
            const textForSpeech = text.replace(/\[[^\]]+\]\([^)]+\)/g, '') 
                                     .replace(/\[LINK:.*?\](.*?)\[\/LINK\]/g, '$1')
                                     .replace(/[*]/g, '')
                                     .replace(/\bAI\b/g, 'E Ai');
            
            const utterance = new SpeechSynthesisUtterance(textForSpeech);
            utterance.lang = 'id-ID';
            utterance.rate = 0.95;
            utterance.pitch = 1;
            if (isAIResponse) {
                let indonesianVoice = speechVoices.find(v => v.lang === 'id-ID');
                if (indonesianVoice) utterance.voice = indonesianVoice;
            }
            utterance.onend = () => resolve();
            utterance.onerror = (e) => { console.error("Speech synthesis error:", e); resolve(e); };
            window.speechSynthesis.speak(utterance);
        });
    }

    function playSound(type) { /* ... logika tidak berubah ... */ }

    // Menampilkan pesan awal
    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        conversationHistory = [];
        displayMessage("Pilih layanan di layar awal untuk memulai...", 'ai-system');
    }

    // Menampilkan pesan di kontainer chat
    function displayMessage(message, sender) {
        if (sender !== 'ai-system') {
            const role = (sender === 'ai') ? 'Saya' : 'Bosku';
            conversationHistory.push({ role: role, text: message });
        }
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', `${sender}-message`);

        if (sender.startsWith('user')) {
            messageContainer.textContent = message;
        } else {
            // Logika parsing markdown dan pembuatan tombol (tidak berubah)
            let textWithChoices = message.replace(/\[PILIHAN:(.*?)\]/g, (match, optionsString) => {
                const options = optionsString.split('|');
                let buttonsHTML = '<div class="choice-container">';
                options.forEach(option => {
                    const trimmedOption = option.trim();
                    buttonsHTML += `<button class="choice-button" data-choice="${trimmedOption}">${trimmedOption}</button>`;
                });
                return buttonsHTML + '</div>';
            });

            let textPart = textWithChoices.split('<div class="choice-container">')[0];
            let choicePart = textWithChoices.includes('<div class="choice-container">') ? '<div class="choice-container">' + textWithChoices.split('<div class="choice-container">')[1] : '';

            let html = textPart
                .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>')
                .replace(/\[LINK:(.*?)\](.*?)\[\/LINK\]/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$2</a>')
                .replace(/\*\*\*(.*?)\*\*\*/g, '<em><strong>$1</strong></em>') 
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/###\s*(.*)/g, '<h3>$1</h3>')
                .replace(/---\n?/g, '<hr>')
                .replace(/\n\s*-\s/g, '<li>');

            const lines = html.split('\n');
            let inList = false;
            let finalHTML = '';
            lines.forEach(line => {
                let trimmedLine = line.trim();
                if (trimmedLine.startsWith('<li>')) {
                    if (!inList) { finalHTML += '<ul>'; inList = true; }
                    finalHTML += `<li>${trimmedLine.substring(4)}</li>`;
                } else {
                    if (inList) { finalHTML += '</ul>'; inList = false; }
                    if (trimmedLine) {
                        finalHTML += `<p>${trimmedLine}</p>`;
                    }
                }
            });
            if (inList) finalHTML += '</ul>';
            
            finalHTML = finalHTML.replace(/<p><\/p>/g, '');
            messageContainer.innerHTML = finalHTML + choicePart;
        }

        messageContainer.querySelectorAll('.choice-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const choiceText = e.currentTarget.dataset.choice;
                button.parentElement.querySelectorAll('.choice-button').forEach(btn => {
                    btn.disabled = true;
                    btn.classList.add('selected');
                });
                handleSendMessageWithChoice(choiceText);
            });
        });
        chatContainer.appendChild(messageContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    init();
});
