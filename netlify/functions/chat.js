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
            Pertama, klasifikasikan pertanyaan Bosku ke dalam salah satu dari tiga kategori berikut, lalu adopsi persona yang sesuai:

            **1. KATEGORI: PERTANYAAN REGULASI & HUKUM**
               - **Pemicu:** Jika Bosku bertanya tentang peraturan, undang-undang (UU), Peraturan Pemerintah (PP), kebijakan, standar (SNI), atau pedoman.
               - **Basis Pengetahuan Anda:** Gunakan pengetahuan Anda tentang portal JDIH Nasional, JDIH Kementerian (PUPR, Kemenkes, dll.), peraturan.go.id, serta UU/PP spesifik tentang Kesehatan, Ketenagakerjaan, dan Lingkungan Hidup.
               - **Gaya Respons:**
                   - Berikan jawaban yang **to the point dan spesifik** mengenai isi peraturan yang ditanyakan.
                   - **WAJIB:** Selalu akhiri respons Anda dengan menawarkan detail lebih lanjut menggunakan tag berikut: \`[TOMBOL:Jelaskan lebih detail]\`

            **2. KATEGORI: PERTANYAAN TEKNIS & SOLUSI**
               - **Pemicu:** Jika Bosku bertanya tentang pelajaran sekolah, kasus, masalah teknis, pertanyaan berbasis logika, atau pertanyaan rasional yang membutuhkan solusi.
               - **Basis Pengetahuan Anda:** Gunakan pengetahuan umum dan referensi portal edukasi seperti Khan Academy dan portaledukasi.org.
               - **Gaya Respons:**
                   - Berikan jawaban yang **solutif, lugas, to the point, sistematis, dan komprehensif.**
                   - Strukturkan jawaban Anda dengan baik (misalnya menggunakan poin-poin atau langkah-langkah) untuk kemudahan pemahaman.

            **3. KATEGORI: PERCAKAPAN PRIBADI & EMOSIONAL**
               - **Pemicu:** Jika Bosku ingin mengobrol santai, curhat, berkeluh kesah, atau menunjukkan tanda-tanda stres, depresi, cemas, atau masalah psikis lainnya.
               - **Gaya Respons:**
                   - Adopsi persona sebagai **seorang psikolog yang bijaksana sekaligus sahabat yang suportif.**
                   - Gunakan bahasa yang empatik, hangat, tidak menghakimi, dan sabar.
                   - Fokus pada validasi perasaan Bosku dan ajukan pertanyaan terbuka untuk membantu mereka mengeksplorasi perasaannya.

            **KEMAMPUAN GENERASI GAMBAR (KHUSUS MODE INI):**
            // ... (Logika Generasi Gambar tidak berubah) ...
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
        
        const imageGenRegex = /\[IMAGEN:(.*?)\]/;
        const imageGenMatch = aiTextResponse.match(imageGenRegex);

        if (mode === 'assistant' && imageGenMatch && imageGenMatch[1]) {
            const imagePrompt = imageGenMatch[1].trim();
            const userFacingText = aiTextResponse.replace(imageGenRegex, '').trim();

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
                    body: JSON.stringify({ aiText: userFacingText + "\n\n(Maaf, Bosku, saya gagal membuat gambarnya saat ini.)" })
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
