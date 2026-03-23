import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Sadece client tarafı veya Edge Functions auth doğrulamaları için temel instance
// Prisma olduğu için veritabanı okuma/yazma işlemleri Prisma üzerinden yapılacaktır.
export const supabase = createClient(supabaseUrl, supabaseKey);
