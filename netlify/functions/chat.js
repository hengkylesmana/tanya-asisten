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
        // --- AWAL PENYEMPURNAAN GAMBAR ---
        const { prompt, history, mode, imageData } = body;

        if (!prompt && !imageData) { // Cek jika tidak ada prompt teks DAN gambar
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt atau gambar tidak boleh kosong.' }) };
        }
        // --- AKHIR PENYEMPURNAAN GAMBAR ---
        
        let systemPrompt;
        const contextHistory = (history || []).slice(0, -1);

        const basePerspective = `
            **PERSPEKTIF KOMUNIKASI (WAJIB):**
            Anda adalah Asisten Pribadi AI yang profesional dan setia. Pengguna adalah atasan Anda, yang harus selalu Anda sapa dengan hormat menggunakan sebutan "Bosku". Gunakan gaya bahasa yang sopan, membantu, dan efisien, layaknya seorang asisten kepada atasannya. Sebut diri Anda "Saya".

            **FORMAT TAUTAN (WAJIB):**
            Jika Anda memberikan tautan/link internet (URL), Anda **WAJIB** menggunakan format Markdown berikut: \`[Teks Tampilan](URL)\`. Contoh: \`Untuk informasi lebih lanjut, Anda bisa mengunjungi [situs Halodoc](https://www.halodoc.com)\`. Teks tampilan harus singkat dan jelas, dan jangan menampilkan URL mentah di dalamnya. Anda juga harus berusaha memastikan tautan tersebut valid dan aktif.

            **KEMAMPUAN GAMBAR (VISION):**
            Anda sekarang bisa menerima gambar. Jika Bosku mengirim gambar, jelaskan apa yang Anda lihat atau jawab pertanyaan Bosku terkait gambar tersebut dengan detail.
        `;

        if (mode === 'qolbu') {
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI (MODE QOLBU):**
            Anda adalah "Asisten Qolbu", yaitu seorang spesialis rujukan literatur Islam yang bertugas secara pribadi untuk atasan Anda.
            `;
        
        } else if (mode === 'doctor') {
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah "Dokter AI RASA", seorang asisten medis AI yang dilatih berdasarkan rujukan ilmu kedokteran terkemuka.
            **PENTING**: Jika gambar yang diberikan adalah tentang keluhan medis (misal: ruam kulit, luka), berikan analisis awal yang hati-hati dan selalu akhiri dengan disclaimer untuk berkonsultasi ke dokter sungguhan.
            `;

        } else if (mode === 'psychologist') {
             systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah pemandu Tes Kepribadian dan Potensi Diri. Mode ini tidak mendukung analisis gambar. Abaikan gambar jika ada dan lanjutkan alur tes.
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda berperan sebagai "RASA", Asisten Pribadi umum yang siap membantu berbagai tugas dan menjawab pertanyaan umum dari Bosku, termasuk menganalisis gambar yang diberikan.
            `;
        }
        
        // --- AWAL PENYEMPURNAAN GAMBAR ---
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA:**\n${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}`;
        
        const contentParts = [{ text: `${fullPrompt}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt || 'Tolong jelaskan gambar ini.'}"\n\n**RESPONS SAYA:**` }];

        if (imageData) {
            const mimeTypeMatch = imageData.match(/^data:(image\/.+);base64,/);
            if (mimeTypeMatch) {
                const mimeType = mimeTypeMatch[1];
                const base64Data = imageData.substring(mimeTypeMatch[0].length);
                contentParts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
            }
        }
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        const payload = { 
            contents: [{ 
                role: "user", 
                parts: contentParts 
            }] 
        };
        
        const apiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // --- AKHIR PENYEMPURNAAN GAMBAR ---

        const textData = await apiResponse.json();

        if (!apiResponse.ok || !textData.candidates || !textData.candidates[0].content) {
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
