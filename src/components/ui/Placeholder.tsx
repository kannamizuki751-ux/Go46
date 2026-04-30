import { motion } from 'motion/react';
import { Construction, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Placeholder({ title }: { title: string }) {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
        <Construction className="w-10 h-10 text-blue-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-800 mb-2">{title}</h1>
      <p className="text-slate-500 mb-8 max-w-sm">Halaman ini sedang dalam tahap pengembangan. Silakan kembali lagi nanti.</p>
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" /> Kembali
      </button>
    </div>
  );
}
