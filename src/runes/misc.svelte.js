import { writable } from 'svelte/store';

export const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];

export const longThemes = [{theme: "lust", longTheme: "Lust"},
                            {theme: "representation", longTheme: "All representation matters"},
                            {theme: "beHer", longTheme: "Be her or be with her"},
                            {theme: "genderConstruct", longTheme: "Gender is a construct"},
                            {theme: "girlPower", longTheme: "Girl power"},
                            {theme: "gaySeeGay", longTheme: "Gay recognize gay"},
                            {theme: "publicOpinion", longTheme: "Court of public opinion"},
                            {theme: "trueSelves", longTheme: "Trying on our true selves"}
                        ];

export const colors = ["#FF69B4", "#FF1818", "#FF8E00", "#FFCC00", "#008600", "#00C0C0", "#400098", "#8E008E"];

export function normalizeEventKey(str) {
    return String(str || '')
        .toLowerCase()              // optional: lowercase everything
        .replace(/\s+/g, '')        // remove all whitespace
        .replace(/[^a-z0-9\-]/g, ''); // remove all non-alphanum chars
}

export const addedEvents = writable([]);

export const instructionStep = writable(0);

export const activeSection = writable("intro");