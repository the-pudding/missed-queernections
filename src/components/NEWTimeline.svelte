<script>
    // ─────────────────────────────────────────────────────────────────────────
    // LIBRARIES & DATA
    // ─────────────────────────────────────────────────────────────────────────
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
    import combinedData from "$data/combined.csv";
    import { themes, colors } from "$runes/misc.svelte.js";
    import Path from "$components/NEWTimeline.Side.Path.svelte";
    import Circle from "$components/NEWTimeline.Side.Circle.svelte";
    // combinedData: flat array of event rows from CSV
    // themes: ordered array of theme name strings, e.g. ["beHer", "representation", ...]
    // colors: parallel array of hex colors, one per theme

    // ─────────────────────────────────────────────────────────────────────────
    // SVG + SCROLL STATE
    // All declared as $state so Svelte tracks changes and re-runs derived
    // computations when they update.
    // ─────────────────────────────────────────────────────────────────────────
    let svgHeight = $state(60000);  // Fixed tall canvas — one long scrollable SVG, change this to increase/decrease space between events
    let svgWidth = $state(0);       // Bound to SVG element width; updates on resize
    let scrollY = $state(0);        // Current scroll position (px from top)
    let windowHeight = $state(0);   // Viewport height
    let maxScroll = $state(0);      // High-water mark of how far user has scrolled
                                    // (never decreases — drives one-way reveal animation)

    // ─────────────────────────────────────────────────────────────────────────
    // DATE SCALE
    // Maps a JS Date → a y-pixel position on the 60000px tall SVG.
    // Built once from the full data extent; never changes.
    // ─────────────────────────────────────────────────────────────────────────
    const allDates = combinedData.map(d => new Date(d.longDate || d.date)).filter(d => d);
    const [minDate, maxDate] = d3.extent(allDates);

    const yScale = d3.scaleTime()
        .domain([minDate, maxDate])   // earliest → latest date in data
        .range([100, 60000 - 100]);   // 100px padding top and bottom

    // ─────────────────────────────────────────────────────────────────────────
    // processData()
    // Runs ONCE at startup. Transforms raw CSV rows into a nested structure
    // that the renderer can efficiently consume.
    //
    // Output shape:
    //   [ // one entry per "side" (jan / ashleé)
    //     {
    //       side: "jan",
    //       themesData: [ // one entry per theme
    //         {
    //           themeName: "representation",
    //           pathPoints: [...],   // thinned daily events for the SVG path
    //           circlePoints: [...], // only real (non-placeholder) events
    //         }, ...
    //       ]
    //     }, ...
    //   ]
    // ─────────────────────────────────────────────────────────────────────────
    const processData = (rawData) => {
        // Parse dates and drop any rows with invalid dates
        const formattedData = rawData.map(d => ({
            ...d,
            parsedDate: new Date(d.longDate || d.date)
        })).filter(d => d.parsedDate instanceof Date && !isNaN(d.parsedDate));

        // Generate one entry per calendar day across the full date range.
        // This gives us a dense daily scaffold to hang pull values onto.
        const dateRange = d3.timeDay.range(minDate, d3.timeDay.offset(maxDate, 1));

        // The two "sides" of the timeline. Each side reads from a different
        // theme column in the CSV.
        const sides = [
            { key: "jan",    themeCol: "janTheme" },
            { key: "ashleé", themeCol: "ashleéTheme" }
        ];

        return sides.map(side => {
            // Group all events by their theme value for this side.
            // Events with no theme (blank/missing) go into "none".
            const groupedByTheme = d3.group(formattedData, d => {
                const val = d[side.themeCol];
                return (val && val.trim() !== "") ? val.trim() : "none";
            });

            return {
                side: side.key,
                themesData: themes.map(themeName => {

                    // All real events belonging to this theme on this side
                    const realEvents = groupedByTheme.get(themeName) || [];

                    // Index real events by formatted date string for O(1) lookup
                    const eventMap = d3.group(realEvents, d => d3.timeFormat("%B %-d, %Y")(d.parsedDate));

                    // ── Build the dense daily array ───────────────────────
                    // realEventIndices tracks the positions of real events so
                    // we can look backwards/forwards from any given day.
                    const realEventIndices = [];

                    const dailyEvents = dateRange.map((date, i) => {
                        const dateString = d3.timeFormat("%B %-d, %Y")(date);
                        const existing = eventMap.get(dateString);

                        // A "center match" means both jan and ashleé share this
                        // theme on the same day — the event lives at the center
                        // of the SVG rather than in a lane.
                        const isCenterMatch = existing && 
                                            existing[0].janTheme === existing[0].ashleéTheme && 
                                            String(existing[0].match) === "1";

                        if (isCenterMatch) realEventIndices.push({ index: i, type: 'center', parsedDate: date });
                        else if (existing) realEventIndices.push({ index: i, type: 'lane',   parsedDate: date });

                        // Placeholder days have no real event — they exist only
                        // to give the path something to interpolate through.
                        return existing
                            ? { ...existing[0], isPlaceholder: false, parsedDate: date, isCenterMatch }
                            : { parsedDate: date, isPlaceholder: true };
                    });

                    // ─────────────────────────────────────────────────────
                    // FIRST PASS — compute combinedPull and triggerY
                    //
                    // combinedPull: 0→1 value controlling how far this day's
                    //   path point moves from its lane toward the center.
                    //   0 = stays in lane, 1 = fully at center.
                    //
                    // triggerY: the y-pixel of the event that "caused" this
                    //   day's pull. Used as the scroll activation threshold.
                    //
                    // Pull comes from three sources:
                    //   1. At a real event: full pull (center=1.0, lane=0.5)
                    //   2. Bridge: two events close enough (<bridgeLimit days)
                    //      to interpolate smoothly between their pulls
                    //   3. Ramp: a gentle cosine fade in/out within windowSize
                    //      days of an isolated event
                    // ─────────────────────────────────────────────────────
                    const windowSize = 45;   // days to ramp in/out around an isolated event
                    const bridgeLimit = 100; // if two events are within this many days,
                                             // bridge them instead of ramping each separately

                    dailyEvents.forEach((day, i) => {
                        let finalPull = 0;
                        let triggerDate = day.parsedDate;

                        // Nearest real event at or before today (look backwards)
                        const prevEvent = [...realEventIndices].reverse().find(e => e.index <= i);
                        // Nearest real event after today (look forwards)
                        const nextEvent = realEventIndices.find(e => e.index > i);

                        // Full pull depth for each neighboring event
                        const prevDepth = prevEvent ? (prevEvent.type === 'center' ? 1.0 : 0.5) : 0;
                        const nextDepth = nextEvent ? (nextEvent.type === 'center' ? 1.0 : 0.5) : 0;

                        if (prevEvent && prevEvent.index === i) {
                            // ── Case 1: this IS a real event ──
                            // Pull to full depth immediately; trigger is this event itself.
                            finalPull = prevDepth;
                            triggerDate = prevEvent.parsedDate;

                        } else if (prevEvent && nextEvent && (nextEvent.index - prevEvent.index) < bridgeLimit) {
                            // ── Case 2: inside a bridge ──
                            // The gap between prev and next is short enough to interpolate.
                            // t goes 0→1 from prevEvent to nextEvent.
                            // easedT applies a cosine ease so the transition is smooth.
                            const t = (i - prevEvent.index) / (nextEvent.index - prevEvent.index);
                            const easedT = (1 - Math.cos(t * Math.PI)) / 2;
                            finalPull = prevDepth + (nextDepth - prevDepth) * easedT;
                            triggerDate = prevEvent.parsedDate; // bridge activates with prevEvent

                        } else {
                            // ── Case 3: ramp in/out around isolated events ──
                            // Check both directions and take whichever produces more pull.
                            let rampPull = 0;

                            // Ramp OUT from prevEvent (pull decays as we move away)
                            if (prevEvent && (i - prevEvent.index) <= windowSize) {
                                const t = (i - prevEvent.index) / (windowSize + 1);
                                rampPull = prevDepth * ((1 + Math.cos(Math.PI * t)) / 2);
                                triggerDate = prevEvent.parsedDate;
                            }

                            // Ramp IN toward nextEvent (pull builds as we approach)
                            if (nextEvent && (nextEvent.index - i) <= windowSize) {
                                const t = (nextEvent.index - i) / (windowSize + 1);
                                const incomingPull = nextDepth * ((1 + Math.cos(Math.PI * t)) / 2);
                                if (incomingPull > rampPull) {
                                    rampPull = incomingPull;
                                    triggerDate = nextEvent.parsedDate;
                                }
                            }

                            finalPull = rampPull;
                        }

                        day.combinedPull = finalPull;
                        day.triggerY = yScale(triggerDate);
                    });

                    // ─────────────────────────────────────────────────────
                    // SECOND PASS — assign segmentKey
                    //
                    // Problem the first pass leaves behind: in a connected
                    // pull region (e.g. ramp → bridge → ramp), each day may
                    // have a slightly different triggerY because it references
                    // different neighboring events. This means the path would
                    // "unzip" point by point as the user scrolls rather than
                    // snapping out all at once.
                    //
                    // Fix: walk forward through all days. Whenever pull > 0,
                    // we're inside a connected run. Lock in the FIRST triggerY
                    // seen in that run and assign it to every subsequent day
                    // until pull drops back to 0 (end of run).
                    //
                    // Result: every point in a connected pull region shares
                    // the same segmentKey, so the whole shape activates
                    // together when the first event in the run scrolls into view.
                    // ─────────────────────────────────────────────────────
                    let runTriggerY = null;
                    for (let i = 0; i < dailyEvents.length; i++) {
                        const day = dailyEvents[i];
                        if (day.combinedPull > 0) {
                            if (runTriggerY === null) runTriggerY = day.triggerY; // lock in first
                            day.segmentKey = runTriggerY;
                        } else {
                            runTriggerY = null;  // run ended, reset for next run
                            day.segmentKey = null;
                        }
                    }

                    // ─────────────────────────────────────────────────────
                    // PATH POINT THINNING
                    //
                    // The full dailyEvents array has ~1800 entries (one per day
                    // over ~5 years). Drawing a path through all of them is
                    // wasteful — most placeholder days at pull=0 are collinear.
                    //
                    // Keep a point if:
                    //   - it's the first or last day (path endpoints)
                    //   - it's a real event (always draw the dot positions exactly)
                    //   - pull changed from the previous day (inflection point)
                    //   - triggerY changed (segment boundary — affects activation)
                    //   - every 10th placeholder (coarse skeleton for zero-pull runs)
                    // ─────────────────────────────────────────────────────
                    const pathPoints = dailyEvents.filter((d, i, arr) => {
                        if (i === 0 || i === arr.length - 1) return true;
                        if (!d.isPlaceholder) return true;
                        const isInflection   = i > 0 && d.combinedPull !== arr[i - 1].combinedPull;
                        const isTriggerChange = i > 0 && d.triggerY    !== arr[i - 1].triggerY;
                        return isInflection || isTriggerChange || i % 10 === 0;
                    });

                    // circlePoints: only the real events — these become the
                    // clickable/hoverable dot markers on the timeline.
                    const circlePoints = dailyEvents.filter(d => !d.isPlaceholder);

                    return { themeName, pathPoints, circlePoints };
                })
            };
        });
    };

    // Run processData once. baseData is a plain object — not reactive.
    // All the expensive date math, pull calculations, and thinning happen here
    // and never again.
    const baseData = processData(combinedData);

    // ─────────────────────────────────────────────────────────────────────────
    // SCROLL HIGH-WATER MARK
    //
    // maxScroll only ever increases. This means:
    //   - Once a segment has been revealed, it stays revealed (no snap-back)
    //   - The $derived renderedData only recomputes when new territory is
    //     scrolled into — most scroll events (scrolling back up) are no-ops
    // ─────────────────────────────────────────────────────────────────────────
    $effect(() => {
        const threshold = scrollY + (windowHeight * 0.85);
        // 0.85 = reveal triggers when element is 85% down the viewport,
        // giving a slight "just coming into view" feel rather than triggering
        // right at the top of the screen.
        if (threshold > maxScroll) maxScroll = threshold;
    });

    // ─────────────────────────────────────────────────────────────────────────
    // DERIVED RENDER DATA
    //
    // This is the only computation that runs on scroll. It turns baseData
    // (static pull values) into concrete SVG path strings and circle positions
    // by applying the current maxScroll as the activation threshold.
    //
    // Runs when maxScroll or svgWidth changes. svgWidth drives laneX/centerX
    // so the layout reflows correctly on window resize.
    // ─────────────────────────────────────────────────────────────────────────
    const renderedData = $derived.by(() => {
        const ms = maxScroll; // snapshot — avoids repeated reactive reads
        const sw = svgWidth;

        return baseData.map((sideData, sideIndex) => {
            // jan is on the left (direction=+1, lanes extend rightward toward center)
            // ashleé is on the right (direction=-1, lanes extend leftward toward center)
            const direction = sideIndex === 0 ? 1 : -1;
            const centerX = sw / 2;

            return {
                ...sideData,
                themesData: sideData.themesData.map((theme, themeIndex) => {
                    const themeColor = colors[themeIndex];

                    // laneX: the "rest" x position for this theme's strand when pull=0.
                    // Each theme gets its own lane, stacked 10px apart from the edge inward.
                    const laneX = (sideIndex === 0 ? 0 : sw) + (40 * direction) + (themeIndex * 10 * direction);

                    // getX: converts a day's combinedPull into an x coordinate.
                    //
                    // segmentKey ?? triggerY: use the run-level activation threshold
                    // (segmentKey) if available, otherwise fall back to the day's own
                    // triggerY. This is what ensures whole segments snap out together.
                    //
                    // Linear interpolation: laneX at pull=0, centerX at pull=1.
                    function getX(d) {
                        const activationY = d.segmentKey ?? d.triggerY;
                        const isActivated = activationY <= ms;
                        const p = isActivated ? d.combinedPull : 0;
                        return laneX + (centerX - laneX) * p;
                    }

                    // Build the SVG path string from thinned path points.
                    // d3.line() calls getX/getY once per point — no reactive reads
                    // inside the loop, just plain math on snapshot values.
                    const pathD = d3.line()
                        .x(d => getX(d))
                        .y(d => yScale(d.parsedDate))
                        .curve(d3.curveLinear)
                        (theme.pathPoints);

                    // Pre-compute circle positions. The template just reads cx/cy —
                    // no function calls inside {#each}.
                    const circles = theme.circlePoints.map(day => ({
                        cx: getX(day),
                        cy: yScale(day.parsedDate),
                        event: day.event,
                    }));

                    return { ...theme, themeColor, pathD, circles };
                })
            };
        });
    });
