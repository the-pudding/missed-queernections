// Run once: node scripts/seed-fake-visitors.js
// Inserts 99 fake visitors into Supabase. Existing rows (by user_id) are skipped.

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://dbmtysppmiwwjwaeneex.supabase.co";
const supabaseKey = "sb_publishable_W1HmLYmbk86Q2QUGJoIO2Q_h-KqfS2R";
const supabase = createClient(supabaseUrl, supabaseKey);

// Same pool as src/data/fakeVisitors.js
const EVENT_POOL = [
	"Kelly Kapowski",
	"Raven Symone",
	"Same-sex couples",
	"Thelma and Louise",
	"TLC condoms outfits",
	"Fried Green Tomatoes",
	"Michelle Pfeiffer",
	"A League of Their Own (movie)",
	"Stone Butch Blues",
	"k.d. lang/Cindy Crawford",
	"Gillian Anderson",
	"Spice Girls",
	"Alicia Silverstone/Liv Tyler",
	"Da Brat",
	"Xena",
	"The Rosie O'Donnell Show",
	"Miss Honey",
	"WNBA",
	"Lillith Fair",
	"Kate Winslet",
	"Angelina Jolie",
	"Mulan",
	"Man I Feel Like a Woman",
	"Sarah Michelle Gellar/Selma Blair",
	"Ruthie",
	"Detective Olivia Benson",
	"Boys Don't Cry",
	"But I'm a Cheerleader",
	"Bring It On",
	"All the Things She Said",
	"The Chicks",
	"Britney & Madonna (& Christina) kiss",
	"The L Word",
	"Mean Girls",
	"Halle Berry",
	"Alex/Marissa",
	"Fun Home",
	"Shakira/Beyoncé",
	"Like a Boy",
	"Dani",
	"I Kissed A Girl",
	"Rachel Maddow",
	"Lindsay Lohan/Samantha Ronson",
	"Callie/Arizona",
	"Prop 8",
	"RuPaul's Drag Race",
	"Autostraddle",
	"Don't Ask Don't Tell repeal",
	"Santana/Brittney",
	"TomboyX",
	"Orange is the New Black",
	"Blue is the Warmest Color",
	"Carol/Therese",
	"Obergefell v. Hodges / Kim Davis",
	"Sarah Paulson/Holland Taylor",
	"Pulse",
	"Pink",
	"Sex Education",
	"Woxer",
	"Amy Schneider",
	"Repeal of Roe v. Wade",
	"A League of Their Own (TV)",
	"Bottoms",
	"Reneé Rapp",
	"Chappell Roan",
	"Ilona Maher",
	"Kehlani/KWN",
	"K-Pop Demon Hunters",
	"Neve Campbell/Denise Richards",
	"Ruthie",
	"Love and Basketball",
	"Coyote Ugly",
	"Evan Rachel Wood/Nikki Reed",
	"Shakira/Beyoncé",
	"Kim Stolz",
	"Hayley Williams",
	"Oprah",
	"Frozen",
];

function seededRandom(seed) {
	let s = seed;
	return function () {
		s = (s * 1664525 + 1013904223) & 0xffffffff;
		return (s >>> 0) / 0x100000000;
	};
}

function pickRandom(arr, n, rng) {
	const shuffled = [...arr];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled.slice(0, Math.min(n, arr.length));
}

const fakeVisitors = Array.from({ length: 99 }, (_, i) => {
	const rng = seededRandom(i * 48271 + 16807);
	const count = 3 + Math.floor(rng() * 10);
	return pickRandom(EVENT_POOL, count, rng);
});

async function seed() {
	console.log(`Seeding ${fakeVisitors.length} fake visitors…`);

	let inserted = 0;
	let skipped = 0;

	for (let i = 0; i < fakeVisitors.length; i++) {
		const user_id = `fake-${String(i + 1).padStart(3, "0")}`;
		const events = fakeVisitors[i];

		// Use insert (not upsert) so we never overwrite real rows.
		// Duplicate user_ids will return a conflict error — we just skip them.
		const { error } = await supabase
			.from("queernections")
			.insert({ user_id, events });

		if (error) {
			if (error.code === "23505") {
				// unique_violation — row already exists
				console.log(`  skip ${user_id} (already exists)`);
				skipped++;
			} else {
				console.error(`  error on ${user_id}:`, error.message);
			}
		} else {
			console.log(`  inserted ${user_id} (${events.length} events)`);
			inserted++;
		}
	}

	console.log(`\nDone. ${inserted} inserted, ${skipped} skipped.`);
}

seed();
