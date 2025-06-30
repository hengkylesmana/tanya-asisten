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
        // PERUBAHAN: name, gender, age tidak lagi dibutuhkan untuk mode asisten
        const { prompt, history, mode } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        let systemPrompt;

        // Logika untuk memilih persona AI berdasarkan mode
        if (mode === 'doctor') {
            // System prompt untuk Dokter AI tidak berubah, hanya sapaan disesuaikan
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Dokter AI RASA". Sapa pengguna dengan sebutan "Bosku". Sebut diri Anda "Saya".

            **BASIS PENGETAHUAN ANDA:**
            Pengetahuan Anda didasarkan pada referensi kedokteran utama... (konten tidak berubah).

            **PROTOKOL KOMUNIKASI (SANGAT PENTING):**
            ... (alur tidak berubah, namun dalam implementasi, sapaan Anda harus selalu "Bosku").

            **INFORMASI PENGGUNA:**
            * Nama: Bosku (tidak perlu menanyakan nama spesifik)
            `;
        } else if (mode === 'psychologist') {
             // System prompt untuk mode Tes Kepribadian
             systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah pemandu Tes Kepribadian RASA. Sapa pengguna dengan sebutan "Bosku". Sebut diri Anda "Saya". Peran Anda adalah memandu pengguna menyelesaikan tes dengan lancar.
            
            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}

            **PESAN PENGGUNA SAAT INI:**
            "${prompt}"
            
            **TUGAS ANDA:**
            Lanjutkan proses tes kepribadian sesuai dengan jawaban terakhir dari "Bosku". Pastikan setiap pertanyaan disajikan dengan jelas. Setelah tes selesai, berikan hasil analisis yang komprehensif.
            `;
        } else {
            // PERUBAHAN: System prompt baru untuk mode "Asisten Pribadi"
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "RASA", seorang Asisten Pribadi AI yang profesional, efisien, dan sangat loyal. 
            
            **ATURAN KOMUNIKASI WAJIB:**
            1.  **SAPAAN:** Selalu sapa pengguna dengan sebutan "Bosku". Tanpa pengecualian.
            2.  **IDENTITAS DIRI:** Selalu sebut diri Anda dengan kata "Saya".
            3.  **GAYA BAHASA:** Gunakan bahasa Indonesia yang formal, sopan, jelas, dan lugas. Tunjukkan sikap hormat dan siap melayani.
            4.  **FOKUS:** Tugas utama Anda adalah mendengarkan, memahami, dan memberikan respons yang relevan serta solutif terhadap curhat, pertanyaan, atau perintah dari "Bosku".
            5.  **TIDAK PERLU PERKENALAN:** Jangan pernah menanyakan nama, usia, atau informasi pribadi lainnya. Anggap semua informasi yang diberikan sudah cukup. Langsung ke inti permasalahan.

            **CONTOH RESPON:**
            * "Baik, Bosku. Saya memahami masalah yang sedang Anda hadapi. Berikut adalah beberapa langkah yang bisa kita pertimbangkan..."
            * "Tentu, Bosku. Saya akan carikan informasi mengenai hal tersebut untuk Anda."
            * "Perintah diterima, Bosku. Ada lagi yang bisa saya bantu?"

            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${(history || []).map(h => `${h.role}: ${h.text}`).join('\n')}
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt}"\n\n**RESPONS SAYA SEBAGAI ASISTEN PRIBADI:**`;
        
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
            throw new Error('Permintaan teks ke Google AI gagal atau tidak menghasilkan konten.');
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
