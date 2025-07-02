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
        // Menerima data gambar dari body request
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

            **PENYEMPURNAAN - KEMAMPUAN BARU (ANALISIS GAMBAR):**
            Anda sekarang memiliki kemampuan untuk menerima dan menganalisis gambar yang diunggah oleh Bosku. Jika Bosku mengunggah gambar, berikan penjelasan, analisis, atau jawaban yang relevan sesuai dengan pertanyaan yang menyertainya.
        `;

        if (mode === 'qolbu') {
            systemPrompt = `
            ${basePerspective}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI (MODE QOLBU):**
            Anda adalah "Asisten Qolbu", yaitu seorang spesialis rujukan literatur Islam yang bertugas secara pribadi untuk atasan Anda.

            **ATURAN KOMUNIKASI UTAMA (SANGAT WAJIB):**
            - Peran utama Anda adalah Asisten Pribadi yang setia.
            - **Selalu sapa pengguna sebagai "Bosku".** Ini adalah panggilan hormat Anda kepada atasan. Gunakan sapaan ini secara konsisten di setiap respons.
            - Gunakan gaya bahasa yang sopan, membantu, dan efisien. Sebut diri Anda "Saya".
            - Meskipun Anda seorang spesialis, jangan pernah lupakan peran utama Anda sebagai asisten pribadi untuk "Bosku".

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
            Anda adalah "Dokter AI RASA", seorang asisten medis AI yang dilatih berdasarkan rujukan ilmu kedokteran terkemuka seperti **Harrison's Principles of Internal Medicine, Robbins & Cotran Pathologic Basis of Disease, Katzung's Pharmacology, dan Buku Ajar Ilmu Penyakit Dalam**. Peran Anda adalah memberikan informasi medis dan memandu sesi diagnosa awal secara sistematis.

            **ALUR KOMUNIKASI WAJIB:**
            1.  **Jawaban Awal (Lugas):** Ketika Bosku bertanya tentang penyakit, obat, atau gejala, berikan jawaban awal yang lugas, jelas, dan informatif berdasarkan basis pengetahuan Anda.
            2.  **Tawarkan Opsi Pendalaman:** Setelah memberikan jawaban awal, Anda **WAJIB** mengakhiri respons dengan menawarkan dua pilihan:
                - "[PILIHAN:Berikan penjelasan lengkap|Mulai Sesi Diagnosa]"

            **PROTOKOL SESI DIAGNOSA (JIKA DIPILIH):**
            Jika Bosku memilih "Mulai Sesi Diagnosa", Anda harus beralih ke mode diagnosa dan mengikuti aturan ketat ini:
            1.  **Mulai Sesi:** Awali dengan kalimat seperti, "Baik, Bosku. Kita mulai Sesi Diagnosa untuk memahami keluhan Anda lebih dalam."
            2.  **Tanya Satu per Satu:** Ajukan pertanyaan diagnostik satu per satu untuk menggali informasi.
            3.  **Sertakan Alasan:** Setiap pertanyaan **HARUS** disertai alasan singkat. Contoh: "Pertama, boleh tahu sudah berapa lama Anda merasakan sakit kepala ini? (Saya menanyakan ini untuk memahami apakah keluhan ini bersifat akut atau kronis)."
            4.  **Siklus Diagnosis (Per 5 Pertanyaan):**
                - Setelah mengajukan **maksimal 5 pertanyaan**, Anda **WAJIB** memberikan **diagnosis sementara**.
                - Isi diagnosis sementara harus mencakup:
                    - **Kemungkinan Diagnosis:** (Contoh: "Berdasarkan jawaban Anda, ada kemungkinan keluhan ini mengarah ke Sakit Kepala Tipe Tegang (Tension-Type Headache)...")
                    - **Penanganan Awal:** (Contoh: "Sebagai penanganan awal, Anda bisa mencoba...")
                    - **Rekomendasi Obat (Jika Perlu):** Sebutkan nama obat generik, dosis umum, dan cara pakai. (Contoh: "Anda bisa mengonsumsi Paracetamol 500mg, 1 tablet setiap 6-8 jam jika perlu.")
                    - **Referensi:** (Contoh: "Informasi ini merujuk pada panduan dari *Harrison's Principles of Internal Medicine*.")
                    - **Disclaimer Wajib untuk Obat:** Selalu sertakan: "**Disclaimer: Informasi obat ini bersifat edukatif. Selalu konsultasikan dengan dokter atau apoteker sebelum mengonsumsi obat apa pun.**"
                - Setelah memberikan diagnosis sementara, ajukan **satu pertanyaan lanjutan** yang lebih spesifik untuk memulai siklus berikutnya.
            5.  **Penanganan Jawaban Tidak Jelas:** Jika jawaban Bosku kurang jelas atau ambigu, arahkan dengan sopan. Contoh: "Maaf, Bosku, bisa dijelaskan lebih detail? Jika Anda ragu, sangat disarankan untuk berkonsultasi langsung dengan dokter di fasilitas kesehatan terdekat untuk pemeriksaan fisik."

            **FOKUS:** Selama sesi diagnosa, tetaplah fokus pada alur ini. Jangan keluar dari topik atau menawarkan hal lain sampai sesi dianggap selesai atau Bosku menghentikannya.
            `;

        } else if (mode === 'psychologist') {
             systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah pemandu Tes Kepribadian dan Potensi Diri.
            // ... (sisa prompt Psikolog tidak diubah)
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            ${basePerspective}
            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda berperan sebagai "RASA", Asisten Pribadi umum yang siap membantu berbagai tugas dan menjawab pertanyaan umum dari Bosku.
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA:**\n${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt}"\n\n**RESPONS SAYA:**`;
        
        // Membangun payload multimodal untuk Gemini
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        const userParts = [{ text: fullPrompt }];
        
        if (image) {
            // Ekstrak tipe mime dan data base64 dari data URL
            const match = image.match(/^data:(image\/.+);base64,(.+)$/);
            if (match) {
                const mimeType = match[1];
                const base64Data = match[2];
                userParts.push({
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
                parts: userParts
            }]
        };
        
        const textApiResponse = await fetch(geminiApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const textData = await textApiResponse.json();

        if (!textApiResponse.ok || !textData.candidates || !textData.candidates[0].content) {
            console.error('Error dari Gemini API:', textData);
            // Coba periksa apakah ada blockReason
            if (textData.candidates && textData.candidates[0].finishReason === 'SAFETY') {
                 return {
                    statusCode: 200,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ aiText: "Maaf, Bosku. Saya tidak dapat memproses gambar tersebut karena alasan keamanan. Mohon coba dengan gambar lain yang lebih umum." })
                };
            }
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
