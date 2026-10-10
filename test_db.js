import { supabase } from './src/supabaseClient.js';

async function test() {
  const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: false }).limit(2);
  console.log(JSON.stringify(data, null, 2));
}

test();
