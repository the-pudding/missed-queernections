<script>
    import * as d3 from 'd3';
    import { themes, colors } from "$runes/misc.svelte.js";

    let {themePath, i, sideIndex, bulgedMonthIndices} = $props();

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
    d={lineGenerator(themePath.straightPoints.map((point, i) => 
            bulgedMonthIndices.has(i) ? themePath.points[i] : point
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