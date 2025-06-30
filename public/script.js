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
    let currentMode = 'assistant';

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
                const transcript = event.results[0][0].transcript;
                userInput.value = transcript;
                updateButtonVisibility();
                handleSendMessage();
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
        } else { // All other modes
            isTesting = mode.isTest || false;
            currentMode = mode.isTest ? 'psychologist' : (mode.isDoctor ? 'doctor' : 'assistant');
            headerTitle.textContent = mode.isTest ? "Tes Kepribadian" : (mode.isDoctor ? "Tanya ke Dokter AI" : "Asisten Pribadi");
            headerSubtitle.textContent = mode.isTest ? "Saya akan memandu Anda, Bosku" : (mode.isDoctor ? "Saya siap membantu, Bosku" : "Siap melayani, Bosku");
            if(mode.isDoctor) doctorInfoBox.style.display = 'block';

            const welcomeMessage = mode.isTest ? `Selamat datang di Tes Kepribadian, Bosku.\n\n[PILIHAN:Pendekatan STIFIn|Pendekatan MBTI]` : (mode.isDoctor ? "Selamat datang, Bosku. Saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu?" : "Selamat datang, Bosku. Saya, asisten pribadi Anda, siap mendengarkan. Ada yang bisa saya bantu?");
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage.split('[PILIHAN')[0], true);
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
                resolve();
                return;
            }

            const doSpeak = () => {
                window.speechSynthesis.cancel();
                
                const textForSpeech = text.replace(/\[[^\]]+\]/g, ''); // Hapus semua tag [TAG:...]
                
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

    function handleCancelResponse() {
        if (abortController) abortController.abort();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        if (recognition && isRecording) recognition.stop();
        statusDiv.textContent = "Dibatalkan.";
        setTimeout(() => { statusDiv.textContent = ""; }, 2000);
        updateButtonVisibility();
    }

    function toggleMainRecording() {
        if (!recognition) return;
        if (isRecording) {
            recognition.stop();
        } else {
            if ('speechSynthesis'in window) window.speechSynthesis.cancel();
            recognition.start();
        }
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);

        let formattedMessage = message.replace(/\n/g, '<br>');

        // Regex untuk semua jenis tombol
        const buttonRegex = /\[(PILIHAN|TOMBOL):(.*?)\]/g;
        const buttons = [...formattedMessage.matchAll(buttonRegex)];
        
        if (buttons.length > 0) {
            formattedMessage = formattedMessage.replace(buttonRegex, '').trim();
            const choiceContainer = document.createElement('div');
            choiceContainer.className = 'choice-container';
            
            buttons.forEach(match => {
                const type = match[1]; // PILIHAN atau TOMBOL
                const text = match[2]; // Isi dari tombol
                
                if (type === 'PILIHAN') {
                    text.split('|').forEach(choice => {
                        const button = document.createElement('button');
                        button.className = 'choice-button';
                        button.textContent = choice.trim();
                        button.onclick = () => {
                            choiceContainer.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
                            button.classList.add('selected');
                            displayMessage(choice.trim(), 'user');
                            getAIResponse(choice.trim());
                        };
                        choiceContainer.appendChild(button);
                    });
                } else if (type === 'TOMBOL') {
                    const button = document.createElement('button');
                    button.className = 'choice-button';
                    button.textContent = text.trim();
                    button.onclick = () => {
                        button.disabled = true;
                        button.classList.add('selected');
                        // Kirim prompt spesifik untuk meminta penjelasan lebih lanjut
                        handleSendMessageWithText(text.trim());
                    };
                    choiceContainer.appendChild(button);
                }
            });
            messageElement.innerHTML = formattedMessage;
            messageElement.appendChild(choiceContainer);
        } else {
            messageElement.innerHTML = formattedMessage;
        }

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Fungsi helper untuk mengirim pesan secara internal
    function handleSendMessageWithText(text) {
        conversationHistory.push({ role: 'user', text: text });
        displayMessage(text, 'user');
        getAIResponse(text);
    }
    
    init();
});
