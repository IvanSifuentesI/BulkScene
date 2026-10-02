import { supabase } from '../config/supabaseClient';

async function main() {
  const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
  console.log('rpc result:', error ? error.message : data);
}

main();
