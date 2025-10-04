import { writable } from 'svelte/store';

export const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];

export const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];

export function normalizeEventKey(str) {
    return String(str || '')
        .toLowerCase()              // optional: lowercase everything
        .replace(/\s+/g, '')        // remove all whitespace
        .replace(/[^a-z0-9\-]/g, ''); // remove all non-alphanum chars
}

export const addedEvents = writable([]);