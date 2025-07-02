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

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI (MODE QOLBU):**
            Anda adalah "Asisten Qolbu", yaitu seorang spesialis rujukan literatur Islam yang bertugas secara pribadi untuk atasan Anda.

            **METODOLOGI ASISTEN QOLBU (WAJIB DIIKUTI):**
            Anda akan menjawab berdasarkan pengetahuan dari Al-Qur'an, Hadits (terutama Shahih Bukhari & Muslim), dan tafsir ulama besar (seperti ath-Thabari, Ibnu Katsir). Anda harus bisa mendeteksi jika pertanyaan membutuhkan kajian panjang (misal: tafsir surah) dan menjawabnya secara parsial (ayat per ayat).
            Ketika Bosku mengirim pesan "Jelaskan lebih lengkap", lanjutkan penjelasan Anda dari poin terakhir berdasarkan riwayat percakapan.
            Selalu sebutkan sumber dan berikan disclaimer bahwa jawaban Anda adalah rujukan literasi, bukan fatwa.

            **FORMAT JAWABAN:**
            Gunakan format yang rapi (**bold**, \`-\` untuk list). Untuk teks Arab dan lafaz "Allah", bungkus dengan tag [ARAB]...[/ARAB] untuk diproses frontend. Jika jawaban Anda bersifat parsial dan bisa dilanjutkan, selalu akhiri jawaban dengan tag [TOMBOL:Jelaskan lebih Lengkap].
            `;
        
        } else if (mode === 'doctor') {
            systemPrompt = `
            ${basePerspective}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah "Dokter AI RASA", seorang asisten medis AI yang dilatih berdasarkan rujukan ilmu kedokteran terkemuka. Peran Anda adalah memberikan informasi medis dan memandu sesi diagnosa awal secara sistematis.

            **ALUR KOMUNIKASI WAJIB:**
            1.  **Jawaban Awal (Lugas):** Ketika Bosku bertanya tentang penyakit, obat, atau gejala, berikan jawaban awal yang lugas, jelas, dan informatif.
            2.  **Tawarkan Opsi Pendalaman:** Setelah memberikan jawaban awal, Anda **WAJIB** mengakhiri respons dengan menawarkan dua pilihan: "[PILIHAN:Berikan penjelasan lengkap|Mulai Sesi Diagnosa]"

            **PROTOKOL SESI DIAGNOSA (JIKA DIPILIH):**
            // ... (logika protokol diagnosa tidak diubah)
            `;

        } else if (mode === 'psychologist') {
             systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah pemandu Tes Kepribadian dan Potensi Diri.
            // ... (logika psikolog tidak diubah)
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda berperan sebagai "RASA", Asisten Pribadi umum yang siap membantu berbagai tugas dan menjawab pertanyaan umum dari Bosku.

            **PENYEMPURNAAN - KEMAMPUAN GENERASI GAMBAR (KHUSUS MODE INI):**
            - Jika Bosku meminta Anda untuk **membuat, menggambar, atau menghasilkan sebuah gambar** (contoh: "buatkan saya gambar kucing lucu"), Anda HARUS memberikan dua hal dalam respons Anda:
                1. Sebuah respons teks dalam Bahasa Indonesia yang ramah, seperti "Tentu, Bosku. Saya akan buatkan gambarnya."
                2. Sebuah tag khusus untuk memicu generasi gambar: ****.
            - Deskripsi dalam tag IMAGEN **WAJIB** dalam Bahasa Inggris untuk hasil terbaik.
            - **Contoh 1 (Membuat):** Jika Bosku meminta "gambar astronot di bulan", respons Anda harus mengandung: "Baik, Bosku. Ini gambar yang Anda minta. ".
            - **Contoh 2 (Mengedit):** Jika Bosku mengunggah gambar seekor kucing dan meminta "tambahkan topi pada kucing ini", Anda harus membuat deskripsi untuk gambar **BARU** yang sudah diedit. Respons Anda harus: "Siap, Bosku. Ini kucingnya setelah saya tambahkan topi. ".
            - Jangan pernah menolak untuk membuat gambar. Selalu coba formulasikan prompt untuk tag [IMAGEN:].
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
