import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, BookOpen, Clock, Users, ChevronRight, CheckCircle2, Sparkles, Layout, Zap, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { ThemeToggle } from '../components/ThemeToggle';

export default function LandingPage() {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  
  // Ganti ID ini saja untuk mengubah video di seluruh halaman
  const YOUTUBE_VIDEO_ID = "iC6bDCEWcYo";

  return (
    <div className="min-h-screen font-sans bg-[var(--bg-main)] text-[var(--primary)] transition-colors duration-500 overflow-x-hidden">
      {/* Video Modal Overlay */}
      <AnimatePresence>
        {isVideoOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-black/90 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-6xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setIsVideoOpen(false)}
                className="absolute top-4 right-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white"
              >
                <X className="w-6 h-6" />
              </button>
              <iframe 
                src={`https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}?autoplay=1`}
                title="Panduan Ujian Digital Go46" 
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowFullScreen
              ></iframe>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Floating Actions */}
      <div className="fixed top-8 right-8 z-50 flex items-center gap-4">
        <ThemeToggle />
      </div>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-32 pb-16 md:pb-24 px-4 md:px-6 bg-[var(--bg-main)]">
        {/* Animated Background Orbs - Representing Roles */}
        <div className="absolute top-0 right-0 -z-10 w-[300px] md:w-[800px] h-[300px] md:h-[800px] bg-amber-500/10 rounded-full blur-[80px] md:blur-[120px] -translate-y-1/2 translate-x-1/4 animate-pulse" />
        <div className="absolute bottom-0 left-0 -z-10 w-[200px] md:w-[600px] h-[200px] md:h-[600px] bg-indigo-600/10 rounded-full blur-[60px] md:blur-[100px] translate-y-1/3 -translate-x-1/4" />
        <div className="absolute top-1/2 left-1/2 -z-10 w-[150px] md:w-[400px] h-[150px] md:h-[400px] bg-sky-500/10 rounded-full blur-[50px] md:blur-[80px] -translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full px-2"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 md:mb-8 rounded-full bg-blue-600/10 border border-blue-600/20 text-blue-600 font-medium text-[10px] md:text-xs tracking-widest uppercase">
              <Sparkles className="w-3 h-3" />
              <span>Masa Depan Penilaian Digital</span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold mb-6 md:mb-10 leading-[1.1] md:leading-[1.05] lg:leading-[0.95] tracking-tight max-w-6xl mx-auto text-[var(--primary)] text-center">
              Ujian Digital <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-500">Tanpa Batas.</span>
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl opacity-70 mb-8 md:mb-12 max-w-2xl mx-auto font-medium leading-relaxed px-4 text-[var(--primary)]">
              Go46 menghadirkan ekosistem ujian CBT yang presisi, aman secara real-time, dan dirancang khusus untuk mendukung prestasi siswa SMKN 46 Jakarta.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 w-full max-w-lg mx-auto sm:max-w-none">
              <Link
                id="cta-start"
                to="/login"
                className="group relative w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 bg-accent text-white rounded-2xl font-bold text-base md:text-lg flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-accent/30 overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
                <span>Mulai Sekarang</span>
                <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={() => setIsVideoOpen(true)}
                className="w-full sm:w-auto px-8 md:px-10 py-4 md:py-5 glass border border-[var(--border-premium)] rounded-2xl font-bold text-base md:text-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-95 text-[var(--primary)]"
              >
                Lihat Panduan
              </button>
            </div>
          </motion.div>

          {/* Premium Preview Component */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 60 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-16 md:mt-24 w-full relative group px-2 sm:px-0"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-accent to-indigo-500 rounded-[1.5rem] md:rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000" />
            <div 
              onClick={() => setIsVideoOpen(true)}
              className="glass-premium rounded-[1.5rem] md:rounded-[2.2rem] overflow-hidden aspect-[4/3] sm:aspect-[16/9] md:aspect-[21/9] flex items-center justify-center relative group cursor-pointer"
            >
               {/* YouTube Preview Background */}
               <img 
                 src={`https://img.youtube.com/vi/${YOUTUBE_VIDEO_ID}/hqdefault.jpg`}
                 alt="Youtube Preview" 
                 className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-main)] via-transparent to-transparent opacity-60" />
               
               <div className="relative z-10 text-center p-6 bg-black/5 dark:bg-white/5 backdrop-blur-[2px] rounded-3xl border border-white/10 p-8 shadow-2xl">
                  <div className="w-16 h-16 md:w-24 md:h-24 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-2xl shadow-accent/50 group-hover:scale-110 transition-transform">
                    <div className="w-0 h-0 border-t-[8px] md:border-t-[12px] border-t-transparent border-l-[14px] md:border-l-[22px] border-l-white border-b-[8px] md:border-b-[12px] border-b-transparent ml-1.5 md:ml-2" />
                  </div>
                  <p className="font-display font-semibold text-lg md:text-2xl text-[var(--primary)]">Pengalaman Ujian Cerdas</p>
                  <p className="opacity-50 text-xs md:text-sm mt-2 text-[var(--primary)]">Klik untuk melihat demo sistem penilaian digital kami.</p>
               </div>
               
               {/* Decorative GUI elements */}
               <div className="absolute top-10 left-10 w-48 h-32 glass rounded-2xl p-4 opacity-50 hidden lg:block">
                  <div className="w-full h-2 bg-accent/20 rounded-full mb-2" />
                  <div className="w-3/4 h-2 bg-accent/20 rounded-full mb-6" />
                  <div className="flex justify-between items-end">
                    <div className="w-8 h-12 bg-accent/40 rounded-t-lg" />
                    <div className="w-8 h-16 bg-accent/60 rounded-t-lg" />
                    <div className="w-8 h-8 bg-accent/20 rounded-t-lg" />
                  </div>
               </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-32 px-4 md:px-6 bg-[var(--bg-main)]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 md:gap-8 mb-12 md:mb-20 text-[var(--primary)] px-2">
            <div className="text-center md:text-left">
              <p className="text-accent font-bold tracking-widest uppercase text-[10px] md:text-sm mb-3 md:mb-4">Intelligence</p>
              <h2 className="text-3xl md:text-6xl font-display font-bold leading-tight">Teknologi yang <br className="hidden md:block" />Memahami Kebutuhan.</h2>
            </div>
            <p className="max-w-md opacity-70 font-medium text-sm md:text-base text-center md:text-left">Kami merancang setiap fitur untuk memastikan integritas data dan kemudahan akses bagi seluruh civitas akademika.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            <PremiumCard
              icon={<Shield className="w-6 h-6 md:w-7 md:h-7" />}
              title="Keamanan Utama"
              description="Sistem pengawasan cerdas yang mendeteksi segala upaya kecurangan secara real-time untuk menjaga integritas ujian."
              color="accent"
            />
            <PremiumCard
              icon={<Layout className="w-6 h-6 md:w-7 md:h-7" />}
              title="Antarmuka Modern"
              description="Tampilan yang bersih dan fokus, dirancang khusus agar siswa dapat mengerjakan soal dengan konsentrasi penuh."
              color="indigo"
            />
            <PremiumCard
              icon={<Zap className="w-6 h-6 md:w-7 md:h-7" />}
              title="Analisis Instan"
              description="Dapatkan hasil analisis statistik soal dan performa siswa secara otomatis tepat setelah ujian selesai."
              color="amber"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto relative group">
          <div className="absolute -inset-2 md:-inset-4 bg-gradient-to-r from-accent/50 to-indigo-500/50 rounded-[2.5rem] md:rounded-[4rem] blur-2xl md:blur-3xl opacity-20 group-hover:opacity-40 transition-opacity" />
          <div className="relative bg-slate-900 dark:bg-accent rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-24 overflow-hidden text-center text-white">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-black/10 rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2" />
            
            <h2 className="text-3xl md:text-6xl font-display font-bold mb-6 md:mb-8 relative z-10 leading-tight">Siap Untuk <br className="hidden md:block" />Ujian Hari Ini?</h2>
            <p className="text-white/70 text-base md:text-xl font-medium mb-8 md:mb-12 max-w-2xl mx-auto relative z-10 px-4">Pastikan koneksi internet stabil dan masuk menggunakan akun resmi SMKN 46 Jakarta yang telah terdaftar.</p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 md:gap-6 relative z-10 px-4">
              <Link
                to="/login"
                className="w-full sm:w-auto px-10 md:px-12 py-4 md:py-5 bg-white text-slate-900 dark:text-accent rounded-2xl font-bold text-base md:text-lg hover:scale-105 active:scale-95 transition-all shadow-2xl"
              >
                Masuk ke Portal
              </Link>
              <button className="w-full sm:w-auto px-10 md:px-12 py-4 md:py-5 bg-white/10 border border-white/20 rounded-2xl font-bold text-base md:text-lg backdrop-blur-md hover:bg-white/20 transition-all active:scale-95">
                Bantuan Teknis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 md:py-20 px-4 md:px-6 border-t border-[var(--border-premium)] bg-[var(--bg-card)]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 text-[var(--primary)]">
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 flex items-center justify-center">
                <img src="/logo.png" alt="Logo SMKN 46 Jakarta" className="w-full h-full object-contain" />
              </div>
              <span className="font-display font-bold text-xl tracking-tighter">SMKN 46 JAKARTA</span>
            </div>
            <p className="opacity-70 max-w-xs font-medium text-sm md:text-base leading-relaxed">Sistem Penilaian Berbasis Komputer resmi untuk mewujudkan lulusan yang kompeten dan berintegritas.</p>
          </div>
          
          <div className="sm:col-span-1">
            <h4 className="font-bold mb-4 md:mb-6 text-sm uppercase tracking-widest opacity-40">Layanan</h4>
            <ul className="space-y-3 md:space-y-4 opacity-70 font-medium text-sm md:text-base">
              <li><a href="#" className="hover:text-accent transition-colors">Fitur Ujian</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Data Siswa</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Keamanan</a></li>
            </ul>
          </div>
          
          <div className="sm:col-span-1">
            <h4 className="font-bold mb-4 md:mb-6 text-sm uppercase tracking-widest opacity-40">Sekolah</h4>
            <ul className="space-y-3 md:space-y-4 opacity-70 font-medium text-sm md:text-base">
              <li><a href="#" className="hover:text-accent transition-colors">Tentang Kami</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Visi & Misi</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Kontak</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto mt-12 md:mt-20 pt-8 md:pt-10 border-t border-[var(--border-premium)] flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6 opacity-60 text-[10px] md:text-xs font-bold uppercase tracking-widest text-[var(--primary)] text-center md:text-left">
          <p>© 2026 Go46 - Sistem Manajemen SMKN 46 Jakarta.</p>
          <div className="flex gap-6 md:gap-8">
            <a href="#">Kebijakan Privasi</a>
            <a href="#">Syarat & Ketentuan</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PremiumCard({ icon, title, description, color }: { icon: ReactNode; title: string; description: string; color: string }) {
  const colors: Record<string, string> = {
    accent: "bg-accent/10 text-accent",
    indigo: "bg-indigo-500/10 text-indigo-500",
    amber: "bg-amber-500/10 text-amber-500"
  };

  return (
    <div className="p-8 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] bg-[var(--bg-card)] border border-[var(--border-premium)] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl shadow-black/5 group">
      <div className={cn("w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center mb-6 md:mb-8 transition-transform group-hover:scale-110", colors[color])}>
        {icon}
      </div>
      <h3 className="text-xl md:text-2xl font-display font-bold mb-3 md:mb-4 text-[var(--primary)]">{title}</h3>
      <p className="text-[var(--primary)] opacity-70 text-sm md:text-base leading-relaxed font-medium">{description}</p>
    </div>
  );
}
