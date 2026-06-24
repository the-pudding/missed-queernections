import { writable } from 'svelte/store';

export const themes = ["representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];

export const longThemes = [ {theme: "representation", longTheme: "All representation matters"},
                            {theme: "beHer", longTheme: "Be her or be with her"},
                            {theme: "genderConstruct", longTheme: "Gender is a construct"},
                            {theme: "girlPower", longTheme: "Girl power"},
                            {theme: "gaySeeGay", longTheme: "Gay recognize gay"},
                            {theme: "publicOpinion", longTheme: "Court of public opinion"},
                            {theme: "trueSelves", longTheme: "Trying on our true selves"}
                        ];

export const colors = [
    "#FF94CD", // Light Hot Pink
    "#FF7676", // Soft Coral Red
    "#FFAE58", // Bright Apricot Orange
    "#FFD426", // Sunny Yellow
    "#B18CFF", // Bright Lavender (Fixed from dark purple!)
    "#5CE1E1", // Electric Mint Cyan
    "#7CD67C"  // Fresh Lime Green
];

export function normalizeEventKey(str) {
    return String(str || '')
        .toLowerCase()              // optional: lowercase everything
        .replace(/\s+/g, '')        // remove all whitespace
        .replace(/[^a-z0-9\-]/g, ''); // remove all non-alphanum chars
}

export const addedEvents = writable([]);

export const instructionStep = writable(0);

export const instructionsVisible = writable(false);

export const activeSection = writable("intro");

export const userId = writable("");

// Array of { user_id, events } — the 99 most recent visitors from the database.
// Populated once by UserNetwork on mount.
export const visitors = writable([]);