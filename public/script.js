// Fungsionalitas JavaScript dipindahkan ke file eksternal untuk efisiensi dan kerapian.
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const voiceBtn = document.getElementById('voice-btn');
    const endChatBtn = document.getElementById('end-chat-btn');
    const statusDiv = document.getElementById('status');
    const startOverlay = document.getElementById('start-overlay');
    const startCurhatBtn = document.getElementById('start-curhat-btn');
    const startTestBtn = document.getElementById('start-test-btn');
    const startDoctorBtn = document.getElementById('start-doctor-btn');
    const header = document.querySelector('header');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    
    const doctorInfoBox = document.getElementById('doctor-info-box');
    const doctorInfoClose = document.getElementById('doctor-info-close');
    
    let conversationHistory = []; 
    let speechVoices = [];
    let abortController = null;
    let recognition = null;
    let isRecording = false;
    let audioContext = null;
    let userName = '', userGender = 'Pria', userAge = '';
    let isOnboarding = false;
    let isTesting = false;
    let currentTestType = null;
    let testData = {};
    let testScores = {};
    let currentTestQuestionIndex = 0;
    let currentMode = 'psychologist'; 
    
    const fullTestData = {
        stifin: {
            questions: [
                { question: "Saat belajar hal baru, Anda lebih suka:", options: [ { text: "Menghafal fakta dan detail penting.", type: "S" }, { text: "Memahami logika dan rumus di baliknya.", type: "T" }, { text: "Mencari konsep besar dan polanya.", type: "I" }, { text: "Mendiskusikannya dengan teman atau guru.", type: "F" }, { text: "Langsung mencoba dan praktik.", type: "In" } ] },
                { question: "Film atau cerita seperti apa yang paling Anda nikmati?", options: [ { text: "Kisah nyata atau dokumenter yang faktual.", type: "S" }, { text: "Cerita detektif atau strategi yang penuh teka-teki.", type: "T" }, { text: "Fiksi ilmiah atau fantasi dengan dunia yang unik.", type: "I" }, { text: "Drama yang menyentuh perasaan dan hubungan antar tokoh.", type: "F" }, { text: "Petualangan seru dengan banyak aksi.", type: "In" } ] },
                { question: "Jika Anda memiliki uang lebih, Anda akan menggunakannya untuk:", options: [ { text: "Menabung atau investasi yang aman dan jelas hasilnya.", type: "S" }, { text: "Membeli barang berkualitas tinggi yang tahan lama.", type: "T" }, { text: "Berinvestasi pada ide bisnis baru yang berisiko tapi potensial.", type: "I" }, { text: "Mentraktir teman dan keluarga atau berdonasi.", type: "F" }, { text: "Mencoba pengalaman baru seperti traveling atau kursus singkat.", type: "In" } ] },
                { question: "Dalam kerja kelompok, peran Anda seringkali menjadi:", options: [ { text: "Pencatat detail dan memastikan semua sesuai data.", type: "S" }, { text: "Penentu strategi dan memastikan semuanya logis.", type: "T" }, { text: "Pemberi ide-ide kreatif dan out-of-the-box.", type: "I" }, { text: "Penjaga keharmonisan dan motivator tim.", type: "F" }, { text: "Penghubung dan penengah jika ada masalah.", type: "In" } ] },
                { question: "Ketika dihadapkan pada masalah, apa yang pertama kali Anda lakukan?", options: [ { text: "Mencari data dan fakta konkret yang pernah terjadi.", type: "S" }, { text: "Menganalisis sebab-akibat dan mencari solusi paling logis.", type: "T" }, { text: "Membayangkan berbagai kemungkinan dan ide-ide baru.", type: "I" }, { text: "Memikirkan dampaknya pada orang lain dan mencari harmoni.", type: "F" }, { text: "Merespon secara spontan dan beradaptasi dengan keadaan.", type: "In" } ] },
                { question: "Lingkungan kerja seperti apa yang paling Anda sukai?", options: [ { text: "Praktis, terstruktur, dan ada hasil nyata yang bisa dilihat.", type: "S" }, { text: "Efisien, berbasis aturan yang jelas, dan objektif.", type: "T" }, { text: "Inovatif, fleksibel, dan memberikan ruang untuk kreativitas.", type: "I" }, { text: "Kolaboratif, mendukung, dan penuh interaksi dengan rekan kerja.", type: "F" }, { text: "Dinamis, beragam, di mana saya bisa membantu di banyak bidang.", type: "In" } ] },
                { question: "Bagaimana cara Anda mengambil keputusan penting?", options: [ { text: "Berdasarkan pengalaman masa lalu dan bukti yang ada.", type: "S" }, { text: "Dengan pertimbangan untung-rugi yang matang dan rasional.", type: "T" }, { text: "Mengikuti intuisi dan gambaran besar tentang masa depan.", type: "I" }, { text: "Mempertimbangkan nilai-nilai pribadi dan perasaan orang lain.", type: "F" }, { text: "Dengan cepat, sesuai dengan naluri saat itu juga.", type: "In" } ] },
                { question: "Apa yang paling membuat Anda merasa puas dalam sebuah pencapaian?", options: [ { text: "Menyelesaikan tugas dengan tuntas dan hasilnya bisa diandalkan.", type: "S" }, { text: "Menciptakan sistem yang efisien atau memenangkan persaingan.", type: "T" }, { text: "Menghasilkan sebuah karya atau ide orisinal yang diakui.", type: "I" }, { text: "Membangun hubungan yang baik atau memimpin orang lain menuju sukses.", type: "F" }, { text: "Bisa berkontribusi dan membawa kedamaian bagi banyak orang.", type: "In" } ] },
                { question: "Saat mendeskripsikan sesuatu, Anda cenderung:", options: [ { text: "Memberikan detail yang spesifik dan berurutan.", type: "S" }, { text: "Menjelaskan pro dan kontranya secara objektif.", type: "T" }, { text: "Menggunakan metafora atau perumpamaan.", type: "I" }, { text: "Menceritakan bagaimana hal itu membuat Anda merasa.", type: "F" }, { text: "Menunjukkan dengan contoh atau gerakan.", type: "In" } ] },
                { question: "Hobi atau kegiatan waktu luang Anda biasanya melibatkan:", options: [ { text: "Olahraga, berkebun, atau kegiatan fisik lainnya.", type: "S" }, { text: "Bermain catur, sudoku, atau game strategi.", type: "T" }, { text: "Menulis, melukis, atau menciptakan sesuatu yang baru.", type: "I" }, { text: "Menjadi sukarelawan atau berkumpul dengan teman-teman.", type: "F" }, { text: "Menjelajahi tempat baru tanpa rencana yang pasti.", type: "In" } ] },
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
                { q: "Ketika merencanakan liburan, Anda:", o: [{ t: "Membuat itinerary detail dari hari pertama hingga terakhir.", v: "J" }, { t: "Hanya memesan tiket dan hotel, sisanya biarkan mengalir.", v: "P" }] },
                { q: "Di antara teman-teman, Anda lebih dikenal sebagai orang yang:", o: [{ t: "Mudah bergaul dan banyak bicara.", v: "E" }, { t: "Pendengar yang baik dan lebih suka mengamati.", v: "I" }] },
                { q: "Anda cenderung lebih memperhatikan:", o: [{ t: "Apa yang nyata dan terjadi saat ini.", v: "S" }, { t: "Apa yang mungkin terjadi di masa depan.", v: "N" }] },
                { q: "Kritik atau masukan dari orang lain Anda terima sebagai:", o: [{ t: "Informasi logis untuk perbaikan, tidak personal.", v: "T" }, { t: "Sesuatu yang terkadang menyakiti perasaan.", v: "F" }] },
                { q: "Ketika mengerjakan sebuah proyek, Anda merasa lebih nyaman:", o: [{ t: "Menyelesaikannya jauh-jauh hari sebelum tenggat waktu.", v: "J" }, { t: "Bekerja mendekati tenggat waktu karena tekanan memotivasi Anda.", v: "P" }] },
                { q: "Saat berada dalam sebuah kelompok, Anda lebih sering:", o: [{ t: "Menjadi orang yang memulai percakapan.", v: "E" }, { t: "Menunggu orang lain untuk menyapa Anda terlebih dahulu.", v: "I" }] }
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

    function init() {
        if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('ServiceWorker registration successful'))
            .catch(err => console.log('ServiceWorker registration failed: ', err));
        });
        }
        loadVoices();
        displayInitialMessage();
        updateButtonVisibility();

        startCurhatBtn.addEventListener('click', () => initializeApp({ isCurhat: true }));
        startTestBtn.addEventListener('click', () => initializeApp({ isTest: true }));
        startDoctorBtn.addEventListener('click', () => initializeApp({ isDoctor: true }));
        
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
    }
    
    function initializeApp(mode = {}) {
        if (!audioContext) {
            try {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                if(audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            } catch(e) { console.error("Web Audio API tidak didukung."); }
        }
        startOverlay.classList.add('hidden');
        chatContainer.innerHTML = '';
        
        doctorInfoBox.style.display = 'none';
        
        if (mode.isTest) {
            currentMode = 'psychologist';
            headerTitle.textContent = "Tes Kepribadian dan Potensi Diri";
            headerSubtitle.textContent = "Namaku RASA, bersamamu sebagai Konselor";

            isTesting = true;
            currentTestType = 'selection';
            const introMessage = `Selamat datang di Tes Kepribadian dan Potensi Diri.\n\nTes ini menawarkan dua pendekatan untuk membantu Anda lebih mengenal diri:\n- **Pendekatan STIFIn:** Berbasis konsep kecerdasan genetik.\n- **Pendekatan MBTI:** Mengidentifikasi preferensi Anda dalam melihat dunia.\n\n---\n\n***Disclaimer:*** *Tes ini adalah pengantar. Untuk hasil yang komprehensif, disarankan untuk mengikuti tes di Layanan Psikologi Profesional.*\n\nSilakan pilih pendekatan yang ingin Anda gunakan:\n[PILIHAN:Pendekatan STIFIn|Pendekatan MBTI]`;
            
            displayMessage(introMessage, 'ai');
            speakAsync("Selamat datang di tes kepribadian dan potensi diri. Silakan pilih pendekatan yang ingin Anda gunakan.", true);

        } else if (mode.isDoctor) {
            currentMode = 'doctor';
            headerTitle.textContent = "Tanya ke Dokter AI";
            headerSubtitle.textContent = "Namaku RASA, bersamamu sebagai Dokter Profesional";
            
            doctorInfoBox.style.display = 'block';

            isTesting = false; 
            isOnboarding = false;
            const welcomeMessage = "Halo, saya Dokter AI RASA. Ada keluhan medis yang bisa saya bantu?";
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage, true);

        } else { 
            currentMode = 'psychologist';
            headerTitle.textContent = "Tanya ke Psikolog AI";
            headerSubtitle.textContent = "Namaku RASA, bersamamu sebagai Psikolog Profesional";
            isTesting = false; 
            startOnboardingIfNeeded();
        }
    }

    async function startOnboardingIfNeeded() {
        isOnboarding = true;
        statusDiv.textContent = "Sesi perkenalan...";
        updateButtonVisibility();
        try {
            const firstGreeting = "Perkenalkan , saya adalah asisten pribadi Anda yang bernama RASA. Saya sebagai seorang Psikolog AI, siap membantu Anda. Mari kita mulai dengan sesi perkenalan, boleh saya tahu nama Anda?";
            displayMessage(firstGreeting, 'ai');
            await speakAsync(firstGreeting, true);
            
            const nameAnswer = await listenOnce();
            displayMessage(nameAnswer, 'user');
            userName = nameAnswer.trim();
            
            const genderAnswer = await askAndListen("Boleh konfirmasi, apakah kamu seorang laki-laki atau wanita?");
            if (genderAnswer.toLowerCase().includes('wanita') || genderAnswer.toLowerCase().includes('perempuan')) {
                userGender = 'Wanita';
            }
            const ageAnswer = await askAndListen("Kalau usiamu berapa?");
            const ageMatch = ageAnswer.match(/\d+/);
            if (ageMatch) userAge = ageMatch[0];

        } catch (error) {
            console.log("Onboarding diabaikan:", error);
        } finally {
            isOnboarding = false;
            statusDiv.textContent = "";
            updateButtonVisibility();
            const welcomeMessage = `Baik, ${userName || 'temanku'}, terima kasih sudah berkenalan. Sekarang, saya siap mendengarkan. Silakan ceritakan apa yang kamu rasakan.`;
            displayMessage(welcomeMessage, 'ai');
            speakAsync(welcomeMessage, true);
        }
    }

    function listenOnce() {
        playSound('start'); 
        return new Promise((resolve, reject) => {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) {
                playSound('stop');
                reject("Not supported");
                return;
            }
            
            const rec = new SpeechRecognition();
            rec.lang = 'id-ID';
            rec.continuous = false;
            rec.interimResults = false;

            let hasResolved = false;

            rec.onresult = (event) => {
                if (hasResolved) return;
                hasResolved = true;
                playSound('stop');
                resolve(event.results[0][0].transcript);
            };
            rec.onerror = (event) => {
                if (hasResolved) return;
                hasResolved = true;
                playSound('stop');
                reject(event.error);
            };
            rec.onend = () => {
                if (!hasResolved) { 
                    hasResolved = true;
                    playSound('stop');
                    reject('no-speech');
                }
                if (statusDiv.textContent === "Mendengarkan...") statusDiv.textContent = "";
            };
            rec.onstart = () => statusDiv.textContent = "Mendengarkan...";
            rec.start();
        });
    }

    async function askAndListen(question) {
        displayMessage(question, 'ai');
        await speakAsync(question, true);
        try {
            const answer = await listenOnce();
            displayMessage(answer, 'user');
            return answer;
        } catch (e) {
            const errorMessage = (e === 'no-speech' || e === 'audio-capture')
                ? "Maaf, saya tidak mendengar suaramu. Bisa ulangi lagi?"
                : "Maaf, terjadi sedikit gangguan. Silakan coba lagi.";
            console.error("Listen error:", e);
            displayMessage(errorMessage, 'ai-system');
            return "";
        }
    }

    function selectRandomQuestions(questionArray, count) {
        const shuffled = [...questionArray].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    function initiateTest(type) {
        currentTestType = type;
        const originalTestData = (type === 'stifin') ? fullTestData.stifin : fullTestData.mbti;

        let questionsToAsk = [];
        if (type === 'stifin') {
            const mainQuestions = originalTestData.questions.filter(q => !q.isDriveQuestion);
            const driveQuestion = originalTestData.questions.find(q => q.isDriveQuestion);
            questionsToAsk = selectRandomQuestions(mainQuestions, 8);
            if (driveQuestion) questionsToAsk.push(driveQuestion);
        } else { 
            questionsToAsk = selectRandomQuestions(originalTestData.questions, 12);
        }

        testData = { ...originalTestData, questions: questionsToAsk };
        testScores = {};
        currentTestQuestionIndex = 0;
        displayMessage(`Baik, mari kita mulai Tes Kepribadian dengan Pendekatan ${type.toUpperCase()}. Jawablah ${testData.questions.length} pertanyaan berikut.`, 'ai-system');
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

        if (currentTestQuestionIndex >= testData.questions.length) {
            calculateAndDisplayResult();
        } else if (currentTestType === 'stifin' && testData.questions[currentTestQuestionIndex].isDriveQuestion) {
            let dominantMK = Object.keys(testScores).reduce((a, b) => testScores[a] > testScores[b] ? a : b);
             if (dominantMK === 'In') {
                 calculateAndDisplayResult(null); 
                 return;
             }
            setTimeout(displayNextTestQuestion, 500);
        }
        else {
            setTimeout(displayNextTestQuestion, 500);
        }
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
            let resultMessage = `Terima kasih telah menjawab. Berikut adalah hasil analisa kepribadian Anda:\n\n${result.explanation}\n\n---\n\n### **${result.title}**\n\n**Potensi Diri:**\n${result.potensiDiri}\n\n**Cara Belajar yang Cocok:**\n${result.caraBelajar}\n\n**Potensi Profesi yang Sesuai:**\n- ${result.profesi.split(', ').join('\n- ')}\n\n---\n\nIngat, ini adalah peta potensi, bukan takdir. Gunakan wawasan ini untuk berkembang.`;
            displayMessage(resultMessage, 'ai');
            speakAsync(resultMessage, true);
        } else {
            displayMessage("Maaf, terjadi kesalahan dalam menampilkan hasil tes. Silakan mulai ulang dari header.", 'ai-system');
        }
        updateButtonVisibility();
    }

    async function handleSendMessage() {
        if (isRecording || isOnboarding || isTesting) return;
        const userText = userInput.value.trim();
        if (!userText) return;

        displayMessage(userText, 'user');
        
        if (userText.toLowerCase() === 'tunjukkan contoh link') {
            userInput.value = '';
            userInput.style.height = 'auto';
            updateButtonVisibility();
            const linkMessage = "Tentu, ini adalah contoh tautan wisata di Malang yang aktif: \n\n- [Jatim Park 3](https://jtp.id/jatimpark3)\n- [Kampung Warna Warni Jodipan](https://www.instagram.com/kampung_warna_warni_jodipan)";
            displayMessage(linkMessage, 'ai');
            speakAsync("Tentu, ini adalah contoh tautan yang bisa diklik.", true);
            return;
        }
        
        userInput.value = '';
        userInput.style.height = 'auto';
        updateButtonVisibility();
        await getAIResponse(userText, userName, userGender, userAge);
    }
    
    function handleSendMessageWithChoice(choice) {
        displayMessage(choice, 'user');
        if (isTesting) {
            if (currentTestType === 'selection') {
                const type = choice.toLowerCase().includes('stifin') ? 'stifin' : 'mbti';
                initiateTest(type);
            } else {
                processTestAnswer(choice);
            }
        } else {
            getAIResponse(choice, userName, userGender, userAge);
        }
    }

    function updateButtonVisibility() {
        const isTyping = userInput.value.length > 0;
        const isInputDisabled = isTesting || isOnboarding;

        userInput.disabled = isInputDisabled;
        userInput.placeholder = isInputDisabled ? "Jawab melalui tombol atau suara..." : "Tulis ceritamu di sini...";

        if (isRecording || isInputDisabled) {
            sendBtn.style.display = 'none';
            if (isOnboarding) {
                voiceBtn.style.display = 'flex';
            } else {
                voiceBtn.style.display = 'none';
            }
        } else if (isTyping) {
            sendBtn.style.display = 'flex';
            voiceBtn.style.display = 'none';
        } else {
            sendBtn.style.display = 'none';
            voiceBtn.style.display = 'flex';
        }
         if (!isRecording && userInput.value.length > 0) {
             sendBtn.style.display = 'flex';
             voiceBtn.style.display = 'none';
         }
    }
    
    function handleCancelResponse() {
        if (abortController) abortController.abort();
        window.speechSynthesis.cancel();
        if (recognition) recognition.abort();
        isRecording = false;
        isTesting = false;
        isOnboarding = false;
        currentTestType = null;
        voiceBtn.classList.remove('recording');
        statusDiv.textContent = "Proses dibatalkan.";
        updateButtonVisibility();
        setTimeout(() => { if (statusDiv.textContent === "Proses dibatalkan.") statusDiv.textContent = ""; }, 2000);
    }
    
    function toggleMainRecording() {
        if (isTesting || isOnboarding) return;
        if (isRecording) stopRecording();
        else startRecording();
    }

    function startRecording() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition || isRecording) return;
        playSound('start');
        isRecording = true;
        voiceBtn.classList.add('recording');
        updateButtonVisibility();
        recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            updateButtonVisibility();
            handleSendMessage();
        };
        recognition.onerror = (event) => {
            console.error(`Error: ${event.error}`);
            statusDiv.textContent = "Tidak dapat mengenali suara.";
        };
        recognition.onstart = () => statusDiv.textContent = "Mendengarkan...";
        recognition.onend = () => { if (isRecording) stopRecording(); };
        recognition.start();
    }

    function stopRecording() {
        if (!isRecording) return;
        playSound('stop');
        isRecording = false;
        voiceBtn.classList.remove('recording');
        if (recognition) recognition.stop();
        updateButtonVisibility();
        if (statusDiv.textContent === "Mendengarkan...") statusDiv.textContent = "";
    }
    
    async function getAIResponse(prompt, name, gender, age) {
        abortController = new AbortController();
        statusDiv.textContent = "RASA sedang berpikir...";
        updateButtonVisibility();
        
        try {
            const apiResponse = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, name, gender, age, history: conversationHistory, mode: currentMode }),
                signal: abortController.signal
            });
            if (!apiResponse.ok) throw new Error(`Server merespon dengan status ${apiResponse.status}`);
            const result = await apiResponse.json();
            const responseText = result.aiText || `Terima kasih sudah berbagi, ${name || 'teman'}. Bisa ceritakan lebih lanjut?`;
            
            if (responseText) {
                let processedText = responseText;
                if (conversationHistory.filter(m => m.role === 'RASA').length > 0 && currentMode !== 'doctor') {
                    processedText = processedText.replace(/Assalamualaikum,?\s*/i, "").trim();
                }
                displayMessage(processedText, 'ai');
                await speakAsync(processedText, true);
            }

        } catch (error) {
            if (error.name !== 'AbortError') {
               displayMessage(`Maaf, sepertinya ada sedikit gangguan koneksi. Bisa ceritakan kembali?`, 'ai-system');
            }
        } finally {
            statusDiv.textContent = "";
            updateButtonVisibility();
        }
    }

    function loadVoices() {
        if (!('speechSynthesis' in window)) return;
        const setVoices = () => { speechVoices = window.speechSynthesis.getVoices(); };
        setVoices();
        if (speechVoices.length === 0 && window.speechSynthesis.onvoiceschanged !== undefined) {
            window.speechSynthesis.onvoiceschanged = setVoices;
        }
    }
    
    function speakAsync(text, isAIResponse = false) {
        return new Promise((resolve) => {
            if (!('speechSynthesis' in window)) { resolve(); return; }
            window.speechSynthesis.cancel();
            
            // PERUBAHAN: Teks dibersihkan dari karakter '*' sebelum diucapkan
            const textForSpeech = text.replace(/\[[^\]]+\]\([^)]+\)/g, '') 
                                     .replace(/\[LINK:.*?\](.*?)\[\/LINK\]/g, '$1')
                                     .replace(/[*]/g, '') // Menghapus semua karakter asterisk
                                     .replace(/\bAI\b/g, 'E Ai');
            
            const utterance = new SpeechSynthesisUtterance(textForSpeech);
            utterance.lang = 'id-ID';
            utterance.rate = 0.95;
            utterance.pitch = 1;
            if (isAIResponse) {
                let indonesianVoice = speechVoices.find(v => v.lang === 'id-ID');
                if (indonesianVoice) utterance.voice = indonesianVoice;
            }
            utterance.onend = () => resolve();
            utterance.onerror = (e) => { console.error("Speech synthesis error:", e); resolve(e); };
            window.speechSynthesis.speak(utterance);
        });
    }

    function playSound(type) {
        if (audioContext && audioContext.state === 'suspended') { audioContext.resume(); }
        if (!audioContext) return;

        const now = audioContext.currentTime;

        function beep(startTime, freq, duration) {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.01);
            oscillator.start(startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
            oscillator.stop(startTime + duration);
        }

        if (type === 'start') {
            beep(now, 1000, 0.1);
        } else if (type === 'stop') {
            beep(now, 800, 0.08);
            beep(now + 0.12, 800, 0.08);
        }
    }

    function displayInitialMessage() {
        chatContainer.innerHTML = '';
        conversationHistory = [];
        displayMessage("Pilih layanan di layar awal untuk memulai...", 'ai-system');
    }

    function displayMessage(message, sender) {
        if (sender !== 'ai-system') {
            const role = (sender === 'ai') ? 'RASA' : 'User';
            conversationHistory.push({ role: role, text: message });
        }
        const messageContainer = document.createElement('div');
        messageContainer.classList.add('chat-message', `${sender}-message`);

        if (sender.startsWith('user')) {
            messageContainer.textContent = message;
        } else {
            let textWithChoices = message.replace(/\[PILIHAN:(.*?)\]/g, (match, optionsString) => {
                const options = optionsString.split('|');
                let buttonsHTML = '<div class="choice-container">';
                options.forEach(option => {
                    const trimmedOption = option.trim();
                    buttonsHTML += `<button class="choice-button" data-choice="${trimmedOption}">${trimmedOption}</button>`;
                });
                return buttonsHTML + '</div>';
            });

            let textPart = textWithChoices.split('<div class="choice-container">')[0];
            let choicePart = textWithChoices.includes('<div class="choice-container">') ? '<div class="choice-container">' + textWithChoices.split('<div class="choice-container">')[1] : '';

            let html = textPart
                .replace(/\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>')
                .replace(/\[LINK:(.*?)\](.*?)\[\/LINK\]/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$2</a>')
                .replace(/\*\*\*(.*?)\*\*\*/g, '<em><strong>$1</strong></em>') 
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/###\s*(.*)/g, '<h3>$1</h3>')
                .replace(/---\n?/g, '<hr>')
                .replace(/\n\s*-\s/g, '<li>');

            const lines = html.split('\n');
            let inList = false;
            let finalHTML = '';
            lines.forEach(line => {
                let trimmedLine = line.trim();
                if (trimmedLine.startsWith('<li>')) {
                    if (!inList) { finalHTML += '<ul>'; inList = true; }
                    finalHTML += `<li>${trimmedLine.substring(4)}</li>`;
                } else {
                    if (inList) { finalHTML += '</ul>'; inList = false; }
                    if (trimmedLine) {
                        finalHTML += `<p>${trimmedLine}</p>`;
                    }
                }
            });
            if (inList) finalHTML += '</ul>';
            
            finalHTML = finalHTML.replace(/<p><\/p>/g, '');
            messageContainer.innerHTML = finalHTML + choicePart;
        }

        messageContainer.querySelectorAll('.choice-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const choiceText = e.currentTarget.dataset.choice;
                button.parentElement.querySelectorAll('.choice-button').forEach(btn => {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                });
                e.currentTarget.classList.add('selected');
                handleSendMessageWithChoice(choiceText);
            });
        });
        chatContainer.appendChild(messageContainer);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    init();
});
