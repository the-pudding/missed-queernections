<script>
    import { createEventDispatcher } from 'svelte';
    import * as d3 from 'd3';
    import { themes, colors, normalizeEventKey } from "$runes/misc.svelte.js";

    let {svgWidth, dot, dotType, scrolling, tooltipVisible, tooltipX, tooltipY, axisData, highlightedTickIndex, isBulged, isHovered, isFaded, isAdded, addedEvents } = $props();
    let dotDate = $state();
    let dotEvent = $state();
    let dotTheme = $state();

    const formatMonthYear = d3.timeFormat("%b %Y");
    const parseMonthYear = d3.timeParse("%B %Y");

    // EVENT HANDLERS
    const dispatch = createEventDispatcher();

    function handleMouseEnter(e) {
        dispatch('hover', { dot: dot, clientX: e.clientX, clientY: e.clientY });
    }

    function handleClick() {
        dispatch('click', { dot: dot });
    }

    $effect(() => {
        console.log(isAdded)
    })
</script>

<g 
    class="circle-group"
    tabindex="0" 
    role="button"  
    data-id={normalizeEventKey(dot.event)}
    data-x={dot.x}
    data-y={dot.y}
    data-basex={dot.baseX}
    data-month={dot.monthStr}
    data-theme={dot.theme}
    transform={`translate(${dot.baseX}, ${dot.y}) scale(1)`}
    onmouseenter={handleMouseEnter}
    onmouseleave={() => dispatch('leave')}
    onclick={handleClick}
    onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
        }
    }}
>
    <circle
        r={dotType == "rainbow" ? 10 : 6}
        fill={dotType == "rainbow" ? colors[themes.indexOf(dot.theme)] : "black"}
    />
    <g class="icon" class:rotated={isAdded}>
        <line x1="0" y1={dotType == "rainbow" ? "-4" : "-3"} x2="0" y2={dotType == "rainbow" ? 4 : 3} stroke="white" stroke-width="2" pointer-events="none" />
        <line x1={dotType == "rainbow" ? "-4" : "-3"} y1="0" x2={dotType == "rainbow" ? 4 : 3} y2="0" stroke="white" stroke-width="2" pointer-events="none" />
    </g>
</g>

<style>
    .circle-group {
        /* transition: transform 150ms ease; */
    }

    .icon {
        transition: transform 150ms ease;
        transform-box: fill-box;       /* make transform-origin use the box of the element */
        transform-origin: 50% 50%;     /* center of the group */
    }

    .icon.rotated {
        transform: rotate(45deg);
    }

    :global(#timeline svg circle) {
        cursor: pointer;
        /* transition: all 0.3s linear; */
    }
</style>