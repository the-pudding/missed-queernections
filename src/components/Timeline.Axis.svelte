<script>
    import * as d3 from 'd3';
    let {margins, svgHeight, allTimelineData, axisData} = $props();

    const formatYear = d3.timeFormat("%Y");
</script>

<div class="axis-container" style="height: {svgHeight}px;">
    {#each axisData as tickValue, i}
        <div id="tick-{i}" class="axis-tick" 
            style="top: {allTimelineData.yScale(tickValue) - margins.top}px;"
        >
            {#if d3.timeMonth.floor(tickValue).getMonth() === 0}
                <p class="year">{formatYear(tickValue)}</p>
            {/if}
        </div>
    {/each}
</div>

<style>
    .axis-container {
        position: absolute;
        width: 100%;
        top: 0;
        left: 0;
        z-index: 0;
        pointer-events: none;
    }

    .axis-tick {
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
    }

    .axis-tick p {
        transition: all 0.25s linear;
    }

    .year, .month {
        font-family: var(--sans);
        margin: 0;
        padding: 0;
        line-height: 1;
        font-size: var(--14px);
        font-weight: 500;
    }
</style>