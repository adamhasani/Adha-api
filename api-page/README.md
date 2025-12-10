import axios from "axios";
import fs from "fs";
import path, { dirname } from "path";
import chalk from "chalk";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// =========================================================================
// ⚙️ KONFIGURASI
// =========================================================================

const DEADLINE_JIDS = [
    "120363421667960480@g.us",
    "120363403916613526@g.us"
];

const PRAYER_JIDS = [
    "120363421667960480@g.us",
    "120363420716070913@g.us",
];

const HOLIDAY_JIDS = [
    "120363421667960480@g.us",
];

// Target JID untuk Peringatan Hujan
const WEATHER_JIDS = [
    "120363421667960480@g.us",
];

const CITY_CONFIG = { 
    name: 'Tegal', 
    aladhan_city: 'Tegal', 
    kemenag_id: '1630', 
    country: 'Indonesia',
    lat: -6.8694, 
    lon: 109.1402 
};

// 🖼️ DATABASE GAMBAR
const IMAGE_DATABASE = {
    subuh: "https://files.catbox.moe/n3956k.jpg",
    dzuhur: "https://files.catbox.moe/0cpyga.jpg",
    ashar: "https://files.catbox.moe/7pquh3.jpg",
    magrib: "https://files.catbox.moe/1tnslp.jpg",
    isya: "https://files.catbox.moe/xdihh4.jpg",
    jumat: "https://files.catbox.moe/g9ud53.jpg",
    deadline_h1: "https://files.catbox.moe/i3ss0s.jpg", 
    deadline_due: "https://files.catbox.moe/dtuzv5.jpg",
    hari_penting: "https://files.catbox.moe/h733d5.jpg",
    hujan: "https://files.catbox.moe/chxy41.jpg" // Thumbnail Hujan
};

const FIXED_IMPORTANT_DAYS = {
    "21-04": "Hari Kartini 👩",
    "02-05": "Hari Pendidikan Nasional 📚",
    "20-05": "Hari Kebangkitan Nasional 🇮🇩",
    "01-06": "Hari Lahir Pancasila 🦅",
    "17-08": "Hari Kemerdekaan RI 🇮🇩",
    "02-10": "Hari Batik Nasional 👕",
    "28-10": "Hari Sumpah Pemuda ✊",
    "10-11": "Hari Pahlawan 🛡️",
    "25-11": "Hari Guru Nasional 👨‍🏫",
    "22-12": "Hari Ibu 👩‍👧‍👦"
};

