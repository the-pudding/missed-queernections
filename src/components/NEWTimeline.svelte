<script>
    // ------------------- LIBRARIES -------------------
    import * as d3 from 'd3';
    // ------------------- DATA -------------------
    import combinedData from "$data/combined.csv";
    // ------------------- RUNES -------------------
    import { themes, colors } from "$runes/misc.svelte.js";

    // ------------------- SVG DIMENSIONS -------------------
    let svgHeight = $state(40000); 
    let svgWidth = $state(0);

    // ------------------- DATA PROCESSING -------------------
    const processData = (rawData) => {
        const formattedData = rawData.map(d => ({
            ...d,
            parsedDate: new Date(d.longDate || d.date),
        })).filter(d => d.parsedDate instanceof Date && !isNaN(d.parsedDate));

        const [minDate, maxDate] = d3.extent(formattedData, d => d.parsedDate);
        const dateRange = d3.timeDay.range(minDate, d3.timeDay.offset(maxDate, 1));

        const sides = [
            { key: "jan", themeCol: "janTheme" },
            { key: "ashleé", themeCol: "ashleéTheme" }
        ];

        return sides.map(side => {
            const groupedByTheme = d3.group(formattedData, d => {
                const val = d[side.themeCol];
                return (val && val.trim() !== "") ? val.trim() : "none";
            });

            return {
                side: side.key,
                themesData: themes.map(themeName => {
                    const realEvents = groupedByTheme.get(themeName) || [];
                    const eventMap = d3.group(realEvents, d => d3.timeFormat("%B %-d, %Y")(d.parsedDate));

                    const realEventIndices = [];
                    const dailyEvents = dateRange.map((date, i) => {
                        const dateString = d3.timeFormat("%B %-d, %Y")(date);
                        const existing = eventMap.get(dateString);
                        if (existing) realEventIndices.push(i);

                        return existing 
                            ? { ...existing[0], isPlaceholder: false, parsedDate: date } 
                            : { parsedDate: date, isPlaceholder: true };
                    });

                    // --- THE SILKY BRIDGE MATH (PRE-CALCULATED) ---
                    const windowSize = 45; 
                    const bridgeLimit = 100; // Join dots if within 100 days

                    dailyEvents.forEach((day, i) => {
                        let maxPull = 0;

                        // 1. Calculate Ramps (Ease-in/out)
                        for (let k = 0; k < realEventIndices.length; k++) {
                            const eventIdx = realEventIndices[k];
                            const dist = Math.abs(i - eventIdx);

                            if (dist <= windowSize) {
                                const t = dist / (windowSize + 1);
                                const pull = (1 + Math.cos(Math.PI * t)) / 2;
                                if (pull > maxPull) maxPull = pull;
                            } 
                        }

                        // 2. Calculate Bridges (Flat Plateaus between nearby dots)
                        for (let k = 0; k < realEventIndices.length - 1; k++) {
                            const start = realEventIndices[k];
                            const end = realEventIndices[k+1];
                            if (i >= start && i <= end && (end - start) < bridgeLimit) {
                                maxPull = 1;
                                break;
                            }
                        }
                        day.pull = maxPull;
                    });

                    return { themeName, events: dailyEvents };
                })
            };
        });
    };

    const timelineData = processData(combinedData);

    // ------------------- SCALES -------------------
    const allDates = combinedData.map(d => new Date(d.longDate || d.date)).filter(d => d);
    const [minDate, maxDate] = d3.extent(allDates);

    const yScale = $derived(
        d3.scaleTime()
            .domain([minDate, maxDate]) 
            .range([100, svgHeight - 100])
    );
</script>

<section id="timeline">
    <figure style="height: {svgHeight}px;">
        <svg width="100%" height={svgHeight} bind:clientWidth={svgWidth}>
            {#each timelineData as sideData, sideIndex}
                {@const direction = sideIndex === 0 ? 1 : -1}
                {@const centerX = svgWidth / 2}

                <g class="side-{sideData.side}">
                    {#each sideData.themesData as theme (theme.themeName)}
                        {@const themeIndex = themes.indexOf(theme.themeName)}
                        
                        {#if themeIndex !== -1}
                            {@const themeColor = colors[themeIndex]}
                            {@const laneX = (sideIndex === 0 ? 0 : svgWidth) + (40 * direction) + (themeIndex * 10 * direction)}
                            {@const midX = laneX + (centerX - laneX) * 0.5}

                            <path 
                                d={d3.line()
                                    .x(d => laneX + (midX - laneX) * d.pull)
                                    .y(d => yScale(d.parsedDate))
                                    .curve(d3.curveMonotoneY)
                                    (theme.events.filter((d, i, arr) => {
                                        if (i === 0 || i === arr.length - 1) return true;
                                        // Keep inflection points (where pull starts/stops changing)
                                        const isInflection = (i > 0 && d.pull !== arr[i-1].pull) || (i < arr.length-1 && d.pull !== arr[i+1].pull);
                                        // Keep a "heartbeat" every 5 days for MonotoneY smoothness
                                        return isInflection || i % 5 === 0;
                                    }))
                                }
                                stroke={themeColor}
                                stroke-width="6"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                style="shape-rendering: geometricPrecision;"
                            />

                            {#each theme.events as day}
                                {#if !day.isPlaceholder}
                                    <circle 
                                        cx={laneX + (midX - laneX) * day.pull} 
                                        cy={yScale(day.parsedDate)} 
                                        r="10" 
                                        fill={themeColor} 
                                        stroke="white"
                                        stroke-width="2"
                                    />
                                {/if}
                            {/each}
                        {/if}
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
    path { shape-rendering: geometricPrecision; }
</style>