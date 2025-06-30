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

    const fullTestData = { /* Data tes tidak berubah */ };
    
    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg failed: ', err));
            });
        }
        loadVoices();
        displayInitialMessage();
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
        qolbuInfoBox.style.display = 'none';
        
        if (mode.isQolbu) {
            currentMode = 'qolbu';
            headerTitle.textContent = "Asisten Qolbu";
            headerSubtitle.textContent = "Menjawab dengan Rujukan Islami";
            qolbuInfoBox.style.display = 'block';
            isTesting = false; 
            // PENYEMPURNAAN: Sapaan awal untuk teks dan suara diperbarui
            const welcomeMessage = "Assalamualaikum, Bosku. Saya hadir sebagai Asisten Qolbu, yang dengan izin Allah, siap membantu menjawab, menelusuri dan menyajikan rujukan Islami yang Anda dibutuhkan.";
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
    
    // Fungsi-fungsi lain tidak diubah
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
                displayMessage(responseText, 'ai');
                await speakAsync(responseText, true);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
               displayMessage(`Maaf, Bosku, ada gangguan koneksi.`, 'ai-system');
            }
        } finally {
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }
    
    // Sisa fungsi (handleSendMessageWithChoice, updateButtonVisibility, TTS, dll) tetap sama
    function handleSendMessageWithChoice(choice) { /* ... */ }
    function updateButtonVisibility() { /* ... */ }
    function handleCancelResponse() { /* ... */ }
    function toggleMainRecording() { /* ... */ }
    function startRecording() { /* ... */ }
    function stopRecording() { /* ... */ }
    function loadVoices() { /* ... */ }
    function speakAsync(text, isAIResponse = false) { /* ... */ }
    function displayInitialMessage() { /* ... */ }
    function displayMessage(message, sender) { /* ... */ }
    
    init();
});
