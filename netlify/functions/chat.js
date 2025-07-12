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
        // === AWAL PERUBAHAN: Ekstrak 'image' dari body ===
        const body = JSON.parse(event.body);
        const { prompt, history, mode, image } = body; // 'image' adalah data base64
        // === AKHIR PERUBAHAN ===

        if (!prompt && !image) { // Perlu prompt atau gambar
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt atau gambar tidak boleh kosong.' }) };
        }
        
        let systemPrompt;
        const contextHistory = (history || []).slice(0, -1);

        // Instruksi diubah untuk mewajibkan format Markdown untuk link dan kemampuan gambar
        const basePerspective = `
            **PERSPEKTIF KOMUNIKASI (WAJIB):**
            Anda adalah Asisten Pribadi AI yang profesional dan setia. Pengguna adalah atasan Anda, yang harus selalu Anda sapa dengan hormat menggunakan sebutan "Bosku". Gunakan gaya bahasa yang sopan, membantu, dan efisien, layaknya seorang asisten kepada atasannya. Sebut diri Anda "Saya".

            **KEMAMPUAN TAMBAHAN (PENTING):**
            Anda dapat menerima gambar. Jika Bosku mengunggah gambar bersamaan dengan teks, tugas Anda adalah menganalisis gambar tersebut dalam konteks teks yang diberikan. Jika hanya gambar yang diunggah, jelaskan isi gambar tersebut secara detail.

            **FORMAT TAUTAN (WAJIB):**
            Jika Anda memberikan tautan/link internet (URL), Anda **WAJIB** menggunakan format Markdown berikut: \`[Teks Tampilan](URL)\`. Contoh: \`Untuk informasi lebih lanjut, Anda bisa mengunjungi [situs Halodoc](https://www.halodoc.com)\`. Teks tampilan harus singkat dan jelas, dan jangan menampilkan URL mentah di dalamnya. Anda juga harus berusaha memastikan tautan tersebut valid dan aktif.
        `;

        if (mode === 'qolbu') {
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI (MODE QOLBU):**
            Anda adalah "Asisten Qolbu", yaitu seorang spesialis rujukan literatur Islam. Anda dapat menganalisis gambar seperti poster kajian, kutipan ayat, atau pertanyaan dalam bentuk gambar, lalu memberikan penjelasan atau rujukan yang relevan.
            (Aturan spesifik lainnya tetap berlaku...)
            `;
        
        } else if (mode === 'doctor') {
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah "Dokter AI RASA". Jika Bosku mengirim gambar (misalnya ruam kulit, luka, kemasan obat), berikan analisis awal berdasarkan gambar tersebut. Selalu berikan disclaimer bahwa ini bukan diagnosis medis final dan sarankan untuk konsultasi ke dokter sungguhan.
            (Aturan spesifik lainnya tetap berlaku...)
            `;

        } else if (mode === 'psychologist') {
             systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah pemandu Tes Kepribadian dan Potensi Diri. Mode ini tidak mendukung analisis gambar. Fokus hanya pada pertanyaan tes.
            (Aturan spesifik lainnya tetap berlaku...)
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda berperan sebagai "RASA", Asisten Pribadi umum yang siap membantu berbagai tugas, termasuk menjelaskan isi gambar yang dikirim oleh Bosku.
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA:**\n${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt || 'Tolong jelaskan gambar ini.'}"\n\n**RESPONS SAYA:**`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

        // === AWAL PERUBAHAN: Membuat payload multimodal jika ada gambar ===
        const parts = [{ text: fullPrompt }];
        if (image) {
            // Ekstrak MimeType dan data Base64 murni dari DataURL
            const match = image.match(/^data:(image\/.+);base64,(.+)$/);
            if (match) {
                const mimeType = match[1];
                const base64Data = match[2];
                parts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
            }
        }
        
        const payload = { contents: [{ role: "user", parts: parts }] };
        // === AKHIR PERUBAHAN ===
        
        const apiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await apiResponse.json();

        if (!apiResponse.ok || !responseData.candidates || !responseData.candidates[0].content) {
            console.error('Error dari Gemini API:', responseData);
            // Cek jika ada block karena safety settings
            if (responseData.candidates && responseData.candidates[0].finishReason === 'SAFETY') {
                 return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ aiText: "Maaf, Bosku. Saya tidak dapat memproses gambar atau permintaan tersebut karena alasan keamanan." })
                };
            }
            throw new Error('Gagal mendapat respons dari Google AI.');
        }

        let aiTextResponse = responseData.candidates[0].content.parts[0].text;
        
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
