<script>
    // ------------------- IMPORTS -------------------
    import { createEventDispatcher } from 'svelte';
    import * as d3 from 'd3';
    import { themes, colors, normalizeEventKey, instructionStep } from "$runes/misc.svelte.js";

    // ------------------- PROPS -------------------
    let { dot, dotType, isBulged, isHovered, isAdded, isPulsing } = $props();

    // ------------------- VARAIBLES -------------------
    let dotDate = $state();
    let dotEvent = $state();
    let dotTheme = $state();
    let dotScale = $derived(isHovered ? 1.2 : 1);

    // ------------------- HELPERS -------------------
    const formatMonthYear = d3.timeFormat("%b %Y");
    const parseMonthYear = d3.timeParse("%B %Y");
    const dispatch = createEventDispatcher();

    // ------------------- EVENTS -------------------
    function handleMouseEnter(e) {
        dispatch('hover', { dot: dot, clientX: e.clientX, clientY: e.clientY });
    }

    function handleClick() {
        dispatch('click', { dot: dot });
    }
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
    transform={`translate(${isBulged ? dot.x : dot.baseX}, ${dot.y}) scale(${dotScale})`}
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
    {#if normalizeEventKey(dot.event) == "loriicefetrick" && dotType == "rainbow"}
        <circle
            r={10}
            fill={colors[themes.indexOf(dot.theme)]}
            class:pulse={$instructionStep === 5}
        />
    {/if}
    {#if isPulsing && dotType == "rainbow"}
        <circle
            r={10}
            fill={colors[themes.indexOf(dot.theme)]}
            class:pulseColor={isPulsing}
        />
    {/if}
    <circle
        r={dotType == "rainbow" ? 10 : 6}
        fill={dotType == "rainbow" ? colors[themes.indexOf(dot.theme)] : "black"}
    />
    <g class="icon" class:rotated={isAdded}>
        <line x1="0" y1={dotType == "rainbow" ? "-4" : "-3"} x2="0" y2={dotType == "rainbow" ? 4 : 3} stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />
        <line x1={dotType == "rainbow" ? "-4" : "-3"} y1="0" x2={dotType == "rainbow" ? 4 : 3} y2="0" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />
    </g>
</g>

<style>
    .circle-group {
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .icon {
        transition: transform 150ms ease;
        transform-box: fill-box;
        transform-origin: 50% 50%;
    }

    .icon.rotated {
        transform: rotate(45deg);
    }

    :global(#timeline svg circle) {
        cursor: pointer;
    }
</style>