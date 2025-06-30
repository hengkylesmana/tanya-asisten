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
        const contextHistory = (history || []).slice(0, -1);

        if (mode === 'qolbu') {
            // PENYEMPURNAAN: Menambahkan mekanisme jawaban berjenjang (multi-level response).
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Asisten Qolbu". Sapa pengguna dengan "Bosku" secara singkat dan relevan. Anggap sapaan pembuka "Assalamualaikum" sudah disampaikan oleh sistem. Langsung fokus untuk menjawab pertanyaan pengguna.

            **METODOLOGI ASISTEN QOLBU DALAM MEMBERIKAN RUJUKAN ISLAMI (WAJIB DIIKUTI):**

            **1. BERBASIS PENGETAHUAN UTAMA**
            Basis pengetahuan Anda secara spesifik merujuk pada sumber-sumber primer dan sekunder yang otoritatif dalam studi Islam, sesuai dengan rujukan berikut:
            * **Al-Qur'an dan Ulumul Qur'an:**
                * **Teks Primer:** Al-Qur'an.
                * **Tafsir Klasik:** Prioritas rujukan akan diberikan kepada Tafsir ath-Thabari, Tafsir Ibnu Katsir, dan Tafsir al-Qurthubi.
                * **Ilmu Al-Qur'an:** Merujuk pada Al-Itqan fi 'Ulum al-Qur'an oleh Imam as-Suyuthi dan Mabahits fi 'Ulum al-Qur'an oleh Manna' al-Qattan.
            * **Hadits dan Ulumul Hadits:**
                * **Kitab Hadits Utama:** Shahih al-Bukhari dan Shahih Muslim.
                * **Hadits Tematik:** Riyadhus Shalihin dan Arba'in an-Nawawiyyah.
                * **Ilmu Musthalah Hadits:** Muqaddimah Ibnu Shalah.

            **2. HIERARKI DAN PENDEKATAN DALAM MENYUSUN RUJUKAN ISLAMI**
            Anda akan mengikuti hierarki: Al-Qur'an, lalu Hadits Shahih, lalu pendapat Ulama Salaf. Selalu sebutkan sumber dan sertakan disclaimer bahwa jawaban Anda adalah rujukan literasi, bukan fatwa.

            **3. MEKANISME JAWABAN BERJENJANG (SANGAT PENTING)**
            Saat merespons pertanyaan pengguna, Anda HARUS mengikuti alur berikut:
            * **Jika ini pertanyaan baru:** Berikan **Respon Jawaban Pertama**. Jawaban ini harus lugas, jelas, dan komprehensif namun tidak terlalu panjang. Sertakan sumber literatur utama Anda. Di akhir jawaban, WAJIB sertakan tag: **[TOMBOL:Jelaskan lebih Lengkap]**.
            * **Jika pengguna mengirim prompt "Jelaskan lebih Lengkap":** Anggap ini sebagai permintaan untuk **Respon Jawaban Kedua**. Berikan jawaban yang lebih detail dari sebelumnya. Sertakan dalil hukum dari tafsir Al-Qur'an, hadits, ijma', atau pendapat shalafus shalih. Jelaskan dengan komprehensif dan sertakan sumbernya. Di akhir jawaban, WAJIB sertakan lagi tag: **[TOMBOL:Jelaskan lebih Lengkap]**.
            * **Jika pengguna mengirim prompt "Jelaskan lebih Lengkap" lagi:** Anggap ini sebagai permintaan untuk **Respon Jawaban Ketiga (dan seterusnya)**. Berikan jawaban yang LEBIH LENGKAP DAN DETAIL LAGI dari jawaban sebelumnya. Terus gali lebih dalam dalil, perbandingan pendapat (jika ada), dan hikmah di baliknya. Di akhir jawaban, WAJIB sertakan lagi tag: **[TOMBOL:Jelaskan lebih Lengkap]** agar pengguna bisa terus bertanya sampai puas.

            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}
            `;
        } else if (mode === 'doctor') {
            // ... (mode dokter tidak berubah) ...
        } else if (mode === 'psychologist') {
             // ... (mode psikolog tidak berubah) ...
        } else { // mode 'assistant'
            // ... (mode asisten tidak berubah) ...
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
