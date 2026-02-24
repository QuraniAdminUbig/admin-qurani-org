"use client"

import { useState, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { DashboardLayout } from "@/components/layouts/dashboard-layout"
import { I18nProvider } from "@/components/providers/i18n-provider"
import {
    ArrowLeft,
    MapPin,
    Clock,
    BookOpen,
    Star,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    ShieldCheck,
    ShieldOff,
    Image as ImageIcon,
    MessageSquare,
    Info,
    Award,
    ThumbsUp,
    Video,
    FileText,
    User,
    BadgeCheck,
    CircleDashed,
} from "lucide-react"
import dummyData from "@/data/billing-dummy.json"

// ── Static rich data per trainer ─────────────────────────────────────────────
const GURU_STATIC: Record<number, {
    status: "verified" | "pending" | "suspended"
    paymentMethod: string
    joinDate: string
    location: string
    experience: string
    subjects: string[]
    cover: string
    bio: string
    courseDescription: string
    methods: { name: string; desc: string }[]
    certificates: { title: string; issuer: string; year: string; imgUrl: string }[]
    gallery: { type: "image" | "video"; url: string; caption: string; videoId?: string }[]
    reviews: {
        name: string
        avatar: string
        rating: number
        date: string
        comment: string
        tags: string[]
    }[]
    ratingDist: number[]   // [5,4,3,2,1] percentages
    totalReviews: number
    // Verification checklist
    verif: {
        dataDiri: boolean
        videoFatihah: boolean
        videoMengajar: boolean
        sertifikat: boolean
    }
}> = {
    301: {
        status: "verified",
        paymentMethod: "Ummi",
        joinDate: "2024-03-10",
        location: "Jakarta Selatan",
        experience: "10 Tahun Pengalaman",
        subjects: ["Tahfidz", "Tajwid", "Al-Qur'an Dasar"],
        cover: "https://images.unsplash.com/photo-1564459031928-3f52dd97e93a?w=1200&q=80",
        bio: "Assalamualaikum, saya Hasyim Asy'ari, Lc., lulusan Al-Azhar Kairo Mesir jurusan Ushuluddin. Saya telah mengajar Al-Qur'an selama lebih dari 10 tahun dengan spesialisasi di bidang Tahfidzul Qur'an dan Tajwid. Saya percaya bahwa setiap murid memiliki kecepatan belajar yang berbeda, dan pendekatan saya disesuaikan dengan kebutuhan masing-masing santri agar merasa nyaman dan termotivasi.",
        courseDescription: "Kursus ini dirancang untuk membantu Anda menguasai Tajwid dan Tahfidz dengan bimbingan langsung dari saya. Setiap sesi berlangsung selama 60 menit secara online atau offline, dengan materi yang disesuaikan dengan kemampuan dan kebutuhan masing-masing santri. Progres akan dipantau secara berkala.",
        methods: [
            { name: "Ummi", desc: "Metode pembelajaran Al-Qur'an berbasis irama khas dengan prinsip talaqqi musyafahah." },
            { name: "Talaqqi", desc: "Belajar langsung dari mulut guru ke mulut murid untuk memastikan ketepatan makhraj." },
        ],
        certificates: [
            { title: "Ijazah Al-Qur'an Sanad Muttasil", issuer: "Al-Azhar University, Cairo", year: "2014", imgUrl: "https://images.unsplash.com/photo-1589330273594-fade1ee91647?w=400&q=80" },
            { title: "Sertifikat Tahfidz 30 Juz", issuer: "Pondok Pesantren Yanbu'ul Qur'an", year: "2012", imgUrl: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=400&q=80" },
            { title: "Sertifikat Pengajar Metode Ummi", issuer: "Yayasan Ummi Foundation", year: "2016", imgUrl: "https://images.unsplash.com/photo-1609342122563-a43ac8917a3a?w=400&q=80" },
        ],
        gallery: [
            { type: "image", url: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80", caption: "Proses Mengajar Tahsin" },
            { type: "video", url: "", caption: "Metode Talaqqi — Pengenalan Makhraj", videoId: "RysQ81Uuqr4" },
            { type: "image", url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&q=80", caption: "Diskusi Tajwid & Makhraj" },
            { type: "image", url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&q=80", caption: "Sesi Belajar Kelompok" },
            { type: "video", url: "", caption: "Sesi Online — Bimbingan Tahfidz", videoId: "RysQ81Uuqr4" },
            { type: "image", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80", caption: "Kelas Intensif Ramadhan" },
        ],
        reviews: [
            { name: "Ahmad Fauzi", avatar: "https://i.pravatar.cc/40?img=11", rating: 5, date: "2 minggu yang lalu", comment: "Sangat puas dengan cara mengajar beliau. Penjelasannya sangat detail terutama pada bagian makhrajul huruf. Sabar sekali membimbing saya yang masih terbata-bata.", tags: ["Sangat Sabar", "Penjelasan Detail"] },
            { name: "Dewi Rahayu", avatar: "https://i.pravatar.cc/40?img=47", rating: 5, date: "1 bulan yang lalu", comment: "Metode yang digunakan sangat efektif. Saya merasa ada kemajuan pesat dalam bacaan Al-Qur'an saya hanya dalam 3 sesi. Sangat direkomendasikan!", tags: ["Metode Efektif", "Progress Cepat"] },
            { name: "Halimah Tussa'diyah", avatar: "https://i.pravatar.cc/40?img=25", rating: 5, date: "2 bulan yang lalu", comment: "Ustadz Hasyim sangat berpengalaman dan penuh kesabaran. Beliau mampu menjelaskan konsep yang sulit dengan cara yang mudah dipahami.", tags: ["Berpengalaman", "Mudah Dipahami"] },
        ],
        ratingDist: [78, 15, 5, 1, 1],
        totalReviews: 45,
        verif: { dataDiri: true, videoFatihah: true, videoMengajar: true, sertifikat: true },
    },
    302: {
        status: "verified",
        paymentMethod: "Tilawati",
        joinDate: "2024-05-22",
        location: "Bandung",
        experience: "7 Tahun Pengalaman",
        subjects: ["Tahsinul Qur'an", "Tahfidzul Qur'an"],
        cover: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80",
        bio: "Assalamualaikum, saya Indi Fitriani, pengajar Al-Qur'an dengan spesialisasi Tahsinul Qur'an dan Tahfidzul Qur'an. Latar belakang pendidikan saya dari Pesantren Tahfidz Jawa Barat, dan saya memiliki pengalaman mengajar lebih dari 7 tahun. Saya menyukai pendekatan personal dan sabar dalam membimbing setiap santri.",
        courseDescription: "Program kursus saya mencakup perbaikan bacaan (tahsin) hingga hafalan Al-Qur'an (tahfidz) dengan metode Tilawati yang menyenangkan dan mudah dipahami oleh semua usia. Sesi dilakukan secara fleksibel sesuai dengan jadwal murid.",
        methods: [
            { name: "Tilawati", desc: "Metode belajar membaca Al-Qur'an dengan lagu yang khas dan menyenangkan, tepat untuk semua usia." },
        ],
        certificates: [
            { title: "Hafizah 30 Juz", issuer: "Pondok Pesantren Al-Hikmah Jabar", year: "2017", imgUrl: "https://images.unsplash.com/photo-1589330273594-fade1ee91647?w=400&q=80" },
            { title: "Sertifikat Metode Tilawati", issuer: "Yayasan Pondok Tilawati Surabaya", year: "2018", imgUrl: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=400&q=80" },
        ],
        gallery: [
            { type: "image", url: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=600&q=80", caption: "Sesi Tahfidz Online" },
            { type: "video", url: "", caption: "Metode Tilawati — Belajar dengan Lagu", videoId: "RysQ81Uuqr4" },
            { type: "image", url: "https://images.unsplash.com/photo-1513258496099-48168024aec0?w=600&q=80", caption: "Bimbingan Tartil" },
            { type: "image", url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80", caption: "Diskusi Kelompok" },
        ],
        reviews: [
            { name: "Siti Aminah", avatar: "https://i.pravatar.cc/40?img=32", rating: 5, date: "3 minggu yang lalu", comment: "Ibu Indi sangat sabar dan metodenya sangat mudah diikuti. Anak saya yang awalnya susah mengaji sekarang sudah lancar!", tags: ["Cocok untuk Anak", "Sabar"] },
            { name: "Nur Hidayah", avatar: "https://i.pravatar.cc/40?img=45", rating: 4, date: "2 bulan yang lalu", comment: "Pengajaran sangat sistematis dan terstruktur. Setiap sesi ada evaluasi singkat yang sangat membantu perkembangan.", tags: ["Sistematis", "Ada Evaluasi"] },
        ],
        ratingDist: [72, 20, 6, 1, 1],
        totalReviews: 39,
        verif: { dataDiri: true, videoFatihah: true, videoMengajar: false, sertifikat: true },
    },
    303: {
        status: "verified",
        paymentMethod: "Qiroati",
        joinDate: "2024-01-15",
        location: "Surabaya",
        experience: "5 Tahun Pengalaman",
        subjects: ["Baca Tulis Al-Qur'an", "Tajwid Dasar"],
        cover: "https://images.unsplash.com/photo-1560785496-3c9d27877182?w=1200&q=80",
        bio: "Assalamualaikum, saya Ustadz Iwan, pengajar Al-Qur'an untuk anak-anak dan dewasa pemula dengan metode Qiroati. Saya percaya bahwa fondasi baca Al-Qur'an yang benar sejak dini adalah kunci keberhasilan jangka panjang. Saya mengajar dengan penuh semangat dan menyesuaikan materi dengan kondisi murid.",
        courseDescription: "Kursus Baca Tulis Al-Qur'an ini cocok untuk pemula dewasa maupun anak-anak. Materi dimulai dari pengenalan huruf hijaiyah, harakat, hingga tajwid dasar. Sesi berlangsung 60 menit dengan metode yang fun dan interaktif.",
        methods: [
            { name: "Qiroati", desc: "Metode belajar Al-Qur'an yang terstruktur mulai dari pengenalan huruf hingga tajwid, populer di pesantren seluruh Indonesia." },
        ],
        certificates: [
            { title: "Sertifikat Pengajar Qiroati", issuer: "Lembaga Qiroati Pusat Semarang", year: "2019", imgUrl: "https://images.unsplash.com/photo-1609342122563-a43ac8917a3a?w=400&q=80" },
            { title: "Sertifikat Pendidik Al-Qur'an", issuer: "LPTQ Jawa Timur", year: "2021", imgUrl: "https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=400&q=80" },
        ],
        gallery: [
            { type: "image", url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80", caption: "Kelas Anak-Anak" },
            { type: "video", url: "", caption: "Cara Belajar Metode Qiroati", videoId: "RysQ81Uuqr4" },
            { type: "image", url: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&q=80", caption: "Evaluasi Bulanan" },
        ],
        reviews: [
            { name: "Budi Santoso", avatar: "https://i.pravatar.cc/40?img=57", rating: 5, date: "1 bulan yang lalu", comment: "Ustadz Iwan sangat cocok untuk pemula seperti saya. Beliau tidak terburu-buru dan selalu memastikan saya benar-benar paham.", tags: ["Cocok Pemula", "Tidak Terburu-buru"] },
            { name: "Aisyah Putri", avatar: "https://i.pravatar.cc/40?img=20", rating: 5, date: "3 bulan yang lalu", comment: "Anak pertama saya yang 7 tahun sangat senang belajar dengan Ustadz Iwan. Caranya mengajar sangat menyenangkan.", tags: ["Anak-Friendly", "Menyenangkan"] },
        ],
        ratingDist: [80, 12, 5, 2, 1],
        totalReviews: 34,
        verif: { dataDiri: true, videoFatihah: true, videoMengajar: true, sertifikat: true },
    },
    304: {
        status: "pending",
        paymentMethod: "Al-Baghdadi",
        joinDate: "2025-08-01",
        location: "Depok",
        experience: "2 Tahun Pengalaman",
        subjects: ["Tahsin", "Tahfidz"],
        cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=1200&q=80",
        bio: "Assalamualaikum, saya Nanda, lulusan pesantren tahfidz dan kini bersemangat untuk berbagi ilmu Al-Qur'an kepada lebih banyak murid.",
        courseDescription: "Program tahsin dan tahfidz bagi pemula hingga menengah.",
        methods: [
            { name: "Al-Baghdadi", desc: "Metode klasik pengajaran Al-Qur'an yang telah terbukti selama berabad-abad." },
        ],
        certificates: [],
        gallery: [],
        reviews: [],
        ratingDist: [0, 0, 0, 0, 0],
        totalReviews: 0,
        verif: { dataDiri: true, videoFatihah: false, videoMengajar: false, sertifikat: false },
    },
    305: {
        status: "verified",
        paymentMethod: "Talaqqi",
        joinDate: "2024-07-19",
        location: "Malang",
        experience: "8 Tahun Pengalaman",
        subjects: ["Tahsin", "Makhraj", "Tajwid Lanjut"],
        cover: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80",
        bio: "Assalamualaikum, saya Zain. Saya berspesialisasi dalam Tahsin dan perbaikan Makhraj secara profesional. Selama 8 tahun saya telah membimbing murid dari berbagai kalangan usia, mulai dari anak-anak hingga dewasa.",
        courseDescription: "Kursus Tahsin dan Makhraj Profesional ini difokuskan pada perbaikan cara baca Al-Qur'an yang benar dari sisi makhraj dan sifat huruf, serta penerapan hukum Tajwid secara praktikal dalam tilawah sehari-hari.",
        methods: [
            { name: "Talaqqi", desc: "Metode menghafal dan membenarkan bacaan secara langsung face-to-face dengan guru, menjaga sanad keilmuan." },
            { name: "Mujawwad", desc: "Tilawah dengan irama dan lagu yang indah sesuai dengan maqam Al-Qur'an." },
        ],
        certificates: [
            { title: "Ijazah Sanad Qur'an Riwayat Hafsh", issuer: "Syekh Muhammad Al-Busiri, Mesir", year: "2020", imgUrl: "https://images.unsplash.com/photo-1589330273594-fade1ee91647?w=400&q=80" },
            { title: "Sertifikat Pengajar Tahsin & Makhraj", issuer: "Markaz Tahsin Internasional", year: "2019", imgUrl: "https://images.unsplash.com/photo-1609342122563-a43ac8917a3a?w=400&q=80" },
        ],
        gallery: [
            { type: "image", url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80", caption: "Sesi Makhraj Intensif" },
            { type: "video", url: "", caption: "Demo Pengajaran Makhraj Huruf", videoId: "RysQ81Uuqr4" },
            { type: "image", url: "https://images.unsplash.com/photo-1560785496-3c9d27877182?w=600&q=80", caption: "Halaqah Tilawah" },
            { type: "image", url: "https://images.unsplash.com/photo-1551818255-e6e10975bc17?w=600&q=80", caption: "Evaluasi Akhir Bulan" },
        ],
        reviews: [
            { name: "Farid Al-Amin", avatar: "https://i.pravatar.cc/40?img=68", rating: 5, date: "1 bulan yang lalu", comment: "Ustadz Zain luar biasa dalam mengoreksi makhraj. Setelah 3 sesi, bacaan saya sudah jauh lebih baik.", tags: ["Koreksi Detail", "Makhraj Expert"] },
        ],
        ratingDist: [82, 10, 5, 2, 1],
        totalReviews: 32,
        verif: { dataDiri: true, videoFatihah: true, videoMengajar: true, sertifikat: true },
    },
}

// ── Build trainer map from dummy data ─────────────────────────────────────────
function buildTrainerMap() {
    const map: Record<number, typeof dummyData.bookingDetails[0]["trainer"]> = {}
    dummyData.bookingDetails.forEach(bd => {
        if (!map[bd.trainer.id]) map[bd.trainer.id] = bd.trainer
    })
    return map
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
    verified: { label: "Terverifikasi", bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
    pending: { label: "Menunggu Verifikasi", bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
    suspended: { label: "Nonaktif", bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
}

type Tab = "informasi" | "galeri" | "ulasan"

function StarRow({ rating, count = 5 }: { rating: number; count?: number }) {
    return (
        <div className="flex gap-0.5">
            {Array.from({ length: count }, (_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < rating ? "text-amber-400 fill-amber-400" : "text-gray-200 dark:text-gray-700"}`} />
            ))}
        </div>
    )
}

function GuruDetailContent() {
    const params = useParams()
    const id = Number(params.id)

    const trainerMap = useMemo(() => buildTrainerMap(), [])
    const trainer = trainerMap[id]
    const extra = GURU_STATIC[id]

    const [activeTab, setActiveTab] = useState<Tab>("informasi")

    if (!trainer || !extra) {
        return (
            <div className="p-8 text-center text-gray-500">
                <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">Guru tidak ditemukan</p>
                <Link href="/billing/guru" className="mt-3 inline-block text-sm text-emerald-600 hover:underline">← Kembali ke daftar</Link>
            </div>
        )
    }

    const st = STATUS_CFG[extra.status]
    const isVerified = extra.status === "verified"
    const allRequiredOk = extra.verif.dataDiri && extra.verif.videoFatihah
    const canVerify = !isVerified && allRequiredOk
    const avgRating = extra.ratingDist.reduce((s, p, i) => s + ((5 - i) * p) / 100, 0)

    // Compute stats from bookings
    const guruBookings = dummyData.bookings.filter(b => b.trainerId === id)
    const totalRevenue = isVerified ? guruBookings.reduce((s, b) => s + b.totalPayment, 0) : 0
    const totalStudents = isVerified ? guruBookings.length : 0

    return (
        <div className="bg-gray-50 dark:bg-gray-950 min-h-screen">

            {/* ── Admin Action Header ── */}
            <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4 flex-wrap">
                    {/* breadcrumb + title */}
                    <div className="flex items-center gap-2">
                        <Link href="/billing/guru"
                            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 transition-colors"
                            title="Kembali ke Manajemen Guru">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <span className="text-gray-300 dark:text-gray-700">/</span>
                        <span className="text-xs text-gray-400">Manajemen Guru</span>
                        <span className="text-gray-300 dark:text-gray-700">/</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate max-w-[200px]">{trainer.name}</span>
                    </div>
                    {/* status only — action buttons are in the sidebar verification card */}
                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Main layout ── */}
            <div className="max-w-[1400px] mx-auto px-4 py-4">
                <div className="flex gap-5 items-start flex-col lg:flex-row">

                    {/* ══════════ LEFT MAIN CONTENT ══════════ */}
                    <div className="flex-1 min-w-0 space-y-4">

                        {/* ── Hero Card (Profile) ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Cover + Avatar (positioned absolute on cover) */}
                            <div className="relative w-full h-44 bg-gradient-to-r from-emerald-600 to-teal-600 overflow-visible">
                                <Image src={extra.cover} alt="cover" fill className="object-cover opacity-60 rounded-t-2xl" unoptimized />
                                {/* Avatar overlapping cover bottom */}
                                <div className="absolute -bottom-8 left-6 z-10">
                                    <div className="relative w-20 h-20 rounded-xl overflow-hidden ring-4 ring-white dark:ring-gray-900 shadow-xl">
                                        <Image src={trainer.avatar} alt={trainer.name} fill className="object-cover" unoptimized />
                                    </div>
                                </div>
                            </div>

                            {/* Profile info — top padding accounts for avatar overlap */}
                            <div className="pt-12 px-6 pb-5">
                                {/* Name + badge */}
                                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{trainer.name}</h2>
                                    {isVerified && <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />}
                                </div>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold mb-3">{trainer.specialization}</p>

                                {/* Rating + review count */}
                                {isVerified && (
                                    <div className="flex items-center gap-2 mb-4">
                                        <StarRow rating={Math.round(avgRating)} />
                                        <span className="text-sm font-bold text-gray-900 dark:text-white">{trainer.rating.toFixed(1)}</span>
                                        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">({extra.totalReviews} Ulasan)</span>
                                    </div>
                                )}

                                {/* Info bar */}
                                <div className="flex items-center flex-wrap gap-x-5 gap-y-2 border-t border-gray-100 dark:border-gray-800 pt-4">
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                        <MapPin className="w-4 h-4 text-emerald-500" />
                                        <span>{extra.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                        <Clock className="w-4 h-4 text-blue-500" />
                                        <span>{extra.experience}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                                        <BookOpen className="w-4 h-4 text-violet-500" />
                                        {extra.subjects.map((s, i) => (
                                            <span key={i}>{s}{i < extra.subjects.length - 1 && <span className="mx-1 text-gray-300">·</span>}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Tabs navigation ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="flex border-b border-gray-100 dark:border-gray-800">
                                {([
                                    { key: "informasi", label: "Informasi", icon: Info },
                                    { key: "galeri", label: "Galeri", icon: ImageIcon },
                                    { key: "ulasan", label: "Ulasan", icon: MessageSquare },
                                ] as { key: Tab; label: string; icon: React.ElementType }[]).map(tab => {
                                    const Icon = tab.icon
                                    const active = activeTab === tab.key
                                    return (
                                        <button key={tab.key}
                                            onClick={() => setActiveTab(tab.key)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-semibold border-b-2 transition-all ${active
                                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10"
                                                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                                            <Icon className="w-4 h-4" />
                                            {tab.label}
                                        </button>
                                    )
                                })}
                            </div>

                            {/* ── Tab: Informasi ── */}
                            {activeTab === "informasi" && (
                                <div className="p-5 space-y-4">
                                    {/* Tentang Pengajar */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                                                <span className="text-lg">❝</span>
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white tracking-wide uppercase">Tentang Pengajar</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{extra.bio}</p>
                                    </div>

                                    {/* Tentang Kursus */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                                                <BookOpen className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white tracking-wide uppercase">Tentang Kursus</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{extra.courseDescription}</p>
                                    </div>

                                    {/* Metode Belajar */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                                                <BookOpen className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white tracking-wide uppercase">Metode Belajar</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {extra.methods.map((m, i) => (
                                                <div key={i} className="flex gap-3 bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                                    <div className="w-10 h-10 rounded-lg bg-violet-500 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">{m.name.slice(0, 2)}</div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{m.name}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{m.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sertifikat */}
                                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                                                <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <h3 className="font-bold text-sm text-gray-900 dark:text-white tracking-wide uppercase">Sertifikat</h3>
                                        </div>
                                        {extra.certificates.length === 0 ? (
                                            <p className="text-sm text-gray-400 italic">Belum ada sertifikat yang diunggah.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {extra.certificates.map((c, i) => (
                                                    <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-amber-100 dark:border-amber-900/30 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                                        {/* Certificate thumbnail */}
                                                        <div className="relative w-full h-28 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
                                                            <Image src={c.imgUrl} alt={c.title} fill className="object-cover opacity-80" unoptimized />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-amber-900/40 to-transparent" />
                                                            <div className="absolute top-2 right-2">
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow">{c.year}</span>
                                                            </div>
                                                        </div>
                                                        {/* Certificate info */}
                                                        <div className="p-3">
                                                            <div className="flex items-start gap-2">
                                                                <Award className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-2">{c.title}</p>
                                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">{c.issuer}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── Tab: Galeri ── */}
                            {activeTab === "galeri" && (
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-9 h-9 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                                            <ImageIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                                        </div>
                                        <h3 className="font-bold text-sm text-gray-900 dark:text-white tracking-wide uppercase">Galeri Aktivitas</h3>
                                    </div>
                                    {extra.gallery.length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <ImageIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Belum ada foto galeri.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                            {extra.gallery.map((g, i) => (
                                                g.type === "video" && g.videoId ? (
                                                    // ── YouTube Embed ──
                                                    <div key={i} className="relative rounded-xl overflow-hidden aspect-video group bg-black shadow-sm">
                                                        <iframe
                                                            src={`https://www.youtube.com/embed/${g.videoId}?rel=0&modestbranding=1`}
                                                            title={g.caption}
                                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                            allowFullScreen
                                                            className="w-full h-full border-0"
                                                        />
                                                        {/* Caption bar below */}
                                                        <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-black/70 pointer-events-none">
                                                            <div className="flex items-center gap-1 text-white text-[10px] font-semibold">
                                                                <Video className="w-3 h-3 text-red-400 flex-shrink-0" />
                                                                {g.caption}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // ── Photo ──
                                                    <div key={i} className="relative rounded-xl overflow-hidden aspect-video group cursor-pointer">
                                                        <Image src={g.url} alt={g.caption} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                                                            <div className="flex items-center gap-1 text-white text-xs font-semibold">
                                                                <ImageIcon className="w-3 h-3 opacity-80" />
                                                                {g.caption}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Tab: Ulasan ── */}
                            {activeTab === "ulasan" && (
                                <div className="p-5 space-y-4">
                                    {extra.totalReviews === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <Star className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                            <p className="text-sm">Belum ada ulasan.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Rating breakdown */}
                                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                                                <div className="flex items-start gap-6">
                                                    {/* Big score */}
                                                    <div className="text-center flex-shrink-0">
                                                        <p className="text-5xl font-black text-gray-900 dark:text-white leading-none">{avgRating.toFixed(1)}</p>
                                                        <StarRow rating={Math.round(avgRating)} />
                                                        <p className="text-xs text-gray-400 mt-1">{extra.totalReviews} ulasan</p>
                                                    </div>
                                                    {/* Bars */}
                                                    <div className="flex-1 space-y-1.5">
                                                        {extra.ratingDist.map((pct, i) => (
                                                            <div key={i} className="flex items-center gap-2">
                                                                <div className="flex items-center gap-0.5 w-8 flex-shrink-0 justify-end">
                                                                    <span className="text-xs text-gray-600 dark:text-gray-400">{5 - i}</span>
                                                                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                                </div>
                                                                <div className="flex-1 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                                                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                                                                </div>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{pct}%</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Review list */}
                                            <div className="space-y-3">
                                                {extra.reviews.map((r, i) => (
                                                    <div key={i} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                                                        <div className="flex items-start justify-between gap-4 mb-2">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="relative w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
                                                                    <Image src={r.avatar} alt={r.name} fill className="object-cover" unoptimized />
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{r.name}</p>
                                                                    <StarRow rating={r.rating} />
                                                                </div>
                                                            </div>
                                                            <span className="text-xs text-gray-400 flex-shrink-0">{r.date}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-2">{r.comment}</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {r.tags.map((tag, j) => (
                                                                <span key={j} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900">
                                                                    <ThumbsUp className="w-2.5 h-2.5" />
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>

                    {/* ══════════ RIGHT SIDEBAR ══════════ */}
                    <div className="w-full lg:w-[320px] flex-shrink-0 space-y-4">

                        {/* ── Verifikasi Pengajar Card ── */}
                        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Header */}
                            <div className={`px-5 py-4 border-b ${isVerified ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40" : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/40"}`}>
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className={`w-5 h-5 ${isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`} />
                                    <h3 className={`font-bold text-sm ${isVerified ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
                                        Verifikasi Pengajar
                                    </h3>
                                </div>
                                {!allRequiredOk && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        Lengkapi item wajib untuk verifikasi
                                    </p>
                                )}
                            </div>

                            {/* Checklist */}
                            <div className="p-5 space-y-3">
                                {/* Data Diri - Wajib */}
                                <VerifItem
                                    ok={extra.verif.dataDiri}
                                    label="Data Diri"
                                    sublabel="Nama, foto, lokasi, spesialisasi"
                                    required
                                    icon={User}
                                />
                                {/* Video Al-Fatihah - Wajib */}
                                <VerifItem
                                    ok={extra.verif.videoFatihah}
                                    label="Video Membaca Al-Fatihah"
                                    sublabel="Bukti kelancaran bacaan"
                                    required
                                    icon={Video}
                                />
                                {/* Video Mengajar - Opsional */}
                                <VerifItem
                                    ok={extra.verif.videoMengajar}
                                    label="Video Mengajar"
                                    sublabel="Contoh kegiatan mengajar"
                                    required={false}
                                    icon={Video}
                                />
                                {/* Sertifikat - Opsional */}
                                <VerifItem
                                    ok={extra.verif.sertifikat}
                                    label="Sertifikat / Ijazah"
                                    sublabel="Dokumen pendukung keahlian"
                                    required={false}
                                    icon={FileText}
                                />
                            </div>

                            {/* Action button */}
                            <div className="px-5 pb-5">
                                {extra.status === "pending" && (
                                    <button disabled={!canVerify}
                                        className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${canVerify
                                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
                                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed"}`}>
                                        <ShieldCheck className="w-4 h-4" />
                                        {canVerify ? "Verifikasi Sekarang" : "Lengkapi Data Wajib Dulu"}
                                    </button>
                                )}
                                {extra.status === "verified" && (
                                    <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-sm font-bold">
                                        <CheckCircle2 className="w-4 h-4" />
                                        Pengajar Terverifikasi
                                    </div>
                                )}
                                {extra.status === "suspended" && (
                                    <button className="w-full py-2.5 rounded-xl text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white transition-all flex items-center justify-center gap-2">
                                        <ShieldCheck className="w-4 h-4" />
                                        Aktifkan Kembali
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ── Stats Card ── */}
                        {isVerified && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white mb-4">Statistik Pengajar</h3>
                                <div className="space-y-3">
                                    <StatRow label="Total Murid" value={`${totalStudents} murid`} />
                                    <StatRow label="Total Pesanan" value={`${guruBookings.length} pesanan`} />
                                    <StatRow label="Total Revenue" value={`Rp ${totalRevenue.toLocaleString("id-ID")}`} />
                                    <StatRow label="Rating" value={`${trainer.rating.toFixed(1)} / 5.0 ⭐`} />
                                    <StatRow label="Bergabung" value={new Date(extra.joinDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })} />
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function VerifItem({ ok, label, sublabel, required, icon: Icon }: {
    ok: boolean; label: string; sublabel: string; required: boolean; icon: React.ElementType
}) {
    return (
        <div className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${ok
            ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40"
            : required
                ? "bg-red-50 dark:bg-red-900/15 border-red-100 dark:border-red-900/40"
                : "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"}`}>
            {/* Status icon */}
            <div className="flex-shrink-0 mt-0.5">
                {ok
                    ? <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500" />
                    : required
                        ? <XCircle className="w-4.5 h-4.5 text-red-500" />
                        : <CircleDashed className="w-4.5 h-4.5 text-gray-400" />}
            </div>
            {/* Text */}
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <p className={`text-xs font-bold leading-tight ${ok ? "text-emerald-700 dark:text-emerald-300" : required ? "text-red-700 dark:text-red-300" : "text-gray-600 dark:text-gray-400"}`}>
                        {label}
                    </p>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${required ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"}`}>
                        {required ? "Wajib" : "Opsional"}
                    </span>
                </div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{sublabel}</p>
            </div>
            {/* Type icon */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${ok ? "bg-emerald-100 dark:bg-emerald-900/30" : required ? "bg-red-100 dark:bg-red-900/30" : "bg-gray-100 dark:bg-gray-800"}`}>
                <Icon className={`w-3.5 h-3.5 ${ok ? "text-emerald-600 dark:text-emerald-400" : required ? "text-red-500" : "text-gray-400"}`} />
            </div>
        </div>
    )
}

function StatRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
            <span className="text-xs font-bold text-gray-900 dark:text-white text-right">{value}</span>
        </div>
    )
}

// ── Page export ───────────────────────────────────────────────────────────────
export default function GuruDetailPage() {
    return (
        <DashboardLayout>
            <I18nProvider namespaces={["billing", "common"]}>
                <GuruDetailContent />
            </I18nProvider>
        </DashboardLayout>
    )
}