// ✨ QUOTES "DEEP" (SAYA KEMBALIKAN VERSI YANG BANYAK)
const PRAYER_QUOTES = {
    subuh: [
        "🌌 *Perbaiki Subuhmu*\nJika bangun pagi saja kau kalah dengan selimut, bagaimana kau mau menang menaklukkan dunia?",
        "✨ *Jaminan Allah*\nDunia ini tidak menjamin kebahagiaanmu, tapi dua rakaat Subuh menjamin engkau dalam lindungan-Nya seharian.",
        "❄️ *Rezeki Pagi*\nJangan takut telat mencari rezeki, takutlah telat menghadap Sang Pemberi Rezeki.",
        "🚪 *Kunci Hari*\nAwali harimu dengan sujud, niscaya Allah mudahkan segala urusanmu hari ini."
    ],
    dzuhur: [
        "🌞 *Istirahatlah*\nPunggungmu butuh sandaran, tapi jiwamu butuh sujud. Rehatlah sejenak untuk Dzuhur.",
        "💼 *Prioritas*\nKerja kerasmu tidak menjamin kamu kaya, tapi sholatmu menjamin keberkahan pada hartamu.",
        "🔥 *Dinginkan Hati*\nUrusan dunia memang panas dan tak ada habisnya, dinginkan hatimu dengan air wudhu.",
        "⚖️ *Penyeimbang*\nKejarlah dunia secukupnya, kejarlah akhirat sekuat tenaga. Dzuhur dulu, kerja lagi nanti."
    ],
    ashar: [
        "⏳ *Waktu Sempit*\nGurumu memang tidak menjamin hidupmu sukses, tapi Allah menjamin hidupmu jika kamu memperbaiki sholatmu.",
        "🌤️ *Jangan Terlewat*\nSehebat apapun karirmu, jika sholat Ashar kau tinggalkan, maka sia-sialah amalmu.",
        "🏃 *Lelah Itu Biasa*\nLelah mengejar dunia itu wajar, tapi jangan sampai lelahmu membuatmu lupa bersujud.",
        "⚠️ *Kerugian Nyata*\nManusia benar-benar dalam kerugian, kecuali mereka yang menyempatkan waktu untuk Tuhannya di sela kesibukan."
    ],
    magrib: [
        "🌅 *Pulang*\nSejauh apapun kakimu melangkah hari ini, ujung perjalananmu tetaplah kembali kepada Allah.",
        "🕌 *Obat Lelah*\nJika hidupmu terasa rumit dan berat, mungkin keningmu sudah terlalu lama tidak menyentuh sajadah.",
        "🌑 *Waktu Mustajab*\nLangit dibuka, doa didengar. Jangan biarkan Maghrib berlalu tanpa memohon ampunan.",
        "🛤️ *Arah Hidup*\nPerbaiki sholatmu, maka Allah akan memperbaiki hidupmu. Mulailah dari Maghrib ini."
    ],
    isya: [
        "🌙 *Penutup Hari*\nAllah tidak butuh sholatmu, tapi kamulah yang butuh Allah untuk menjamin sisa hidupmu.",
        "🛌 *Tidur Tenang*\nTidurmu tidak akan nyenyak jika hatimu gelisah karena hutang sholat yang belum lunas.",
        "💡 *Cahaya Kubur*\nJadikan Isya sebagai penutup lelahmu, agar esok engkau dibangunkan dalam keadaan iman yang hidup.",
        "🤲 *Bantuan Langit*\nKita lemah tanpa pertolongan-Nya. Sujudlah, mintalah kekuatan untuk hari esok."
    ],
    jumat: [
        "🕌 *JUMAT BERKAH*\nOrang sukses bukan yang paling sibuk, tapi yang paling cepat menyambut seruan Jumat.",
        "👔 *Tinggalkan Dunia*\nRezekimu tidak akan lari jika kau tinggalkan sebentar untuk Sholat Jumat.",
        "📖 *Kahfi*\nSinari hatimu di antara dua Jumat dengan membaca Al-Kahfi."
    ]
};

// Path Database
const dbFolder = path.join(__dirname, "../toolkit/db");
const deadlinePath = path.join(dbFolder, "deadlines.json");
const prayerStatePath = path.join(dbFolder, "prayer_state.json");

if (!fs.existsSync(dbFolder)) {
    try { fs.mkdirSync(dbFolder, { recursive: true }); } catch (e) {}
}

// Global States
global.prayerRemindersSent = global.prayerRemindersSent || {};
global.todayPrayerTimesCache = global.todayPrayerTimesCache || null;
global.holidaySentToday = global.holidaySentToday || false; 
global.weatherSentToday = global.weatherSentToday || false;

// =========================================================================
// 🛠️ FUNGSI HELPER
// =========================================================================

const getBuffer = async (url) => {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data, 'utf-8');
    } catch (error) { return null; }
};

function getTimeInTimezone(timezone) {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-GB', { timeZone: timezone, hour: 'numeric', minute: 'numeric', hour12: false });
    const [hour, minute] = timeString.split(':').map(Number);
    return { hour, minute };
}

