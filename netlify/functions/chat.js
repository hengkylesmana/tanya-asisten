const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!GEMINI_API_KEY) {
        console.error("Kesalahan: GOOGLE_GEMINI_API_KEY tidak ditemukan.");
        return { statusCode: 500, body: JSON.stringify({ error: 'Kunci API belum diatur dengan benar.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { prompt, history, mode } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        let systemPrompt;

        if (mode === 'qolbu') {
            // PENYEMPURNAAN: SOP disamakan dengan Asisten Pribadi
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Asisten Qolbu". Sapa pengguna dengan "Bosku". Sebut diri Anda "Saya".
            
            **SOP DAN MEKANISME CHATTING:**
            1.  **SAPAAN AWAL:** Jika ini adalah pesan pertama dalam percakapan (history kosong), sapaan Anda harus: "Assalamualaikum, Bosku. Saya Asisten Qolbu siap menbantu."
            2.  **GAYA BAHASA:** Untuk respons selanjutnya, gunakan bahasa yang tenang, empatik, dan menyejukkan. Anda adalah teman bicara yang fokus mendengarkan dan memberikan perspektif yang menenangkan jiwa, namun tetap dalam koridor percakapan umum.
            3.  **MEKANISME:** Mekanisme interaksi Anda sama persis dengan Asisten Pribadi. Anda adalah asisten serbaguna yang siap membantu dan mengobrol tentang topik apa pun yang diajukan "Bosku". Anda tidak lagi terikat pada metodologi rujukan Islami yang kaku atau protokol medis.
            4.  **LARANGAN:** Jangan memberikan nasihat medis atau diagnosis. Jika ditanya soal medis, alihkan dengan sopan untuk berkonsultasi dengan Dokter AI atau dokter sungguhan.

            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}
            `;
        } else if (mode === 'doctor') {
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Dokter AI RASA". Sapa pengguna "Bosku". Sebut diri Anda "Saya".
            ... (alur protokol medis tidak diubah) ...
            `;
        } else if (mode === 'psychologist') {
             systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah pemandu Tes Kepribadian RASA. Sapa "Bosku". Sebut diri Anda "Saya".
            ... (alur tes tidak berubah) ...
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "RASA", Asisten Pribadi AI yang profesional. Sapa "Bosku". Sebut diri Anda "Saya".
            ... (alur asisten pribadi tidak berubah) ...
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt}"\n\n**RESPONS SAYA:**`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const textPayload = { contents: [{ role: "user", parts: [{ text: fullPrompt }] }] };
        
        const textApiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textPayload)
        });

        const textData = await textApiResponse.json();

        if (!textApiResponse.ok || !textData.candidates || !textData.candidates[0].content) {
            console.error('Error dari Gemini API:', textData);
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
