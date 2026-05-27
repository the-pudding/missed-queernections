<script>
    import * as d3 from 'd3';
    import combinedData from "$data/combined.csv";
    import { themes, colors } from "$runes/misc.svelte.js";

    let svgHeight = $state(40000); 
    let svgWidth = $state(0);

    const allDates = combinedData.map(d => new Date(d.longDate));
    const [minDate, maxDate] = d3.extent(allDates);

    // 1. Vertical Scale
    const yScale = $derived(
        d3.scaleTime()
            .domain([minDate, maxDate]) 
            .range([100, svgHeight - 100])
    );

    // 2. The Smooth X-Logic (Cosine Interpolation)
    const calculateX = (i, allEvents, laneX, centerX) => {
        const windowSize = 10; // Larger window for silkier curves
        const midX = laneX + (centerX - laneX) * 0.5;
        let strongestPull = 0;

        const start = Math.max(0, i - windowSize);
        const end = Math.min(allEvents.length - 1, i + windowSize);
        
        for (let j = start; j <= end; j++) {
            if (!allEvents[j].isPlaceholder) {
                const distance = Math.abs(i - j);
                const t = distance / (windowSize + 1);
                const pull = (1 + Math.cos(Math.PI * t)) / 2;
                if (pull > strongestPull) strongestPull = pull;
            }
        }
        return laneX + (midX - laneX) * strongestPull;
    };

    // ... (Your processData function remains the same)
    const timelineData = processData(combinedData);
</script>

<section id="timeline">
    <figure style="height: {svgHeight}px;">
        <svg width="100%" height={svgHeight} bind:clientWidth={svgWidth}>
            {#each timelineData as sideData, sideIndex}
                {@const direction = sideIndex === 0 ? 1 : -1}
                {@const centerX = svgWidth / 2}

                <g class="side-{sideData.side}">
                    {#each sideData.themesData as theme}
                        {@const themeIndex = themes.indexOf(theme.themeName)}
                        
                        {#if themeIndex !== -1}
                            {@const themeColor = colors[themeIndex]}
                            {@const laneX = (sideIndex === 0 ? 0 : svgWidth) + (30 * direction) + (themeIndex * 20 * direction)}

                            <path 
                                d={d3.line()
                                    .x((d, i) => calculateX(i * 4, theme.events, laneX, centerX))
                                    .y(d => yScale(d.parsedDate))
                                    .curve(d3.curveBumpY)(theme.events.filter((_, i) => i % 4 === 0 || i === theme.events.length - 1))}
                                stroke={themeColor}
                                stroke-width="6"
                                fill="none"
                            />

                            {#each theme.events as day, i}
                                {#if !day.isPlaceholder}
                                    <circle 
                                        cx={calculateX(i, theme.events, laneX, centerX)} 
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
    path {
        shape-rendering: geometricPrecision;
    }
</style>