import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://dbmtysppmiwwjwaeneex.supabase.co'
const supabaseKey = 'sb_publishable_W1HmLYmbk86Q2QUGJoIO2Q_h-KqfS2R'
const supabase = createClient(supabaseUrl, supabaseKey);

export async function insert() {
    const { data, error } = await supabase
        .from('queernections')
        .insert([
            { user_id: 'someValue', events: 'otherValue' },
        ])
        .select()
        }