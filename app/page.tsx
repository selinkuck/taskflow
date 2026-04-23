"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from "next/navigation";
import { 
  DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, rectIntersection
} from '@dnd-kit/core';
import { 
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Plus, Trash2, LogOut, Users, X, Edit3, MoveHorizontal, Rocket, UserPlus, Kanban, GripVertical, AlignLeft, Calendar, LayoutGrid, Sparkles, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';

const PRIMARY = '#3b82f6'; 

const getAvatarStyle = (email: string) => {
  if (!email) return { backgroundColor: '#94a3b8' };
  const colors = [PRIMARY, '#ec4899', '#22c55e', '#f59e0b', '#06b6d4', '#8b5cf6', '#f43f5e', '#10b981'];
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = email.charCodeAt(i) + ((hash << 5) - hash);
  return { backgroundColor: colors[Math.abs(hash) % colors.length], color: '#FFFFFF' };
};

// --- 1. GÖREV KARTI ---
function SortableTaskItem({ task, onDelete, onEdit }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { type: 'Task', task } });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  
  return (
    <div ref={setNodeRef} style={style} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex gap-3 items-start mb-3 group hover:border-blue-200 hover:shadow-md transition-all">
      <div {...attributes} {...listeners} className="cursor-grab text-slate-300 hover:text-slate-400 mt-1 shrink-0 p-1"><GripVertical size={18} /></div>
      <div className="flex-1 min-w-0 text-left">
        <div className="flex justify-between items-start mb-2 gap-2 text-slate-900">
          <span onClick={() => onEdit(task)} className="text-sm font-bold text-slate-700 leading-snug cursor-pointer hover:text-blue-600 flex-1 truncate">{task.content}</span>
          <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all"><Trash2 size={14} /></button>
        </div>
        {task.due_date && (
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2 font-bold bg-slate-50 w-fit px-2 py-0.5 rounded-md border border-slate-100">
            <Calendar size={12} className="text-slate-400" />
            {new Date(task.due_date).toLocaleDateString('tr-TR')}
          </div>
        )}
        <div className="flex items-center gap-3 mt-1 pt-3 border-t border-slate-50/50">
          <div style={getAvatarStyle(task.assigned_to_email)} className="w-6 h-6 rounded-full flex items-center justify-center border-2 border-white shadow-sm shrink-0 text-[9px] font-bold uppercase">{task.assigned_to_email?.charAt(0) || '?'}</div>
          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">{task.assigned_to_email?.split('@')[0]}</span>
          {task.description && <AlignLeft size={14} className="text-slate-200 ml-auto" />}
        </div>
      </div>
    </div>
  );
}

