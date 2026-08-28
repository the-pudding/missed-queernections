import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dbmtysppmiwwjwaeneex.supabase.co";
const supabaseKey = "sb_publishable_W1HmLYmbk86Q2QUGJoIO2Q_h-KqfS2R";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getRecentVisitors({
    excludeUserId = null,
    limit = 99
} = {}) {
    let query = supabase
        .from("queernections")
        .select("user_id, events, famous")
        .order("updated_at", { ascending: false })
        .limit(limit);

    if (excludeUserId) {
        query = query.neq("user_id", excludeUserId);
    }

    const { data, error } = await query;
    if (error) {
        console.error("Error fetching recent visitors:", error);
        throw error;
    }
    return data ?? [];
}

export async function insert({ user_id, events, famous }) {
    // 1. Resolve famous value: use parameter first, fall back to localStorage, or default to null
    const resolvedFamous = famous !== undefined 
        ? famous 
        : (typeof window !== "undefined" ? localStorage.getItem("famous") : null);

    // 2. Include famous in the upsert payload object
    const { data, error } = await supabase
        .from("queernections")
        .upsert(
            {
                user_id: user_id,
                events: events,
                famous: resolvedFamous
            },
            {
                onConflict: "user_id"
            }
        )
        .select();

    if (error) {
        throw error;
    }

    return data;
}