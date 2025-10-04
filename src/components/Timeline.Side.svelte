<script>
    import { createEventDispatcher } from 'svelte';
    import * as d3 from 'd3';
    import { themes, colors, normalizeEventKey, addedEvents } from "$runes/misc.svelte.js";
    import Path from "$components/Timeline.Side.Path.svelte";
    import Dot from "$components/Timeline.Side.Dot.svelte";
    import BlackPath from "$components/Timeline.Side.BlackPath.svelte";

    let {side, sideIndex, svgWidth, svgHeight, allTimelineData, scrolling, tooltipVisible, tooltipX, tooltipY, axisData, highlightedTickIndex, bulgedMonthIndices, hoveredEventKey, isFaded } = $props();

    const dispatch = createEventDispatcher();
</script>

<g class="g-{side}" class:faded={isFaded}>
    <BlackPath {svgWidth} {svgHeight} {side}/>
    <g class="g-{side}-rainbow-paths">
        {#each allTimelineData[side].paths as themePath, i}
            <Path {themePath} {i} {sideIndex} {bulgedMonthIndices}/>
        {/each}
    </g>

    <g class="g-{side}-rainbow-dots">
        {#each allTimelineData[side].dots as dot}
            {@const eventKey = normalizeEventKey(dot.event)}
            <Dot 
                {svgWidth} 
                {dot} 
                dotType={"rainbow"} 
                {scrolling} 
                {tooltipVisible} 
                {tooltipX} 
                {tooltipY} 
                {axisData} 
                {highlightedTickIndex} 
                isBulged={bulgedMonthIndices.has(dot.monthIndex)}
                isHovered={hoveredEventKey === eventKey}
                isFaded={hoveredEventKey && hoveredEventKey !== eventKey}
                isAdded={$addedEvents.includes(dot.event)}
                on:hover={(e) => dispatch('hover', e.detail)}
                on:leave={() => dispatch('leave')}
                on:click={(e) => dispatch('click', e.detail)}/>
        {/each}
    </g>

    <g class="g-{side}-black-dots">
        {#each allTimelineData[side].emptyDots as dot}
            {@const eventKey = normalizeEventKey(dot.event)}
            <Dot 
                {svgWidth} 
                {dot} 
                dotType={"black"} 
                {scrolling} 
                {tooltipVisible} 
                {tooltipX} 
                {tooltipY} 
                {axisData} 
                {highlightedTickIndex} 
                isBulged={null}
                isHovered={hoveredEventKey === eventKey}
                isFaded={hoveredEventKey && hoveredEventKey !== eventKey}
                isAdded={$addedEvents.includes(dot.event)}
                on:hover={(e) => dispatch('hover', e.detail)}
                on:leave={() => dispatch('leave')}
                on:click={(e) => dispatch('click', e.detail)}/>
        {/each}
    </g>
</g>

<style>

    :global(path.faded) {
        opacity: 0.4;
    }

    .g-jan, .g-ashlee {
        transition: opacity 0.5s ease-in-out;
    }

    .faded {
        opacity: 0.2;
    }
</style>