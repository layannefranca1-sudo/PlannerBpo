export interface User {
  id: number;
  name: string;
  email?: string;
  user_code?: string;
  role: 'ADMIN' | 'USER';
}

export type Priority = 'BAIXA' | 'MEDIA' | 'ALTA';
export type Status = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'ATRASADA';
export type Frequency = 'DIAS_UTEIS' | 'SEMANAL' | 'MENSAL';

export interface Empresa {
  id: number;
  name: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Task {
  id: number;
  empresa_id: number;
  template_id?: number;
  date: string;
  status: Status;
  name: string;
  description: string;
  responsible: string;
  priority: Priority;
  checklist: ChecklistItem[];
  empresa_name?: string;
}

export interface DashboardStats {
  total: number;
  concluded: number;
  in_progress: number;
  pending: number;
  delayed: number;
}
