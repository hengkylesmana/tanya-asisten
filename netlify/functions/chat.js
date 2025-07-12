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
        // --- PENYEMPURNAAN: Ambil imageData dari body ---
        const { prompt, history, mode, imageData } = body;

        // --- PENYEMPURNAAN: Cek kata kunci untuk generasi gambar ---
        const isImageGenerationRequest = prompt && (prompt.toLowerCase().includes('buatkan gambar') || prompt.toLowerCase().includes('generate image'));

        if (!prompt && !imageData) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Prompt atau gambar tidak boleh kosong.' }) };
        }
        
        // --- PENYEMPURNAAN: Logika untuk memanggil API yang sesuai ---

        // KASUS 1: Permintaan Generasi Gambar (menggunakan Imagen)
        if (isImageGenerationRequest && mode === 'assistant') {
            const imagenApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${GEMINI_API_KEY}`;
            const imagePayload = {
                instances: [{ prompt: prompt }],
                parameters: { "sampleCount": 1 }
            };

            const imageApiResponse = await fetch(imagenApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(imagePayload)
            });

            const imageDataResult = await imageApiResponse.json();

            if (!imageApiResponse.ok || !imageDataResult.predictions || !imageDataResult.predictions[0].bytesBase64Encoded) {
                console.error('Error dari Imagen API:', imageDataResult);
                throw new Error('Gagal membuat gambar dari Google AI.');
            }

            const generatedImage = `data:image/png;base64,${imageDataResult.predictions[0].bytesBase64Encoded}`;

            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    aiText: "Tentu, Bosku. Ini gambar yang Anda minta.",
                    generatedImage: generatedImage 
                })
            };
        }

        // KASUS 2 & 3: Analisis Gambar atau Teks Saja (menggunakan Gemini)
        let systemPrompt;
        const contextHistory = (history || []).slice(0, -1);
        const basePerspective = `...`; // Perspektif dasar tidak diubah
        
        // Logika system prompt untuk mode qolbu, doctor, dll tetap sama
        if (mode === 'qolbu') { systemPrompt = `...`; } 
        else if (mode === 'doctor') { systemPrompt = `...`; } 
        else if (mode === 'psychologist') { systemPrompt = `...`; } 
        else { systemPrompt = `...`; }

        const fullPrompt = `${systemPrompt}\n\n**RIWAYAT PERCAKAPAN SEBELUMNYA:**\n${contextHistory.map(h => `${h.role === 'user' ? 'Bosku' : 'Saya'}: ${h.text}`).join('\n')}\n\n**PESAN/TUGAS DARI BOSKU SAAT INI:**\nBosku: "${prompt}"\n\n**RESPONS SAYA:**`;
        
        const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
        
        // --- PENYEMPURNAAN: Buat payload sesuai dengan adanya gambar atau tidak ---
        const parts = [{ text: fullPrompt }];
        if (imageData) {
            parts.push({
                inlineData: {
                    mimeType: "image/png", // Asumsi PNG, bisa juga JPEG
                    data: imageData
                }
            });
        }
        const textPayload = { contents: [{ role: "user", parts: parts }] };
        
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
