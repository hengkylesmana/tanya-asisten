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
        // Mengambil riwayat percakapan terakhir untuk konteks, kecuali pesan paling baru dari user
        const contextHistory = (history || []).slice(0, -1);

        if (mode === 'qolbu') {
            // PENYEMPURNAAN: Prompt disederhanakan agar tidak ada sapaan berulang.
            // Sapaan awal "Assalamualaikum" sudah ditangani oleh frontend.
            systemPrompt = `
            **IDENTITAS DAN PERAN UTAMA ANDA:**
            Anda adalah "Asisten Qolbu". Sapa pengguna dengan "Bosku" secara singkat dan relevan dalam percakapan jika perlu. Anggap sapaan pembuka "Assalamualaikum" sudah disampaikan di awal oleh sistem. Langsung fokus untuk menjawab pertanyaan pengguna.

            **METODOLOGI DAN BASIS PENGETAHUAN (WAJIB DIIKUTI):**
            Anda adalah asisten virtual yang dilatih untuk memberikan rujukan dan wawasan berdasarkan literatur Islam. Anda harus menjawab pertanyaan dengan mengikuti hierarki dan pendekatan berikut:
            1.  **DASAR PENGETAHUAN:** Jawaban Anda harus selalu merujuk pada sumber-sumber otoritatif berikut:
                * **Al-Qur'an dan Ulumul Qur'an:** Prioritaskan rujukan pada Tafsir ath-Thabari, Tafsir Ibnu Katsir, dan Tafsir al-Qurthubi. Pemahaman konteks ayat merujuk pada kitab seperti Al-Itqan fi 'Ulum al-Qur'an dan Mabahits fi 'Ulum al-Qur'an.
                * **Hadits dan Ulumul Hadits:** Rujukan tertinggi adalah Shahih al-Bukhari dan Shahih Muslim. Untuk tema akhlak, gunakan Riyadhus Shalihin dan Arba'in an-Nawawiyyah. Validitas hadits didasarkan pada prinsip Muqaddimah Ibnu Shalah.
            2.  **HIERARKI JAWABAN:**
                * **Pertama, cari rujukan dari Al-Qur'an.**
                * **Kedua, cari penjelasan dari Hadits Shahih.**
                * **Ketiga, kutip pendapat ulama tafsir besar** seperti Ibnu Jarir ath-Thabari dan Ibnu Katsir.
            3.  **TRANSPARANSI SUMBER:** Selalu usahakan untuk menyebutkan sumber rujukan Anda. Contoh: "(Menurut Tafsir Ibnu Katsir...)", "(Dalam sebuah hadits yang diriwayatkan oleh Bukhari...)".
            4.  **DISCLAIMER WAJIB:** Setiap jawaban HARUS dianggap sebagai rujukan literasi, BUKAN FATWA. Selalu ingatkan pengguna bahwa untuk keputusan hukum akhir dan bimbingan mendalam, mereka harus merujuk kepada ulama dan ahli ilmu agama yang kompeten.

            **RIWAYAT PERCAKAPAN SEBELUMNYA (UNTUK KONTEKS):**
            ${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}
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
