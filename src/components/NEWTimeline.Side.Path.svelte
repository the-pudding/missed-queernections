<script>
    import * as d3 from 'd3';
    let { theme, yScale, xPos, color } = $props();

    // Create a simple vertical line generator
    const lineGenerator = d3.line()
        .x(xPos)
        .y(d => yScale(d.parsedDate));

    const pathData = $derived(lineGenerator(theme.events));

    console.log(color)
</script>

{#if theme.themeName !== "none" && theme.events.length > 1}
    <path 
        d={pathData} 
        stroke={color}
        fill="none"
        stroke-width="3"
        stroke-linecap="round"
        opacity="0.8"
    />
{/if}

<!-- {#each theme.events as event}
    <circle 
        cx={xPos} 
        cy={yScale(event.parsedDate)} 
        r="4" 
        fill={theme.themeName === "none" ? "#ccc" : color} 
    />
{/each} -->