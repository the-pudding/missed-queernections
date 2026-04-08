<script>
    import { themes, colors } from "$runes/misc.svelte.js";

    let {circle, fill, centerX } = $props();

    let queernection = $state(false);

    function handleTransitionEnd(event) {
        // 1. Only trigger if the horizontal position (cx) was what finished moving
        if (event.propertyName === 'cx') {
            
            // 2. Check if the current position is approximately the center
            // We use a small buffer (1px) to account for floating point math
            const isAtCenter = Math.abs(circle.cx - centerX) < 1;

            if (isAtCenter) {
                console.log(`✅ Transition complete: "${circle.event}" has met in the center.`);
                queernection = true;
            }
        }
    }
</script>

<defs>
    <radialGradient id="rainbowGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        {#each colors as color, i}
            <stop offset="{(i * 100) / (colors.length - 1)}%" style="stop-color: {color};" />
        {/each}
    </radialGradient>
</defs>

<g class="circle-container">
    {#if queernection}
        <circle 
            cx={circle.cx}
            cy={circle.cy}
            r="10" 
            fill={fill} 
            class="pulse"
        />

        {#each colors as color, i}
            <circle 
                cx={circle.cx}
                cy={circle.cy}
                r="10" 
                fill="none"
                stroke={color}
                stroke-width="1"
                class="shockwave"
                style="animation-delay: {i * 50}ms;"
            />
        {/each}
    {/if}

    <circle 
        cx={circle.cx}
        cy={circle.cy}
        r="10" 
        fill={fill} 
        stroke-width="2"
        ontransitionend={handleTransitionEnd}
        onmouseenter={() => console.log(`📌 ${circle.event}`)}
    />
</g>

<style>
    circle {
        /*
            Animates cx (horizontal position) when a segment activates,
            matching the path transition timing exactly so dots and lines
            move together.
        */
        transition: cx 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        cursor: pointer;
        pointer-events: all;
        transform-box: fill-box;
        transform-origin: center;
    }
    
    circle:hover {
        r: 13; /* grows on hover — also CSS-transitioned by the browser */
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
</style>