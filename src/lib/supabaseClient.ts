import { createClient } from "@supabase/supabase-js";

// URL do seu projeto Supabase
const supabaseUrl = "https://qjwfnzahicjxhbwywyni.supabase.co";

// Chave anônima (para frontend)
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqd2ZuemFoaWNqeGhid3l3eW5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1MDkwMTUsImV4cCI6MjA4OTA4NTAxNX0.6MimWvSro51JBY-AX8a_0ZGHILjunqwtG5W5Ammjnjw";

// Cria o cliente Supabase
export const supabase = createClient(supabaseUrl, supabaseKey);
