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
        // PERUBAHAN: Ekstrak data gambar dari body request
        const { prompt, history, mode, imageData, mimeType } = body;

        // PERUBAHAN: Izinkan prompt kosong jika ada gambar
        if (!prompt && !imageData) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt atau gambar tidak boleh kosong.' }) };
        }
        
        let systemPrompt;
        const contextHistory = (history || []).slice(0, -1);

        const basePerspective = `
            **PERSPEKTIF KOMUNIKASI (WAJIB):**
            Anda adalah Asisten Pribadi AI yang profesional dan setia. Pengguna adalah atasan Anda, yang harus selalu Anda sapa dengan hormat menggunakan sebutan "Bosku". Gunakan gaya bahasa yang sopan, membantu, dan efisien, layaknya seorang asisten kepada atasannya. Sebut diri Anda "Saya".

            **FORMAT TAUTAN (WAJIB):**
            Jika Anda memberikan tautan/link internet (URL), Anda **WAJIB** menggunakan format Markdown berikut: \`[Teks Tampilan](URL)\`. Contoh: \`Untuk informasi lebih lanjut, Anda bisa mengunjungi [situs Halodoc](https://www.halodoc.com)\`.

            **KEMAMPUAN ANALISIS GAMBAR (PENTING):**
            Bosku mungkin akan memberikan gambar bersamaan dengan teks. Jika ada gambar, respons Anda HARUS didasarkan pada konten gambar tersebut. Analisis gambar, jelaskan apa yang Anda lihat, dan jawab pertanyaan Bosku terkait gambar itu. Jika hanya ada gambar tanpa teks, tugas Anda adalah menjelaskan isi gambar tersebut secara detail.
        `;

        if (mode === 'qolbu') {
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI (MODE QOLBU):**
            Anda adalah "Asisten Qolbu". Tugas Anda adalah memberikan rujukan dari literatur Islam. Jika Bosku memberikan gambar (misalnya, potongan ayat, simbol, atau situasi), berikan analisis atau jawaban dari perspektif Islam berdasarkan gambar tersebut.
            `;
        
        } else if (mode === 'doctor') {
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah "Dokter AI RASA". Jika Bosku memberikan gambar (misalnya, ruam kulit, hasil lab, bentuk pil obat), gunakan gambar itu sebagai data utama untuk analisis Anda. Jelaskan apa yang Anda lihat dari sudut pandang medis dan lanjutkan dengan alur diagnosa jika relevan.
            `;

        } else if (mode === 'psychologist') {
             systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah pemandu Tes Kepribadian. Mode ini tidak mendukung analisis gambar. Abaikan gambar apa pun yang mungkin terkirim dan fokus pada alur tes.
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda berperan sebagai "RASA", Asisten Pribadi umum. Analisis gambar apa pun yang diberikan Bosku dan jawab pertanyaannya.
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA:**\n${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt || 'Tolong jelaskan gambar ini.'}"\n\n**RESPONS SAYA:**`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        // PERUBAHAN: Buat payload yang bisa menangani teks dan gambar (multimodal)
        const parts = [{ text: fullPrompt }];
        if (imageData && mimeType) {
            parts.push({
                inline_data: {
                    mime_type: mimeType,
                    data: imageData
                }
            });
        }

        const payload = { 
            contents: [{ 
                role: "user", 
                parts: parts 
            }] 
        };
        
        const apiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const responseData = await apiResponse.json();

        if (!apiResponse.ok || !responseData.candidates || !responseData.candidates[0].content) {
            console.error('Error dari Gemini API:', responseData);
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
