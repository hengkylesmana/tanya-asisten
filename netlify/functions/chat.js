const fetch = require('node-fetch');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const IMAGEN_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;

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
        const { prompt, history, mode, image } = body;

        if (!prompt) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt tidak boleh kosong.' }) };
        }
        
        let systemPrompt;
        const contextHistory = (history || []).slice(0, -1);

        const basePerspective = `
            **PERSPEKTIF KOMUNIKASI (WAJIB):**
            Anda adalah Asisten Pribadi AI yang profesional dan setia. Pengguna adalah atasan Anda, yang harus selalu Anda sapa dengan hormat menggunakan sebutan "Bosku". Gunakan gaya bahasa yang sopan, membantu, dan efisien, layaknya seorang asisten kepada atasannya. Sebut diri Anda "Saya".

            **FORMAT TAUTAN (WAJIB):**
            Jika Anda memberikan tautan/link internet (URL), Anda WAJIB menggunakan format Markdown berikut: \`[Teks Tampilan](URL)\`. Contoh: \`Untuk informasi lebih lanjut, Anda bisa mengunjungi [situs Halodoc](https://www.halodoc.com)\`.

            **KEMAMPUAN ANALISIS GAMBAR:**
            Anda memiliki kemampuan untuk menerima dan menganalisis gambar yang diunggah oleh Bosku. Jika Bosku mengunggah gambar, berikan penjelasan, analisis, atau jawaban yang relevan sesuai dengan pertanyaan yang menyertainya.
        `;

        if (mode === 'qolbu') {
            systemPrompt = `
            ${basePerspective}
            // ... (Logika Asisten Qolbu tidak berubah) ...
            `;
        
        } else if (mode === 'doctor') {
            systemPrompt = `
            ${basePerspective}
            // ... (Logika Dokter AI tidak berubah) ...
            `;

        } else if (mode === 'psychologist') {
             systemPrompt = `
            ${basePerspective}
            // ... (Logika Tes Kepribadian tidak berubah) ...
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah "RASA", Asisten Pribadi umum yang memiliki kecerdasan adaptif. Anda harus mengubah gaya respons Anda berdasarkan jenis pertanyaan dari Bosku.

            **ATURAN KECERDASAN ADAPTIF (SANGAT WAJIB DIIKUTI):**
            // ... (Logika Kecerdasan Adaptif tidak berubah) ...

            **KEMAMPUAN ILUSTRASI VISUAL (KHUSUS MODE INI):**
            - Jika Bosku meminta Anda untuk memberikan **ilustrasi, gambar, atau visualisasi** sebagai bagian dari jawaban (misalnya "jelaskan dengan ilustrasi", "berikan saya gambar tentang...", "saya butuh visualnya"), Anda HARUS memberikan dua hal dalam respons Anda:
                1. Sebuah respons teks dalam Bahasa Indonesia yang singkat dan relevan dengan permintaan.
                2. Sebuah tag khusus untuk memicu pembuatan ilustrasi: **[ILUSTRASI: deskripsi gambar dalam Bahasa Inggris yang sangat detail dan deskriptif untuk diilustrasikan]**.
            - Deskripsi dalam tag ILUSTRASI **WAJIB** dalam Bahasa Inggris untuk hasil terbaik.
            - **Contoh:** Jika Bosku meminta "jelaskan siklus air dengan ilustrasi", respons Anda harus mengandung: "Tentu, Bosku. Siklus air melibatkan evaporasi, kondensasi, dan presipitasi. Berikut ilustrasinya. [ILUSTRASI: a simple diagram of the water cycle, showing evaporation from the ocean, condensation into clouds, and precipitation as rain over land]".
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA:**\n${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt}"\n\n**RESPONS SAYA:**`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const userParts = [{ text: fullPrompt }];
        if (image) {
            const match = image.match(/^data:(image\/.+);base64,(.+)$/);
            if (match) {
                userParts.push({ inlineData: { mimeType: match[1], data: match[2] } });
            }
        }

        const payload = { contents: [{ role: "user", parts: userParts }] };
        
        const textApiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const textData = await textApiResponse.json();

        if (!textApiResponse.ok || !textData.candidates || !textData.candidates[0].content) {
            console.error('Error dari Gemini API:', textData);
            throw new Error('Gagal mendapat respons dari Google AI.');
        }

        let aiTextResponse = textData.candidates[0].content.parts[0].text;
        
        const ilustrasiRegex = /\[ILUSTRASI:(.*?)\]/;
        const ilustrasiMatch = aiTextResponse.match(ilustrasiRegex);

        if (mode === 'assistant' && ilustrasiMatch && ilustrasiMatch[1]) {
            const imagePrompt = ilustrasiMatch[1].trim();
            const userFacingText = aiTextResponse.replace(ilustrasiRegex, '').trim();

            const imagenPayload = { instances: [{ prompt: imagePrompt }], parameters: { "sampleCount": 1 } };
            const imagenResponse = await fetch(IMAGEN_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imagenPayload)
            });
            const imagenResult = await imagenResponse.json();

            if (imagenResult.predictions && imagenResult.predictions[0].bytesBase64Encoded) {
                const imageUrl = `data:image/png;base64,${imagenResult.predictions[0].bytesBase64Encoded}`;
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ aiText: userFacingText, generatedImage: imageUrl })
                };
            } else {
                return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ aiText: userFacingText + "\n\n(Maaf, Bosku, saya gagal membuat ilustrasinya saat ini.)" })
                };
            }
        } else {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ aiText: aiTextResponse })
            };
        }

    } catch (error) {
        console.error('Error di dalam fungsi:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Terjadi kesalahan internal di server.' })
        };
    }
};
