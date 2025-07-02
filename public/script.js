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
    
    // PENYEMPURNAAN: Elemen untuk fungsionalitas upload gambar
    const uploadBtn = document.getElementById('upload-btn');
    const imageInput = document.getElementById('image-input');
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
    let pendingImage = null; // PENYEMPURNAAN: Menyimpan data gambar yang akan dikirim

    // State untuk Tes Kepribadian
    let isTesting = false;
    let currentTestType = null;
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;

    // Basis Data Kecerdasan Tes (tidak diubah)
    const fullTestData = { /* ... data tes yang sangat panjang tidak ditampilkan untuk keringkasan ... */ };

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
        
        // PENYEMPURNAAN: Event listener untuk tombol dan input gambar
        uploadBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);

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
            recognition.onstart = () => { isRecording = true; voiceBtn.classList.add('recording'); statusDiv.textContent = "Saya mendengarkan..."; updateButtonVisibility(); };
            recognition.onend = () => { isRecording = false; voiceBtn.classList.remove('recording'); statusDiv.textContent = ""; updateButtonVisibility(); if (currentMode === 'assistant' && userInput.value.trim()) { handleSendMessage(); } };
            recognition.onerror = (event) => { console.error("Speech recognition error", event.error); statusDiv.textContent = "Maaf, saya tidak bisa mendengar."; };
        }
    }
    
    function initializeApp(mode = {}) {
        // ... (fungsi ini tidak diubah, hanya disingkat)
        if (!audioContext) { try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); if(audioContext.state === 'suspended') audioContext.resume(); } catch(e) { console.error("Web Audio API tidak didukung."); } }
        startOverlay.classList.add('hidden'); chatContainer.innerHTML = ''; conversationHistory = []; qolbuInfoBox.style.display = 'none'; doctorInfoBox.style.display = 'none';
        isTesting = mode.isTest || false; currentMode = mode.isQolbu ? 'qolbu' : (mode.isTest ? 'psychologist' : (mode.isDoctor ? 'doctor' : 'assistant'));
        const headerTitle = document.getElementById('header-title'); const headerSubtitle = document.getElementById('header-subtitle'); let welcomeMessage = "";
        if (mode.isQolbu) { headerTitle.textContent = "Asisten Qolbu"; headerSubtitle.textContent = "Menjawab dengan Rujukan Islami"; qolbuInfoBox.style.display = 'block'; welcomeMessage = "Assalamualaikum, Bosku. Saya Asisten Qolbu siap menbantu."; } else if (mode.isTest) { headerTitle.textContent = "Tes Kepribadian"; headerSubtitle.textContent = "Saya akan memandu Anda, Bosku"; initiateTestSelection(); return; } else if (mode.isDoctor) { headerTitle.textContent = "Tanya ke Dokter AI"; headerSubtitle.textContent = "Saya siap membantu, Bosku"; doctorInfoBox.style.display = 'block'; welcomeMessage = "Selamat datang, Bosku. Saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu?"; } else { headerTitle.textContent = "Asisten Pribadi"; headerSubtitle.textContent = "Siap melayani, Bosku"; welcomeMessage = "Selamat datang, Bosku. Saya, asisten pribadi Anda, siap mendengarkan. Ada yang bisa saya bantu?"; }
        displayMessage(welcomeMessage, 'ai'); speakAsync(welcomeMessage); updateButtonVisibility();
    }
    
    // PENYEMPURNAAN: Fungsi untuk menangani upload gambar
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            pendingImage = e.target.result; // Simpan data base64
            displayImagePreview(pendingImage, file.name);
            updateButtonVisibility();
        };
        reader.readAsDataURL(file);
        
        imageInput.value = ''; // Reset input file
    }

    // PENYEMPURNAAN: Fungsi untuk menampilkan preview gambar
    function displayImagePreview(imageData, fileName) {
        imagePreviewContainer.style.display = 'flex';
        imagePreviewContainer.innerHTML = `
            <img src="${imageData}" alt="Preview">
            <p>${fileName}</p>
            <button id="remove-preview-btn" title="Hapus Gambar">&times;</button>
        `;
        document.getElementById('remove-preview-btn').addEventListener('click', () => {
            pendingImage = null;
            imagePreviewContainer.style.display = 'none';
            imagePreviewContainer.innerHTML = '';
            updateButtonVisibility();
        });
        userInput.focus();
    }

    // ... (Fungsi-fungsi tes kepribadian tidak diubah, disingkat)
    function initiateTestSelection() { /* ... */ }
    function startActualTest(type) { /* ... */ }
    function displayNextTestQuestion() { /* ... */ }
    function processTestAnswer(choice) { /* ... */ }
    function calculateAndDisplayResult(stifinDrive = null) { /* ... */ }
    
    async function handleSendMessage() {
        if (isRecording || isTesting) return;
        
        // PENYEMPURNAAN: Izinkan pengiriman pesan meski input teks kosong jika ada gambar
        const userText = userInput.value.trim();
        if (!userText && !pendingImage) return;
        
        // Jika ada gambar tapi tidak ada teks, gunakan teks default
        const promptText = userText || "Tolong jelaskan atau analisis gambar ini, Bosku.";

        handleSendMessageWithText(promptText, pendingImage);
        
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // Reset preview gambar setelah dikirim
        pendingImage = null;
        imagePreviewContainer.style.display = 'none';
        imagePreviewContainer.innerHTML = '';
    }

    async function handleSendMessageWithText(text, image = null) {
        if (isTesting) { /* ... (logika tes tidak diubah) ... */ return; }
        
        // PENYEMPURNAAN: Menampilkan pesan pengguna dengan gambar jika ada
        displayUserMessage(text, image);
        conversationHistory.push({ role: 'user', text: text });
        updateButtonVisibility();
        await getAIResponse(text, image);
    }
    
    async function getAIResponse(prompt, image = null) {
        abortController = new AbortController();
        statusDiv.textContent = "Saya sedang berpikir...";
        updateButtonVisibility();

        try {
            // PENYEMPURNAAN: Mengirim data gambar ke API
            const apiResponse = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, history: conversationHistory, mode: currentMode, image: image }),
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
    
    function speakAsync(text) {
        // ... (fungsi ini tidak diubah, hanya disingkat)
        return new Promise((resolve) => { if (!('speechSynthesis' in window)) { resolve(); return; } window.speechSynthesis.cancel(); if (isTesting) { resolve(); return; } const utteranceQueue = []; const parts = text.split(/(\[ARAB\].*?\[\/ARAB\])/g); parts.forEach(part => { if (part.startsWith('[ARAB]')) { const arabicText = part.substring(6, part.length - 7); if (arabicText.trim()) { const utterance = new SpeechSynthesisUtterance(arabicText); utterance.lang = 'ar-SA'; utteranceQueue.push(utterance); } } else { let cleanPart = part.replace(/\[(TOMBOL|PILIHAN|GAMBAR):.*?\]/g, '').replace(/[*#_]/g, '').replace(/\bAI\b/g, 'E-Ai'); if (cleanPart.trim()) { const utterance = new SpeechSynthesisUtterance(cleanPart); utterance.lang = 'id-ID'; utteranceQueue.push(utterance); } } }); if (utteranceQueue.length === 0) { resolve(); return; } let currentIndex = 0; const speakNext = () => { if (currentIndex >= utteranceQueue.length) { resolve(); return; } const currentUtterance = utteranceQueue[currentIndex]; currentUtterance.onend = () => { currentIndex++; speakNext(); }; currentUtterance.onerror = (e) => { console.error("Speech synthesis error:", e); currentIndex++; speakNext(); }; window.speechSynthesis.speak(currentUtterance); }; if (window.speechSynthesis.getVoices().length === 0) { window.speechSynthesis.onvoiceschanged = speakNext; } else { speakNext(); } });
    }

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isThinking = !!abortController;
        const hasImage = !!pendingImage;
        const isInputDisabled = isTesting || isRecording || isThinking;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isTesting ? "Jawab melalui tombol..." : (isRecording ? "Mendengarkan..." : "Tulis pesan untuk saya, Bosku...");
        
        // PENYEMPURNAAN: Logika visibilitas tombol disesuaikan
        if (isInputDisabled) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'none';
            uploadBtn.style.display = 'none';
        } else if (isTyping || hasImage) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
            uploadBtn.style.display = 'flex';
        } else {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
            uploadBtn.style.display = 'flex';
        }
        
        voiceBtn.disabled = isThinking || isTesting || hasImage;
        uploadBtn.disabled = isThinking || isTesting || isRecording;
    }

    function handleCancelResponse() {
        if (abortController) abortController.abort();
        window.speechSynthesis.cancel();
        if (recognition && isRecording) recognition.stop();
        isTesting = false; 
        statusDiv.textContent = "Dibatalkan.";
        setTimeout(() => { statusDiv.textContent = ""; }, 2000);
        updateButtonVisibility();
    }

    function toggleMainRecording() {
        if (isTesting || pendingImage) return; 
        if (isRecording) { recognition.stop(); } 
        else { if ('speechSynthesis'in window) window.speechSynthesis.cancel(); recognition.start(); }
    }

    function simpleMarkdownToHTML(text) {
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
        
        // PENYEMPURNAAN: Menambahkan regex untuk tag gambar dari AI
        let html = text
            .replace(/\[ARAB\](.*?)\[\/ARAB\]/g, '<span class="arabic-text" dir="rtl">$1</span>')
            .replace(/\[GAMBAR:(.*?)\]/g, '<img src="$1" alt="Gambar dari AI" class="chat-image" onclick="window.open(\'$1\', \'_blank\');">')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/_(.*?)_/g, '<i>$1</i>')
            .replace(/###\s*(.*)/g, '<h3>$1</h3>')
            .replace(/---\n/g, '<hr>')
            .replace(markdownLinkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');

        // ... (logika list tidak diubah)
        const lines = html.split('\n'); let inList = false; html = lines.map(line => { let trimmedLine = line.trim(); if (trimmedLine.startsWith('- ')) { if (!inList) { inList = true; return '<ul><li>' + trimmedLine.substring(2) + '</li>'; } return '<li>' + trimmedLine.substring(2) + '</li>'; } else { if (inList) { inList = false; return '</ul>' + line; } return line; } }).join('<br>'); if (inList) html += '</ul>';
        return html.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');
    }

    // PENYEMPURNAAN: Fungsi baru untuk menampilkan pesan pengguna dengan gambar
    function displayUserMessage(text, imageUrl) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'user-message');
        
        let imageHTML = '';
        if (imageUrl) {
            imageHTML = `<img src="${imageUrl}" alt="Gambar yang diunggah" class="chat-image" onclick="window.open('${imageUrl}', '_blank');">`;
        }
        
        messageElement.innerHTML = simpleMarkdownToHTML(text) + imageHTML;
        
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function displayMessage(message, sender) {
        // Jangan tampilkan pesan pengguna lagi karena sudah ditangani oleh displayUserMessage
        if (sender === 'user') return;

        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);

        const buttonRegex = /\[(PILIHAN|TOMBOL):(.*?)\]/g;
        const buttons = [...message.matchAll(buttonRegex)];
        const cleanMessage = message.replace(buttonRegex, '').trim();
        
        messageElement.innerHTML = simpleMarkdownToHTML(cleanMessage);

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