function formatRemainingTime(ms) {
    if (ms <= 0) return "Waktu habis";
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours} jam ${minutes} menit`;
}

function loadPrayerState() {
    try {
        if (!fs.existsSync(prayerStatePath)) return null;
        return JSON.parse(fs.readFileSync(prayerStatePath, 'utf-8'));
    } catch (e) { return null; }
}

function savePrayerState() {
    try {
        const today = new Date().toLocaleDateString('id-ID');
        fs.writeFileSync(prayerStatePath, JSON.stringify({ date: today, flags: global.prayerRemindersSent }, null, 2));
    } catch (e) {}
}

// =========================================================================
// 🌧️ FITUR: PENGINGAT HUJAN
// =========================================================================
async function checkWeatherForecast() {
    // Cek agar tidak spam (cukup 1x sehari)
    if (global.weatherSentToday) return;

    const { hour } = getTimeInTimezone('Asia/Jakarta');
    // Jalankan cek cuaca pagi hari (misal jam 6 - 8 pagi)
    if (hour < 6 || hour > 8) return;

    console.log(chalk.blue('[SCHEDULER] Mengecek prakiraan cuaca...'));

    try {
        // API Open-Meteo
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${CITY_CONFIG.lat}&longitude=${CITY_CONFIG.lon}&daily=weathercode,precipitation_probability_max&timezone=auto`;
        
        const { data } = await axios.get(url);
        
        if (!data || !data.daily) return;

        // Ambil data hari ini (index 0)
        const weatherCode = data.daily.weathercode[0];
        const rainChance = data.daily.precipitation_probability_max[0];

        // Daftar Kode Hujan (WMO Code)
        const rainCodes = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];

        // HANYA KIRIM JIKA HUJAN
        if (rainCodes.includes(weatherCode) || rainChance > 60) {
            console.log(chalk.cyan(`[SCHEDULER] Terdeteksi potensi hujan (Chance: ${rainChance}%)`));
            
            const imgBuffer = await getBuffer(IMAGE_DATABASE.hujan);
            const text = `🌧️ *PERINGATAN CUACA* 🌧️\n\nHalo! Prakiraan cuaca hari ini di *${CITY_CONFIG.name}* menunjukkan potensi turun hujan.\n\n☔ *Persiapan:*\n- Bawa Jas Hujan / Payung\n- Amankan jemuran sebelum pergi\n- Hati-hati di jalan licin\n\n_Tetap waspada dan jaga kesehatan!_`;

            for (const jid of WEATHER_JIDS) {
                try {
                    await global.conn.sendMessage(jid, {
                        text: text,
                        contextInfo: {
                            externalAdReply: {
                                title: "Sedia Payung Sebelum Hujan",
                                body: `Peluang Hujan: ${rainChance}%`,
                                thumbnail: imgBuffer,
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                sourceUrl: "https://weather.com"
                            }
                        }
                    });
                    await new Promise(r => setTimeout(r, 2000));
                } catch (e) {}
            }
        } else {
            console.log(chalk.green('[SCHEDULER] Cuaca hari ini terpantau Aman.'));
        }

        global.weatherSentToday = true;

    } catch (e) {
        console.log(chalk.red(`[SCHEDULER] Gagal cek cuaca: ${e.message}`));
    }
}

// =========================================================================
// ✨ FITUR: HARI PENTING
// =========================================================================
async function checkImportantDays() {
    if (global.holidaySentToday) return;

    const { hour } = getTimeInTimezone('Asia/Jakarta');
    if (hour < 7 || hour > 8) return; 

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const dateKey = `${day}-${month}`;

    let celebrationName = null;
    let isHoliday = false;

    if (FIXED_IMPORTANT_DAYS[dateKey]) celebrationName = FIXED_IMPORTANT_DAYS[dateKey];

    if (!celebrationName) {
        try {
            const { data } = await axios.get('https://api-harilibur.vercel.app/api');
            const todayStr = now.toISOString().split('T')[0];
            const holiday = data.find(h => h.holiday_date === todayStr && h.is_national_holiday);
            if (holiday) {
                celebrationName = holiday.holiday_name;
                isHoliday = true;
            }
        } catch (e) {}
    }

    if (celebrationName) {
        console.log(chalk.magenta(`[SCHEDULER] Hari ini: ${celebrationName}`));
        const imgBuffer = await getBuffer(IMAGE_DATABASE.hari_penting);
        const ucapan = isHoliday ? `🟥 *SELAMAT HARI LIBUR NASIONAL* 🟥` : `🗓️ *PERINGATAN HARI PENTING* 🗓️`;
        const text = `${ucapan}\n\n🎉 Hari ini kita memperingati:\n*${celebrationName}*\n\n_Semoga harimu menyenangkan!_`;

        for (const jid of HOLIDAY_JIDS) {
            try {
                await global.conn.sendMessage(jid, {
                    text: text,
                    contextInfo: {
                        externalAdReply: {
                            title: celebrationName,
                            body: "Kalender Indonesia",
                            thumbnail: imgBuffer,
                            mediaType: 1,
                            renderLargerThumbnail: true,
                            sourceUrl: "https://kalender.web.id"
                        }
                    }
                });
                await new Promise(r => setTimeout(r, 2000));
            } catch (e) {}
        }
        global.holidaySentToday = true;
    }
}

