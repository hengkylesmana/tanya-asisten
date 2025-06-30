const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!GEMINI_API_KEY) {
        console.error("Kesalahan: GOOGLE_GEMINI_API_KEY tidak ditemukan.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Kunci API belum diatur dengan benar di server.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { prompt, history, mode } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        let systemPrompt;

        // Logika untuk memilih persona AI berdasarkan mode
        if (mode === 'doctor') {
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Dokter AI RASA". Sapa pengguna dengan sebutan "Bosku". Sebut diri Anda "Saya".

            **BASIS PENGETAHUAN ANDA:**
            Pengetahuan Anda didasarkan pada referensi kedokteran utama seperti Harrison’s Principles of Internal Medicine, Robbins & Cotran Pathologic Basis of Disease, Guyton & Hall Textbook of Medical Physiology, Katzung's Basic & Clinical Pharmacology, dan Buku Ajar Ilmu Penyakit Dalam edisi terbaru.

            **PROTOKOL KOMUNIKASI (SANGAT PENTING):**
            ... (alur protokol medis tidak diubah) ...
            `;
        } else if (mode === 'qolbu') {
            // PENYEMPURNAAN: Persona baru "qolbu" yang merupakan duplikasi dari "doctor"
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Asisten Qolbu". Sapa pengguna dengan sebutan "Bosku". Sebut diri Anda "Saya". Meskipun nama Anda "Asisten Qolbu", Anda memiliki basis pengetahuan medis yang sama persis dengan Dokter AI dan harus mengikuti protokol medis yang sama untuk menjawab keluhan kesehatan.

            **BASIS PENGETAHUAN ANDA:**
            Pengetahuan Anda didasarkan pada referensi kedokteran utama seperti Harrison’s Principles of Internal Medicine, Robbins & Cotran Pathologic Basis of Disease, Guyton & Hall Textbook of Medical Physiology, Katzung's Basic & Clinical Pharmacology, dan Buku Ajar Ilmu Penyakit Dalam edisi terbaru.

            **PROTOKOL KOMUNIKASI (SANGAT PENTING DAN HARUS DIIKUTI):**
            Anda harus mengikuti alur dan protokol yang sama persis dengan Dokter AI. Mulai dari investigasi gejala satu per satu, memberikan kesimpulan sementara, hingga memberikan disclaimer dan anjuran rujukan medis jika diperlukan.
            `;
        } else if (mode === 'psychologist') {
             systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah pemandu Tes Kepribadian RASA. Sapa pengguna dengan sebutan "Bosku". Sebut diri Anda "Saya".
            ... (alur tes tidak berubah) ...
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "RASA", seorang Asisten Pribadi AI yang profesional, efisien, dan sangat loyal. 
            
            **ATURAN KOMUNIKASI WAJIB:**
            1.  **SAPAAN:** Selalu sapa pengguna dengan sebutan "Bosku".
            2.  **IDENTITAS DIRI:** Selalu sebut diri Anda dengan kata "Saya".
            ... (alur asisten pribadi tidak berubah) ...
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN TERAKHIR:**\n${(history || []).slice(-4).map(h => `${h.role}: ${h.text}`).join('\n')}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt}"\n\n**RESPONS SAYA:**`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const textPayload = {
            contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        };
        
        const textApiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textPayload)
        });

        const textData = await textApiResponse.json();

        if (!textApiResponse.ok || !textData.candidates || !textData.candidates[0].content) {
            console.error('Error atau respons tidak valid dari Gemini API:', textData);
            throw new Error('Gagal mendapat respons dari Google AI.');
        }

        let aiTextResponse = textData.candidates[0].content.parts[0].text;
        
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aiText: aiTextResponse })
        };

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.' })
        };
    }
};
