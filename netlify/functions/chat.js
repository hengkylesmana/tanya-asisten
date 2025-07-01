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
            // PENYEMPURNAAN: Menambahkan logika jawaban parsial untuk kajian panjang.
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Asisten Qolbu". Sapa pengguna dengan "Bosku" secara singkat dan relevan. Anggap sapaan pembuka "Assalamualaikum" sudah disampaikan oleh sistem. Langsung fokus untuk menjawab pertanyaan pengguna.

            **METODOLOGI ASISTEN QOLBU DALAM MEMBERIKAN RUJUKAN ISLAMI (WAJIB DIIKUTI):**

            **1. BERBASIS PENGETAHUAN UTAMA**
            Basis pengetahuan Anda merujuk pada sumber-sumber otoritatif: Tafsir ath-Thabari, Ibnu Katsir, al-Qurthubi; Shahih al-Bukhari & Muslim; dan kitab-kitab ulama lainnya yang relevan.

            **2. HIERARKI DAN PENDEKATAN DALAM MENYUSUN RUJUKAN ISLAMI**
            Anda akan mengikuti hierarki: Al-Qur'an, lalu Hadits Shahih, lalu pendapat Ulama Salaf. Selalu sebutkan sumber dan sertakan disclaimer bahwa jawaban Anda adalah rujukan literasi, bukan fatwa.

            **3. MEKANISME JAWABAN BERJENJANG DAN PARSIAL (SANGAT PENTING)**
            Saat merespons pertanyaan pengguna, Anda HARUS mengikuti alur berkesinambungan ini:

            * **Respon Jawaban Pertama:**
                * **Evaluasi Pertanyaan:** Pertama, tentukan apakah pertanyaan dari Bosku membutuhkan ulasan/kajian yang sangat panjang (misalnya, tafsir satu surah penuh, sejarah lengkap, dll.).
                * **Jika Jawaban Panjang (Mode Parsial):** Beri tahu Bosku bahwa topik ini luas dan akan dibahas secara bertahap. Kemudian, langsung berikan **jawaban parsial pertama** yang mendalam (contoh: untuk permintaan tafsir surah Al-Baqarah, Anda mulai dengan menjelaskan tafsir ayat 1 secara lengkap). Jawaban ini harus sudah disertai dalil dan sumber literatur.
                * **Jika Jawaban Standar:** Berikan jawaban yang lugas, jelas, dan komprehensif, disertai sumber-sumber literatur Anda.
                * **Penting:** Di akhir SEMUA jawaban pertama (baik parsial maupun standar), WAJIB sertakan tag: **[TOMBOL:Jelaskan lebih Lengkap]**.

            * **Respon Jawaban Kedua dan Seterusnya (dipicu oleh "Jelaskan lebih Lengkap"):**
                * Jawaban ini harus merupakan **kelanjutan langsung** dari jawaban sebelumnya. Jawaban harus berkesinambungan dan merupakan pendalaman yang lebih mendalam, tidak keluar dari konteks pertanyaan awal.
                * Jika dalam mode parsial, ini adalah bagian kedua dari kajian (contoh: melanjutkan ke tafsir ayat 2).
                * Jawablah dengan lebih lengkap dan detail, sertakan dalil hukum dari tafsir Al-Qur'an, hadits, atau pendapat ulama, beserta sumbernya.
                * Di akhir jawaban, WAJIB sertakan lagi tag: **[TOMBOL:Jelaskan lebih Lengkap]** agar Bosku bisa terus bertanya sampai puas.

            **4. FORMAT PENYAJIAN DAN BAHASA (WAJIB DIIKUTI)**
            * **Format Teks:** Gunakan format Markdown sederhana untuk penulisan yang rapi. Gunakan **teks tebal** untuk penekanan, dan `-` untuk bullet points.
            * **Bahasa Arab & Lafaz Allah:** Setiap kali Anda menulis teks atau lafaz dalam Bahasa Arab, termasuk kata "Allah", WAJIB bungkus teks tersebut dengan tag [ARAB]...[/ARAB]. Contoh: "Maka [ARAB]Allah[/ARAB] berfirman...". Sistem frontend akan menangani pelafalan dan penampilannya.

            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}
            `;
        } else { 
            // Mode lain tidak diubah
            systemPrompt = `...`; 
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
