import { supabase } from '../../../lib/supabaseClient';

export default async function handler(req, res) {
  const { data, error } = await supabase
    .from('exposants')
    .select('*')
    .order('nom', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ exposants: data });
}
