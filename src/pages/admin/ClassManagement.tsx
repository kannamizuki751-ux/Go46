import { useState, useEffect } from 'react';
import { 
  Plus, 
  School, 
  Trash2, 
  Users, 
  BookOpen,
  Loader2,
  X,
  Search
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getSupabase } from '../../lib/supabase';

interface Class {
  id: string;
  name: string;
  description: string;
  student_count?: number;
}

export default function ClassManagement() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = getSupabase();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('classes').insert({
        name: newClassName,
        description: newClassDesc
      });
      if (error) throw error;
      setShowAddModal(false);
      setNewClassName('');
      setNewClassDesc('');
      fetchClasses();
    } catch (err) {
      alert('Gagal menambah kelas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteClass = async (id: string) => {
    if (!confirm('Hapus kelas ini?')) return;
    try {
      const { error } = await supabase.from('classes').delete().eq('id', id);
      if (error) throw error;
      fetchClasses();
    } catch (err) {
      alert('Gagal menghapus kelas');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Data Kelas</h2>
          <p className="text-slate-500 font-medium">Kelola rombongan belajar dan grup studi.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-blue-200"
        >
          <Plus className="w-5 h-5" />
          Tambah Kelas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="font-bold text-slate-400">Menghubungkan ke Database Kelas...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="col-span-full bg-white rounded-[40px] border-2 border-dashed border-slate-100 p-20 text-center">
            <School className="w-16 h-16 text-slate-100 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Belum ada kelas yang terdaftar.</p>
          </div>
        ) : (
          classes.map((c) => (
            <motion.div 
              layout
              key={c.id} 
              className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm hover:border-blue-200 transition-all group relative overflow-hidden"
            >
               <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                 <School className="w-24 h-24 text-blue-900" />
               </div>
               
               <div className="space-y-6 relative z-10">
                  <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-[20px] flex items-center justify-center shadow-sm">
                    <BookOpen className="w-7 h-7" />
                  </div>
                  
                  <div>
                    <h4 className="text-2xl font-black text-slate-900 tracking-tight">{c.name}</h4>
                    <p className="text-slate-400 text-sm font-medium mt-1">{c.description || 'Tidak ada deskripsi'}</p>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-xs uppercase tracking-widest">
                       <Users className="w-4 h-4 text-blue-500" />
                       Tersisa 0 Siswa
                    </div>
                    <button 
                      onClick={() => deleteClass(c.id)}
                      className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
               </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-[40px] p-8 md:p-12 max-w-lg w-full shadow-2xl relative"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-8 right-8 p-3 text-slate-400 hover:bg-slate-50 rounded-2xl"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">Portal Kelas Baru</h3>
                  <p className="text-slate-400 mt-2 font-medium">Buat grup belajar baru dalam sistem.</p>
                </div>

                <form onSubmit={handleAddClass} className="space-y-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Kelas</label>
                     <input 
                       required
                       value={newClassName}
                       onChange={(e) => setNewClassName(e.target.value)}
                       className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:border-blue-500 focus:bg-white outline-none font-bold placeholder:text-slate-300 transition-all"
                       placeholder="Contoh: X MIPA 1"
                     />
                   </div>

                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Deskripsi / Keterangan</label>
                     <textarea 
                       value={newClassDesc}
                       onChange={(e) => setNewClassDesc(e.target.value)}
                       className="w-full p-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:border-blue-500 focus:bg-white outline-none font-bold placeholder:text-slate-300 transition-all min-h-[100px]"
                       placeholder="Opsional..."
                     />
                   </div>

                   <button 
                     disabled={isSubmitting}
                     className="w-full py-5 bg-blue-600 text-white rounded-[24px] font-black shadow-2xl shadow-blue-200 transition-all disabled:opacity-50"
                   >
                     {isSubmitting ? 'Mendaftarkan...' : 'Konfirmasi & Buat'}
                   </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
