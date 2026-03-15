import { format, parseISO, eachDayOfInterval, isWeekend } from 'date-fns';
import { supabase } from './supabaseClient';

export async function generateTasksFromTemplate(template: any) {
  const start = parseISO(template.start_date);
  const end = parseISO(template.end_date);
  const days = eachDayOfInterval({ start, end });

  const tasksToInsert: any[] = [];

  for (const day of days) {
    const dateStr = format(day, "yyyy-MM-dd");
    
    let shouldGenerate = false;
    if (template.frequency === 'DIAS_UTEIS') {
      if (!isWeekend(day)) shouldGenerate = true;
    } else if (template.frequency === 'SEMANAL') {
      if (day.getDay() === start.getDay()) shouldGenerate = true;
    } else if (template.frequency === 'MENSAL') {
      if (day.getDate() === start.getDate()) shouldGenerate = true;
    }

    if (shouldGenerate) {
      tasksToInsert.push({
        id_empresa: template.id_empresa,
        template_id: template.id,
        user_id: template.user_id,
        date: dateStr,
        name: template.name,
        description: template.description,
        responsible: template.responsible,
        priority: template.priority,
        checklist: template.checklist,
        status: 'PENDENTE'
      });
    }
  }

  if (tasksToInsert.length > 0) {
    const { error } = await supabase
      .from('tarefas')
      .insert(tasksToInsert);
    
    if (error) {
      console.error('Supabase error generating tasks in tarefas table:', error);
      throw error;
    }
  }
}
