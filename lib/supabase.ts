import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema (snake_case)
export interface ImageRow {
  id?: number;
  url: string;
  title?: string | null;
  width?: number | null;
  height?: number | null;
  mime?: string | null;
  added_at?: string | null;
  taken_at?: string | null;
  source?: string | null;
  attribution?: string | null;
  license_name?: string | null;
  license_url?: string | null;
  description?: string | null;
  categories?: any | null;
  owner?: string | null;
}