</script>

<!-- Bind scroll position and viewport height to reactive state -->
<svelte:window bind:scrollY bind:innerHeight={windowHeight} />

<section id="timeline">
    <!--
        figure height = svgHeight so the page is actually scrollable.
        The SVG itself is position:sticky or just tall — the figure creates
        the scroll distance.
    -->
    <figure style="height: {svgHeight}px;">
        <!--
            bind:clientWidth keeps svgWidth in sync with the rendered SVG width.
            This drives laneX/centerX recalculation on resize.
        -->
        <svg width="100%" height={svgHeight} bind:clientWidth={svgWidth}>
            {#each renderedData as sideData}
                <g class="side-{sideData.side}">
                    {#each sideData.themesData as theme, themeIndex (theme.themeName)}
                        <g class="paths-{sideData.side}-{theme.themeName}">
                            <!--
                                themeIndex !== -1 guard: themes.indexOf() returns -1
                                if the theme name isn't in the themes array.
                                Shouldn't happen with clean data, but belt-and-suspenders.
                            -->
                            {#if themeIndex !== -1}
                                <!--
                                    pathD is a pre-computed string — no computation here.
                                    The CSS transition on `d` animates the path shape
                                    smoothly as segments snap into place on scroll.
                                -->
                                <Path 
                                    d={theme.pathD}
                                    stroke={theme.themeColor}
                                />
                            {/if}
                        </g>
                    {/each}
                    {#each sideData.themesData as theme, themeIndex (theme.themeName)}
                        <g class="circles-{sideData.side}-{theme.themeName}">
                            <!--
                                Circles sit at real event positions.
                                cx is pre-computed; CSS transition animates it
                                when the segment activates.
                            -->
                            {#if themeIndex !== -1}
                                {#each theme.circles as circle}
                                    <Circle 
                                        circle={circle}
                                        fill={theme.themeColor} 
                                        centerX={svgWidth / 2}
                                    />
                                {/each}
                            {/if}
                        </g>
                    {/each}
                </g>
            {/each}
        </svg>
    </figure>
</section>

<style>
    #timeline { width: 100%; background: transparent; }
    figure { width: 100%; margin: 0; }
    svg { display: block; overflow: visible; }
    
    path { 
        /*
            Animates the SVG path shape (`d` attribute) when segments activate.
            cubic-bezier gives a snappy-but-smooth feel.
            shape-rendering: geometricPrecision prevents jagged edges on
            diagonal strokes at sub-pixel positions.
        */
        transition: d 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        shape-rendering: geometricPrecision; 
        pointer-events: none; /* clicks pass through to circles underneath */
    }

    circle {
        /*
            Animates cx (horizontal position) when a segment activates,
            matching the path transition timing exactly so dots and lines
            move together.
        */
        transition: cx 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        cursor: pointer;
        pointer-events: all;
    }
    
    circle:hover {
        r: 13; /* grows on hover — also CSS-transitioned by the browser */
    }
</style>