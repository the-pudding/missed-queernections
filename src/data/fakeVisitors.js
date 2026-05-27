// Fake data representing the last 99 visitors' selected events.
// Uses the same event names from jan.csv so they match $addedEvents.
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
    "Vagina Monologues",
    "Willow/Tara",
    "Ellen/Laura Dern",
    "WNBA",
    "Lillith Fair",
    "Kate Winslet",
    "Angelina Jolie",
    "Sex and the City",
    "Mulan",
    "Tegan and Sara",
    "Sarah Michelle Gellar/Selma Blair",
    "But I'm a Cheerleader",
    "Boys Don't Cry",
    "Bring It On",
    "Detective Olivia Benson",
    "AfterEllen",
    "Bend it Like Beckham",
    "Britney & Madonna (& Christina) kiss",
    "Wicked (Broadway)",
    "The L Word",
    "Alex/Marissa",
    "Spashley",
    "I Kissed A Girl",
    "Rachel Maddow",
    "Callie/Arizona",
    "RuPaul's Drag Race",
    "Autostraddle",
    "Jennifer's Body",
    "Orange is the New Black",
    "Carol/Therese",
    "Obergefell v. Hodges",
    "Kate McKinnon",
    "Sarah Paulson/Holland Taylor",
    "Fun Home",
    "Blue is the Warmest Color",
    "Lori \"Ice\" Fetrick",
    "Victoria's Secret Fashion Show",
    "Mrs. Doubtfire",
    "Neve Campbell/Denise Richards",
    "Ruthie",
    "Love and Basketball",
    "Coyote Ugly",
    "Halle Berry",
    "Evan Rachel Wood/Nikki Reed",
    "Shakira/Beyoncé",
    "Dani",
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

export const fakeVisitors = Array.from({ length: 99 }, (_, i) => {
    const rng = seededRandom(i * 48271 + 16807);
    const count = 3 + Math.floor(rng() * 10);
    return pickRandom(EVENT_POOL, count, rng);
});

// Pre-computed visitor-visitor shared-event counts (static, ~2400 links).
// Use Sets for O(1) lookup.
const visitorSets = fakeVisitors.map(v => new Set(v));

export const visitorLinks = [];
for (let i = 0; i < 99; i++) {
    for (let j = i + 1; j < 99; j++) {
        const count = fakeVisitors[i].filter(e => visitorSets[j].has(e)).length;
        if (count > 0) {
            visitorLinks.push({ source: i + 1, target: j + 1, weight: count });
        }
    }
}
