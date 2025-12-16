<script>
    // ------------------- IMPORTS -------------------
    import { createEventDispatcher } from 'svelte';
    import { normalizeEventKey, addedEvents } from "$runes/misc.svelte.js";

    // ------------------- COMPONENTS -------------------
    import Path from "$components/Timeline.Side.Path.svelte";
    import Dot from "$components/Timeline.Side.Dot.svelte";
    import BlackPath from "$components/Timeline.Side.BlackPath.svelte";

    // ------------------- PROPS -------------------
    // PROP CHANGE: Renamed bulgedMonthIndices to bulgedDayIndices
    let {side, sideIndex, svgWidth, svgHeight, allTimelineData, scrolling, tooltipVisible, tooltipX, tooltipY, axisData, bulgedDayIndices, hoveredEventKey, isFaded, pulsingDotId, blackLineX } = $props();

    // ------------------- HELPERS -------------------
    
    const dispatch = createEventDispatcher();
</script>

<g class="g-{side}" class:faded={isFaded}>
    <BlackPath {svgWidth} {svgHeight} {side} {blackLineX}/>
    <g class="g-{side}-rainbow-paths">
        {#each allTimelineData[side].paths as themePath, i}
            <Path 
                {themePath} 
                {i} 
                {sideIndex} 
                bulgedDayIndices={bulgedDayIndices}
            />
        {/each}
    </g>

    <g class="g-{side}-rainbow-dots">
        {#each allTimelineData[side].dots as dot}
            {@const eventKey = normalizeEventKey(dot.event)}
            // DOT ID CHANGE: Use dot.dayIndex instead of dot.monthIndex
            {@const dotId = `${dot.dayIndex}-${dot.theme}`}
            <Dot 
                {svgWidth} 
                {dot} 
                dotType={"rainbow"} 
                {scrolling} 
                {tooltipVisible} 
                {tooltipX} 
                {tooltipY} 
                {axisData} 
                isBulged={bulgedDayIndices.has(dot.dayIndex)}
                isHovered={hoveredEventKey === eventKey}
                isFaded={hoveredEventKey && hoveredEventKey !== eventKey}
                isAdded={$addedEvents.includes(dot.event)}
                isPulsing={dotId === pulsingDotId}
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
    .g-jan, .g-ashlee {
        transition: opacity 0.5s ease-in-out;
    }

    .faded {
        opacity: 0.2;
    }
</style>