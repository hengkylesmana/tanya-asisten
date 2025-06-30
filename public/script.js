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
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    
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
    let isTesting = false;
    let currentTestType = null;
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;
    let currentMode = 'assistant';

    // Inisialisasi SpeechRecognition API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
    } else {
        console.log("Browser tidak mendukung Speech Recognition.");
        voiceBtn.style.display = 'none'; // Sembunyikan tombol jika tidak didukung
    }

    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg failed: ', err));
            });
        }
        updateButtonVisibility();

        // Event listener untuk tombol di layar awal
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

        // Event listener untuk SpeechRecognition
        if (recognition) {
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                userInput.value = transcript;
                updateButtonVisibility();
                handleSendMessage(); // Langsung kirim setelah transkrip didapat
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
        
        doctorInfoBox.style.display = 'none';
        qolbuInfoBox.style.display = 'none';
        
        if (mode.isQolbu) {
            currentMode = 'qolbu';
            headerTitle.textContent = "Asisten Qolbu";
            headerSubtitle.textContent = "Menjawab dengan Rujukan Islami";
            qolbuInfoBox.style.display = 'block';
            isTesting = false;
            const welcomeMessage = "Assalamualaikum, Bosku. Saya Asisten Qolbu siap menbantu.";
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage, true);
        } else if (mode.isTest) {
            currentMode = 'psychologist';
            headerTitle.textContent = "Tes Kepribadian";
            headerSubtitle.textContent = "Saya akan memandu Anda, Bosku";
            isTesting = true;
            currentTestType = 'selection';
            const introMessage = `Selamat datang di Tes Kepribadian, Bosku.\n\n[PILIHAN:Pendekatan STIFIn|Pendekatan MBTI]`;
            displayMessage(introMessage, 'ai');
            speakAsync("Selamat datang di tes kepribadian, Bosku. Silakan pilih pendekatan.", true);
        } else if (mode.isDoctor) {
            currentMode = 'doctor';
            headerTitle.textContent = "Tanya ke Dokter AI";
            headerSubtitle.textContent = "Saya siap membantu, Bosku";
            doctorInfoBox.style.display = 'block';
            isTesting = false;
            const welcomeMessage = "Selamat datang, Bosku. Saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu?";
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage, true);
        } else { // mode.isAssistant
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
    
    async function handleSendMessage() {
        if (isRecording || isTesting) return;
        const userText = userInput.value.trim();
        if (!userText) return;

        conversationHistory.push({ role: 'user', text: userText });
        displayMessage(userText, 'user');
        userInput.value = '';
        userInput.style.height = 'auto';
        updateButtonVisibility();
        
        await getAIResponse(userText);
    }
    
    async function getAIResponse(prompt) {
        abortController = new AbortController();
        statusDiv.textContent = "Saya sedang berpikir...";
        updateButtonVisibility();

        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, history: conversationHistory, mode: currentMode }),
                signal: abortController.signal
            });
            if (!apiResponse.ok) throw new Error(`Server error: ${apiResponse.status}`);
            const result = await apiResponse.json();
            const responseText = result.aiText || `Maaf, Bosku. Bisa diulangi lagi?`;
            
            if (responseText) {
                conversationHistory.push({ role: 'ai', text: responseText });
                displayMessage(responseText, 'ai');
                await speakAsync(responseText, true);
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
    
    function speakAsync(text, isAIResponse = false) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                console.warn("Speech Synthesis tidak didukung.");
                resolve();
                return;
            }

            const doSpeak = () => {
                window.speechSynthesis.cancel();
                
                const textForSpeech = text.replace(/\[[^\]]+\]\([^)]+\)/g, '') 
                                         .replace(/\[LINK:.*?\](.*?)\[\/LINK\]/g, '$1')
                                         .replace(/[*#]/g, '')
                                         .replace(/\bAI\b/g, 'E Ai');
                
                const utterance = new SpeechSynthesisUtterance(textForSpeech);
                utterance.lang = 'id-ID';
                utterance.rate = 0.95;
                utterance.pitch = 1;

                const voices = window.speechSynthesis.getVoices();
                let indonesianVoice = voices.find(v => v.lang === 'id-ID');
                if (indonesianVoice) utterance.voice = indonesianVoice;

                utterance.onend = () => resolve();
                utterance.onerror = (e) => {
                    console.error("Terjadi kesalahan pada sintesis suara:", e);
                    resolve(e);
                };
                window.speechSynthesis.speak(utterance);
            };

            if (window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.onvoiceschanged = doSpeak;
            } else {
                doSpeak();
            }
        });
    }

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isThinking = !!abortController;
        const isInputDisabled = isTesting || isRecording || isThinking;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isTesting ? "Jawab melalui tombol..." : (isRecording ? "Mendengarkan..." : "Tulis pesan untuk saya, Bosku...");

        if (isTyping && !isInputDisabled) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
        }
        
        voiceBtn.disabled = isThinking || isTesting;
    }

    /**
     * PENYEMPURNAAN: Fungsi untuk membatalkan respons AI (Tombol SKIP)
     */
    function handleCancelResponse() {
        // 1. Batalkan permintaan fetch jika sedang berjalan
        if (abortController) {
            abortController.abort();
            console.log("Permintaan Fetch dibatalkan.");
        }
        // 2. Hentikan sintesis suara yang sedang berjalan
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        // 3. Hentikan rekaman suara jika sedang berjalan
        if (recognition && isRecording) {
            recognition.stop();
        }
        statusDiv.textContent = "Dibatalkan.";
        setTimeout(() => { statusDiv.textContent = ""; }, 2000);
        updateButtonVisibility();
    }

    /**
     * PENYEMPURNAAN: Fungsi untuk memulai/menghentikan rekaman suara
     */
    function toggleMainRecording() {
        if (!recognition) return;

        if (isRecording) {
            recognition.stop();
        } else {
            // Hentikan dulu jika ada suara AI yang masih berjalan
            if ('speechSynthesis'in window) {
                window.speechSynthesis.cancel();
            }
            recognition.start();
        }
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);

        let formattedMessage = message.replace(/\n/g, '<br>');

        // Parsing kustom untuk link dan pilihan
        formattedMessage = formattedMessage.replace(/\[LINK:(.*?)\](.*?)\[\/LINK\]/g, '<a href="$1" target="_blank" class="chat-link">$2</a>');
        
        const choiceRegex = /\[PILIHAN:(.*?)\]/g;
        const choices = formattedMessage.match(choiceRegex);
        
        if (choices) {
            formattedMessage = formattedMessage.replace(choiceRegex, '');
            const choiceContainer = document.createElement('div');
            choiceContainer.className = 'choice-container';
            
            const choiceText = choices[0].replace('[PILIHAN:', '').replace(']', '');
            choiceText.split('|').forEach(choice => {
                const button = document.createElement('button');
                button.className = 'choice-button';
                button.textContent = choice.trim();
                button.onclick = () => {
                    // Nonaktifkan semua tombol pilihan setelah satu dipilih
                    choiceContainer.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
                    button.classList.add('selected');
                    // Kirim pilihan sebagai pesan pengguna
                    displayMessage(choice.trim(), 'user');
                    getAIResponse(choice.trim());
                };
                choiceContainer.appendChild(button);
            });
            messageElement.innerHTML = formattedMessage;
            messageElement.appendChild(choiceContainer);
        } else {
            messageElement.innerHTML = formattedMessage;
        }

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    init();
});
