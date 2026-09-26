import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL ? process.env.VITE_SUPABASE_URL.replace(/^['"]|['"]$/g, '') : '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ? process.env.VITE_SUPABASE_ANON_KEY.replace(/^['"]|['"]$/g, '') : '';

export const supabase = createClient(supabaseUrl, supabaseKey);
