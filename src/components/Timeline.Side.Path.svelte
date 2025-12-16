<script>
    // ------------------- IMPORTS -------------------
    import * as d3 from 'd3';
    import { colors } from "$runes/misc.svelte.js";

    // ------------------- PROPS -------------------
    // PROP CHANGE: Renamed bulgedMonthIndices to bulgedDayIndices
    let { themePath, i, sideIndex, bulgedDayIndices } = $props();

    // ------------------- HELPERS -------------------
    const lineGenerator = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBumpY);
</script>

<path 
    class="timeline-path"
    data-side-index={sideIndex}
    data-path-index={i}
    id="{themePath.theme}-{i}-path" 
    d={lineGenerator(themePath.straightPoints.map((point, index) => 
            // The index `i` here corresponds to the index in themePath.straightPoints,
            // which now represents a day index (since the path was generated day-by-day).
            bulgedDayIndices.has(index) ? themePath.points[index] : point
        ))} 
    stroke={colors[i]} 
    fill="none" 
    stroke-width={6} 
/>

<style>
    .timeline-path {
        transition: d 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
</style>