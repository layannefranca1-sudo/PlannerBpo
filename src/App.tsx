import React, { useState, useEffect, useMemo } from 'react';
import { 
  Fuel, 
  ClipboardList, 
  Settings, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  ChevronRight,
  Edit,
  Calendar,
  LayoutDashboard,
  AlertTriangle,
  Users,
  BarChart3,
  Trello,
  Filter,
  CheckSquare,
  ChevronLeft,
  X,
  Search,
  AlertCircle,
  Maximize2,
  Play,
  ListChecks,
  Check,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isWeekend, subMonths, addMonths, isToday, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

import { Login } from './components/Login';
import { supabase } from './lib/supabaseClient';
import { generateTasksFromTemplate } from './lib/taskUtils';
import { MonthlyReportView } from './components/MonthlyReportView';
import { 
  StatusBadge, 
  PriorityBadge, 
  DashboardView, 
  KanbanView, 
  CalendarView, 
  EmpresasView, 
  TaskDetailModal, 
  MyTasksView, 
  SettingsView,
  UsersView
} from './components/Views';
import { User, Empresa, Task, DashboardStats, Status, Priority, ChecklistItem, Frequency } from './types';

// --- App Component ---









export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'kanban' | 'calendar' | 'empresas' | 'settings' | 'my-tasks' | 'report' | 'users'>('dashboard');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setActiveTab(user.role === 'ADMIN' ? 'dashboard' : 'my-tasks');
      } catch (e) {
        console.error('Error parsing saved user', e);
      }
    }
    setIsAuthReady(true);
  }, []);

  const [selectedEmpresaId, setSelectedEmpresaId] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [stats, setStats] = useState<DashboardStats>({ total: 0, concluded: 0, in_progress: 0, pending: 0, delayed: 0 });
  const [delayedTasks, setDelayedTasks] = useState<Task[]>([]);
  const [delayedRanking, setDelayedRanking] = useState<{ id: number; name: string; delayedCount: number }[]>([]);
  const [progressData, setProgressData] = useState<any[]>([]);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    id_empresa: '',
    name: '',
    description: '',
    responsible: currentUser?.name || '',
    frequency: 'DIAS_UTEIS' as Frequency,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    priority: 'MEDIA' as Priority,
    checklist: [] as ChecklistItem[]
  });
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    if (currentUser && !newTemplate.responsible) {
      setNewTemplate(prev => ({ ...prev, responsible: currentUser.user_code || currentUser.name }));
    }
  }, [currentUser]);

  // Filters
  const [filterEmpresa, setFilterEmpresa] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterResponsible, setFilterResponsible] = useState<string>('');

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
    setActiveTab(user.role === 'ADMIN' ? 'dashboard' : 'my-tasks');
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, codigo, tipo_usuario, user_id')
        .order('created_at', { ascending: true });
      
      console.log('usuarios:', data, 'erro:', error);
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      // Fetch Empresas
      let empresasQuery = supabase.from('empresas').select('*');
      
      if (currentUser.role === 'USER') {
        const { data: userEmpresas } = await supabase
          .from('usuario_empresa')
          .select('id_empresa')
          .eq('user_id', currentUser.id);
        
        const empresaIds = userEmpresas?.map(ue => ue.id_empresa) || [];
        
        if (empresaIds.length > 0) {
          empresasQuery = empresasQuery.in('id', empresaIds);
        } else {
          empresasQuery = empresasQuery.eq('id', -1);
        }
      }

      const { data: allEmpresas, error: empresasError } = await empresasQuery;
      if (empresasError) throw empresasError;

      setEmpresas(allEmpresas || []);

      // Fetch Templates
      let templatesQuery = supabase.from('task_templates').select('*');
      if (currentUser.role === 'USER') {
        // Fetch companies linked to user
        const { data: userEmpresas } = await supabase
          .from('usuario_empresa')
          .select('id_empresa')
          .eq('user_id', currentUser.id);
        
        const empresaIds = userEmpresas?.map(ue => ue.id_empresa) || [];
        
        if (empresaIds.length > 0) {
          templatesQuery = templatesQuery.in('id_empresa', empresaIds);
        } else {
          templatesQuery = templatesQuery.eq('id', -1);
        }
      }
      const { data: templatesData, error: templatesError } = await templatesQuery;
      if (templatesError) throw templatesError;
      setTemplates(templatesData || []);

      // Fetch Users (to map responsible code to name)
      const { data: allUsers, error: usersError } = await supabase
        .from('usuarios')
        .select('codigo, nome');
      
      if (usersError) throw usersError;

      // Fetch Tasks
      let tasksQuery = supabase
        .from('tarefas')
        .select(`
          *,
          empresas (
            id,
            nome
          )
        `);

      if (currentUser.role !== 'ADMIN') {
        tasksQuery = tasksQuery.eq('responsible', currentUser.user_code);
      } else {
        // Admin filters
        if (filterResponsible) {
          tasksQuery = tasksQuery.eq('responsible', filterResponsible);
        }
        if (filterEmpresa) {
          tasksQuery = tasksQuery.eq('id_empresa', Number(filterEmpresa));
        }
        if (filterStatus && filterStatus !== 'all') {
          tasksQuery = tasksQuery.eq('status', filterStatus);
        }
      }

      const { data: tasksData, error: tasksError } = await tasksQuery;
      
      console.log('tarefas retornadas:', tasksData, 'erro:', tasksError);
      
      if (tasksError) throw tasksError;
      
      let filteredTasks = (tasksData || []).map(t => ({
        ...t,
        empresa_name: t.empresas?.nome || 'Sem Empresa',
        responsible_name: allUsers?.find(u => u.codigo === t.responsible)?.nome || t.responsible
      }));

      // Filter by selected company
      if (selectedEmpresaId) {
        filteredTasks = filteredTasks.filter(t => Number(t.id_empresa) === Number(selectedEmpresaId));
      }

      // Month/Year filtering
      const startDateStr = format(startOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd');
      const endDateStr = format(endOfMonth(new Date(selectedYear, selectedMonth - 1)), 'yyyy-MM-dd');
      
      filteredTasks = filteredTasks.filter(t => t.date >= startDateStr && t.date <= endDateStr);

      setTasks(filteredTasks);

      // Calculate Stats
      const stats = {
        total: filteredTasks.length,
        concluded: filteredTasks.filter(t => t.status === 'CONCLUIDA').length,
        in_progress: filteredTasks.filter(t => t.status === 'EM_ANDAMENTO').length,
        pending: filteredTasks.filter(t => t.status === 'PENDENTE').length,
        delayed: filteredTasks.filter(t => t.status === 'ATRASADA').length,
      };
      setStats(stats);

      // Delayed Tasks
      setDelayedTasks(filteredTasks.filter(t => t.status === 'ATRASADA'));

      // Progress Data
      const progress = (allEmpresas || []).map(s => {
        const empresaTasks = filteredTasks.filter(t => Number(t.id_empresa) === Number(s.id));
        const total = empresaTasks.length;
        const concluded = empresaTasks.filter(t => t.status === 'CONCLUIDA').length;
        return {
          id: s.id,
          name: s.nome,
          total,
          concluded,
          progress: total > 0 ? Math.round((concluded / total) * 100) : 0
        };
      });
      setProgressData(progress);

      // Delayed Ranking
      const ranking = (allEmpresas || []).map(s => {
        const delayedCount = filteredTasks.filter(t => Number(t.id_empresa) === Number(s.id) && t.status === 'ATRASADA').length;
        return {
          id: s.id,
          name: s.nome,
          delayedCount
        };
      }).filter(r => r.delayedCount > 0)
        .sort((a, b) => b.delayedCount - a.delayedCount)
        .slice(0, 5);
      setDelayedRanking(ranking);

      if (currentUser.role === 'ADMIN') {
        fetchUsers();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmpresa = async (id: number) => {
    console.log('handleDeleteEmpresa initiated for id:', id);
    if (currentUser?.role !== 'ADMIN') {
      console.warn('Delete attempt by non-admin user');
      showNotification('Apenas administradores podem excluir empresas.', 'error');
      return;
    }
    
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir esta empresa? Todas as tarefas e programações associadas serão excluídas.',
      onConfirm: async () => {
        try {
          console.log('Executing Supabase delete for empresa id:', id);
          const { error } = await supabase.from('empresas').delete().eq('id', id);
          if (error) {
            console.error('Supabase error deleting empresa:', error);
            throw error;
          }
          console.log('Empresa deleted successfully, fetching data...');
          await fetchData();
          showNotification('Empresa excluída com sucesso!', 'success');
        } catch (error: any) {
          console.error('Error deleting empresa:', error);
          showNotification(`Erro ao excluir empresa: ${error.message || 'Erro desconhecido'}`, 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleDeleteTemplate = async (id: number) => {
    if (currentUser?.role !== 'ADMIN') {
      showNotification('Apenas administradores podem excluir programações.', 'error');
      return;
    }
    
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir esta programação? Todas as tarefas geradas por ela serão excluídas.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('task_templates').delete().eq('id', id);
          if (error) {
            console.error('Supabase error deleting template:', error);
            throw error;
          }
          await fetchData();
          showNotification('Programação excluída com sucesso!', 'success');
        } catch (error: any) {
          console.error('Error deleting template:', error);
          showNotification(`Erro ao excluir programação: ${error.message || 'Erro desconhecido'}`, 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleAddTemplate = async () => {
    const { name, id_empresa, responsible, frequency, start_date, end_date, priority, checklist, description } = newTemplate;
    
    console.log('Saving template:', { name, id_empresa, responsible, frequency, start_date, end_date });
    
    if (!name || !id_empresa || !responsible || !start_date || !end_date) {
      console.warn('Validation failed for newTemplate:', newTemplate);
      showNotification('Preencha todos os campos obrigatórios (*)', 'error');
      return;
    }
    
    try {
      const templateData = { 
        name,
        id_empresa: parseInt(id_empresa.toString(), 10),
        responsible,
        frequency,
        start_date,
        end_date,
        priority,
        checklist,
        description,
        user_id: currentUser?.id 
      };

      console.log('Salvando template:', { name, id_empresa: templateData.id_empresa, responsible, frequency, start_date, end_date });
      
      let result;
      if (editingTemplate) {
        result = await supabase.from('task_templates').update(templateData).eq('id', editingTemplate.id).select().single();
      } else {
        result = await supabase.from('task_templates').insert(templateData).select().single();
      }

      console.log('Resultado:', result.data, 'Erro:', result.error);

      if (result.error) {
        console.error('Supabase error saving template:', result.error);
        throw result.error;
      }

      if (result.data) {
        console.log('Generating tasks from template...');
        await generateTasksFromTemplate(result.data);
      }

      showNotification(editingTemplate ? 'Tarefa atualizada com sucesso!' : 'Tarefa programada com sucesso!', 'success');
      setNewTemplate({
        id_empresa: '',
        name: '',
        description: '',
        responsible: currentUser?.name || '',
        frequency: 'DIAS_UTEIS',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        priority: 'MEDIA',
        checklist: []
      });
      setEditingTemplate(null);
      await fetchData();
    } catch (error: any) {
      console.error('Error saving template:', error);
      showNotification(`Erro ao salvar programação: ${error.message || 'Erro desconhecido'}`, 'error');
    }
  };

  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setNewTemplate({
      id_empresa: template.id_empresa.toString(),
      name: template.name,
      description: template.description,
      responsible: template.responsible,
      frequency: template.frequency,
      start_date: template.start_date,
      end_date: template.end_date,
      priority: template.priority,
      checklist: template.checklist
    });
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTask = async (id: number) => {
    if (currentUser?.role !== 'ADMIN') {
      showNotification('Apenas administradores podem excluir tarefas.', 'error');
      return;
    }
    
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir esta tarefa?',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('tarefas').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
          showNotification('Tarefa excluída com sucesso!', 'success');
        } catch (error: any) {
          console.error('Error deleting task:', error);
          showNotification(`Erro ao excluir tarefa: ${error.message || 'Erro desconhecido'}`, 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleDeleteAllTasks = async (id: number) => {
    if (currentUser?.role !== 'ADMIN') {
      showNotification('Apenas administradores podem excluir todas as tarefas.', 'error');
      return;
    }
    
    setConfirmDialog({
      message: 'Tem certeza que deseja excluir TODAS as tarefas desta empresa? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const { error } = await supabase.from('tarefas').delete().eq('id_empresa', id);
          if (error) {
            console.error('Supabase error deleting all tasks for empresa:', error);
            throw error;
          }
          await fetchData();
          showNotification('Todas as tarefas da empresa foram excluídas.', 'success');
        } catch (error: any) {
          console.error('Error deleting all tasks:', error);
          showNotification(`Erro ao excluir tarefas da empresa: ${error.message || 'Erro desconhecido'}`, 'error');
        }
        setConfirmDialog(null);
      }
    });
  };

  useEffect(() => {
    if (!currentUser) return;

    const empresasSubscription = supabase
      .channel('public:empresas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresas' }, () => fetchData())
      .subscribe();

    const tasksSubscription = supabase
      .channel('public:tarefas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tarefas' }, () => fetchData())
      .subscribe();

    const templatesSubscription = supabase
      .channel('public:task_templates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_templates' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(empresasSubscription);
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(templatesSubscription);
    };
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [currentUser, selectedEmpresaId, selectedMonth, selectedYear, filterEmpresa, filterStatus, filterResponsible]);

  const updateTaskStatus = async (taskId: number, newStatus: Status) => {
    try {
      if (newStatus === 'CONCLUIDA') {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.checklist.length > 0 && !task.checklist.every(item => item.completed)) {
          showNotification("Conclua todos os itens do checklist primeiro.", "info");
          return;
        }
      }

      const { error } = await supabase
        .from('tarefas')
        .update({ status: newStatus })
        .eq('id', taskId);
      
      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const toggleChecklistItem = async (task: Task, itemId: string) => {
    const updatedChecklist = task.checklist.map(item => 
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    try {
      const { error } = await supabase
        .from('tarefas')
        .update({ checklist: updatedChecklist })
        .eq('id', task.id);
      
      if (error) throw error;
      await fetchData();
      if (viewingTask?.id === task.id) {
        setViewingTask({ ...task, checklist: updatedChecklist });
      }
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  const updateChecklist = async (task: Task, checklist: ChecklistItem[]) => {
    try {
      const { error } = await supabase
        .from('tarefas')
        .update({ checklist })
        .eq('id', task.id);
      
      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Error updating checklist:', error);
    }
  };

  // --- Main Layout ---

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <div>
            <p className="text-white font-black uppercase tracking-[0.3em] text-xl">Planner Bpo</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 flex font-sans overflow-hidden">
      {/* Custom Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 20 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 
              notification.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' : 
              'bg-indigo-500/90 border-indigo-400 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-bold text-sm">{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-4 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirm Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-card p-8 rounded-[2.5rem] border border-white/10 max-w-md w-full shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Confirmar Ação</h3>
              <p className="text-slate-400 mb-8 leading-relaxed">{confirmDialog.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-6 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 px-6 py-4 rounded-2xl bg-rose-500 hover:bg-rose-400 text-white font-bold transition-all shadow-lg shadow-rose-600/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className="w-80 bg-[#0a0a0a] border-r border-white/5 flex flex-col hidden lg:flex h-screen sticky top-0 z-50">
        <div className="p-10">
          <div className="flex items-center gap-4 mb-16">
            <div className="w-12 h-12 bg-[#6366f1] rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/40">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-white font-black text-xl leading-none tracking-tighter">Planner Bpo</h1>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">RC Consultoria Financeira</p>
            </div>
          </div>

          <nav className="space-y-2">
            {[
              { id: 'my-tasks', icon: ListChecks, label: 'Minhas Tarefas' },
              { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
              { id: 'kanban', icon: Trello, label: 'Quadro Kanban' },
              { id: 'calendar', icon: Calendar, label: 'Calendário' },
              { id: 'empresas', icon: Fuel, label: 'Empresas' },
              { id: 'report', icon: FileText, label: 'Relatório Mensal' },
              { id: 'settings', icon: Settings, label: 'Planejamento' },
              ...(currentUser?.role === 'ADMIN' ? [{ id: 'users', icon: Users, label: 'Usuários' }] : []),
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group ${activeTab === item.id ? 'bg-[#6366f1] text-white shadow-2xl shadow-indigo-600/30' : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}`}
              >
                <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${activeTab === item.id ? 'text-white' : 'text-slate-500'}`} />
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto p-10">
          <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#6ee7b7]/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-[#6ee7b7]" />
              </div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Status Geral</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Concluído</span>
                <span>{Math.round((stats.concluded / (stats.total || 1)) * 100)}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#6ee7b7] transition-all duration-1000" 
                  style={{ width: `${(stats.concluded / (stats.total || 1)) * 100}%` }} 
                />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-[#0a0a0a] custom-scrollbar h-screen relative">
        <header className="h-24 border-b border-white/5 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-40 px-12 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h2 className="text-2xl font-black text-white capitalize tracking-tight">
              {activeTab === 'dashboard' ? 'Visão Geral' : 
               activeTab === 'kanban' ? 'Quadro de Tarefas' : 
               activeTab === 'calendar' ? 'Planejamento Mensal' : 
               activeTab === 'empresas' ? 'Empresas' : 
               activeTab === 'report' ? 'Relatório Mensal' :
               activeTab === 'my-tasks' ? 'Minhas Tarefas' : 'Planejamento'}
            </h2>
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
              <Search className="w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Buscar tarefas..." 
                className="bg-transparent border-none outline-none text-xs text-slate-300 w-48"
              />
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-black text-white tracking-tight">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-0.5">
                {currentUser.role === 'ADMIN' ? 'Administrador' : 'Operador'} • {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer group"
              title="Sair do sistema"
            >
              <Users className="w-5 h-5 text-slate-400 group-hover:text-rose-500" />
            </button>
          </div>
        </header>

        <div className="p-12 max-w-[1600px] mx-auto pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'my-tasks' && (
                <MyTasksView 
                  tasks={tasks.filter(t => t.responsible === currentUser.user_code)}
                  empresas={empresas}
                  onUpdate={updateTaskStatus}
                  onViewTask={setViewingTask}
                />
              )}

              {activeTab === 'dashboard' && (
                <DashboardView 
                  stats={stats}
                  tasks={tasks}
                  progressData={progressData}
                  delayedTasks={delayedTasks}
                  delayedRanking={delayedRanking}
                  setSelectedEmpresaId={setSelectedEmpresaId}
                  setActiveTab={setActiveTab}
                  setViewingTask={setViewingTask}
                  fetchData={fetchData}
                  filterEmpresa={filterEmpresa}
                  setFilterEmpresa={setFilterEmpresa}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  filterStatus={filterStatus}
                  setFilterStatus={setFilterStatus}
                  filterResponsible={filterResponsible}
                  setFilterResponsible={setFilterResponsible}
                  empresas={empresas}
                  users={users}
                  currentUser={currentUser}
                />
              )}
              {activeTab === 'kanban' && (
                <KanbanView 
                  currentUser={currentUser}
                  empresas={empresas}
                  onUpdate={updateTaskStatus}
                  setViewingTask={setViewingTask}
                />
              )}
              {activeTab === 'calendar' && (
                <CalendarView 
                  tasks={tasks}
                  setViewingTask={setViewingTask}
                />
              )}
              {activeTab === 'empresas' && (
                <EmpresasView 
                  empresas={empresas}
                  tasks={tasks}
                  progressData={progressData}
                  setViewingTask={setViewingTask}
                />
              )}
              {activeTab === 'report' && (
                <MonthlyReportView 
                  currentUser={currentUser}
                  empresas={empresas}
                />
              )}
              {activeTab === 'users' && currentUser?.role === 'ADMIN' && (
                <UsersView 
                  users={users}
                  empresas={empresas}
                  fetchUsers={fetchUsers}
                  showNotification={showNotification}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsView 
                  empresas={empresas}
                  users={users}
                  templates={templates}
                  fetchData={fetchData}
                  handleDeleteEmpresa={handleDeleteEmpresa}
                  handleDeleteTemplate={handleDeleteTemplate}
                  handleDeleteAllTasks={handleDeleteAllTasks}
                  handleEditTemplate={handleEditTemplate}
                  editingTemplate={editingTemplate}
                  setEditingTemplate={setEditingTemplate}
                  newTemplate={newTemplate}
                  setNewTemplate={setNewTemplate}
                  newItemText={newItemText}
                  setNewItemText={setNewItemText}
                  handleAddTemplate={handleAddTemplate}
                  currentUser={currentUser}
                  showNotification={showNotification}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Floating Action Button */}
        <button 
          onClick={() => setActiveTab('settings')}
          className="fixed bottom-12 right-12 w-16 h-16 bg-[#6366f1] hover:bg-indigo-500 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 transition-all hover:scale-110 active:scale-95 z-50 group"
        >
          <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
        </button>
        <footer className="fixed bottom-0 left-80 right-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 px-12 flex items-center justify-between z-40">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">RC Consultoria Financeira ©</p>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Desenvolvido por Lisle Layane de França do Carmo</p>
        </footer>
      </main>

      {/* Global Modals */}
      <AnimatePresence>
        {viewingTask && (
          <TaskDetailModal 
            task={viewingTask} 
            onClose={() => setViewingTask(null)} 
            onUpdate={updateTaskStatus}
            onDelete={handleDeleteTask}
            onUpdateChecklist={updateChecklist}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