// =========================================================================
// 📡 API SHOLAT
// =========================================================================
async function fetchAndCachePrayerTimes() {
    console.log(chalk.yellow('[SCHEDULER] Mengambil jadwal sholat...'));

    try {
        const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '/'); 
        const url = `https://api.myquran.com/v3/sholat/jadwal/${CITY_CONFIG.kemenag_id}/${dateStr}`;
        const { data } = await axios.get(url, { timeout: 8000 });
        
        if (data?.status && data?.data?.jadwal) {
            const j = data.data.jadwal;
            global.todayPrayerTimesCache = {
                subuh: j.subuh, dzuhur: j.dzuhur, ashar: j.ashar, magrib: j.magrib, isya: j.isya, jumat: "11:45"
            };
            console.log(chalk.green('[SCHEDULER] Sukses via Kemenag V3.'));
            return;
        }
    } catch (e) { console.log(chalk.red(`[SCHEDULER] Kemenag Gagal.`)); }

    try {
        const url = `https://api.aladhan.com/v1/timingsByCity?city=${CITY_CONFIG.aladhan_city}&country=${CITY_CONFIG.country}&method=8`;
        const { data } = await axios.get(url, { timeout: 5000 });
        if (data?.data?.timings) {
            const t = data.data.timings;
            global.todayPrayerTimesCache = {
                subuh: t.Fajr, dzuhur: t.Dhuhr, ashar: t.Asr, magrib: t.Maghrib, isya: t.Isha, jumat: "11:45"
            };
            console.log(chalk.green('[SCHEDULER] Sukses via Backup Aladhan.'));
            return;
        }
    } catch (error) {}

    global.todayPrayerTimesCache = {
        subuh: "04:30", dzuhur: "11:50", ashar: "15:10", magrib: "17:55", isya: "19:05", jumat: "11:45"
    };
}

// =========================================================================
// 🕋 REMINDER SHOLAT (UPDATED: ITALIC CLOSING)
// =========================================================================
async function checkPrayerReminders(now, currentHour, currentMinute) {
    if (!global.conn || !global.conn.user) return;
    
    if (!global.todayPrayerTimesCache) await fetchAndCachePrayerTimes();
    const jadwal = global.todayPrayerTimesCache;
    if (!jadwal) return;

    const dayName = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'Asia/Jakarta' });

    for (const [sholat, waktu] of Object.entries(jadwal)) {
        if (dayName === 'Friday' && sholat === 'dzuhur') continue;
        if (dayName !== 'Friday' && sholat === 'jumat') continue;

        const [pHour, pMinute] = waktu.split(':').map(Number);
        const currentTotal = (currentHour * 60) + currentMinute;
        const prayerTotal = (pHour * 60) + pMinute;
        const diff = currentTotal - prayerTotal;

        // Cek jika waktu sekarang sama atau lewat sedikit (0-2 menit)
        if (diff >= 0 && diff <= 2 && !global.prayerRemindersSent[sholat]) {
            
            // 1. Ambil Data
            const quotes = PRAYER_QUOTES[sholat] || ["Waktunya sholat."];
            let rawQuote = quotes[Math.floor(Math.random() * quotes.length)];
            
            const imgUrl = IMAGE_DATABASE[sholat] || "https://qu.ax/dxEsl.jpg";
            const bufferImg = await getBuffer(imgUrl);

            // 2. Format Nama Sholat
            const sholatCapitalized = sholat.charAt(0).toUpperCase() + sholat.slice(1);

            // 3. Susun Tampilan
            
            // HEADER KARTU (Thumbnail)
            const cardTitle = `🕋 WAKTU ${sholat.toUpperCase()} (${waktu})`;
            const cardBody = `Wilayah ${CITY_CONFIG.name} & Sekitarnya`;

            // PESAN CHAT (CAPTION)
            // Perubahan disini: Ada jarak (\n\n) dan underscore (_) untuk miring
            const captionText = `🕌 *SHOLAT ${sholat.toUpperCase()}* 🕌\n\n"${rawQuote}"\n\n_Selamat menunaikan ibadah sholat ${sholatCapitalized}._`;

            try {
                for (const jid of PRAYER_JIDS) {
                    await global.conn.sendMessage(jid, { 
                        text: captionText, 
                        contextInfo: {
                            externalAdReply: {
                                title: cardTitle,
                                body: cardBody,
                                thumbnailUrl: imgUrl, 
                                thumbnail: bufferImg, 
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                sourceUrl: "https://jadwalsholat.org"
                            }
                        }
                    });
                    await new Promise(r => setTimeout(r, 1500));
                }
                global.prayerRemindersSent[sholat] = true;
                savePrayerState();
            } catch (e) {
                console.error(`Gagal kirim sholat ${sholat}:`, e.message);
            }
        } 
        else if (diff > 5 && !global.prayerRemindersSent[sholat]) {
            global.prayerRemindersSent[sholat] = true;
            savePrayerState();
        }
    }
}

