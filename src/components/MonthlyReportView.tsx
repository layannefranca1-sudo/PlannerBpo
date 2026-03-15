import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  MapPin, 
  PieChart as PieChartIcon, 
  BarChart as BarChartIcon,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronDown
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabaseClient';
import { User, Empresa, Task, Status } from '../types';

interface MonthlyReportViewProps {
  currentUser: User;
  empresas: Empresa[];
}

export const MonthlyReportView = ({ currentUser, empresas }: MonthlyReportViewProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterUser, setFilterUser] = useState('');

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth, selectedYear, filterEmpresa, filterUser]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('tarefas').select('*, empresas(nome), profiles:user_id(name)');
      
      // Month/Year filtering
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      
      query = query.gte('date', startDate.toISOString().split('T')[0])
                   .lte('date', endDate.toISOString().split('T')[0]);

      if (filterEmpresa) {
        query = query.eq('id_empresa', filterEmpresa);
      }
      
      if (filterUser) {
        query = query.eq('user_id', filterUser);
      } else if (currentUser.role === 'USER') {
        query = query.eq('user_id', currentUser.id);
      }

      const { data, error } = await query;

      if (!error && data) {
        const formattedTasks = data.map(t => ({
          ...t,
          empresa_name: t.empresas?.nome,
          user_name: t.profiles?.name
        }));
        setTasks(formattedTasks);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = tasks.length;
    const concluded = tasks.filter(t => t.status === 'CONCLUIDA').length;
    const inProgress = tasks.filter(t => t.status === 'EM_ANDAMENTO').length;
    const pending = tasks.filter(t => t.status === 'PENDENTE').length;
    const delayed = tasks.filter(t => t.status === 'ATRASADA').length;
    const completionRate = total > 0 ? Math.round((concluded / total) * 100) : 0;

    return { total, concluded, inProgress, pending, delayed, completionRate };
  }, [tasks]);

  const statusChartData = useMemo(() => [
    { name: 'Concluídas', value: stats.concluded, color: '#10b981' },
    { name: 'Em Andamento', value: stats.inProgress, color: '#6366f1' },
    { name: 'Pendentes', value: stats.pending, color: '#f59e0b' },
    { name: 'Atrasadas', value: stats.delayed, color: '#ef4444' },
  ].filter(d => d.value > 0), [stats]);

  const empresaChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      counts[t.empresa_name] = (counts[t.empresa_name] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [tasks]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    const title = `Relatório Mensal - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Total de Tarefas: ${stats.total}`, 14, 35);
    doc.text(`Concluídas: ${stats.concluded} (${stats.completionRate}%)`, 14, 42);
    doc.text(`Em Andamento: ${stats.inProgress}`, 14, 49);
    doc.text(`Atrasadas: ${stats.delayed}`, 14, 56);

    const tableData = tasks.map(t => [
      format(parseISO(t.date), 'dd/MM/yyyy'),
      t.name,
      t.empresa_name,
      t.user_name || t.responsible || 'N/A',
      t.status
    ]);

    autoTable(doc, {
      startY: 65,
      head: [['Data', 'Tarefa', 'Empresa', 'Responsável', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] }
    });

    doc.save(`relatorio_${selectedMonth}_${selectedYear}.pdf`);
  };

  const exportToExcel = () => {
    const data = tasks.map(t => ({
      Data: format(parseISO(t.date), 'dd/MM/yyyy'),
      Tarefa: t.name,
      Empresa: t.empresa_name,
      Responsável: t.user_name || t.responsible || 'N/A',
      Status: t.status
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Relatório");
    XLSX.writeFile(wb, `relatorio_${selectedMonth}_${selectedYear}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white/5 p-8 rounded-[2rem] border border-white/5">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/20">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Relatório Mensal</h1>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Consolidado de atividades e performance</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Período</label>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all min-w-[140px]"
                >
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Empresa</label>
              <select 
                value={filterEmpresa}
                onChange={(e) => setFilterEmpresa(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all min-w-[180px]"
              >
                <option value="">Todas as Empresas</option>
                {empresas.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
              </select>
            </div>

            {currentUser.role === 'ADMIN' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-2">Usuário</label>
                <select 
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-indigo-500 transition-all min-w-[180px]"
                >
                  <option value="">Todos os Usuários</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border border-rose-500/20"
          >
            <Download className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total de Tarefas', value: stats.total, icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Concluídas', value: stats.concluded, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Em Andamento', value: stats.inProgress, icon: Clock, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
          { label: 'Atrasadas', value: stats.delayed, icon: AlertCircle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
          { label: 'Conclusão', value: `${stats.completionRate}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/5 p-6 rounded-[1.5rem] border border-white/5 flex flex-col gap-4">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <PieChartIcon className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Distribuição de Status</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white/5 p-8 rounded-[2rem] border border-white/5">
          <div className="flex items-center gap-3 mb-8">
            <BarChartIcon className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Tarefas por Empresa</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={empresaChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  itemStyle={{ color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed List */}
      <div className="bg-white/5 rounded-[2rem] border border-white/5 overflow-hidden">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Lista Detalhada</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {tasks.length} tarefas encontradas
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tarefa</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Empresa</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Responsável</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Carregando dados...</p>
                    </div>
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Nenhuma tarefa encontrada para este período</p>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-slate-500" />
                        <span className="text-xs font-bold text-slate-200">{format(parseISO(task.date), 'dd/MM/yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-xs font-black text-white uppercase tracking-tight">{task.name}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-bold text-slate-400">{task.empresa_name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-xs font-bold text-slate-400">{task.user_name || task.responsible || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className={`text-[10px] px-3 py-1 rounded-lg font-black uppercase tracking-widest border ${
                        task.status === 'CONCLUIDA' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        task.status === 'EM_ANDAMENTO' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        task.status === 'ATRASADA' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {task.status === 'CONCLUIDA' ? 'Concluída' :
                         task.status === 'EM_ANDAMENTO' ? 'Em Andamento' :
                         task.status === 'ATRASADA' ? 'Atrasada' : 'Pendente'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
