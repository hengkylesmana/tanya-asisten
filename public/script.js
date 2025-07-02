// Fungsionalitas JavaScript untuk RASA
document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi konstanta elemen DOM
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const statusDiv = document.getElementById('status');
    const startOverlay = document.getElementById('start-overlay');
    const startQolbuBtn = document.getElementById('start-qolbu-btn');
    const startCurhatBtn = document.getElementById('start-curhat-btn');
    const startTestBtn = document.getElementById('start-test-btn');
    const startDoctorBtn = document.getElementById('start-doctor-btn');
    const header = document.querySelector('header');
    
    const qolbuInfoBox = document.getElementById('qolbu-info-box');
    const qolbuInfoClose = document.getElementById('qolbu-info-close');
    const doctorInfoBox = document.getElementById('doctor-info-box');
    const doctorInfoClose = document.getElementById('doctor-info-close');

    // State aplikasi
    let conversationHistory = []; 
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;
    let currentMode = 'assistant';

    // State untuk Tes Kepribadian
    let isTesting = false;
    let currentTestType = null; // 'stifin', 'mbti', atau 'selection'
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;

    // Basis Data Kecerdasan Tes
    const fullTestData = {
        stifin: {
            questions: [
                { question: "Saat belajar hal baru, Anda lebih suka:", options: [ { text: "Menghafal fakta dan detail penting.", type: "S" }, { text: "Memahami logika dan rumus di baliknya.", type: "T" }, { text: "Mencari konsep besar dan polanya.", type: "I" }, { text: "Mendiskusikannya dengan teman atau guru.", type: "F" }, { text: "Langsung mencoba dan praktik.", type: "In" } ] },
                { question: "Film atau cerita seperti apa yang paling Anda nikmati?", options: [ { text: "Kisah nyata atau dokumenter yang faktual.", type: "S" }, { text: "Cerita detektif atau strategi yang penuh teka-teki.", type: "T" }, { text: "Fiksi ilmiah atau fantasi dengan dunia yang unik.", type: "I" }, { text: "Drama yang menyentuh perasaan dan hubungan antar tokoh.", type: "F" }, { text: "Petualangan seru dengan banyak aksi.", type: "In" } ] },
                { question: "Jika Anda memiliki uang lebih, Anda akan menggunakannya untuk:", options: [ { text: "Menabung atau investasi yang aman dan jelas hasilnya.", type: "S" }, { text: "Membeli barang berkualitas tinggi yang tahan lama.", type: "T" }, { text: "Berinvestasi pada ide bisnis baru yang berisiko tapi potensial.", type: "I" }, { text: "Mentraktir teman dan keluarga atau berdonasi.", type: "F" }, { text: "Mencoba pengalaman baru seperti traveling atau kursus singkat.", type: "In" } ] },
                { question: "Dalam kerja kelompok, peran Anda seringkali menjadi:", options: [ { text: "Pencatat detail dan memastikan semua sesuai data.", type: "S" }, { text: "Penentu strategi dan memastikan semuanya logis.", type: "T" }, { text: "Pemberi ide-ide kreatif dan out-of-the-box.", type: "I" }, { text: "Penjaga keharmonisan dan motivator tim.", type: "F" }, { text: "Penghubung dan penengah jika ada masalah.", type: "In" } ] },
                { question: "Ketika dihadapkan pada masalah, apa yang pertama kali Anda lakukan?", options: [ { text: "Mencari data dan fakta konkret yang pernah terjadi.", type: "S" }, { text: "Menganalisis sebab-akibat dan mencari solusi paling logis.", type: "T" }, { text: "Membayangkan berbagai kemungkinan dan ide-ide baru.", type: "I" }, { text: "Memikirkan dampaknya pada orang lain dan mencari harmoni.", type: "F" }, { text: "Merespon secara spontan dan beradaptasi dengan keadaan.", type: "In" } ] },
                { question: "Mana yang lebih menggambarkan diri Anda?", isDriveQuestion: true, options: [ { text: "Energi dan ide saya lebih sering muncul dari dalam diri. Saya memikirkannya dulu baru beraksi.", type: "i" }, { text: "Saya mendapatkan energi dan ide dari interaksi dengan dunia luar. Saya lebih suka langsung mencoba.", type: "e" } ] }
            ],
            results: {
                Si: { explanation: "Hasil tes Anda adalah **Sensing introvert (Si)**.\n\n- **Sensing (S)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan kelima panca indera dan memproses informasi secara konkret. Anda adalah seorang yang praktis dan fokus pada fakta.\n- **introvert (i)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari dalam ke luar, membuat Anda cenderung berpikir dulu sebelum bertindak dan memiliki stamina serta daya ingat yang kuat.", title: "Sensing introvert (Si) - Sang Penyimpan yang Tekun", potensiDiri: "Anda adalah 'kamus berjalan' yang andal, dengan daya ingat kuat untuk fakta dan detail. Sebagai pekerja keras yang ulet, disiplin, dan efisien, Anda hebat dalam mengeksekusi tugas. Anda percaya diri dan lebih suka menjadi pelaku langsung di lapangan daripada hanya merancang.", caraBelajar: "Paling efektif dengan pengulangan dan praktik. Merekam informasi melalui gerakan (misalnya menulis catatan) dan menggunakan alat peraga akan sangat membantu memperkuat ingatan otot dan visual Anda.", profesi: "Keuangan (Akuntan, Bankir), Sejarawan, Atlet, Tentara, Ahli Bahasa, Dokter, Pilot, Manajer Produksi, dan peran apa pun yang membutuhkan ketelitian dan daya tahan tinggi." },
                Se: { explanation: "Hasil tes Anda adalah **Sensing extrovert (Se)**.\n\n- **Sensing (S)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan kelima panca indera dan memproses informasi secara konkret. Anda adalah seorang yang praktis dan fokus pada fakta.\n- **extrovert (e)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari luar ke dalam, membuat Anda terpicu oleh lingkungan dan pengalaman langsung.", title: "Sensing extrovert (Se) - Sang Peluang yang Gesit", potensiDiri: "Anda sangat pandai menangkap peluang yang ada di depan mata. Sebagai pembelajar yang cepat dari pengalaman ('learning by doing'), Anda berkembang dalam lingkungan yang dinamis. Anda cenderung menikmati hidup, dermawan, dan membutuhkan stimulus dari luar untuk bergerak.", caraBelajar: "Teori harus diikuti dengan praktik langsung. Anda belajar paling cepat dengan terjun langsung, mencoba, dan mengalami sendiri. Menandai bacaan dan menggunakan visual akan membantu Anda.", profesi: "Wirausaha (Pedagang), Sales & Marketing, Entertainer, Bisnis Perhotelan, Fotografer, Presenter, Event Organizer, dan semua profesi yang membutuhkan respons cepat terhadap peluang." },
                Ti: { explanation: "Hasil tes Anda adalah **Thinking introvert (Ti)**.\n\n- **Thinking (T)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan logika dan penalaran objektif untuk membuat keputusan.\n- **introvert (i)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari dalam ke luar, membuat Anda menjadi pemikir yang mendalam, mandiri, dan fokus pada spesialisasi.", title: "Thinking introvert (Ti) - Sang Pakar yang Logis", potensiDiri: "Anda adalah seorang pakar atau spesialis sejati yang berpikir mendalam. Dengan 'tangan dingin', Anda mampu menyelesaikan masalah yang rumit secara sistematis. Anda sangat mandiri, teguh pada prinsip logika, dan kadang terlihat keras kepala karena keyakinan pada analisis Anda.", caraBelajar: "Fokus pada 'mengapa' di balik setiap informasi. Anda perlu menalar isi bacaan untuk menemukan logika dan intisarinya. Anda menyukai kerangka berpikir yang jelas dan efisien, serta mampu belajar mandiri dengan sangat baik.", profesi: "Ahli Riset & Teknologi, IT (Programmer, System Analyst), Insinyur, Ahli Strategi, Auditor, Konsultan Manajemen, Dokter Spesialis, Pembuat Kebijakan." },
                Te: { explanation: "Hasil tes Anda adalah **Thinking extrovert (Te)**.\n\n- **Thinking (T)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan logika dan penalaran objektif untuk membuat keputusan.\n- **extrovert (e)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari luar ke dalam, membuat Anda terdorong untuk mengorganisir lingkungan dan sistem secara efektif untuk mencapai tujuan.", title: "Thinking extrovert (Te) - Sang Komandan yang Efektif", potensiDiri: "Anda adalah seorang komandan atau manajer yang hebat. Kekuatan Anda terletak pada kemampuan mengelola sistem, sumber daya, dan organisasi secara efektif untuk melipatgandakan hasil. Anda objektif, adil, tegas, dan suka mengendalikan proses agar berjalan sesuai rencana.", caraBelajar: "Membutuhkan tujuan yang jelas dan langkah-langkah yang logis. Anda belajar dengan membuat struktur dan skema dari materi. Anda lebih suka gambaran besar yang sistematis daripada detail yang terlalu dalam.", profesi: "Eksekutif/CEO, Manajer Proyek, Birokrat, Pembuat Kebijakan, Manufaktur, Bisnis Properti, Ahli Hukum, Pemimpin Militer." },
                Ii: { explanation: "Hasil tes Anda adalah **Intuiting introvert (Ii)**.\n\n- **Intuiting (I)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan indra keenam (intuisi) dan imajinasi untuk melihat pola dan kemungkinan.\n- **introvert (i)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari dalam ke luar, menghasilkan ide-ide orisinal, murni, dan visioner dari dalam diri Anda.", title: "Intuiting introvert (Ii) - Sang Penggagas yang Visioner", potensiDiri: "Anda adalah penggagas sejati, pencipta ide-ide baru yang orisinal dan berkualitas tinggi. Sebagai seorang perfeksionis yang visioner, Anda mampu melihat jauh ke depan. Anda lebih nyaman bekerja di balik layar sebagai konseptor atau pencetus tren.", caraBelajar: "Belajar dengan memahami konsep besar di baliknya. Ilustrasi, grafis, film, dan cerita inspiratif akan memicu imajinasi Anda. Anda tidak terlalu suka menghafal, tetapi ingin tahu 'gambaran besarnya'.", profesi: "Peneliti Sains Murni, Penulis Sastra, Sutradara, Arsitek, Desainer, Investor, Pencipta Lagu, Entrepreneur di bidang inovasi, Filsuf." },
                Ie: { explanation: "Hasil tes Anda adalah **Intuiting extrovert (Ie)**.\n\n- **Intuiting (I)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan indra keenam (intuisi) dan imajinasi untuk melihat pola dan kemungkinan.\n- **extrovert (e)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari luar ke dalam, membuat Anda pandai merakit dan membumikan ide-ide besar agar diterima pasar.", title: "Intuiting extrovert (Ie) - Sang Inovator yang Adaptif", potensiDiri: "Anda adalah seorang pembaharu yang pandai merakit berbagai ide menjadi sebuah inovasi yang relevan dengan pasar. Anda mampu memprediksi tren bisnis dan 'mendaratkan' ide-ide besar menjadi sesuatu yang konkret dan bisa dijual. Kreativitas Anda bersifat aplikatif.", caraBelajar: "Belajar dengan merumuskan tema dan menghubungkan berbagai ide. Menggunakan peraga bongkar-pasang atau mempelajari studi kasus akan sangat efektif. Anda suka mengeksplorasi banyak hal untuk dirakit menjadi sesuatu yang baru.", profesi: "Wirausaha/Investor, Marketing & Periklanan, Konsultan Bisnis, Cinematografer, Detektif, Bidang Lifestyle & Mode, Business Development." },
                Fi: { explanation: "Hasil tes Anda adalah **Feeling introvert (Fi)**.\n\n- **Feeling (F)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan perasaan dan emosi untuk memahami orang dan membuat keputusan.\n- **introvert (i)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari dalam ke luar, memancarkan pengaruh dan kharisma kepemimpinan yang kuat dari dalam diri.", title: "Feeling introvert (Fi) - Sang Pemimpin yang Berkharisma", potensiDiri: "Anda adalah pemimpin alami yang kharismatik. Kekuatan Anda datang dari pengaruh kuat yang terpancar dari dalam. Anda mampu menyentuh emosi orang lain, memiliki visi yang jauh ke depan, populer, dan pandai meyakinkan orang untuk mengikuti ideologi Anda.", caraBelajar: "Anda adalah pendengar yang baik. Setelah mendengar, Anda perlu waktu untuk merefleksikan dan merasakan koneksinya. Anda akan sangat termotivasi jika materi relevan dengan nilai-nilai yang Anda yakini.", profesi: "Politisi, Negarawan, Pemimpin Organisasi/Yayasan, Psikolog, Motivator, Trainer/Public Speaker, Budayawan, Aktivis." },
                Fe: { explanation: "Hasil tes Anda adalah **Feeling extrovert (Fe)**.\n\n- **Feeling (F)** adalah Mesin Kecerdasan (MK) Anda, yang berarti Anda mengandalkan perasaan dan emosi untuk memahami orang dan membuat keputusan.\n- **extrovert (e)** adalah Kemudi Kecerdasan Anda, artinya energi Anda bergerak dari luar ke dalam, membuat Anda terdorong untuk membangun hubungan, membina, dan mengayomi orang lain.", title: "Feeling extrovert (Fe) - Sang Pembina yang Peduli", potensiDiri: "Anda adalah seorang 'king-maker', mentor, atau pemilik yang hebat dalam membangun hubungan dan menggembleng orang lain menuju kesuksesan. Kemampuan sosial Anda luar biasa. Anda lebih suka bekerja di belakang layar, memastikan tim Anda solid dan berprestasi.", caraBelajar: "Melalui interaksi. Berdiskusi dengan guru atau teman, serta kerja kelompok, adalah cara belajar yang paling efektif. Anda menyerap energi dan pemahaman dari komunikasi dua arah.", profesi: "Psikolog/Konselor, Ahli Komunikasi/Humas, Diplomat, HRD (Personalia), Coach/Mentor, Manajer Komunitas." },
                In: { explanation: "Hasil tes Anda adalah **Insting (In)**.\n\n- **Insting (In)** adalah Mesin Kecerdasan (MK) Anda yang unik. Berada di otak tengah, Anda memiliki naluri yang tajam, kemampuan serba bisa, dan mudah beradaptasi di berbagai situasi. Anda adalah juru damai yang responsif, penyeimbang alami di antara tipe lainnya.", title: "Insting (In) - Sang Penyeimbang yang Serba Bisa", potensiDiri: "Anda adalah juru damai yang responsif dan pandai beradaptasi. Dengan naluri yang tajam, Anda seringkali tahu apa yang harus dilakukan tanpa perlu analisis panjang. Sebagai seorang generalis, Anda bisa diandalkan di banyak bidang dan sering menjadi penengah yang baik.", caraBelajar: "Anda belajar secara holistik. Pahami kesimpulan atau gambaran besarnya terlebih dahulu, baru kemudian masuk ke rincian (deduktif). Belajar paling baik dalam suasana tenang, damai, dan harmonis.", profesi: "Mediator, Jurnalis, Chef, Musisi, Aktivis Kemanusiaan/Agama, Pelayan Masyarakat, Terapis, dan sangat cocok sebagai 'tangan kanan' atau partner di berbagai posisi." }
            }
        },
        mbti: {
            questions: [
                { q: "Setelah menghabiskan waktu di acara sosial yang ramai, Anda biasanya merasa:", o: [{ t: "Bersemangat dan 'terisi' energinya.", v: "E" }, { t: "Lelah dan butuh waktu untuk menyendiri.", v: "I" }] },
                { q: "Anda lebih mempercayai:", o: [{ t: "Pengalaman langsung dan fakta yang konkret.", v: "S" }, { t: "Inspirasi, firasat, dan gambaran besar.", v: "N" }] },
                { q: "Saat membuat keputusan, Anda lebih sering:", o: [{ t: "Menganalisis pro dan kontra secara objektif.", v: "T" }, { t: "Mempertimbangkan perasaan orang lain dan nilai-nilai Anda.", v: "F" }] },
                { q: "Dalam bekerja atau menjalani hari, Anda lebih suka:", o: [{ t: "Memiliki rencana yang jelas dan jadwal yang pasti.", v: "J" }, { t: "Tetap terbuka pada pilihan dan bersikap spontan.", v: "P" }] },
                { q: "Saat merakit perabotan baru, Anda:", o: [{ t: "Membaca dan mengikuti instruksi langkah demi langkah dengan teliti.", v: "S" }, { t: "Melihat gambar hasil akhir dan mencoba merakitnya berdasarkan intuisi.", v: "N" }] },
                { q: "Seorang teman curhat tentang masalahnya. Respon pertama Anda adalah:", o: [{ t: "Menawarkan solusi logis dan langkah-langkah penyelesaian.", v: "T" }, { t: "Memberikan dukungan emosional dan mengatakan 'saya turut prihatin'.", v: "F" }] },
            ],
            results: {
                ISTJ: { explanation: "Hasil tes Anda adalah **ISTJ**.\nIni adalah peta preferensi Anda:\n- **I (Introvert):** Anda mendapatkan energi dari dunia internal (pikiran dan ide).\n- **S (Sensing):** Anda memproses informasi melalui fakta dan detail konkret.\n- **T (Thinking):** Anda mengambil keputusan berdasarkan logika dan objektivitas.\n- **J (Judging):** Anda menyukai kehidupan yang terencana dan terstruktur.", title: "ISTJ - Sang Pengawas", potensiDiri: "Sangat dapat diandalkan, praktis, dan logis. Anda adalah individu yang menghargai tradisi dan keteraturan. Anda teliti, bertanggung jawab, dan memastikan semua berjalan sesuai rencana.", caraBelajar: "Menyukai metode belajar terstruktur, langkah demi langkah, dan berbasis fakta. Belajar paling baik dengan aplikasi praktis dan contoh nyata.", profesi: "Akuntan, Manajer Logistik, Administrator, Teknisi, Insinyur, Ahli Hukum." },
                ISFJ: { explanation: "Hasil tes Anda adalah **ISFJ**.\nIni adalah peta preferensi Anda:\n- **I (Introvert):** Anda mendapatkan energi dari dunia internal.\n- **S (Sensing):** Anda fokus pada fakta dan detail.\n- **F (Feeling):** Anda membuat keputusan berdasarkan nilai dan perasaan.\n- **J (Judging):** Anda menyukai keteraturan dan perencanaan.", title: "ISFJ - Sang Pelindung", potensiDiri: "Hangat, setia, dan sangat peduli pada orang lain. Anda memiliki ingatan yang kuat terhadap detail tentang orang-orang penting bagi Anda. Anda pekerja keras dan berdedikasi.", caraBelajar: "Membutuhkan lingkungan belajar yang mendukung dan guru yang sabar. Mengingat fakta dengan baik, terutama jika terkait dengan orang atau pengalaman.", profesi: "Perawat, Guru, Pekerja Sosial, Desainer Interior, Konselor, Staf HRD." },
                INFJ: { explanation: "Hasil tes Anda adalah **INFJ**.\nIni adalah peta preferensi Anda:\n- **I (Introvert):** Anda mendapatkan energi dari dunia internal.\n- **N (Intuition):** Anda fokus pada ide dan konsep besar.\n- **F (Feeling):** Anda membuat keputusan berdasarkan nilai dan empati.\n- **J (Judging):** Anda menyukai kehidupan yang terencana.", title: "INFJ - Sang Penasihat", potensiDiri: "Visioner, idealis, dan memiliki pemahaman mendalam tentang manusia. Anda terdorong untuk membantu orang lain mencapai potensi mereka. Kreatif dan berprinsip.", caraBelajar: "Tertarik pada konsep dan ide besar di balik fakta. Belajar terbaik saat materi memiliki makna dan tujuan yang lebih tinggi.", profesi: "Psikolog, Penulis, Konselor, Seniman, Pemimpin Spiritual, Aktivis Sosial." },
                INTJ: { explanation: "Hasil tes Anda adalah **INTJ**.\nIni adalah peta preferensi Anda:\n- **I (Introvert):** Anda mendapatkan energi dari dunia internal.\n- **N (Intuition):** Anda fokus pada pola dan kemungkinan.\n- **T (Thinking):** Anda membuat keputusan berdasarkan logika.\n- **J (Judging):** Anda menyukai perencanaan dan struktur.", title: "INTJ - Sang Arsitek", potensiDiri: "Pemikir strategis dengan rencana untuk segala hal. Anda mandiri, analitis, dan memiliki standar yang sangat tinggi. Anda melihat gambaran besar dan mampu mengubah teori menjadi kenyataan.", caraBelajar: "Menyukai tantangan intelektual dan sistem yang kompleks. Belajar secara mandiri dan konseptual. Tidak suka pengulangan yang tidak perlu.", profesi: "Ilmuwan, Ahli Strategi, Insinyur, Programmer, Pemimpin Organisasi, Pengacara." },
                ISTP: { explanation: "Hasil tes Anda adalah **ISTP**.\nIni adalah peta preferensi Anda:\n- **I (Introvert):** Anda mendapatkan energi dari dunia internal.\n- **S (Sensing):** Anda fokus pada fakta dan pengalaman saat ini.\n- **T (Thinking):** Anda membuat keputusan secara logis.\n- **P (Perceiving):** Anda menyukai fleksibilitas dan spontanitas.", title: "ISTP - Sang Pengrajin", potensiDiri: "Toleran dan fleksibel, seorang pemecah masalah yang handal. Anda fokus pada saat ini dan cepat menemukan solusi praktis. Anda suka memahami cara kerja sesuatu.", caraBelajar: "Belajar dengan cara 'learning by doing'. Teori harus bisa dipraktikkan. Menyukai pemecahan masalah secara langsung.", profesi: "Mekanik, Pilot, Atlet, Teknisi Gawat Darurat, Wirausahawan, Ahli Forensik." },
                ISFP: { explanation: "Hasil tes Anda adalah **ISFP**.\nIni adalah peta preferensi Anda:\n- **I (Introvert):** Anda mendapatkan energi dari dunia internal.\n- **S (Sensing):** Anda fokus pada pengalaman sensorik saat ini.\n- **F (Feeling):** Anda membuat keputusan berdasarkan nilai dan perasaan.\n- **P (Perceiving):** Anda menyukai fleksibilitas dan pilihan terbuka.", title: "ISFP - Sang Seniman", potensiDiri: "Ramah, sensitif, dan memiliki kesadaran estetika yang kuat. Anda menikmati momen saat ini dan menciptakan lingkungan yang indah. Setia pada nilai-nilai Anda.", caraBelajar: "Menyukai lingkungan belajar yang fleksibel dan mendukung. Belajar terbaik dengan pendekatan langsung dan pengalaman sensorik (visual, sentuhan).", profesi: "Seniman, Musisi, Desainer, Dokter Hewan, Guru Anak-anak, Chef." },
                INFP: { explanation: "Hasil tes Anda adalah **INFP**.\nIni adalah peta preferensi Anda:\n- **I (Introvert):** Anda mendapatkan energi dari dunia internal.\n- **N (Intuition):** Anda fokus pada ide dan makna.\n- **F (Feeling):** Anda membuat keputusan berdasarkan nilai dan idealisme.\n- **P (Perceiving):** Anda menyukai kehidupan yang fleksibel dan penuh kemungkinan.", title: "INFP - Sang Mediator", potensiDiri: "Idealis, setia pada nilai-nilai Anda, dan ingin membuat dunia menjadi tempat yang lebih baik. Anda penasaran dan terbuka, serta pandai melihat kebaikan pada orang lain.", caraBelajar: "Termotivasi oleh materi yang sesuai dengan nilai-nilai mereka. Suka mengeksplorasi ide dan bekerja secara mandiri dengan bimbingan yang positif.", profesi: "Penulis, Aktivis, Konselor, Psikolog, Aktor, Editor, Pustakawan." },
                INTP: { explanation: "Hasil tes Anda adalah **INTP**.\nIni adalah peta preferensi Anda:\n- **I (Introvert):** Anda mendapatkan energi dari dunia internal.\n- **N (Intuition):** Anda fokus pada konsep dan teori.\n- **T (Thinking):** Anda membuat keputusan berdasarkan logika yang presisi.\n- **P (Perceiving):** Anda menyukai fleksibilitas dan ide-ide baru.", title: "INTP - Sang Pemikir", potensiDiri: "Sangat haus akan pengetahuan. Anda adalah pemikir abstrak yang logis, analitis, dan memiliki kemampuan unik untuk fokus dalam memecahkan masalah.", caraBelajar: "Skeptis dan kritis, membutuhkan pemahaman logis atas setiap konsep. Belajar terbaik secara mandiri dengan mendalami teori.", profesi: "Fisikawan, Filsuf, Programmer, Analis Keuangan, Profesor, Ahli Matematika." },
                ESTP: { explanation: "Hasil tes Anda adalah **ESTP**.\nIni adalah peta preferensi Anda:\n- **E (Extravert):** Anda mendapatkan energi dari interaksi sosial.\n- **S (Sensing):** Anda fokus pada fakta dan momen saat ini.\n- **T (Thinking):** Anda membuat keputusan berdasarkan logika praktis.\n- **P (Perceiving):** Anda menyukai kehidupan yang spontan dan penuh aksi.", title: "ESTP - Sang Wirausahawan", potensiDiri: "Cerdas, energik, dan sangat perseptif. Anda menikmati hidup di ujung tanduk dan berani mengambil risiko. Pandai beradaptasi dan hebat dalam situasi krisis.", caraBelajar: "Tidak suka teori yang panjang. Belajar harus aktif, menyenangkan, dan kompetitif. Cepat memahami saat terjun langsung ke lapangan.", profesi: "Pengusaha, Paramedis, Sales, Detektif, Atlet Profesional, Marketer." },
                ESFP: { explanation: "Hasil tes Anda adalah **ESFP**.\nIni adalah peta preferensi Anda:\n- **E (Extravert):** Anda mendapatkan energi dari interaksi sosial.\n- **S (Sensing):** Anda fokus pada pengalaman sensorik saat ini.\n- **F (Feeling):** Anda membuat keputusan berdasarkan perasaan.\n- **P (Perceiving):** Anda menyukai spontanitas dan menikmati hidup.", title: "ESFP - Sang Penghibur", potensiDiri: "Spontan, energik, dan sangat antusias. Anda menikmati hal-hal sederhana dan suka menjadi pusat perhatian. Anda ramah dan pandai membuat orang lain senang.", caraBelajar: "Belajar dalam kelompok dan melalui aktivitas interaktif. Tidak suka rutinitas dan membutuhkan variasi agar tetap termotivasi.", profesi: "Aktor, Presenter, Event Organizer, Pemandu Wisata, Konsultan Fashion." },
                ENFP: { explanation: "Hasil tes Anda adalah **ENFP**.\nIni adalah peta preferensi Anda:\n- **E (Extravert):** Anda mendapatkan energi dari interaksi sosial.\n- **N (Intuition):** Anda fokus pada kemungkinan dan ide.\n- **F (Feeling):** Anda membuat keputusan berdasarkan nilai dan perasaan.\n- **P (Perceiving):** Anda menyukai kehidupan yang fleksibel dan penuh inspirasi.", title: "ENFP - Sang Juru Kampanye", potensiDiri: "Antusias, kreatif, dan sangat mudah bergaul. Anda mampu melihat kehidupan sebagai rangkaian kemungkinan yang tak terbatas. Pandai berkomunikasi dan memotivasi orang lain.", caraBelajar: "Membutuhkan lingkungan yang kolaboratif dan inspiratif. Belajar terbaik saat mereka bisa menghubungkan ide dengan pengalaman manusia.", profesi: "Jurnalis, Politisi, Konsultan, Wirausahawan Sosial, Aktor, Perencana Acara." },
                ENTP: { explanation: "Hasil tes Anda adalah **ENTP**.\nIni adalah peta preferensi Anda:\n- **E (Extravert):** Anda mendapatkan energi dari interaksi sosial.\n- **N (Intuition):** Anda fokus pada konsep dan kemungkinan.\n- **T (Thinking):** Anda membuat keputusan berdasarkan logika objektif.\n- **P (Perceiving):** Anda menyukai perdebatan ide dan fleksibilitas.", title: "ENTP - Sang Pendebat", potensiDiri: "Cerdas, blak-blakan, dan tidak takut menentang status quo. Anda menikmati adu argumen dan ide. Cepat memahami konsep yang kompleks dan berpikir out-of-the-box.", caraBelajar: "Suka berdebat dan mengeksplorasi ide dari berbagai sudut pandang. Belajar terbaik dengan tantangan intelektual dan kebebasan untuk bereksperimen.", profesi: "Pengacara, Insinyur, Ilmuwan, Aktor, Perencana Strategis, Konsultan." },
                ESTJ: { explanation: "Hasil tes Anda adalah **ESTJ**.\nIni adalah peta preferensi Anda:\n- **E (Extravert):** Anda mendapatkan energi dari interaksi sosial.\n- **S (Sensing):** Anda fokus pada fakta dan logika praktis.\n- **T (Thinking):** Anda membuat keputusan secara objektif.\n- **J (Judging):** Anda menyukai organisasi dan efisiensi.", title: "ESTJ - Sang Eksekutif", potensiDiri: "Administrator yang luar biasa, tak tertandingi dalam mengelola sesuatu atau orang. Anda praktis, realistis, dan berpegang pada fakta. Suka mengambil alih kepemimpinan.", caraBelajar: "Menyukai tujuan yang jelas, materi yang terorganisir, dan hasil yang terukur. Belajar paling efisien dari instruktur yang kompeten dan berpengalaman.", profesi: "CEO, Manajer Proyek, Hakim, Pejabat Militer, Analis Bisnis, Administrator Sekolah." },
                ESFJ: { explanation: "Hasil tes Anda adalah **ESFJ**.\nIni adalah peta preferensi Anda:\n- **E (Extravert):** Anda mendapatkan energi dari interaksi sosial.\n- **S (Sensing):** Anda fokus pada fakta dan kebutuhan orang lain.\n- **F (Feeling):** Anda membuat keputusan berdasarkan nilai dan keharmonisan.\n- **J (Judging):** Anda menyukai kehidupan yang teratur dan membantu sesama.", title: "ESFJ - Sang Konsul", potensiDiri: "Sangat peduli, sosial, dan populer. Anda selalu bersemangat untuk membantu orang lain. Anda menghargai keharmonisan dan sangat peka terhadap kebutuhan orang lain.", caraBelajar: "Belajar terbaik dalam lingkungan yang harmonis dan terstruktur. Membutuhkan umpan balik positif dan dorongan dari pengajar.", profesi: "Sales, Perawat, Guru, Administrator, Event Coordinator, Konselor." },
                ENFJ: { explanation: "Hasil tes Anda adalah **ENFJ**.\nIni adalah peta preferensi Anda:\n- **E (Extravert):** Anda mendapatkan energi dari interaksi sosial.\n- **N (Intuition):** Anda fokus pada potensi dan mimpi orang lain.\n- **F (Feeling):** Anda membuat keputusan berdasarkan empati.\n- **J (Judging):** Anda menyukai perencanaan untuk mencapai visi bersama.", title: "ENFJ - Sang Protagonis", potensiDiri: "Pemimpin yang karismatik dan inspirasional. Anda mampu menyerap emosi, kebutuhan, dan motivasi orang lain. Anda melihat potensi dalam diri setiap orang.", caraBelajar: "Menyukai aktivitas kelompok yang kooperatif. Termotivasi ketika materi pelajaran dapat diterapkan untuk membantu orang lain.", profesi: "Guru, Diplomat, Manajer HR, Politisi, Motivator, Sutradara." },
                ENTJ: { explanation: "Hasil tes Anda adalah **ENTJ**.\nIni adalah peta preferensi Anda:\n- **E (Extravert):** Anda mendapatkan energi dari interaksi sosial.\n- **N (Intuition):** Anda fokus pada strategi jangka panjang.\n- **T (Thinking):** Anda membuat keputusan berdasarkan logika dan efisiensi.\n- **J (Judging):** Anda menyukai perencanaan dan pencapaian tujuan.", title: "ENTJ - Sang Komandan", potensiDiri: "Pemimpin yang berani, imajinatif, dan berkemauan kuat. Anda selalu menemukan atau menciptakan cara untuk mencapai tujuan. Tegas dan tidak suka inefisiensi.", caraBelajar: "Menyukai lingkungan belajar yang menantang dan kompetitif. Ingin tahu strategi dan konsep di balik setiap materi.", profesi: "CEO, Pemimpin Militer, Pengacara, Konsultan, Wirausahawan, Direktur." }
            }
        }
    };

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
    }

    function init() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW reg failed: ', err));
            });
        }
        updateButtonVisibility();

        startQolbuBtn.addEventListener('click', () => initializeApp({ isQolbu: true }));
        startCurhatBtn.addEventListener('click', () => initializeApp({ isAssistant: true }));
        startTestBtn.addEventListener('click', () => initializeApp({ isTest: true }));
        startDoctorBtn.addEventListener('click', () => initializeApp({ isDoctor: true }));
        
        qolbuInfoClose.addEventListener('click', () => { qolbuInfoBox.style.display = 'none'; });
        doctorInfoClose.addEventListener('click', () => { doctorInfoBox.style.display = 'none'; });

        header.addEventListener('click', () => window.location.reload());
        sendBtn.addEventListener('click', handleSendMessage);
        voiceBtn.addEventListener('click', toggleMainRecording);
        endChatBtn.addEventListener('click', handleCancelResponse);
        
        userInput.addEventListener('input', () => {
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
            updateButtonVisibility();
        });

        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        // --- AWAL PENYEMPURNAAN ---
        // Logika event handler untuk SpeechRecognition diubah
        if (recognition) {
            // 'onresult' hanya akan mengisi kotak input dengan hasil suara.
            recognition.onresult = (event) => {
                userInput.value = event.results[0][0].transcript;
                updateButtonVisibility(); // Perbarui tampilan tombol kirim
            };

            recognition.onstart = () => {
                isRecording = true;
                voiceBtn.classList.add('recording');
                statusDiv.textContent = "Saya mendengarkan...";
                updateButtonVisibility();
            };

            // 'onend' akan secara otomatis mengirim pesan jika ada teks di kotak input.
            recognition.onend = () => {
                isRecording = false;
                voiceBtn.classList.remove('recording');
                statusDiv.textContent = "";
                updateButtonVisibility();
                // Kirim pesan secara otomatis HANYA jika dalam mode 'assistant'
                if (currentMode === 'assistant' && userInput.value.trim()) {
                    handleSendMessage();
                }
            };

            recognition.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                statusDiv.textContent = "Maaf, saya tidak bisa mendengar.";
            };
        }
        // --- AKHIR PENYEMPURNAAN ---
    }
    
    function initializeApp(mode = {}) {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if(audioContext.state === 'suspended') audioContext.resume();
            } catch(e) { console.error("Web Audio API tidak didukung."); }
        }
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        conversationHistory = [];
        
        qolbuInfoBox.style.display = 'none';
        doctorInfoBox.style.display = 'none';
        
        isTesting = mode.isTest || false;
        currentMode = mode.isQolbu ? 'qolbu' : (mode.isTest ? 'psychologist' : (mode.isDoctor ? 'doctor' : 'assistant'));
        
        const headerTitle = document.getElementById('header-title');
        const headerSubtitle = document.getElementById('header-subtitle');
        let welcomeMessage = "";

        if (mode.isQolbu) {
            headerTitle.textContent = "Asisten Qolbu";
            headerSubtitle.textContent = "Menjawab dengan Rujukan Islami";
            qolbuInfoBox.style.display = 'block';
            welcomeMessage = "Assalamualaikum, Bosku. Saya Asisten Qolbu siap menbantu.";
        } else if (mode.isTest) {
            headerTitle.textContent = "Tes Kepribadian";
            headerSubtitle.textContent = "Saya akan memandu Anda, Bosku";
            initiateTestSelection();
            return; 
        } else if (mode.isDoctor) {
            headerTitle.textContent = "Tanya ke Dokter AI";
            headerSubtitle.textContent = "Saya siap membantu, Bosku";
            doctorInfoBox.style.display = 'block';
            welcomeMessage = "Selamat datang, Bosku. Saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu?";
        } else {
            headerTitle.textContent = "Asisten Pribadi";
            headerSubtitle.textContent = "Siap melayani, Bosku";
            welcomeMessage = "Selamat datang, Bosku. Saya, asisten pribadi Anda, siap mendengarkan. Ada yang bisa saya bantu?";
        }
        
        displayMessage(welcomeMessage, 'ai');
        speakAsync(welcomeMessage);
        updateButtonVisibility();
    }
    
    function initiateTestSelection() {
        isTesting = true;
        currentTestType = 'selection'; 
        const introMessage = `Selamat datang di Tes Kepribadian dan Potensi Diri, Bosku.\n\nSaya menawarkan dua pendekatan untuk membantu Anda lebih mengenal diri:\n- **Pendekatan STIFIn:** Berbasis konsep kecerdasan genetik untuk menemukan "sistem operasi" otak Anda yang dominan.\n- **Pendekatan MBTI:** Salah satu tes kepribadian paling populer di dunia untuk mengidentifikasi preferensi Anda.\n\n---\n\n_Disclaimer: Tes ini adalah pengantar untuk mengenali potensi diri. Untuk hasil yang lebih akurat, disarankan untuk mengikuti tes di Layanan Psikologi Profesional._\n\nSekarang, silakan pilih pendekatan yang ingin Anda gunakan:\n[PILIHAN:Pendekatan STIFIn|Pendekatan MBTI]`;
        
        displayMessage(introMessage, 'ai');
        speakAsync("Selamat datang di tes kepribadian dan potensi diri. Silakan pilih pendekatan yang ingin Anda gunakan.");
        updateButtonVisibility();
    }

    function startActualTest(type) {
        currentTestType = type;
        const originalTestData = (type === 'stifin') ? fullTestData.stifin : fullTestData.mbti;

        let questionsToAsk = [];
        if (type === 'stifin') {
            const mainQuestions = originalTestData.questions.filter(q => !q.isDriveQuestion);
            const driveQuestion = originalTestData.questions.find(q => q.isDriveQuestion);
            const shuffledMain = mainQuestions.sort(() => 0.5 - Math.random());
            questionsToAsk = shuffledMain.slice(0, 5); 
            if (driveQuestion) questionsToAsk.push(driveQuestion);
        } else { 
            const shuffled = originalTestData.questions.sort(() => 0.5 - Math.random());
            questionsToAsk = shuffled.slice(0, 6); 
        }

        testData = {
            ...originalTestData,
            questions: questionsToAsk
        };

        testScores = {};
        currentTestQuestionIndex = 0;
        displayMessage(`Baik, Bosku. Mari kita mulai Tes Kepribadian dengan Pendekatan ${type.toUpperCase()}. Jawablah ${testData.questions.length} pertanyaan berikut.`, 'ai-system');
        setTimeout(displayNextTestQuestion, 1000);
    }

    function displayNextTestQuestion() {
        if (currentTestQuestionIndex >= testData.questions.length) {
            calculateAndDisplayResult();
            return;
        }
        const q = testData.questions[currentTestQuestionIndex];
        const qText = (currentTestType === 'mbti') ? q.q : q.question;
        const qOptions = (currentTestType === 'mbti') ? q.o.map(opt => opt.t) : q.options.map(opt => opt.text);
        
        let questionDisplay = `**Pertanyaan ${currentTestQuestionIndex + 1}/${testData.questions.length}:**\n\n${qText}`;
        if (q.isDriveQuestion) {
            questionDisplay = `**Pertanyaan Terakhir:**\n\n${q.question}`;
        }
        let fullMessage = `${questionDisplay}[PILIHAN:${qOptions.join('|')}]`;
        displayMessage(fullMessage, 'ai');
        speakAsync(questionDisplay);
    }

    function processTestAnswer(choice) {
        const q = testData.questions[currentTestQuestionIndex];
        if (!q) return;

        if (currentTestType === 'stifin') {
            const selectedOption = q.options.find(opt => opt.text === choice);
            if (!selectedOption) return;
            if (q.isDriveQuestion) {
                calculateAndDisplayResult(selectedOption.type); 
                return;
            }
            testScores[selectedOption.type] = (testScores[selectedOption.type] || 0) + 1;
        } else { // MBTI
            const selectedOption = q.o.find(opt => opt.t === choice);
            if (!selectedOption) return;
            testScores[selectedOption.v] = (testScores[selectedOption.v] || 0) + 1;
        }
        
        currentTestQuestionIndex++;
        setTimeout(displayNextTestQuestion, 500);
    }

    function calculateAndDisplayResult(stifinDrive = null) {
        const localTestType = currentTestType;
        isTesting = false;
        currentTestType = null;
        let finalType = '';
        let result;

        if (localTestType === 'stifin') {
            let dominantMK = Object.keys(testScores).length > 0 ? Object.keys(testScores).reduce((a, b) => testScores[a] > testScores[b] ? a : b) : "In";
            finalType = dominantMK;
            if (dominantMK !== 'In' && stifinDrive) {
                finalType += stifinDrive;
            }
            result = fullTestData.stifin.results[finalType];
        } else if (localTestType === 'mbti') {
            const E = testScores['E'] || 0; const I = testScores['I'] || 0;
            const S = testScores['S'] || 0; const N = testScores['N'] || 0;
            const T = testScores['T'] || 0; const F = testScores['F'] || 0;
            const J = testScores['J'] || 0; const P = testScores['P'] || 0;
            finalType += (E >= I) ? 'E' : 'I';
            finalType += (S >= N) ? 'S' : 'N';
            finalType += (T >= F) ? 'T' : 'F';
            finalType += (J >= P) ? 'J' : 'P';
            result = fullTestData.mbti.results[finalType];
        }

        if (result) {
            let resultMessage = `Terima kasih telah menjawab, Bosku. Berikut adalah hasil analisa kepribadian Anda:\n\n${result.explanation}\n\n---\n\n### **${result.title}**\n\n**Potensi Diri:**\n${result.potensiDiri}\n\n**Cara Belajar yang Cocok:**\n${result.caraBelajar}\n\n**Potensi Profesi yang Sesuai:**\n- ${result.profesi.split(', ').join('\n- ')}\n\n---\n\nIngat, ini adalah peta potensi, bukan takdir. Gunakan wawasan ini untuk berkembang.`;
            displayMessage(resultMessage, 'ai');
            speakAsync(resultMessage.replace(/[\*#\-]/g, ''));
        } else {
            displayMessage("Maaf, terjadi kesalahan dalam menampilkan hasil tes. Silakan mulai ulang dari header.", 'ai-system');
        }
        updateButtonVisibility();
    }
    
    async function handleSendMessage() {
        if (isRecording || isTesting) return;
        const userText = userInput.value.trim();
        if (!userText) return;
        handleSendMessageWithText(userText);
        userInput.value = '';
        userInput.style.height = 'auto';
    }

    async function handleSendMessageWithText(text) {
        if (isTesting && currentTestType === 'selection') {
            displayMessage(text, 'user');
            const type = text.toLowerCase().includes('stifin') ? 'stifin' : 'mbti';
            startActualTest(type);
            return;
        }
        if (isTesting) {
            displayMessage(text, 'user');
            processTestAnswer(text);
            return;
        }

        conversationHistory.push({ role: 'user', text: text });
        displayMessage(text, 'user');
        updateButtonVisibility();
        await getAIResponse(text);
    }
    
    async function getAIResponse(prompt) {
        abortController = new AbortController();
        statusDiv.textContent = "Saya sedang berpikir...";
        updateButtonVisibility();

        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, history: conversationHistory, mode: currentMode }),
                signal: abortController.signal
            });
            if (!apiResponse.ok) throw new Error(`Server error: ${apiResponse.status}`);
            const result = await apiResponse.json();
            const responseText = result.aiText || `Maaf, Bosku. Bisa diulangi lagi?`;
            
            if (responseText) {
                conversationHistory.push({ role: 'ai', text: responseText });
                displayMessage(responseText, 'ai');
                await speakAsync(responseText);
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
               displayMessage(`Maaf, Bosku, ada gangguan koneksi atau respons dibatalkan.`, 'ai-system');
            }
        } finally {
            abortController = null;
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }
    
    function speakAsync(text) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) {
                resolve();
                return;
            }
            window.speechSynthesis.cancel();
            
            if (isTesting) {
                resolve();
                return;
            }

            const utteranceQueue = [];
            const parts = text.split(/(\[ARAB\].*?\[\/ARAB\])/g);

            parts.forEach(part => {
                if (part.startsWith('[ARAB]')) {
                    const arabicText = part.substring(6, part.length - 7);
                    if (arabicText.trim()) {
                        const utterance = new SpeechSynthesisUtterance(arabicText);
                        utterance.lang = 'ar-SA';
                        utteranceQueue.push(utterance);
                    }
                } else {
                    let cleanPart = part.replace(/\[(TOMBOL|PILIHAN):.*?\]/g, '').replace(/[*#_]/g, '');
                    
                    cleanPart = cleanPart.replace(/\bAI\b/g, 'E-Ai');

                    if (cleanPart.trim()) {
                        const utterance = new SpeechSynthesisUtterance(cleanPart);
                        utterance.lang = 'id-ID';
                        utteranceQueue.push(utterance);
                    }
                }
            });

            if (utteranceQueue.length === 0) { resolve(); return; }

            let currentIndex = 0;
            const speakNext = () => {
                if (currentIndex >= utteranceQueue.length) { resolve(); return; }
                const currentUtterance = utteranceQueue[currentIndex];
                currentUtterance.onend = () => { currentIndex++; speakNext(); };
                currentUtterance.onerror = (e) => { console.error("Speech synthesis error:", e); currentIndex++; speakNext(); };
                window.speechSynthesis.speak(currentUtterance);
            };
            
            if (window.speechSynthesis.getVoices().length === 0) {
                window.speechSynthesis.onvoiceschanged = speakNext;
            } else {
                speakNext();
            }
        });
    }

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isThinking = !!abortController;
        const isInputDisabled = isTesting || isRecording || isThinking;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isTesting ? "Jawab melalui tombol..." : (isRecording ? "Mendengarkan..." : "Tulis pesan untuk saya, Bosku...");

        if (isInputDisabled) {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'none';
        } else if (isTyping) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
        }
        
        voiceBtn.disabled = isThinking || isTesting;
    }

    function handleCancelResponse() {
        if (abortController) abortController.abort();
        window.speechSynthesis.cancel();
        if (recognition && isRecording) recognition.stop();
        isTesting = false; 
        statusDiv.textContent = "Dibatalkan.";
        setTimeout(() => { statusDiv.textContent = ""; }, 2000);
        updateButtonVisibility();
    }

    function toggleMainRecording() {
        if (isTesting) return; 
        if (isRecording) {
            recognition.stop();
        } else {
            if ('speechSynthesis'in window) window.speechSynthesis.cancel();
            recognition.start();
        }
    }

    function simpleMarkdownToHTML(text) {
        const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
        
        let html = text
            .replace(/\[ARAB\](.*?)\[\/ARAB\]/g, '<span class="arabic-text" dir="rtl">$1</span>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/_(.*?)_/g, '<i>$1</i>')
            .replace(/###\s*(.*)/g, '<h3>$1</h3>')
            .replace(/---\n/g, '<hr>')
            .replace(markdownLinkRegex, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>');

        const lines = html.split('\n');
        let inList = false;
        html = lines.map(line => {
            let trimmedLine = line.trim();
            if (trimmedLine.startsWith('- ')) {
                if (!inList) {
                    inList = true;
                    return '<ul><li>' + trimmedLine.substring(2) + '</li>';
                }
                return '<li>' + trimmedLine.substring(2) + '</li>';
            } else {
                if (inList) {
                    inList = false;
                    return '</ul>' + line;
                }
                return line;
            }
        }).join('<br>');

        if (inList) html += '</ul>';
        
        return html.replace(/<br>\s*<ul>/g, '<ul>').replace(/<\/ul><br>/g, '</ul>');
    }

    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);

        const buttonRegex = /\[(PILIHAN|TOMBOL):(.*?)\]/g;
        const buttons = [...message.matchAll(buttonRegex)];
        const cleanMessage = message.replace(buttonRegex, '').trim();
        
        messageElement.innerHTML = simpleMarkdownToHTML(cleanMessage);

        if (buttons.length > 0) {
            const choiceContainer = document.createElement('div');
            choiceContainer.className = 'choice-container';
            buttons.forEach(match => {
                const buttonType = match[1]; 
                const options = match[2].split('|');
                
                options.forEach(optionText => {
                    const button = document.createElement('button');
                    button.className = 'choice-button';
                    button.textContent = optionText.trim();
                    button.onclick = () => {
                        choiceContainer.querySelectorAll('.choice-button').forEach(btn => btn.disabled = true);
                        button.classList.add('selected');
                        handleSendMessageWithText(optionText.trim());
                    };
                    choiceContainer.appendChild(button);
                });
            });
            messageElement.appendChild(choiceContainer);
        }

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    init();
});
