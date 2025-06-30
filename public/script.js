// Fungsionalitas JavaScript untuk RASA v1.1.1
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
    let currentMode = 'assistant';

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
            results: { /* Data hasil STIFin tidak ditampilkan untuk keringkasan */ }
        },
        mbti: { /* Data MBTI tidak ditampilkan untuk keringkasan */ }
    };
    
    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('ServiceWorker registration failed: ', err));
            });
        }
        loadVoices();
        displayInitialMessage();
        updateButtonVisibility();

        startCurhatBtn.addEventListener('click', () => initializeApp({ isAssistant: true }));
        startTestBtn.addEventListener('click', () => initializeApp({ isTest: true }));
        startDoctorBtn.addEventListener('click', () => initializeApp({ isDoctor: true }));
        
        doctorInfoClose.addEventListener('click', () => { doctorInfoBox.style.display = 'none'; });

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
    
    function initializeApp(mode = {}) {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if(audioContext.state === 'suspended') audioContext.resume();
            } catch(e) { console.error("Web Audio API tidak didukung."); }
        }
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        doctorInfoBox.style.display = 'none';
        
        if (mode.isTest) {
            currentMode = 'psychologist';
            headerTitle.textContent = "Tes Kepribadian dan Potensi Diri";
            headerSubtitle.textContent = "Saya akan memandu Anda, Bosku";
            isTesting = true;
            currentTestType = 'selection';
            const introMessage = `Selamat datang di Tes Kepribadian, Bosku.\n\nTes ini menawarkan dua pendekatan untuk membantu Anda lebih mengenal diri:\n- **Pendekatan STIFIn:** Berbasis konsep kecerdasan genetik.\n- **Pendekatan MBTI:** Mengidentifikasi preferensi Anda.\n\n---\n\n***Disclaimer:*** *Tes ini adalah pengantar. Untuk hasil komprehensif, disarankan mengikuti tes di Layanan Psikologi Profesional.*\n\nSilakan pilih pendekatan yang ingin Anda gunakan:\n[PILIHAN:Pendekatan STIFIn|Pendekatan MBTI]`;
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
        } else {
            currentMode = 'assistant';
            headerTitle.textContent = "Asisten Pribadi";
            headerSubtitle.textContent = "Siap melayani, Bosku";
            isTesting = false; 
            const welcomeMessage = "Selamat datang, Bosku. Saya, asisten pribadi Anda, siap mendengarkan. Ada yang bisa saya bantu?";
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage, true);
        }
        updateButtonVisibility();
    }
    
    // Fungsi-fungsi untuk tes kepribadian (logika tidak diubah)
    function initiateTest(type) {
        currentTestType = type;
        const testConfig = fullTestData[type];
        if (!testConfig) return;
        
        testData = { ...testConfig, questions: [...testConfig.questions] };
        testScores = {};
        currentTestQuestionIndex = 0;
        displayMessage(`Baik, Bosku. Mari kita mulai Tes ${type.toUpperCase()}.`, 'ai-system');
        setTimeout(displayNextTestQuestion, 1000);
    }
    function displayNextTestQuestion() { /* ... */ }
    function processTestAnswer(choice) { /* ... */ }
    function calculateAndDisplayResult(stifinDrive = null) { /* ... */ }

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

    // PERBAIKAN: Fungsi ini telah dikoreksi logikanya.
    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isInputDisabled = isTesting;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isInputDisabled ? "Jawab melalui tombol atau suara..." : "Tulis pesan untuk saya, Bosku...";

        if (isInputDisabled) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'none';
        } else if (isRecording) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex'; // Tombol suara tetap tampil saat merekam
        } else if (isTyping) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else { // Kondisi default: tidak mengetik, tidak merekam
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
    
    function toggleMainRecording() {
        if (isTesting || isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    function startRecording() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            statusDiv.textContent = "Input suara tidak didukung browser ini.";
            return;
        }

        isRecording = true;
        voiceBtn.classList.add('recording');
        updateButtonVisibility();
        
        recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            updateButtonVisibility();
            handleSendMessage(); // Langsung kirim setelah suara dikenali
        };
        recognition.onerror = (event) => {
            console.error(`Error pengenalan suara: ${event.error}`);
            statusDiv.textContent = "Tidak dapat mengenali suara.";
        };
        recognition.onstart = () => statusDiv.textContent = "Mendengarkan...";
        recognition.onend = () => {
             if (isRecording) stopRecording();
        };
        recognition.start();
    }

    function stopRecording() {
        isRecording = false;
        if (recognition) recognition.stop();
        voiceBtn.classList.remove('recording');
        if (statusDiv.textContent === "Mendengarkan...") statusDiv.textContent = "";
        updateButtonVisibility();
    }
    
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
            if (!apiResponse.ok) throw new Error(`Server error: ${apiResponse.status}`);
            const result = await apiResponse.json();
            const responseText = result.aiText || `Maaf, Bosku. Bisa diulangi lagi?`;
            
            if (responseText) {
                displayMessage(responseText, 'ai');
                await speakAsync(responseText, true);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
               displayMessage(`Maaf, Bosku, ada gangguan koneksi. Bisa ceritakan kembali?`, 'ai-system');
            }
        } finally {
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }

    function loadVoices() {
        if (!('speechSynthesis' in window)) return;
        speechVoices = window.speechSynthesis.getVoices();
        if (speechVoices.length === 0 && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = () => {
                speechVoices = window.speechSynthesis.getVoices();
            };
        }
    }
    
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
            utterance.onend = resolve;
            utterance.onerror = (e) => { console.error("Speech synthesis error:", e); resolve(e); };
            window.speechSynthesis.speak(utterance);
        });
    }

    function playSound(type) { /* ... */ }

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        conversationHistory = [];
        displayMessage("Pilih layanan di layar awal untuk memulai...", 'ai-system');
    }

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
            let textWithChoices = message.replace(/\[PILIHAN:(.*?)\]/g, (match, optionsString) => {
                const options = optionsString.split('|');
                let buttonsHTML = '<div class="choice-container">';
                options.forEach(option => {
                    buttonsHTML += `<button class="choice-button" data-choice="${option.trim()}">${option.trim()}</button>`;
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
                    if (trimmedLine) finalHTML += `<p>${trimmedLine}</p>`;
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
