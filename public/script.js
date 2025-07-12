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
    
    const qolbuInfoBox = document.getElementById('qolbu-info-box');
    const qolbuInfoClose = document.getElementById('qolbu-info-close');
    const doctorInfoBox = document.getElementById('doctor-info-box');
    const doctorInfoClose = document.getElementById('doctor-info-close');

    // PENYEMPURNAAN: Elemen untuk fungsionalitas upload gambar
    const uploadBtn = document.getElementById('upload-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');

    // State aplikasi
    let conversationHistory = []; 
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;
    let currentMode = 'assistant';
    let attachedImage = null; // PENYEMPURNAAN: State untuk menyimpan gambar yang akan dikirim

    // State untuk Tes Kepribadian
    let isTesting = false;
    let currentTestType = null;
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;

    // Basis Data Kecerdasan Tes (tidak diubah, tetap sama)
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
            results: { /* ... data hasil STIFin tidak diubah ... */ }
        },
        mbti: {
            questions: [ /* ... data pertanyaan MBTI tidak diubah ... */ ],
            results: { /* ... data hasil MBTI tidak diubah ... */ }
        }
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
        
        // PENYEMPURNAAN: Event listener untuk tombol dan input upload
        uploadBtn.addEventListener('click', () => imageUploadInput.click());
        imageUploadInput.addEventListener('change', handleImageSelection);

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
        clearImagePreview(); // Pastikan preview bersih saat mulai
        
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
            welcomeMessage = "Assalamualaikum, Bosku. Saya Asisten Qolbu siap membantu.";
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
    
    // --- FUNGSI BARU UNTUK MENGELOLA GAMBAR ---

    /**
     * Menangani pemilihan file gambar. Membaca file sebagai Base64 dan menampilkannya di preview.
     * @param {Event} event - Event dari input file.
     */
    function handleImageSelection(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            attachedImage = e.target.result;
            displayImagePreview(attachedImage);
            updateButtonVisibility();
        };
        reader.readAsDataURL(file);
        
        // Reset input value agar bisa memilih file yang sama lagi jika dibatalkan
        event.target.value = null;
    }

    /**
     * Menampilkan thumbnail gambar yang dipilih di area input.
     * @param {string} imageData - String Base64 dari gambar.
     */
    function displayImagePreview(imageData) {
        imagePreviewContainer.innerHTML = ''; // Bersihkan preview sebelumnya
        
        const previewImg = document.createElement('img');
        previewImg.src = imageData;
        previewImg.className = 'image-preview';

        const closeBtn = document.createElement('span');
        closeBtn.className = 'preview-close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = clearImagePreview;

        imagePreviewContainer.appendChild(previewImg);
        imagePreviewContainer.appendChild(closeBtn);
        imagePreviewContainer.style.display = 'block';
    }

    /**
     * Membersihkan preview gambar dan mereset state gambar.
     */
    function clearImagePreview() {
        attachedImage = null;
        imagePreviewContainer.innerHTML = '';
        imagePreviewContainer.style.display = 'none';
        updateButtonVisibility();
    }

    // --- AKHIR FUNGSI BARU ---
    
    async function handleSendMessage() {
        if (isRecording || isTesting) return;
        const userText = userInput.value.trim();
        // Kirim pesan jika ada teks ATAU ada gambar yang dilampirkan
        if (!userText && !attachedImage) return;

        handleSendMessageWithText(userText, attachedImage);
        userInput.value = '';
        userInput.style.height = 'auto';
        clearImagePreview();
    }

    async function handleSendMessageWithText(text, image = null) {
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

        // PENYEMPURNAAN: Tampilkan gambar di chat jika ada
        if (image) {
            displayMessage(image, 'user-image');
        }
        // Tampilkan teks jika ada
        if (text) {
            conversationHistory.push({ role: 'user', text: text });
            displayMessage(text, 'user');
        }
        
        updateButtonVisibility();
        await getAIResponse(text, image);
    }
    
    async function getAIResponse(prompt, image = null) {
        abortController = new AbortController();
        statusDiv.textContent = "Saya sedang berpikir...";
        updateButtonVisibility();

        try {
            // PENYEMPURNAAN: Kirim data gambar ke backend
            const payload = {
                prompt,
                history: conversationHistory,
                mode: currentMode,
                imageData: image
            };

            const apiResponse = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
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
        // Fungsi speakAsync tidak diubah
        return new Promise((resolve) => {
             if (!('speechSynthesis' in window) || isTesting) {
                resolve();
                return;
            }
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text.replace(/\[(ARAB|TOMBOL|PILIHAN):.*?\]/g, '').replace(/[*#_]/g, ''));
            utterance.lang = 'id-ID';
            utterance.onend = () => resolve();
            utterance.onerror = (e) => { console.error("Speech synthesis error:", e); resolve(); };
            window.speechSynthesis.speak(utterance);
        });
    }

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isThinking = !!abortController;
        const isImageAttached = !!attachedImage;
        const isInputDisabled = isTesting || isRecording || isThinking;
        const canShowUpload = !isTesting && !isThinking && !isRecording && !isImageAttached;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isTesting ? "Jawab melalui tombol..." : (isRecording ? "Mendengarkan..." : "Tulis pesan untuk saya, Bosku...");

        sendBtn.style.display = (isTyping || isImageAttached) && !isInputDisabled ? 'flex' : 'none';
        voiceBtn.style.display = !isTyping && !isImageAttached && !isInputDisabled ? 'flex' : 'none';
        uploadBtn.style.display = canShowUpload ? 'flex' : 'none';
        
        voiceBtn.disabled = isThinking || isTesting;
        uploadBtn.disabled = isThinking || isTesting;
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
        if (isTesting) return; 
        if (isRecording) {
            recognition.stop();
        } else {
            if ('speechSynthesis'in window) window.speechSynthesis.cancel();
            recognition.start();
        }
    }

    function simpleMarkdownToHTML(text) {
        // Fungsi ini tidak diubah
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
        let html = text
            .replace(/\[ARAB\](.*?)\[\/ARAB\]/g, '<span class="arabic-text" dir="rtl">$1</span>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/_(.*?)_/g, '<i>$1</i>')
            .replace(/###\s*(.*)/g, '<h3>$1</h3>')
            .replace(/---\n/g, '<hr>')
            .replace(markdownLinkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');
        return html.replace(/\n/g, '<br>');
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);

        // PENYEMPURNAAN: Menangani pesan gambar
        if (sender === 'user-image') {
            const img = document.createElement('img');
            img.src = message;
            messageElement.appendChild(img);
        } else {
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
        }

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // Fungsi-fungsi tes kepribadian tidak diubah
    function initiateTestSelection() { /* ... tidak diubah ... */ }
    function startActualTest(type) { /* ... tidak diubah ... */ }
    function displayNextTestQuestion() { /* ... tidak diubah ... */ }
    function processTestAnswer(choice) { /* ... tidak diubah ... */ }
    function calculateAndDisplayResult(stifinDrive = null) { /* ... tidak diubah ... */ }
    
    init();
});
