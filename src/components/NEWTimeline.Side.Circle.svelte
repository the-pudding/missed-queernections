<script>
    import { addedEvents, colors } from "$runes/misc.svelte.js";
    import { onMount } from 'svelte';

    let {circle, fill, centerX, maxScroll, onsettled, isPick, isDimmed, onhover, onleave, hoveredEventName } = $props();

    let queernection = $state(false);
    let isAdded = $derived($addedEvents.includes(String(circle.event ?? '').trim()));
    let isHoveredAcrossTimeline = $derived(hoveredEventName === circle.event);
    const r = 10;

    function handleTransitionEnd(event) {
        if (event.propertyName.includes('transform')) {
            
            // 1. Calculate if this specific circle is actually "revealed" yet
            // We can check if its vertical position is within the scrolled area
            // (Using the same logic as the parent's activationY)
            const isRevealed = circle.cy <= (maxScroll ?? 0);

            if (!isRevealed) return; // Ignore transitions caused by resize or page load

            const isAtCenter = Math.abs(circle.cx - centerX) < 1;

            if (isAtCenter) {
                queernection = true;
            }
            
            onsettled();
        }
    }

    function handleClick() {
        console.log(`Clicked on circle: "${circle.event}"`);
        const eventKey = String(circle.event ?? '').trim();
        if (!eventKey) return;
        
        if ($addedEvents.includes(eventKey)) {
            // Reassigning the auto-subscribed variable updates the store
            $addedEvents = $addedEvents.filter(ev => ev !== eventKey);
        } else {
            $addedEvents = [...$addedEvents, eventKey];
        }
        console.log(`Current addedEvents:`, $addedEvents);
    }

    onMount(() => {
        // Check if this circle was already scrolled past on load
        const isRevealed = circle.cy <= (maxScroll ?? 0);
        if (isRevealed) {
            onsettled();
        }
    });
</script>

<defs>
    <radialGradient id="rainbowGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        {#each colors as color, i}
            <stop offset="{(i * 100) / (colors.length - 1)}%" style="stop-color: {color};" />
        {/each}
    </radialGradient>
</defs>

<g class="circle-container"
    role="button"
    tabindex="0" 
    data-event={circle.event}
    transform={`translate(${circle.cx}, ${circle.cy})`}
    ontransitionend={handleTransitionEnd}
    onclick={handleClick}
    onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
        }
    }}
    class:is-active-hover={isHoveredAcrossTimeline}
    class:is-dimmed={isDimmed}
    class:is-pick={isPick}
    onmouseenter={onhover}
    onmouseleave={onleave}
>
    {#if queernection}
        <circle 
            cx={0}
            cy={0}
            r={r} 
            fill={fill} 
            class="pulse"
        />

        {#each colors as color, i}
            <circle 
                cx={0}
                cy={0}
                r={r} 
                fill="none"
                stroke={color}
                stroke-width="1"
                class="shockwave"
                style="animation-delay: {i * 50}ms;"
            />
        {/each}
    {/if}

    <circle 
        cx={0}
        cy={0}
        r={r} 
        fill={fill} 
        stroke-width="2"
        style="transform: scale({isHoveredAcrossTimeline ? 1.25 : 1})"
    />

    <g class="icon" 
        class:rotated={isAdded}
        style="transform: scale({isHoveredAcrossTimeline ? 1.25 : 1}) {isAdded ? 'rotate(45deg)' : ''}"
    >
        <line x1="0" y1={-r*0.375} x2="0" y2={r*0.375} stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />
        <line x1={-r*0.375} y1="0" x2={r*0.375} y2="0" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pointer-events="none" />
    </g>
</g>

<style>
    .circle-container {
        /*
            Animates cx (horizontal position) when a segment activates,
            matching the path transition timing exactly so dots and lines
            move together.
        */
        transition: opacity 400ms ease, transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        cursor: pointer;
        pointer-events: all;
        transform-box: fill-box;
        transform-origin: center;
        outline: none;
    }

    circle, .icon {
       transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94); 
    }

    .circle-container.is-dimmed {
        opacity: 0.1;
    }

    .icon.rotated {
        transform: rotate(45deg);
    }

    /* THE CONTINUOUS PULSE (Solid/Aura) */
    @keyframes pulse-animation {
        0% {
            transform: scale(1);
            opacity: 0.6;
        }
        80% {
            transform: scale(2.5);
            opacity: 0;
        }
        100% {
            transform: scale(1);
            opacity: 0;
        }
    }

    .pulse {
        animation: pulse-animation 2s ease-out forwards;
        animation-iteration-count: 2;
        pointer-events: none;
    }

    /* THE BURST RIPPLES (Thin Rings) */
    @keyframes shockwave {
        from {
            r: 0;
            opacity: 0.8;
            stroke-width: 3px;
        }
        to {
            r: 100px;
            opacity: 0;
            stroke-width: 0px;
        }
    }

    .shockwave {
        fill: none;
        stroke-width: 4px; /* Set initial stroke-width */
        opacity: 0.8; /* Set initial opacity */
        animation: shockwave 1.5s ease-out forwards;
        animation-iteration-count: 2;
        pointer-events: none;
    }

    circle {
        /* cx animates to match path transition timing */
        transition: cx 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        cursor: pointer;
        pointer-events: all;
    }
    circle:hover { r: 13; }
</style>