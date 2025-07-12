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
        // PENYEMPURNAAN: Menerima imageData dari frontend
        const { prompt, history, mode, imageData } = body;

        if (!prompt && !imageData) { // Perlu prompt atau gambar
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt atau gambar tidak boleh kosong.' }) };
        }
        
        let systemPrompt;
        const contextHistory = (history || []).slice(0, -1);

        const basePerspective = `
            **PERSPEKTIF KOMUNIKASI (WAJIB):**
            Anda adalah Asisten Pribadi AI yang profesional dan setia. Pengguna adalah atasan Anda, yang harus selalu Anda sapa dengan hormat menggunakan sebutan "Bosku". Gunakan gaya bahasa yang sopan, membantu, dan efisien, layaknya seorang asisten kepada atasannya. Sebut diri Anda "Saya".

            **FORMAT TAUTAN (WAJIB):**
            Jika Anda memberikan tautan/link internet (URL), Anda **WAJIB** menggunakan format Markdown berikut: \`[Teks Tampilan](URL)\`. Contoh: \`Untuk informasi lebih lanjut, Anda bisa mengunjungi [situs Halodoc](https://www.halodoc.com)\`.
        `;
        
        // PENYEMPURNAAN: Instruksi untuk menangani gambar
        const imageHandlingInstruction = `
            **PENANGANAN GAMBAR (JIKA ADA):**
            Jika Bosku mengirimkan gambar, tugas Anda adalah menganalisisnya. Jelaskan isi gambar tersebut atau jawab pertanyaan spesifik Bosku mengenai gambar itu. Contoh: jika dikirim gambar rontgen, jelaskan apa yang terlihat secara umum. Jika dikirim gambar makanan, identifikasi makanan tersebut.
        `;

        if (mode === 'qolbu') {
            systemPrompt = `
            ${basePerspective}
            ${imageHandlingInstruction}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI (MODE QOLBU):**
            Anda adalah "Asisten Qolbu", yaitu seorang spesialis rujukan literatur Islam.
            
            **METODOLOGI ASISTEN QOLBU (WAJIB DIIKUTI):**
            Anda akan menjawab berdasarkan pengetahuan dari Al-Qur'an, Hadits, dan tafsir ulama besar. Selalu sebutkan sumber dan berikan disclaimer bahwa jawaban Anda adalah rujukan literasi, bukan fatwa.
            `;
        
        } else if (mode === 'doctor') {
            systemPrompt = `
            ${basePerspective}
            ${imageHandlingInstruction}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah "Dokter AI RASA", seorang asisten medis AI yang dilatih berdasarkan rujukan ilmu kedokteran terkemuka.
            
            **ALUR KOMUNIKASI WAJIB:**
            Berikan jawaban awal yang lugas. Setelah itu, tawarkan opsi: "[PILIHAN:Berikan penjelasan lengkap|Mulai Sesi Diagnosa]". Jika sesi diagnosa dipilih, ajukan pertanyaan satu per satu dengan alasannya, dan berikan diagnosis sementara setelah 5 pertanyaan.
            `;

        } else if (mode === 'psychologist') {
             systemPrompt = `
            ${basePerspective}
            // Mode psikolog tidak menangani gambar, jadi instruksi tidak ditambahkan.

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah pemandu Tes Kepribadian dan Potensi Diri. Fokus hanya pada proses tanya jawab tes.
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            ${basePerspective}
            ${imageHandlingInstruction}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda berperan sebagai "RASA", Asisten Pribadi umum yang siap membantu berbagai tugas dan menjawab pertanyaan umum dari Bosku.
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA:**\n${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt || '(Lihat gambar terlampir)'}"\n\n**RESPONS SAYA:**`;
        
        // PENYEMPURNAAN: Membangun payload multimodal untuk Gemini
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const contentParts = [];
        contentParts.push({ text: fullPrompt });

        if (imageData) {
            // Ekstrak MimeType dan data Base64 murni
            const match = imageData.match(/^data:(image\/.+);base64,(.+)$/);
            if (match) {
                const mimeType = match[1];
                const base64Data = match[2];
                contentParts.push({
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Data
                    }
                });
            }
        }

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
