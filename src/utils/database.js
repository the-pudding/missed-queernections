import { createClient } from "@supabase/supabase-js";
const supabaseUrl = "https://dbmtysppmiwwjwaeneex.supabase.co";
const supabaseKey = "sb_publishable_W1HmLYmbk86Q2QUGJoIO2Q_h-KqfS2R";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function insert({ user_id, events }) {
	console.log("Upserting data for:", { user_id, events });

	const { data, error } = await supabase
		.from("queernections")
		.upsert(
			{
				user_id: user_id,
				events: events
			},
			{
				onConflict: "user_id"
			}
		)
		.select();

	if (error) {
		console.error("Error upserting data:", error);
		throw error;
	}

	return data;
}
