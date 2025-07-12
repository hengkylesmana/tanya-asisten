// Fungsionalitas JavaScript untuk RASA (dengan fitur gambar)
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
    
    const qolbuInfoBox = document.getElementById('qolbu-info-box');
    const qolbuInfoClose = document.getElementById('qolbu-info-close');
    const doctorInfoBox = document.getElementById('doctor-info-box');
    const doctorInfoClose = document.getElementById('doctor-info-close');

    // --- AWAL PENYEMPURNAAN GAMBAR ---
    const uploadBtn = document.getElementById('upload-btn');
    const imageInput = document.getElementById('image-input');
    let uploadedImageData = null; // Menyimpan data gambar base64
    // --- AKHIR PENYEMPURNAAN GAMBAR ---

    // State aplikasi
    let conversationHistory = []; 
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;
    let currentMode = 'assistant';

    // State untuk Tes Kepribadian (tidak diubah)
    let isTesting = false;
    let currentTestType = null;
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;
    const fullTestData = { /* Data tes lengkap tidak diubah, jadi disembunyikan untuk keringkasan */ };

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

        // --- AWAL PENYEMPURNAAN GAMBAR ---
        uploadBtn.addEventListener('click', () => imageInput.click());
        imageInput.addEventListener('change', handleImageUpload);
        // --- AKHIR PENYEMPURNAAN GAMBAR ---
        
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
        // Fungsi ini sebagian besar tetap sama
        if (!audioContext) { try { audioContext = new (window.AudioContext || window.webkitAudioContext)(); if(audioContext.state === 'suspended') audioContext.resume(); } catch(e) { console.error("Web Audio API tidak didukung."); } }
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        conversationHistory = [];
        qolbuInfoBox.style.display = 'none';
        doctorInfoBox.style.display = 'none';
        isTesting = mode.isTest || false;
        currentMode = mode.isQolbu ? 'qolbu' : (mode.isTest ? 'psychologist' : (mode.isDoctor ? 'doctor' : 'assistant'));
        const headerTitle = document.getElementById('header-title');
        const headerSubtitle = document.getElementById('header-subtitle');
        let welcomeMessage = "";
        if (mode.isQolbu) { headerTitle.textContent = "Asisten Qolbu"; headerSubtitle.textContent = "Menjawab dengan Rujukan Islami"; qolbuInfoBox.style.display = 'block'; welcomeMessage = "Assalamualaikum, Bosku. Saya Asisten Qolbu siap membantu. Anda bisa bertanya tentang rujukan islami atau mengirim gambar untuk didiskusikan."; } 
        else if (mode.isTest) { /* logika tes tidak berubah */ headerTitle.textContent = "Tes Kepribadian"; headerSubtitle.textContent = "Saya akan memandu Anda, Bosku"; initiateTestSelection(); return; } 
        else if (mode.isDoctor) { headerTitle.textContent = "Tanya ke Dokter AI"; headerSubtitle.textContent = "Saya siap membantu, Bosku"; doctorInfoBox.style.display = 'block'; welcomeMessage = "Selamat datang, Bosku. Saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu? Anda juga bisa mengirim foto, misalnya foto ruam kulit atau kemasan obat."; } 
        else { headerTitle.textContent = "Asisten Pribadi"; headerSubtitle.textContent = "Siap melayani, Bosku"; welcomeMessage = "Selamat datang, Bosku. Saya, asisten pribadi Anda, siap mendengarkan. Ada yang bisa saya bantu? Silakan kirim teks atau gambar."; }
        displayMessage(welcomeMessage, 'ai');
        speakAsync(welcomeMessage);
        updateButtonVisibility();
    }
    
    // --- AWAL FUNGSI BARU UNTUK GAMBAR ---
    function handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedImageData = e.target.result; // Simpan data base64
            // Tampilkan preview gambar di chat
            displayMessageWithImagePreview(uploadedImageData);
            userInput.placeholder = "Ajukan pertanyaan tentang gambar ini...";
            userInput.focus();
        };
        reader.readAsDataURL(file);
        imageInput.value = ''; // Reset input file
    }

    function displayMessageWithImagePreview(imageData) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', 'user-message');
        
        const img = document.createElement('img');
        img.src = imageData;
        img.classList.add('image-preview');
        
        messageElement.appendChild(img);
        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    // --- AKHIR FUNGSI BARU UNTUK GAMBAR ---

    async function handleSendMessage() {
        if (isRecording || isTesting) return;
        const userText = userInput.value.trim();
        if (!userText && !uploadedImageData) return; // Jangan kirim jika tidak ada teks atau gambar

        // Hapus preview gambar jika ada
        const preview = chatContainer.querySelector('.user-message:last-child .image-preview');
        if (preview) {
            preview.parentElement.remove();
        }
        
        handleSendMessageWithText(userText, uploadedImageData);
        userInput.value = '';
        userInput.style.height = 'auto';
        userInput.placeholder = "Tulis pesan untuk saya, Bosku...";
        uploadedImageData = null; // Reset setelah dikirim
    }

    async function handleSendMessageWithText(text, imageData = null) {
        // Logika tes tidak diubah
        if (isTesting) { /* ... */ return; }

        conversationHistory.push({ role: 'user', text: text });
        displayMessage(text, 'user', imageData); // Kirim gambar ke displayMessage
        updateButtonVisibility();
        await getAIResponse(text, imageData);
    }
    
    async function getAIResponse(prompt, imageData = null) {
        abortController = new AbortController();
        
        // --- PENYEMPURNAAN: Tampilkan indikator loading ---
        const loadingMessageId = `loading-${Date.now()}`;
        displayMessage("...", 'ai', null, true, loadingMessageId);
        statusDiv.textContent = "Saya sedang memproses...";
        // --- AKHIR PENYEMPURNAAN ---

        updateButtonVisibility();

        try {
            const payload = { 
                prompt, 
                history: conversationHistory, 
                mode: currentMode 
            };
            if (imageData) {
                // Hanya kirim data base64-nya, tanpa prefix
                payload.imageData = imageData.split(',')[1];
            }

            const apiResponse = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: abortController.signal
            });
            if (!apiResponse.ok) throw new Error(`Server error: ${apiResponse.status}`);
            
            const result = await apiResponse.json();
            
            // --- PENYEMPURNAAN: Hapus loading dan tampilkan hasil ---
            const loadingElement = document.getElementById(loadingMessageId);
            if (loadingElement) {
                loadingElement.remove();
            }
            // --- AKHIR PENYEMPURNAAN ---

            const responseText = result.aiText || (result.generatedImage ? "Berikut hasilnya, Bosku." : "Maaf, Bosku. Bisa diulangi lagi?");
            
            if (responseText || result.generatedImage) {
                conversationHistory.push({ role: 'ai', text: responseText });
                displayMessage(responseText, 'ai', result.generatedImage);
                await speakAsync(responseText);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
               const loadingElement = document.getElementById(loadingMessageId);
               if (loadingElement) loadingElement.remove();
               displayMessage(`Maaf, Bosku, ada gangguan koneksi atau respons dibatalkan.`, 'ai-system');
            }
        } finally {
            abortController = null;
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }
    
    function speakAsync(text) { /* Fungsi ini tidak diubah */ return new Promise(resolve => resolve()); }

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isThinking = !!abortController;
        const isInputDisabled = isTesting || isRecording || isThinking;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isTesting ? "Jawab melalui tombol..." : (isRecording ? "Mendengarkan..." : "Tulis pesan untuk saya, Bosku...");
        
        // --- PENYEMPURNAAN: Logika visibilitas tombol ---
        if (isInputDisabled) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'none';
            uploadBtn.style.display = 'none';
        } else if (isTyping || uploadedImageData) { // Tampilkan send jika ada teks ATAU gambar
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
            uploadBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
            uploadBtn.style.display = 'flex';
        }
        
        voiceBtn.disabled = isThinking || isTesting;
        uploadBtn.disabled = isThinking || isTesting;
        // --- AKHIR PENYEMPURNAAN ---
    }

    function handleCancelResponse() { /* Fungsi ini tidak diubah */ }
    function toggleMainRecording() { /* Fungsi ini tidak diubah */ }
    function simpleMarkdownToHTML(text) { /* Fungsi ini tidak diubah */ return text; }

    function displayMessage(message, sender, imageData = null, isLoading = false, elementId = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        if (elementId) {
            messageElement.id = elementId;
        }

        // --- PENYEMPURNAAN: Menangani tampilan gambar dan loading ---
        if (isLoading) {
            const spinner = document.createElement('div');
            spinner.className = 'loading-spinner';
            messageElement.appendChild(spinner);
        } else {
            // Tampilkan gambar jika ada (baik dari user atau AI)
            if (imageData) {
                const img = document.createElement('img');
                img.src = imageData;
                // Beri kelas berbeda untuk preview user dan gambar dari AI
                img.className = sender === 'user' ? 'image-preview' : 'ai-image-display';
                messageElement.appendChild(img);
            }

            // Proses teks pesan
            const buttonRegex = /\[(PILIHAN|TOMBOL):(.*?)\]/g;
            const buttons = [...message.matchAll(buttonRegex)];
            const cleanMessage = message.replace(buttonRegex, '').trim();
            
            if (cleanMessage) {
                const textElement = document.createElement('div');
                textElement.innerHTML = simpleMarkdownToHTML(cleanMessage);
                messageElement.appendChild(textElement);
            }

            // Proses tombol (jika ada)
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
        }
        // --- AKHIR PENYEMPURNAAN ---

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Fungsi-fungsi tes kepribadian tidak diubah
    function initiateTestSelection() { /* ... */ }
    function startActualTest(type) { /* ... */ }
    function displayNextTestQuestion() { /* ... */ }
    function processTestAnswer(choice) { /* ... */ }
    function calculateAndDisplayResult(stifinDrive = null) { /* ... */ }

    init();
});
