"use client";
import React, { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Layout, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';

// --- TİPLER ---
interface Task {
  id: string;
  content: string;
  column_id: string;
  position: number;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

// --- SÜTUN BİLEŞENİ ---
function KanbanColumn({ col, children, onAdd }: { col: Column; children: React.ReactNode; onAdd: (id: string) => void }) {
  const { setNodeRef } = useSortable({ id: col.id });

  return (
    <div ref={setNodeRef} className="bg-slate-200/60 border border-slate-200 p-4 rounded-2xl w-80 min-h-[500px] flex flex-col shadow-sm">
      <div className="flex justify-between items-center mb-5 px-1">
        <h2 className="font-bold text-slate-600 uppercase text-xs tracking-widest">{col.title}</h2>
        <button onClick={() => onAdd(col.id)} className="bg-white p-1.5 rounded-md border shadow-sm hover:bg-blue-50 text-blue-600 transition-colors">
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}

// --- KART BİLEŞENİ ---
function SortableTask({ task, columnId, onDelete, isOverlay = false }: { task: Task; columnId?: string; onDelete?: (id: string) => void; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: isOverlay
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0.3 : 1,
    cursor: isOverlay ? 'grabbing' : 'default'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white p-4 mb-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 group transition-all ${isOverlay ? 'shadow-2xl border-blue-500 rotate-2' : 'hover:border-blue-400'}`}
    >
      <div {...attributes} {...listeners} className={`${isOverlay ? 'cursor-grabbing' : 'cursor-grab'} text-slate-400 hover:text-blue-500 p-1`}>
        <GripVertical size={18} />
      </div>
      <span className="flex-1 text-sm text-slate-700 font-medium leading-relaxed">{task.content}</span>
      {!isOverlay && onDelete && (
        <button onClick={() => onDelete(task.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1 transition-opacity">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}

// --- ANA UYGULAMA ---
export default function KanbanBoard() {
  const [loading, setLoading] = useState(true);
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'Yapılacaklar 📝', tasks: [] },
    { id: 'doing', title: 'Devam Edenler 🚀', tasks: [] },
    { id: 'done', title: 'Bitenler ✅', tasks: [] },
  ]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchTasks(); }, []);

  async function fetchTasks() {
    try {
      const { data, error } = await supabase.from('tasks').select('*').order('position', { ascending: true });
      if (error) throw error;
      if (data) {
        setColumns([
          { id: 'todo', title: 'Yapılacaklar 📝', tasks: data.filter((t: any) => t.column_id === 'todo') },
          { id: 'doing', title: 'Devam Edenler 🚀', tasks: data.filter((t: any) => t.column_id === 'doing') },
          { id: 'done', title: 'Bitenler ✅', tasks: data.filter((t: any) => t.column_id === 'done') },
        ]);
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }

  function handleDragStart(event: DragStartEvent) {
    const task = columns.flatMap(col => col.tasks).find(t => t.id === event.active.id);
    if (task) setActiveTask(task);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const overCol = columns.find(c => c.id === overId || c.tasks.some(t => t.id === overId));
    if (!overCol) return;

    // Arayüzü anında güncelle
    const updatedCols = columns.map(col => {
      const isSource = col.tasks.some(t => t.id === activeId);
      const isTarget = col.id === overCol.id;
      
      if (isSource && isTarget) return col; // Aynı sütunsa fetchTasks halleder
      if (isSource) return { ...col, tasks: col.tasks.filter(t => t.id !== activeId) };
      if (isTarget) return { ...col, tasks: [...col.tasks, { ...activeTask!, column_id: overCol.id }] };
      return col;
    });
    setColumns(updatedCols);

    await supabase.from('tasks').update({ column_id: overCol.id, position: Date.now() }).eq('id', activeId);
    fetchTasks();
  }

  const addTask = async (colId: string) => {
    const content = prompt("Yeni görev nedir?");
    if (!content) return;
    const { data, error } = await supabase.from('tasks').insert([{ content, column_id: colId, position: Date.now() }]).select();
    if (!error) fetchTasks();
  };

  const deleteTask = async (id: string) => {
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (!error) fetchTasks();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 border-b pb-8 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg"><Layout size={28} /></div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">TaskFlow <span className="text-blue-600">AI</span></h1>
              <p className="text-slate-500 text-sm font-medium">KoçSistem Teknik Proje</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm mt-4 md:mt-0">
            <Sparkles className="text-amber-500" size={18} />
            <span className="text-sm font-semibold text-slate-600 italic">AI Asistanı Aktif</span>
          </div>
        </header>
        
        <div className="flex flex-row gap-8 overflow-x-auto pb-8 items-start scrollbar-hide">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {columns.map(col => (
              <KanbanColumn key={col.id} col={col} onAdd={addTask}>
                <SortableContext items={col.tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  {col.tasks.map(task => (
                    <SortableTask key={task.id} task={task} columnId={col.id} onDelete={deleteTask} />
                  ))}
                </SortableContext>
              </KanbanColumn>
            ))}
            {/* BURASI SİHİRLİ DOKUNUŞ: Sürüklenen kartın hayaleti */}
            <DragOverlay>
              {activeTask ? (
                <SortableTask task={activeTask} isOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </div>
  );
}