// --- 2. SÜTUN BİLEŞENİ ---
function SortableColumn({ col, children, onAddTask, onDeleteColumn, onUpdateTitle }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id, data: { type: 'Column', column: col } });
  const style = { transform: CSS.Translate.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  
  return (
    <div ref={setNodeRef} style={style} className="bg-slate-50 p-5 rounded-2xl w-80 min-h-[600px] flex flex-col shrink-0 border border-slate-200 shadow-inner text-slate-900 mx-1">
      <div className="flex justify-between items-center mb-5 px-1 text-slate-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-blue-500 p-1 shrink-0 transition-colors">
            <MoveHorizontal size={18} />
          </div>
          <div className="flex items-center gap-2 overflow-hidden">
            <h2 onClick={() => { const n = prompt("Sütun Başlığı:", col.title); if (n && n !== col.title) onUpdateTitle(col.id, n); }} 
                className="font-black uppercase text-[11px] tracking-widest truncate cursor-pointer hover:text-blue-600 transition-all text-slate-400">
              {col.title}
            </h2>
            <span className="bg-slate-200/70 text-slate-400 text-[10px] font-black px-2 py-0.5 rounded-lg shrink-0">
              {col.tasks?.length || 0}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onAddTask(col.id)} className="p-1.5 bg-white rounded-lg text-slate-400 shadow-sm hover:bg-slate-200 hover:text-slate-600 transition-all border border-slate-200"><Plus size={16} /></button>
          <button onClick={() => onDeleteColumn(col.id)} className="p-1 text-slate-300 hover:text-rose-500 transition-all"><X size={16} /></button>
        </div>
      </div>
      
      <div className="flex-1 bg-slate-200/30 rounded-xl p-2 shadow-inner border border-slate-200/50">
        <SortableContext items={col.tasks.map((t: any) => t.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}

// --- 3. ANA UYGULAMA ---
export default function KanbanApp() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [boards, setBoards] = useState<any[]>([]);
  const [activeBoard, setActiveBoard] = useState<any>(null);
  const [columns, setColumns] = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ id: '', content: '', description: '', assigned_to_email: '', due_date: '', column_id: '' });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) router.push("/login");
      else { setUser(user); fetchBoards(user.id); }
    };
    checkUser();
  }, []);

  const fetchBoards = async (userId: string) => {
    const { data } = await supabase.from('board_members').select('boards(*)').eq('user_id', userId);
    if (data) setBoards(data.map((item: any) => item.boards));
    setLoading(false);
  };

  const fetchKanbanData = async (boardId: string) => {
    const { data: cols } = await supabase.from('columns').select('*').eq('board_id', boardId).order('position');
    const { data: tasks } = await supabase.from('tasks').select('*').eq('board_id', boardId).order('created_at');
    if (cols) setColumns(cols.map(c => ({ ...c, tasks: tasks ? tasks.filter((t: any) => t.column_id === c.id) : [] })));
  };

  const updateBoardName = async () => {
    if (!activeBoard || !user) return;
    const currentId = activeBoard.id;
    const oldName = activeBoard.name;
    const newName = prompt("Yeni Proje Adı:", oldName);
    if (!newName || newName === oldName) return;
    setActiveBoard({ ...activeBoard, name: newName });
    const { error } = await supabase.from('boards').update({ name: newName }).eq('id', currentId);
    if (error) { setActiveBoard({ ...activeBoard, name: oldName }); fetchBoards(user.id); }
  };

  const handleSaveTask = async () => {
    if (!modalData.content) return;
    const taskObj = { content: modalData.content, description: modalData.description || '', assigned_to_email: modalData.assigned_to_email || '', due_date: modalData.due_date === '' ? null : modalData.due_date };
    if (modalData.id) await supabase.from('tasks').update(taskObj).eq('id', modalData.id);
    else await supabase.from('tasks').insert([{ ...taskObj, column_id: modalData.column_id, board_id: activeBoard.id, user_id: user.id }]);
    setIsModalOpen(false); fetchKanbanData(activeBoard.id);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event; setActiveItem(null); if (!over || !activeBoard) return;
    if (active.data.current?.type === 'Column') {
      const activeIndex = columns.findIndex(c => c.id === active.id); const overIndex = columns.findIndex(c => c.id === over.id);
      if (activeIndex !== overIndex) {
        const newOrder = arrayMove(columns, activeIndex, overIndex); setColumns(newOrder);
        for (let i = 0; i < newOrder.length; i++) await supabase.from('columns').update({ position: i }).eq('id', newOrder[i].id);
      }
      return;
    }
    const activeId = active.id; const overId = over.id; let newColumnId = ''; const overData = over.data.current;
    if (overData?.type === 'Column') newColumnId = overId as string; else if (overData?.type === 'Task') newColumnId = overData.task.column_id;
    if (newColumnId && active.data.current?.task.column_id !== newColumnId) {
      const movingTask = active.data.current?.task;
      setColumns(prev => prev.map(col => { if (col.id === movingTask.column_id) return { ...col, tasks: col.tasks.filter(t => t.id !== activeId) }; if (col.id === newColumnId) return { ...col, tasks: [...col.tasks, { ...movingTask, column_id: newColumnId }] }; return col; }));
      await supabase.from('tasks').update({ column_id: newColumnId }).eq('id', activeId); fetchKanbanData(activeBoard.id);
    }
  };

  if (loading && !activeBoard) return <div className="h-screen flex items-center justify-center font-bold text-slate-900 bg-white">Yükleniyor...</div>;

  if (!activeBoard) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center p-8 text-slate-900 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-50 rounded-full blur-[100px] opacity-40"></div>
        <header className="w-full max-w-[1600px] flex justify-between items-center mb-16 mt-4 relative z-10 px-4">
           <h1 className="text-3xl font-black italic flex items-center gap-3 tracking-tighter text-slate-800">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-blue-200 shadow-lg"><Kanban className="text-white" size={24} /></div>
             TaskFlow <span className="text-blue-600">Teams</span>
           </h1>
           <button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="p-3 bg-white text-slate-400 rounded-2xl border border-slate-100 shadow-sm hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"><LogOut size={20} /></button>
        </header>

        <div className="w-full max-w-[1600px] relative z-10 mb-20 px-4">
          <div className="grid grid-cols-2 gap-10">
            <button onClick={() => { const n = prompt("Proje Adı:"); if (n) { const sc = Math.random().toString(36).substring(2, 8).toUpperCase(); supabase.from('boards').insert([{ name: n, share_code: sc, owner_id: user.id }]).select().then(({ data }) => { if (data && data.length > 0) supabase.from('board_members').insert([{ board_id: data[0].id, user_id: user.id }]).then(() => fetchBoards(user.id)); }); } }} 
              className="group bg-blue-600 p-14 rounded-2xl shadow-2xl shadow-blue-100 transition-all text-left hover:bg-blue-700 active:scale-95 flex flex-col items-start min-h-[350px] w-full border border-blue-700">
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center mb-10 group-hover:rotate-6 transition-transform shadow-inner"><Rocket size={40} className="text-white" /></div>
              <h2 className="text-4xl font-black text-white mb-4">Yeni Proje Başlat</h2>
              <p className="text-blue-100 font-medium text-lg leading-relaxed">Ekibin için modern bir çalışma alanı oluştur ve tüm süreçleri uçtan uca yönet.</p>
            </button>
            <button onClick={() => { const code = prompt("Katılım Kodu:"); if (code) supabase.from('boards').select('*').eq('share_code', code).then(({ data }) => { if (data && data.length > 0) supabase.from('board_members').insert([{ board_id: data[0].id, user_id: user.id }]).then(() => fetchBoards(user.id)); }); }}
              className="group bg-white p-14 rounded-2xl border border-slate-200 shadow-xl shadow-slate-100 transition-all text-left hover:border-blue-400 hover:shadow-2xl active:scale-95 flex flex-col items-start min-h-[350px] w-full">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-10 group-hover:rotate-110 transition-transform"><UserPlus size={40} className="text-slate-400" /></div>
              <h2 className="text-4xl font-black text-slate-800 mb-4">Mevcut Ekibe Katıl</h2>
              <p className="text-slate-500 font-bold text-lg leading-relaxed">Paylaşım koduyla ekibinin çalışma alanına dahil ol ve işbirliğine hemen başla.</p>
            </button>
          </div>
        </div>

        <div className="w-full max-w-[1600px] relative z-10 px-4">
           <div className="flex items-center gap-4 mb-12 ml-2">
             <div className="p-3 bg-blue-50 rounded-2xl shadow-sm border border-blue-100"><LayoutGrid size={24} className="text-blue-500" /></div>
             <h3 className="text-xl font-black text-slate-700 uppercase tracking-[0.15em]">Çalışma Alanların</h3>
             <div className="h-[2px] flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-20">
            {boards.map(b => (
              <div key={b.id} onClick={() => { setActiveBoard(b); fetchKanbanData(b.id); }} 
                className="group relative bg-white p-10 rounded-2xl border border-slate-100 shadow-lg shadow-slate-200/50 cursor-pointer hover:shadow-2xl hover:-translate-y-1 hover:border-blue-200 transition-all active:scale-95 flex flex-col min-h-[220px]"
              >
                <div className="absolute top-6 right-6 p-2 bg-blue-50 rounded-xl text-blue-600 opacity-0 group-hover:opacity-100 transition-all"><Sparkles size={16} /></div>
                <h3 className="font-black text-2xl text-slate-700 group-hover:text-blue-600 transition-colors mb-auto leading-tight pr-4">{b.name}</h3>
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
                   <div className="flex flex-col">
                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Erişim Kodu</span>
                     <span className="text-xs font-bold text-slate-600 bg-slate-50 px-4 py-1.5 rounded-xl border border-slate-100">{b.share_code}</span>
                   </div>
                   <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1 shadow-sm">→</div>
                </div>
              </div>
            ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 flex flex-col items-center font-sans text-slate-900">
      <DndContext sensors={sensors} collisionDetection={rectIntersection} onDragStart={(e) => setActiveItem(e.active.data.current)} onDragEnd={onDragEnd}>
        <div className="w-full max-w-[1600px]">
          <header className="flex items-center justify-between mb-10 bg-white/80 backdrop-blur-md p-5 rounded-2xl shadow-sm border border-slate-100 sticky top-4 z-[50]">
            <div className="flex items-center gap-4 text-slate-800 font-bold">
              <button onClick={() => setActiveBoard(null)} className="p-3 bg-slate-50 hover:bg-white rounded-xl border border-slate-100 transition-all active:scale-90 text-slate-500 hover:text-blue-600">←</button>
              <h1 onClick={updateBoardName} className="text-2xl font-black tracking-tight cursor-pointer hover:text-blue-600 transition-all">{activeBoard.name}</h1>
            </div>
            <div className="flex gap-4"><button onClick={() => supabase.auth.signOut().then(() => router.push("/login"))} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"><LogOut size={22} /></button></div>
          </header>
          
          <div className="flex justify-center w-full">
            <div className="flex flex-row gap-6 overflow-x-auto pb-10 px-8 scrollbar-hide items-start">
              <SortableContext items={columns.map(c => c.id)} strategy={horizontalListSortingStrategy}>
                {columns.map(col => (
                  <SortableColumn key={col.id} col={col} 
                    onAddTask={(cid: string) => { setModalData({ id: '', content: '', description: '', assigned_to_email: user.email, due_date: '', column_id: cid }); setIsModalOpen(true); }} 
                    onUpdateTitle={async (id: string, title: string) => { await supabase.from('columns').update({ title }).eq('id', id); fetchKanbanData(activeBoard.id); }} 
                    onDeleteColumn={(cid: string) => { if (confirm("Silinsin mi?")) supabase.from('columns').delete().eq('id', cid).then(() => fetchKanbanData(activeBoard.id)); }}
                  >
                    {col.tasks.map((task: any) => (<SortableTaskItem key={task.id} task={task} onEdit={(t: any) => { setModalData({ ...t, due_date: t.due_date || '' }); setIsModalOpen(true); }} onDelete={(id: string) => supabase.from('tasks').delete().eq('id', id).then(() => fetchKanbanData(activeBoard.id))} />))}
                  </SortableColumn>
                ))}
              </SortableContext>
              
              <button onClick={() => { const t = prompt("Sütun Adı:"); if (t) supabase.from('columns').insert([{ title: t, board_id: activeBoard.id, user_id: user.id, position: columns.length }]).then(() => fetchKanbanData(activeBoard.id)); }} 
                className="w-12 h-12 shrink-0 bg-slate-100 hover:bg-slate-200 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center transition-all duration-200 mt-2 text-slate-400 group active:scale-95 shadow-sm">
                <Plus size={24} strokeWidth={3} className="group-hover:text-slate-600"/>
              </button>
            </div>
          </div>
        </div>
        
        <DragOverlay dropAnimation={{ duration: 250 }}>
          {activeItem?.type === 'Column' ? (
            <div className="bg-slate-50 p-5 rounded-2xl w-80 min-h-[400px] shadow-2xl border border-slate-200 opacity-90 scale-105 text-slate-900">
              <div className="flex items-center gap-2 mb-4 px-1">
                 <MoveHorizontal size={18} className="text-slate-400" />
                 <h2 className="font-black text-slate-400 uppercase text-[11px]">{activeItem.column.title}</h2>
              </div>
              <div className="bg-slate-200/30 rounded-xl p-2 shadow-inner border border-slate-200/50">
                {activeItem.column.tasks.map((t:any) => (<div key={t.id} className="bg-white p-4 rounded-xl border mb-3 shadow-sm text-sm font-bold text-slate-800">{t.content}</div>))}
              </div>
            </div>
          ) : activeItem?.type === 'Task' ? (
            <div className="bg-white p-4 rounded-xl border-2 shadow-2xl flex gap-3 items-start w-80 opacity-95 scale-105 text-slate-900 border-blue-500">
              <GripVertical size={18} className="text-slate-300 mt-1" />
              <span className="text-sm font-bold text-slate-800 leading-snug">{activeItem.task.content}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {isModalOpen && (<div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md z-[999] flex items-center justify-center p-4"><div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-900 font-sans animate-in zoom-in duration-200 border">
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg tracking-tight"><div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Edit3 size={18} /></div> {modalData.id ? "Düzenle" : "Yeni Görev"}</h3>
          <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-[0.1em]">Başlık</label><input autoFocus type="text" value={modalData.content} onChange={(e) => setModalData({...modalData, content: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 text-sm transition-all" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-[0.1em]">Sorumlu</label><input type="email" value={modalData.assigned_to_email} onChange={(e) => setModalData({...modalData, assigned_to_email: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 text-sm transition-all" /></div>
            <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-[0.1em]">Tarih</label><input type="date" value={modalData.due_date} onChange={(e) => setModalData({...modalData, due_date: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 font-bold text-slate-700 text-sm transition-all cursor-pointer" /></div>
          </div>
          <div><label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 tracking-[0.1em]">Açıklama</label><textarea value={modalData.description} onChange={(e) => setModalData({...modalData, description: e.target.value})} rows={2} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-blue-500 resize-none text-slate-600 font-medium text-sm transition-all" /></div>
        </div>
        <div className="p-6 bg-slate-50/50 border-t border-slate-50 flex gap-3">
          <button onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all uppercase text-[10px] tracking-widest">İptal</button>
          <button onClick={handleSaveTask} className="flex-1 px-4 py-3 bg-blue-600 rounded-xl text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all uppercase text-[10px] tracking-widest">Kaydet</button>
        </div>
      </div></div>)}
    </div>
  );
}