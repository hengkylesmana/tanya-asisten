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
    
    // PERBAIKAN: Mengambil elemen info box dan tombol tutupnya
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
        
        // PERBAIKAN: Menambahkan kembali event listener untuk tombol tutup
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
            recognition.onresult = (event) => { userInput.value = event.results[0][0].transcript; updateButtonVisibility(); handleSendMessage(); };
            recognition.onstart = () => { isRecording = true; voiceBtn.classList.add('recording'); statusDiv.textContent = "Saya mendengarkan..."; updateButtonVisibility(); };
            recognition.onend = () => { isRecording = false; voiceBtn.classList.remove('recording'); statusDiv.textContent = ""; updateButtonVisibility(); };
            recognition.onerror = (event) => { console.error("Speech recognition error", event.error); statusDiv.textContent = "Maaf, saya tidak bisa mendengar."; };
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
            welcomeMessage = `Selamat datang di Tes Kepribadian, Bosku.\n\n[PILIHAN:Pendekatan STIFIn|Pendekatan MBTI]`;
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
    
    async function handleSendMessage() {
        if (isRecording || isTesting) return;
        const userText = userInput.value.trim();
        if (!userText) return;
        handleSendMessageWithText(userText);
        userInput.value = '';
        userInput.style.height = 'auto';
    }

    async function handleSendMessageWithText(text) {
        conversationHistory.push({ role: 'user', text: text });
        displayMessage(text, 'user');
        updateButtonVisibility();
        await getAIResponse(text);
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
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                resolve();
                return;
            }
            window.speechSynthesis.cancel();

            const utteranceQueue = [];
            const parts = text.split(/(\[ARAB\].*?\[\/ARAB\])/g);

            parts.forEach(part => {
                if (part.startsWith('[ARAB]')) {
                    const arabicText = part.substring(6, part.length - 7);
                    if (arabicText.trim()) {
                        const utterance = new SpeechSynthesisUtterance(arabicText);
                        utterance.lang = 'ar-SA';
                        utteranceQueue.push(utterance);
                    }
                } else {
                    const cleanPart = part.replace(/\[(TOMBOL|PILIHAN):.*?\]/g, '').replace(/[*#]/g, '');
                    if (cleanPart.trim()) {
                        const utterance = new SpeechSynthesisUtterance(cleanPart);
                        utterance.lang = 'id-ID';
                        utteranceQueue.push(utterance);
                    }
                }
            });

            if (utteranceQueue.length === 0) {
                resolve();
                return;
            }

            let currentIndex = 0;
            const speakNext = () => {
                if (currentIndex >= utteranceQueue.length) {
                    resolve();
                    return;
                }
                const currentUtterance = utteranceQueue[currentIndex];
                currentUtterance.onend = () => {
                    currentIndex++;
                    speakNext();
                };
                currentUtterance.onerror = (e) => {
                    console.error("Speech synthesis error:", e);
                    currentIndex++;
                    speakNext();
                };
                window.speechSynthesis.speak(currentUtterance);
            };
            
            if (window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.onvoiceschanged = speakNext;
            } else {
                speakNext();
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

    function simpleMarkdownToHTML(text) {
        let html = text
            .replace(/\[ARAB\](.*?)\[\/ARAB\]/g, '<span class="arabic-text" dir="rtl">$1</span>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/_(.*?)_/g, '<i>$1</i>');

        const lines = html.split('\n');
        let inList = false;
        html = lines.map(line => {
            if (line.trim().startsWith('- ')) {
                if (!inList) {
                    inList = true;
                    return '<ul><li>' + line.trim().substring(2) + '</li>';
                }
                return '<li>' + line.trim().substring(2) + '</li>';
            } else {
                if (inList) {
                    inList = false;
                    return '</ul>' + line;
                }
                return line;
            }
        }).join('<br>');

        if (inList) {
            html += '</ul>';
        }
        
        return html.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);

        const buttonRegex = /\[(TOMBOL|PILIHAN):(.*?)\]/g;
        const buttons = [...message.matchAll(buttonRegex)];
        const cleanMessage = message.replace(buttonRegex, '').trim();
        
        messageElement.innerHTML = simpleMarkdownToHTML(cleanMessage);

        if (buttons.length > 0) {
            const choiceContainer = document.createElement('div');
            choiceContainer.className = 'choice-container';
            buttons.forEach(match => {
                const text = match[2];
                const button = document.createElement('button');
                button.className = 'choice-button';
                button.textContent = text.trim();
                button.onclick = () => {
                    choiceContainer.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
                    button.classList.add('selected');
                    handleSendMessageWithText(text.trim());
                };
                choiceContainer.appendChild(button);
            });
            messageElement.appendChild(choiceContainer);
        }

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    init();
});
