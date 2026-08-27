import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
  const [key, val] = line.split('=');
  if (key && val) envVars[key.trim()] = val.trim();
});
const supabase = createClient(envVars.VITE_SUPABASE_URL, envVars.VITE_SUPABASE_ANON_KEY);
async function test() {
  const { data, error } = await supabase.from('services').insert([{ 
    name: 'Test Service', 
    description: 'Test', 
    price: 100, 
    cost: 50, 
    category: 'Test', 
    logbook: {} 
  }]).select();
  console.log('Result:', data, '\nError:', error);
}
test();