// =========================================================================
// 📌 REMINDER DEADLINE (UPDATED: WITH DESCRIPTION)
// =========================================================================
function readDeadlines() {
    try {
        if (!fs.existsSync(deadlinePath)) { fs.writeFileSync(deadlinePath, '{}'); return {}; }
        return JSON.parse(fs.readFileSync(deadlinePath, 'utf-8'));
    } catch { return {}; }
}

function saveDeadlines(data) { fs.writeFileSync(deadlinePath, JSON.stringify(data, null, 2)); }

async function checkDeadlines(nowMs) {
    const conn = global.conn;
    if (!conn || !conn.user) return;
    
    const deadlines = readDeadlines();
    const oneDayMs = 86400000; 
    let needSave = false;
    const imgBuffer = await getBuffer(IMAGE_DATABASE.deadline_h1);

    for (const [taskName, task] of Object.entries(deadlines)) {
        const dueMs = new Date(task.deadline).getTime();
        const diffMs = dueMs - nowMs;

        // Cek Deadline H-1
        if (diffMs <= oneDayMs && diffMs > 0 && !task.notified_1day) {
            
            // Cek apakah ada deskripsi/catatan di database, jika tidak ada pakai "-"
            const deskripsi = task.description || task.desc || "-"; 

            // Susun Pesan dengan Deskripsi
            const bodyText = `📌 *Tugas:* ${taskName}\n📝 *Deskripsi:* ${deskripsi}\n⏳ *Sisa Waktu:* ${formatRemainingTime(diffMs)}\n\n_Segera selesaikan sebelum terlambat!_`;
            
            for (const jid of DEADLINE_JIDS) {
                try {
                    await global.conn.sendMessage(jid, {
                        text: bodyText,
                        contextInfo: {
                            externalAdReply: {
                                title: "🚨 DEADLINE H-1",
                                body: `Segera Kumpulkan Tugasmu!`,
                                thumbnail: imgBuffer,
                                mediaType: 1,
                                renderLargerThumbnail: true,
                                sourceUrl: "https://chat.whatsapp.com/"
                            }
                        }
                    });
                } catch (e) {
                    console.error(`Gagal kirim deadline ke ${jid}`);
                }
            }
            task.notified_1day = true;
            needSave = true;
        }
    }

    if (needSave) fs.writeFileSync(deadlinePath, JSON.stringify(deadlines, null, 2));
}

// =========================================================================
// UTAMA
// =========================================================================
async function checkAllSchedules() {
    const { hour, minute } = getTimeInTimezone('Asia/Jakarta');
    const now = new Date();

    // Reset harian saat jam 00:00
    if (hour === 0 && minute === 0) {
        if(global.prayerRemindersSent && global.prayerRemindersSent.subuh) {
            global.prayerRemindersSent = { subuh: false, dzuhur: false, ashar: false, magrib: false, isya: false, jumat: false };
            savePrayerState();
        }
        global.holidaySentToday = false;
        global.weatherSentToday = false; 
        await fetchAndCachePrayerTimes();
    }

    await checkPrayerReminders(now, hour, minute);
    await checkDeadlines(Date.now());
    await checkImportantDays();
    await checkWeatherForecast(); 
}

export default async function deadlineChecker(conn) { 
    if (!global.conn) global.conn = conn; // PENTING: Set global.conn agar fungsi lain bisa pakai

    const state = loadPrayerState();
    const todayStr = new Date().toLocaleDateString('id-ID');
    if (state && state.date === todayStr) global.prayerRemindersSent = state.flags;
    else global.prayerRemindersSent = {};
    
    // Inisialisasi
    global.holidaySentToday = false;
    global.weatherSentToday = false;

    await fetchAndCachePrayerTimes();
    console.log(chalk.cyanBright("🔔 Scheduler Aktif (Sholat, Deadline, Hari Penting & Cuaca)."));
    
    checkAllSchedules(); 
    setInterval(checkAllSchedules, 60000); // Cek setiap 1 menit
}