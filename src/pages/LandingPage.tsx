import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Shield, BookOpen, Clock, Users, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 overflow-x-hidden">
      {/* Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">U</span>
            </div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">
              EduTest46
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/login" className="px-5 py-2 rounded-full font-medium text-slate-600 hover:text-blue-600 transition-colors">
              Login
            </Link>
            <Link to="/login" className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
              Mulai Sekarang
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 -z-10 w-[400px] h-[400px] bg-sky-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 mb-6 text-sm font-semibold tracking-wider text-blue-600 uppercase bg-blue-50 rounded-full">
              Platform Ujian Digital Modern
            </span>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-8 leading-[1.1] tracking-tight text-slate-900">
              Ujian Lebih <span className="text-blue-600">Simpel</span>, <br />
              Lebih <span className="text-sky-500">Transparan</span>.
            </h1>
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              EduTest46 adalah solusi Computer Based Test (CBT) tercanggih dengan fitur anti-kecurangan real-time, pengelolaan bank soal terpusat, dan rekapitulasi nilai otomatis.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 hover:-translate-y-1"
              >
                Coba Demo Gratis <ChevronRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all">
                Lihat Panduan
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative mx-auto max-w-5xl rounded-2xl overflow-hidden shadow-2xl border-4 border-white"
          >
            <div className="aspect-video bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:scale-110 transition-transform">
                  <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                </div>
                <p className="text-white font-medium">Tonton Video Demo</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-white px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Fitur Unggulan Kami</h2>
            <p className="text-slate-500">Mendukung ekosistem pendidikan digital yang sehat dan efisien.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Shield className="w-6 h-6 text-blue-600" />}
              title="Anti-Kecurangan Real-time"
              description="Deteksi otomatis saat siswa meninggalkan halaman ujian, ganti tab, atau mencoba melakukan aksi curang lainnya."
            />
            <FeatureCard
              icon={<Clock className="w-6 h-6 text-sky-500" />}
              title="Countdown & Auto-Submit"
              description="Manajemen waktu ujian yang akurat dengan fitur pengumpulan otomatis saat waktu habis."
            />
            <FeatureCard
              icon={<Users className="w-6 h-6 text-indigo-500" />}
              title="Multi-Role System"
              description="Akses terpisah untuk Admin, Guru, dan Siswa dengan dashboard yang disesuaikan dengan kebutuhan masing-masing."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-blue-700 to-indigo-800 rounded-[32px] p-8 md:p-16 text-center text-white relative overflow-hidden shadow-2xl shadow-blue-200">
           {/* Decorative circles */}
           <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl" />
           <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-400/20 rounded-full translate-x-1/2 translate-y-1/2 blur-2xl" />
           
           <h2 className="text-3xl md:text-4xl font-bold mb-6 relative z-10">Siap Mendigitalisasi Ujian di Sekolah Anda?</h2>
           <p className="text-blue-100 mb-10 text-lg max-w-xl mx-auto relative z-10">Bergabunglah dengan ribuan sekolah yang telah menggunakan EduTest46 untuk pengalaman ujian yang lebih baik.</p>
           <Link
             to="/login"
             className="inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-sky-50 transition-all relative z-10"
           >
             Mulai Gunakan Sekarang <ChevronRight className="w-5 h-5" />
           </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">U</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-800">EduTest46</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 EduTest46. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Privacy</a>
            <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Terms</a>
            <a href="#" className="text-slate-400 hover:text-blue-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="p-8 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-slate-100 transition-all group">
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}
