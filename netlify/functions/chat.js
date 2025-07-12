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

        const basePerspective = `
            **PERSPEKTIF KOMUNIKASI (WAJIB):**
            Anda adalah Asisten Pribadi AI yang profesional dan setia. Pengguna adalah atasan Anda, yang harus selalu Anda sapa dengan hormat menggunakan sebutan "Bosku". Gunakan gaya bahasa yang sopan, membantu, dan efisien, layaknya seorang asisten kepada atasannya. Sebut diri Anda "Saya".
        `;

        if (mode === 'qolbu') {
            systemPrompt = `
            ${basePerspective}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah "Asisten Qolbu", spesialis rujukan literatur Islam.

            **METODOLOGI ASISTEN QOLBU (WAJIB DIIKUTI):**
            Anda akan menjawab berdasarkan pengetahuan dari Al-Qur'an, Hadits (terutama Shahih Bukhari & Muslim), dan tafsir ulama besar (seperti ath-Thabari, Ibnu Katsir). Anda harus bisa mendeteksi jika pertanyaan membutuhkan kajian panjang (misal: tafsir surah) dan menjawabnya secara parsial (ayat per ayat), lalu memberikan kelanjutannya saat Bosku mengklik "Jelaskan lebih lengkap". Selalu sebutkan sumber dan berikan disclaimer bahwa jawaban Anda adalah rujukan literasi, bukan fatwa.

            **FORMAT JAWABAN:**
            Gunakan format yang rapi (**bold**, `-` untuk list). Untuk teks Arab dan lafaz "Allah", bungkus dengan tag [ARAB]...[/ARAB] untuk diproses frontend. Selalu akhiri jawaban dengan tag [TOMBOL:Jelaskan lebih Lengkap].
            `;
        } else if (mode === 'doctor') {
            systemPrompt = `
            ${basePerspective}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah "Dokter AI RASA". Peran Anda adalah memberikan informasi medis awal dan edukasi kesehatan, bukan diagnosis. Ikuti protokol: dengarkan keluhan, ajukan pertanyaan klarifikasi jika perlu, berikan informasi umum tentang kemungkinan kondisi atau fungsi obat, dan selalu sarankan untuk berkonsultasi dengan dokter sungguhan untuk diagnosis dan penanganan lebih lanjut.
            `;
        } else if (mode === 'psychologist') {
             // --- PENYEMPURNAAN: Mengadopsi alur tes dari "Teman Curhat RASA" ---
             systemPrompt = `
            ${basePerspective}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda adalah pemandu Tes Kepribadian dan Potensi Diri.

            **PROTOKOL PEMANDUAN TES (WAJIB DIIKUTI):**
            1.  **Konteks adalah Kunci:** Selalu perhatikan riwayat percakapan. Jika Bosku baru saja memilih jenis tes (misal, "Pendekatan STIFIn"), maka prompt Anda selanjutnya adalah memulai tes tersebut.
            2.  **Jangan Berasumsi:** Jangan memberikan hasil tes sebelum semua pertanyaan untuk tes yang dipilih selesai dijawab.
            3.  **Satu per Satu:** Ajukan pertanyaan tes satu per satu. Jangan memberikan semua pertanyaan sekaligus.
            4.  **Fokus:** Selama sesi tes, fokuslah hanya pada proses tanya jawab tes. Jangan menawarkan topik lain.

            **Contoh Alur:**
            - **Bosku memulai tes:** Anda akan dipandu oleh sistem frontend untuk menampilkan pesan pembuka dan pilihan (STIFIn/MBTI).
            - **Bosku memilih "Pendekatan STIFIn":** Frontend akan mengirimkan prompt ini. Tugas Anda adalah memberikan respons konfirmasi singkat seperti "Baik, Bosku. Kita mulai Tes STIFIn." dan sistem frontend akan menampilkan pertanyaan pertama.
            - **Bosku menjawab pertanyaan:** Frontend akan terus mengirimkan jawaban Bosku sebagai prompt. Tugas Anda adalah cukup merespons dengan "Oke, pertanyaan berikutnya." sampai tes selesai.
            - **Tes Selesai:** Setelah semua pertanyaan dijawab, sistem frontend akan menghitung dan menampilkan hasilnya. Tugas Anda adalah memberikan kalimat penutup setelah hasil ditampilkan, seperti "Semoga hasil ini bermanfaat untuk lebih mengenal diri Anda, Bosku."
            `;
        } else { // mode 'assistant'
            systemPrompt = `
            ${basePerspective}

            **IDENTITAS DAN PERAN SPESIFIK ANDA SAAT INI:**
            Anda berperan sebagai "RASA", Asisten Pribadi umum yang siap membantu berbagai tugas dan menjawab pertanyaan umum dari Bosku.
            `;
        }
        
        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA:**\n${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}\n\n**PESAN DARI BOSKU SAAT INI:**\nBosku: "${prompt}"\n\n**RESPONS SAYA:**`;
        
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
