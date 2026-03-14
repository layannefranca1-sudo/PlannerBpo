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
        station_id: template.station_id,
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
    // In Supabase, we can use upsert or just insert. 
    // To avoid duplicates, we might need a unique constraint on (station_id, template_id, date)
    const { error } = await supabase
      .from('tasks')
      .upsert(tasksToInsert, { onConflict: 'station_id,template_id,date' });
    
    if (error) {
      console.error('Error generating tasks:', error);
      throw error;
    }
  }
}
