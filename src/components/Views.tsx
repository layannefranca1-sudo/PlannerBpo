'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Trash2, 
  Edit, 
  Plus, 
  X,
  MapPin,
  Calendar as CalendarIcon,
  User as UserIcon,
  Fuel,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Trello,
  ListChecks,
  AlertTriangle,
  Filter,
  BarChart3,
  Maximize2,
  Play,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, isSameDay, eachDayOfInterval, startOfWeek, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isToday, subMonths, addMonths, addDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { supabase } from '../lib/supabaseClient';
import { User, Empresa, Task, DashboardStats, Status, Priority, ChecklistItem } from '../types';

// --- Badges ---

export const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    CONCLUIDA: 'bg-[#d1fae5]/10 text-[#6ee7b7] border-[#6ee7b7]/20',
    EM_ANDAMENTO: 'bg-[#fef3c7]/10 text-[#fcd34d] border-[#fcd34d]/20',
    ATRASADA: 'bg-[#ffe4e6]/10 text-[#fda4af] border-[#fda4af]/20',
    PENDENTE: 'bg-[#f1f5f9]/10 text-[#cbd5e1] border-[#cbd5e1]/20',
  };

  const labels = {
    CONCLUIDA: 'Concluído',
    EM_ANDAMENTO: 'Em Andamento',
    ATRASADA: 'Atrasado',
    PENDENTE: 'Pendente',
  };

  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase tracking-wider ${styles[status]}`}>
      {labels[status]}
    </span>
  );
};

export const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const styles = {
    BAIXA: 'text-[#cbd5e1]',
    MEDIA: 'text-[#fcd34d]',
    ALTA: 'text-[#fda4af]',
  };

  return (
    <span className={`text-[10px] font-bold uppercase tracking-widest ${styles[priority]}`}>
      {priority}
    </span>
  );
};

// --- Views ---

export const DashboardView = ({ 
  stats, 
  tasks,
  progressData, 
  delayedTasks, 
  delayedRanking, 
  setSelectedEmpresaId, 
  setActiveTab, 
  setViewingTask,
  fetchData,
  filterEmpresa,
  setFilterEmpresa,
  selectedMonth,
  setSelectedMonth,
  filterStatus,
  setFilterStatus,
  filterResponsible,
  setFilterResponsible,
  empresas,
  users,
  currentUser
}: {
  stats: DashboardStats,
  tasks: Task[],
  progressData: any[],
  delayedTasks: Task[],
  delayedRanking: any[],
  setSelectedEmpresaId: (id: number | null) => void,
  setActiveTab: (tab: any) => void,
  setViewingTask: (task: Task | null) => void,
  fetchData: () => Promise<void>,
  filterEmpresa: string,
  setFilterEmpresa: (val: string) => void,
  selectedMonth: number,
  setSelectedMonth: (val: number) => void,
  filterStatus: string,
  setFilterStatus: (val: string) => void,
  filterResponsible: string,
  setFilterResponsible: (val: string) => void,
  empresas: Empresa[],
  users: any[],
  currentUser: User
}) => {
  return (
    <div className="space-y-12">
      {/* Filters Section (Admin only) */}
      {currentUser.role === 'ADMIN' && (
        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-black text-white uppercase tracking-widest">Filtros</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <select 
              value={filterEmpresa}
              onChange={(e) => setFilterEmpresa(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all"
            >
              <option value="">Todas as Empresas</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>{e.nome}</option>
              ))}
            </select>

            <select 
              value={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all"
            >
              <option value="">Todos os Responsáveis</option>
              {users.map(u => (
                <option key={u.codigo} value={u.codigo}>{u.nome}</option>
              ))}
            </select>

            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="PENDENTE">Pendente</option>
              <option value="EM_ANDAMENTO">Em Andamento</option>
              <option value="CONCLUIDA">Concluída</option>
              <option value="ATRASADA">Atrasada</option>
            </select>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total', value: stats.total, icon: CheckSquare, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Concluídas', value: stats.concluded, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Em Andamento', value: stats.in_progress, icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Atrasadas', value: stats.delayed, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Pendentes', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 flex flex-col gap-6 hover:bg-white/[0.08] transition-all group">
            <div className={`w-12 h-12 ${stat.bg} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
              <p className="text-3xl font-black text-white mt-1 tracking-tighter">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Progress Chart */}
        <div className="lg:col-span-2 bg-white/5 p-10 rounded-[3rem] border border-white/5">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Progresso por Empresa</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Taxa de conclusão mensal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tick={{ dy: 10 }}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${val}%`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                />
                <Bar dataKey="progress" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40}>
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.progress === 100 ? '#10b981' : '#6366f1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delayed Ranking */}
        <div className="bg-white/5 p-10 rounded-[3rem] border border-white/5">
          <div className="flex items-center gap-4 mb-10">
            <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">Ranking de Atrasos</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Empresas com maior incidência</p>
            </div>
          </div>
          <div className="space-y-6">
            {delayedRanking.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nenhum atraso registrado</p>
              </div>
            ) : (
              delayedRanking.map((item: any, i: number) => (
                <div key={item.id} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-black text-slate-700 group-hover:text-indigo-500 transition-colors">0{i + 1}</span>
                    <span className="text-sm font-bold text-slate-300">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500" 
                        style={{ width: `${(item.delayedCount / (delayedRanking[0].delayedCount || 1)) * 100}%` }} 
                      />
                    </div>
                    <span className="text-xs font-black text-rose-500 w-6 text-right">{item.delayedCount}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Company Cards Section */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Visão por Empresa</h3>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Status detalhado de cada cliente</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {empresas.map((empresa: any) => {
            const tarefasDaEmpresa = tasks.filter((t: any) => Number(t.id_empresa) === Number(empresa.id));
            const empresaProgress = progressData.find((p: any) => Number(p.id) === Number(empresa.id))?.progress || 0;
            
            return (
              <div key={empresa.id} className="bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col hover:bg-white/[0.08] transition-all group">
                <div className="p-10 border-b border-white/5 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <MapPin className="w-6 h-6 text-indigo-400" />
                      </div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">{empresa.nome}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Conclusão</p>
                      <p className="text-xl font-black text-emerald-500">{empresaProgress}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-1000" 
                      style={{ width: `${empresaProgress}%` }} 
                    />
                  </div>
                </div>
                <div className="p-8 space-y-4 flex-1">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Tarefas da Empresa</h4>
                  {tarefasDaEmpresa.length === 0 ? (
                    <p className="text-xs text-slate-600 font-bold uppercase tracking-widest py-4">Nenhuma tarefa vinculada</p>
                  ) : (
                    tarefasDaEmpresa.slice(0, 5).map((task: any) => (
                      <div 
                        key={task.id}
                        onClick={() => setViewingTask(task)}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-300">{task.name}</span>
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Resp: {task.responsible_name || task.responsible}</span>
                        </div>
                        <StatusBadge status={task.status} />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const MyTasksView = ({ 
  tasks, 
  empresas, 
  onUpdate, 
  onViewTask 
}: { 
  tasks: Task[], 
  empresas: Empresa[],
  onUpdate: (taskId: number, newStatus: Status) => Promise<void>,
  onViewTask: (task: Task) => void
}) => {
  const today = new Date();
  
  const dailyTasks = tasks.filter(t => {
    const taskDate = parseISO(t.date);
    return isSameDay(taskDate, today) && t.status !== 'CONCLUIDA';
  });

  const delayedTasks = tasks.filter(t => {
    const taskDate = parseISO(t.date);
    return isBefore(taskDate, startOfDay(today)) && t.status !== 'CONCLUIDA';
  });

  return (
    <div className="space-y-12">
      {delayedTasks.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
            <AlertCircle className="w-6 h-6 text-rose-500" />
            <div>
              <h3 className="text-rose-500 font-black text-lg">Tarefas Atrasadas</h3>
              <p className="text-rose-500/60 text-xs font-bold uppercase tracking-widest">Você possui pendências de dias anteriores</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {delayedTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                empresas={empresas} 
                onUpdate={onUpdate} 
                onViewTask={onViewTask} 
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-2xl font-black text-white flex items-center gap-3">
          <CalendarIcon className="w-8 h-8 text-indigo-500" />
          Minhas Tarefas do Dia
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {dailyTasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              empresas={empresas} 
              onUpdate={onUpdate} 
              onViewTask={onViewTask} 
            />
          ))}
          {dailyTasks.length === 0 && (
            <div className="col-span-full py-20 text-center glass-card rounded-[2rem]">
              <CheckCircle2 className="w-16 h-16 text-emerald-500/20 mx-auto mb-4" />
              <p className="text-slate-500 font-bold italic">Nenhuma tarefa pendente para hoje!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const KanbanView = ({ currentUser, empresas, onUpdate, setViewingTask }: { currentUser: User, empresas: Empresa[], onUpdate: (taskId: number, newStatus: Status) => Promise<void>, setViewingTask: (task: Task | null) => void }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterUser, setFilterUser] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);

  const fetchKanbanTasks = async () => {
    setLoading(true);
    try {
      const { data: allUsers } = await supabase.from('usuarios').select('codigo, nome');
      if (allUsers) setUsers(allUsers);
      
      let query = supabase
        .from('tarefas')
        .select(`
          *,
          empresas (
            id,
            nome
          )
        `);
      
      if (currentUser.role !== 'ADMIN') {
        query = query.eq('responsible', currentUser.user_code);
      }

      const { data, error } = await query;
      
      if (data) {
        let filtered = data.map(t => ({
          ...t,
          empresa_name: t.empresas?.nome || 'Sem Empresa',
          responsible_name: allUsers?.find(u => u.codigo === t.responsible)?.nome || t.responsible
        }));

        setTasks(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKanbanTasks();
  }, []);

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (filterEmpresa !== 'all') {
      result = result.filter(t => Number(t.id_empresa) === Number(filterEmpresa));
    }
    if (filterUser !== 'all') {
      result = result.filter(t => t.responsible === filterUser);
    }
    return result;
  }, [tasks, filterEmpresa, filterUser]);

  const columns = [
    { id: 'PENDENTE', label: 'Pendente', color: 'bg-amber-500' },
    { id: 'EM_ANDAMENTO', label: 'Em Andamento', color: 'bg-indigo-500' },
    { id: 'CONCLUIDA', label: 'Concluída', color: 'bg-emerald-500' },
    { id: 'ATRASADA', label: 'Atrasada', color: 'bg-rose-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-40">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white/5 p-6 rounded-[2rem] border border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
            <Filter className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Filtrar Kanban</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Visualize por empresa {currentUser.role === 'ADMIN' && 'ou responsável'}</p>
          </div>
        </div>
        <div className="flex gap-4">
          <select 
            value={filterEmpresa}
            onChange={(e) => setFilterEmpresa(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all min-w-[200px]"
          >
            <option value="all">Todas as Empresas</option>
            {empresas.map(emp => (
              <option key={emp.id} value={emp.id}>{emp.nome}</option>
            ))}
          </select>

          {currentUser.role === 'ADMIN' && (
            <select 
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all min-w-[200px]"
            >
              <option value="all">Todos os Responsáveis</option>
              {users.map(u => (
                <option key={u.codigo} value={u.codigo}>{u.nome}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="flex gap-8 overflow-x-auto pb-8 custom-scrollbar min-h-[700px]">
        {columns.map(col => (
          <div key={col.id} className="flex-1 min-w-[350px] bg-white/[0.02] rounded-[2.5rem] border border-white/5 flex flex-col">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">{col.label}</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-1 rounded-lg">
                {filteredTasks.filter((t: Task) => t.status === col.id).length}
              </span>
            </div>
            <div className="p-6 space-y-4 flex-1">
              {filteredTasks.filter((t: Task) => t.status === col.id).map((task: Task) => (
                <div 
                  key={task.id}
                  onClick={() => setViewingTask(task)}
                  className="bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/[0.08] transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-2 group-hover:text-indigo-400 transition-colors">{task.name}</h4>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Resp: {task.responsible_name || task.responsible}</p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" />
                      {task.empresa_name}
                    </span>
                    <span>{format(parseISO(task.date), 'dd/MM')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const CalendarView = ({ tasks, setViewingTask }: { tasks: Task[], setViewingTask: (task: Task | null) => void }) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  
  const daysInMonth = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate)),
    end: endOfWeek(endOfMonth(currentDate))
  });

  return (
    <div className="bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden">
      <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
            <CalendarIcon className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h2>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Planejamento de atividades</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-3 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setCurrentDate(new Date())}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all"
          >
            Hoje
          </button>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-3 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-white/5">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-6 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-r border-white/5 last:border-0">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 auto-rows-[160px]">
        {daysInMonth.map((day, i) => {
          const dayTasks = tasks.filter((t: any) => isSameDay(parseISO(t.date), day));
          const isCurrentMonth = isSameMonth(day, currentDate);
          const isTodayDate = isToday(day);

          return (
            <div 
              key={i} 
              className={`p-4 border-r border-b border-white/5 last:border-r-0 relative transition-all hover:bg-white/[0.02] ${!isCurrentMonth ? 'opacity-20' : ''}`}
            >
              <span className={`text-xs font-black ${isTodayDate ? 'bg-indigo-500 text-white w-7 h-7 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/30' : 'text-slate-500'}`}>
                {format(day, 'd')}
              </span>
              <div className="mt-4 space-y-1.5">
                {dayTasks.slice(0, 3).map((task: any) => (
                  <div 
                    key={task.id}
                    onClick={() => setViewingTask(task)}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider truncate cursor-pointer transition-all hover:scale-105 ${
                      task.status === 'CONCLUIDA' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                      task.status === 'ATRASADA' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                      'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                    }`}
                  >
                    {task.name}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest pl-2">
                    + {dayTasks.length - 3} tarefas
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const EmpresasView = ({ 
  empresas, 
  tasks, 
  progressData, 
  setViewingTask 
}: { 
  empresas: Empresa[], 
  tasks: Task[], 
  progressData: any[],
  setViewingTask: (task: Task | null) => void 
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {empresas.map((empresa: any) => {
        const tarefasDaEmpresa = tasks.filter((t: any) => Number(t.id_empresa) === Number(empresa.id));
        const empresaProgress = progressData.find((p: any) => Number(p.id) === Number(empresa.id))?.progress || 0;
        
        return (
          <div key={empresa.id} className="bg-white/5 rounded-[3rem] border border-white/5 overflow-hidden flex flex-col hover:bg-white/[0.08] transition-all group">
            <div className="p-10 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <MapPin className="w-6 h-6 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">{empresa.nome}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Conclusão</p>
                  <p className="text-xl font-black text-emerald-500">{empresaProgress}%</p>
                </div>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${empresaProgress}%` }} 
                />
              </div>
            </div>
            <div className="p-8 space-y-4 flex-1">
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Tarefas da Empresa</h4>
              {tarefasDaEmpresa.length === 0 ? (
                <p className="text-xs text-slate-600 font-bold uppercase tracking-widest py-4">Nenhuma tarefa vinculada</p>
              ) : (
                tarefasDaEmpresa.slice(0, 5).map((task: any) => (
                  <div 
                    key={task.id}
                    onClick={() => setViewingTask(task)}
                    className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-300">{task.name}</span>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Resp: {task.responsible_name || task.responsible}</span>
                    </div>
                    <StatusBadge status={task.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const SettingsView = ({ 
  empresas, 
  users,
  templates, 
  fetchData, 
  handleDeleteEmpresa, 
  handleDeleteTemplate,
  handleDeleteAllTasks,
  handleEditTemplate,
  editingTemplate,
  setEditingTemplate,
  newTemplate,
  setNewTemplate,
  newItemText,
  setNewItemText,
  handleAddTemplate,
  currentUser,
  showNotification
}: { 
  empresas: Empresa[], 
  users: any[],
  templates: any[], 
  fetchData: () => Promise<void>, 
  handleDeleteEmpresa: (id: number) => Promise<void>, 
  handleDeleteTemplate: (id: number) => Promise<void>,
  handleDeleteAllTasks: (id: number) => Promise<void>,
  handleEditTemplate: (template: any) => void,
  editingTemplate: any | null,
  setEditingTemplate: (template: any | null) => void,
  newTemplate: any,
  setNewTemplate: (template: any) => void,
  newItemText: string,
  setNewItemText: (text: string) => void,
  handleAddTemplate: () => Promise<void>,
  currentUser: User,
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void
}) => {
  const [newEmpresa, setNewEmpresa] = useState('');

  const handleAddEmpresa = async () => {
    if (currentUser.role !== 'ADMIN') {
      showNotification('Apenas administradores podem cadastrar empresas.', 'error');
      return;
    }
    if (!newEmpresa) return;
    try {
      const { error } = await supabase.from('empresas').insert({ nome: newEmpresa });
      if (!error) {
        setNewEmpresa('');
        await fetchData();
        showNotification('Empresa cadastrada com sucesso!', 'success');
      } else {
        throw error;
      }
    } catch (error: any) {
      console.error('Error adding empresa:', error);
      showNotification(error.message || 'Erro de conexão ao cadastrar empresa', 'error');
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Empresa Registration */}
        <div className="space-y-8">
          {currentUser.role === 'ADMIN' && (
            <div className="glass-card p-8 rounded-[2rem]">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
                <Fuel className="w-6 h-6 text-[#a5b4fc]" />
                Cadastrar Empresa
              </h3>
              <div className="flex gap-3">
                <input 
                  type="text" 
                  placeholder="Nome da Empresa"
                  value={newEmpresa}
                  onChange={(e) => setNewEmpresa(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-white outline-none focus:border-indigo-500 transition-all"
                />
                <button 
                  onClick={handleAddEmpresa}
                  className="bg-[#6366f1] hover:bg-indigo-500 text-white px-8 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20"
                >
                  Adicionar
                </button>
              </div>
            </div>
          )}

          <div className="glass-card rounded-[2rem] overflow-hidden">
            <div className="p-6 border-b border-white/10 bg-white/5">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Empresas Cadastradas</h4>
            </div>
            <div className="divide-y divide-white/5">
              {empresas.map((s: any) => (
                <div key={s.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <span className="font-bold text-slate-200">{s.nome}</span>
                  {currentUser.role === 'ADMIN' && (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeleteAllTasks(s.id)}
                        className="p-2 text-slate-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                        title="Excluir todas as tarefas desta empresa"
                      >
                        <CheckSquare className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('Delete empresa button clicked for id:', s.id);
                          handleDeleteEmpresa(s.id);
                        }}
                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                        title="Excluir empresa"
                      >
                        <Trash2 className="w-5 h-5 pointer-events-none" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task Registration */}
        <div className="glass-card p-8 rounded-[2rem]">
          <h3 className="text-xl font-bold mb-8 flex items-center gap-3">
            <ClipboardList className="w-6 h-6 text-[#6ee7b7]" />
            Programar Tarefas
          </h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Empresa *</label>
                <select 
                  value={newTemplate.id_empresa}
                  onChange={(e) => setNewTemplate({...newTemplate, id_empresa: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">Selecionar...</option>
                  {empresas.map((s: any) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsável *</label>
                <select 
                  value={newTemplate.responsible}
                  onChange={(e) => setNewTemplate({...newTemplate, responsible: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">Selecionar...</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.codigo || u.user_id}>{u.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome da Tarefa *</label>
              <input 
                type="text" 
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="Ex: Conferência de Caixa"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</label>
              <textarea 
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="Detalhes da execução..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 h-24 transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frequência</label>
                <select 
                  value={newTemplate.frequency}
                  onChange={(e) => setNewTemplate({...newTemplate, frequency: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="DIAS_UTEIS">Dias Úteis</option>
                  <option value="SEMANAL">Semanal</option>
                  <option value="MENSAL">Mensal</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Início</label>
                <input 
                  type="date" 
                  value={newTemplate.start_date}
                  onChange={(e) => setNewTemplate({...newTemplate, start_date: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fim</label>
                <input 
                  type="date" 
                  value={newTemplate.end_date}
                  onChange={(e) => setNewTemplate({...newTemplate, end_date: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Checklist Interno</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), setNewTemplate({...newTemplate, checklist: [...newTemplate.checklist, { id: Math.random().toString(36).substr(2, 9), text: newItemText, completed: false }]}), setNewItemText(''))}
                  placeholder="Adicionar item..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white outline-none focus:border-emerald-500 transition-all"
                />
                <button 
                  onClick={() => {
                    if (!newItemText) return;
                    setNewTemplate({...newTemplate, checklist: [...newTemplate.checklist, { id: Math.random().toString(36).substr(2, 9), text: newItemText, completed: false }]});
                    setNewItemText('');
                  }}
                  className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {newTemplate.checklist.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-sm text-slate-300">{item.text}</span>
                    <button 
                      onClick={() => setNewTemplate({...newTemplate, checklist: newTemplate.checklist.filter((i: any) => i.id !== item.id)})}
                      className="text-slate-500 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={handleAddTemplate}
              className={`w-full ${editingTemplate ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-[#10b981] hover:bg-emerald-500'} text-white py-4 rounded-2xl font-black text-lg transition-all shadow-xl shadow-emerald-600/20 mt-4`}
            >
              {editingTemplate ? 'SALVAR ALTERAÇÕES' : 'ADICIONAR TAREFA'}
            </button>
            {editingTemplate && (
              <button 
                onClick={() => {
                  setEditingTemplate(null);
                  setNewTemplate({
                    id_empresa: '',
                    name: '',
                    description: '',
                    responsible: currentUser.name,
                    frequency: 'DIAS_UTEIS',
                    start_date: format(new Date(), 'yyyy-MM-dd'),
                    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
                    priority: 'MEDIA',
                    checklist: []
                  });
                }}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-400 py-3 rounded-2xl font-bold transition-all mt-2"
              >
                CANCELAR EDIÇÃO
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-8">
        <div className="glass-card rounded-[2rem] overflow-hidden">
          <div className="p-8 border-b border-white/10 bg-white/5 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-3">
                <Clock className="w-6 h-6 text-amber-500" />
                Tarefas Programadas
              </h3>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">Gerenciamento de recorrências</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                  <th className="px-8 py-4">Tarefa</th>
                  <th className="px-8 py-4">Empresa</th>
                  <th className="px-8 py-4">Responsável</th>
                  <th className="px-8 py-4">Frequência</th>
                  <th className="px-8 py-4">Período</th>
                  <th className="px-8 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {templates.map((t: any) => (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="font-bold text-slate-200">{t.name}</div>
                      <div className="text-[10px] text-slate-500 mt-1 line-clamp-1">{t.description}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-bold text-slate-400">{empresas.find((s: any) => Number(s.id) === Number(t.id_empresa))?.nome || 'N/A'}</span>
                    </td>
                    <td className="px-8 py-6 text-xs text-slate-400">{t.responsible}</td>
                    <td className="px-8 py-6">
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/5 text-slate-400 border border-white/10">
                        {t.frequency === 'DIAS_UTEIS' ? 'Dias Úteis' : t.frequency === 'SEMANAL' ? 'Semanal' : 'Mensal'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-[10px] text-slate-500 font-mono">
                      {format(parseISO(t.start_date), 'dd/MM/yy')} - {format(parseISO(t.end_date), 'dd/MM/yy')}
                    </td>
                    <td className="px-8 py-6 text-right">
                      {currentUser.role === 'ADMIN' && (
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditTemplate(t)}
                            className="p-2 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-all"
                            title="Editar programação"
                          >
                            <Edit className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Delete template button clicked for id:', t.id);
                              handleDeleteTemplate(t.id);
                            }}
                            className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                            title="Excluir programação e todas as tarefas associadas"
                          >
                            <Trash2 className="w-5 h-5 pointer-events-none" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {templates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-8 py-20 text-center text-slate-500 italic opacity-50">
                      Nenhuma tarefa programada encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  empresas: Empresa[];
  onUpdate: (taskId: number, newStatus: Status) => Promise<void>;
  onViewTask: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, empresas, onUpdate, onViewTask }) => {
  const empresa = empresas.find(s => Number(s.id) === Number(task.id_empresa));
  const checklist = task.checklist || [];
  const completedItems = checklist.filter((i: ChecklistItem) => i.completed).length;
  const totalItems = checklist.length;
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <motion.div 
      layoutId={`task-${task.id}`}
      className="glass-card p-6 rounded-[2rem] hover:border-white/20 transition-all group relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-6">
        <StatusBadge status={task.status} />
        <button 
          onClick={() => onViewTask(task)}
          className="p-2 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:bg-white/10"
        >
          <Maximize2 className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="mb-6">
        <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{empresa?.nome || 'Empresa não definida'}</p>
        <h4 className="text-lg font-black text-white leading-tight">{task.name}</h4>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2">Resp: {task.responsible_name || task.responsible}</p>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Checklist</span>
          <span className="text-xs font-black text-indigo-400">{completedItems}/{totalItems}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-500" 
            style={{ width: `${progress}%` }} 
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">
        {(task.status === 'PENDENTE' || task.status === 'ATRASADA') && (
          <button 
            onClick={() => onUpdate(task.id, 'EM_ANDAMENTO')}
            className="col-span-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-3 h-3" /> INICIAR TAREFA
          </button>
        )}
        {task.status === 'EM_ANDAMENTO' && (
          <>
            <button 
              onClick={() => onViewTask(task)}
              className="bg-white/5 hover:bg-white/10 text-white text-xs font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ListChecks className="w-3 h-3" /> CHECKLIST
            </button>
            <button 
              onClick={() => onUpdate(task.id, 'CONCLUIDA')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-3 h-3" /> CONCLUIR
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export const TaskDetailModal = ({ 
  task, 
  onClose, 
  onUpdate, 
  onDelete,
  onUpdateChecklist,
  currentUser
}: { 
  task: Task, 
  onClose: () => void, 
  onUpdate: (taskId: number, newStatus: Status) => Promise<void>, 
  onDelete: (id: number) => Promise<void>,
  onUpdateChecklist: (task: Task, checklist: ChecklistItem[]) => Promise<void>,
  currentUser: User
}) => {
  const [localTask, setLocalTask] = useState<Task>(task);
  const [newItemText, setNewItemText] = useState('');

  const handleToggleCheck = (itemId: string) => {
    const updated = {
      ...localTask,
      checklist: localTask.checklist.map((i: ChecklistItem) => i.id === itemId ? { ...i, completed: !i.completed } : i)
    };
    setLocalTask(updated);
  };

  const handleAddItem = () => {
    if (!newItemText) return;
    const newItem: ChecklistItem = {
      id: Math.random().toString(36).substr(2, 9),
      text: newItemText,
      completed: false
    };
    setLocalTask({
      ...localTask,
      checklist: [...localTask.checklist, newItem]
    });
    setNewItemText('');
  };

  const handleRemoveItem = (itemId: string) => {
    setLocalTask({
      ...localTask,
      checklist: localTask.checklist.filter((i: ChecklistItem) => i.id !== itemId)
    });
  };

  const handleSave = async () => {
    await onUpdateChecklist(task, localTask.checklist);
    await onUpdate(task.id, localTask.status);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="p-8 border-b border-white/10 flex justify-between items-start bg-white/5">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[10px] font-black bg-indigo-500 text-white px-2 py-1 rounded-lg uppercase tracking-widest">
                {task.empresa_name}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>
            <h2 className="text-3xl font-black text-white">{task.name}</h2>
            <div className="flex items-center gap-4 mt-2">
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <CalendarIcon className="w-4 h-4" />
                {format(parseISO(task.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-slate-500 text-sm flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                Resp: {task.responsible_name || task.responsible}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-2xl transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Descrição</h4>
            <p className="text-slate-300 leading-relaxed bg-white/5 p-4 rounded-2xl border border-white/5">
              {task.description || 'Sem descrição detalhada.'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Checklist de Verificação</h4>
              <span className="text-[10px] font-bold text-indigo-400">
                {localTask.checklist.filter((i: ChecklistItem) => i.completed).length}/{localTask.checklist.length} CONCLUÍDO
              </span>
            </div>
            
            <div className="flex gap-2 mb-4">
              <input 
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
                placeholder="Adicionar novo item..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
              <button 
                onClick={handleAddItem}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {localTask.checklist.map((item: ChecklistItem) => (
                <div 
                  key={item.id}
                  className={`flex items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                    item.completed 
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                      : 'bg-white/5 border-white/5 text-slate-400'
                  }`}
                >
                  <div 
                    onClick={() => handleToggleCheck(item.id)}
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                  >
                    <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                      item.completed ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'
                    }`}>
                      {item.completed && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-bold text-sm">{item.text}</span>
                  </div>
                  <button 
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Alterar Status</h4>
            <div className="grid grid-cols-3 gap-3">
              {['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'].map(status => (
                <button
                  key={status}
                  onClick={() => setLocalTask({ ...localTask, status: status as Status })}
                  className={`py-3 rounded-2xl text-[10px] font-black transition-all border ${
                    localTask.status === status
                      ? 'bg-white text-slate-900 border-white'
                      : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-8 bg-white/5 border-t border-white/10 flex gap-4">
          {currentUser.role === 'ADMIN' && (
            <button 
              onClick={() => onDelete(task.id)}
              className="p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl transition-all"
              title="Excluir tarefa"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          )}
          <button 
            onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-indigo-600/20"
          >
            SALVAR ALTERAÇÕES
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const UsersView = ({ 
  users, 
  empresas,
  fetchUsers,
  showNotification
}: { 
  users: any[], 
  empresas: Empresa[],
  fetchUsers: () => Promise<void>,
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void
}) => {
  const [nome, setNome] = useState('');
  const [codigo, setCodigo] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUserForEmpresas, setSelectedUserForEmpresas] = useState<any | null>(null);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !codigo || !senha) {
      showNotification('Preencha todos os campos', 'error');
      return;
    }
    setLoading(true);
    try {
      // 1. Verificar se já existe um usuário com o mesmo código na tabela usuarios ANTES de criar no Auth
      const { data: usuarioExistente } = await supabase
        .from('usuarios')
        .select('id')
        .eq('codigo', codigo)
        .maybeSingle();

      if (usuarioExistente) {
        showNotification('Já existe um usuário com este código', 'error');
        return;
      }

      const emailFicticio = `${codigo}@plannerbpo.com`;
      
      // 2. Criar no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({ 
        email: emailFicticio, 
        password: senha,
        options: {
          data: { nome, codigo }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // 3. Inserir na tabela usuarios com as colunas corretas
        const { error: dbError } = await supabase
          .from('usuarios')
          .insert({ 
            codigo, 
            nome, 
            user_id: authData.user.id,
            tipo_usuario: 'usuario'
          });

        if (dbError) {
          // 4. Se o insert na tabela usuarios falhar, deletar o usuário recém criado no Auth
          try {
            await fetch(`/api/admin/users/${authData.user.id}`, {
              method: 'DELETE'
            });
          } catch (cleanupError) {
            console.error('Erro ao realizar rollback no Auth:', cleanupError);
          }
          throw dbError;
        }
      }

      showNotification('Usuário criado com sucesso!', 'success');
      setNome('');
      setCodigo('');
      setSenha('');
      await fetchUsers();
    } catch (error: any) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      // Usar a rota do servidor para deletar tanto do Auth quanto da tabela usuarios
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir usuário');
      }

      showNotification('Usuário excluído com sucesso!', 'success');
      await fetchUsers();
    } catch (error: any) {
      showNotification(error.message, 'error');
    }
  };

  return (
    <div className="space-y-12">
      {/* Form Section */}
      <div className="glass-card p-10 rounded-[3rem] border border-white/5">
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Cadastrar Novo Usuário</h3>
        <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Nome Completo</label>
            <input 
              type="text" 
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all"
              placeholder="Ex: João Silva"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Código</label>
            <input 
              type="text" 
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all"
              placeholder="Ex: 001"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Senha</label>
            <input 
              type="password" 
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white outline-none focus:border-indigo-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button 
              type="submit"
              disabled={loading}
              className="bg-[#6366f1] hover:bg-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading ? 'CADASTRANDO...' : 'CADASTRAR USUÁRIO'}
            </button>
          </div>
        </form>
      </div>

      {/* List Section */}
      <div className="glass-card p-10 rounded-[3rem] border border-white/5">
        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-8">Usuários Cadastrados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div 
              key={user.id} 
              onClick={() => setSelectedUserForEmpresas(user)}
              className="bg-white/5 rounded-3xl p-6 border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-sm">{user.nome}</h4>
                  <div className="flex flex-col gap-1">
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Código: {user.codigo}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUser(user.id);
                  }}
                  className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedUserForEmpresas && (
        <UserEmpresasModal 
          user={selectedUserForEmpresas}
          empresas={empresas}
          onClose={() => setSelectedUserForEmpresas(null)}
          showNotification={showNotification}
        />
      )}
    </div>
  );
};

const UserEmpresasModal = ({ 
  user, 
  empresas, 
  onClose, 
  showNotification 
}: { 
  user: any, 
  empresas: Empresa[], 
  onClose: () => void,
  showNotification: (message: string, type?: 'success' | 'error' | 'info') => void
}) => {
  const [vinculos, setVinculos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState('');
  const [funcao, setFuncao] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchVinculos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('usuario_empresa')
        .select(`
          *,
          empresas (
            id,
            nome
          )
        `)
        .eq('user_id', user.id);
      
      if (error) throw error;
      setVinculos(data || []);
    } catch (error: any) {
      showNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVinculos();
  }, [user.id]);

  const handleAddVinculo = async () => {
    if (!selectedEmpresaId || !funcao) {
      showNotification('Selecione uma empresa e defina a função', 'error');
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase
        .from('usuario_empresa')
        .insert({
          user_id: user.id,
          id_empresa: parseInt(selectedEmpresaId, 10),
          funcao
        });

      if (error) throw error;
      
      showNotification('Vínculo adicionado com sucesso!', 'success');
      setSelectedEmpresaId('');
      setFuncao('');
      await fetchVinculos();
    } catch (error: any) {
      showNotification(error.message, 'error');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveVinculo = async (id: number) => {
    if (!confirm('Remover vínculo com esta empresa?')) return;

    try {
      const { error } = await supabase
        .from('usuario_empresa')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      showNotification('Vínculo removido!', 'success');
      await fetchVinculos();
    } catch (error: any) {
      showNotification(error.message, 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="p-8 border-b border-white/10 flex justify-between items-start bg-white/5">
          <div>
            <h2 className="text-2xl font-black text-white">Empresas de {user.nome}</h2>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Gerenciar vínculos e funções</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-2xl transition-all">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {/* Add Section */}
          <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vincular Nova Empresa</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select 
                value={selectedEmpresaId}
                onChange={(e) => setSelectedEmpresaId(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-all"
              >
                <option value="">Selecionar Empresa...</option>
                {empresas.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.nome}</option>
                ))}
              </select>
              <input 
                type="text"
                value={funcao}
                onChange={(e) => setFuncao(e.target.value)}
                placeholder="Função (ex: Gerente)"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 transition-all"
              />
            </div>
            <button 
              onClick={handleAddVinculo}
              disabled={isAdding}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-xl transition-all text-xs uppercase tracking-widest disabled:opacity-50"
            >
              {isAdding ? 'ADICIONANDO...' : 'ADICIONAR VÍNCULO'}
            </button>
          </div>

          {/* List Section */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Empresas Vinculadas</h4>
            {loading ? (
              <div className="py-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : vinculos.length === 0 ? (
              <p className="text-center py-12 text-slate-500 text-xs italic">Nenhuma empresa vinculada.</p>
            ) : (
              <div className="space-y-3">
                {vinculos.map((v) => (
                  <div key={v.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <h5 className="text-white font-bold text-sm">{v.empresas?.nome}</h5>
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest">{v.funcao}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleRemoveVinculo(v.id)}
                      className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

