import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("URL:", supabaseUrl); // Debería mostrar tu URL de Supabase, no "undefined"
console.log("KEY exists:", !!supabaseAnonKey); // Debería mostrar true

export const supabase = createClient(supabaseUrl, supabaseAnonKey);