<script>
    import { colors } from "$runes/misc.svelte.js";

    let {
        circle,
        fill,
        centerX,
        isPick,
        pickLetter,
        isDimmed,
        onhover,
        onleave,
        hoveredEventName,
        isPlayingAudio = false,
        onclick = undefined
    } = $props();

    let pickAtCenter = $state(false);
    let isHoveredAcrossTimeline = $derived(hoveredEventName === circle.event);
	const isCenterMatch = $derived(
        Boolean(circle.isCenterMatch) || Math.abs(circle.cx - centerX) < 1
    );
    const r = $derived(isPick || isCenterMatch ? 14 : 7);

    function handleTransitionEnd(event) {
        if (event.propertyName.includes("transform")) {
            const isAtCenter = Math.abs(circle.cx - centerX) < 1;
            if (isPick) {
                pickAtCenter = isAtCenter;
            }
        }
    }
</script>

<defs>
    <radialGradient
        id="rainbowGradient"
        cx="50%"
        cy="50%"
        r="50%"
        fx="50%"
        fy="50%"
    >
        {#each colors as color, i}
            <stop
                offset="{(i * 100) / (colors.length - 1)}%"
                style="stop-color: {color};"
            />
        {/each}
    </radialGradient>
</defs>

<g
    class="circle-container"
    transform={`translate(${circle.cx}, ${circle.cy})`}
    ontransitionend={handleTransitionEnd}
    class:is-active-hover={isHoveredAcrossTimeline}
    class:is-dimmed={isDimmed}
    class:is-pick={isPick}
    role={isPick ? "button" : "presentation"}
    tabindex={isPick ? 0 : undefined}
    onclick={isPick ? onclick : undefined}
    onkeydown={isPick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onclick?.(); } } : undefined}
    onmouseenter={onhover}
    onmouseleave={onleave}
>
    <!-- Scalable inner group containing all visuals (dot, shockwave, icons) -->
    <g class="pulse-wrapper" class:audio-pulsing={isPlayingAudio}>
        {#if isPick && pickAtCenter}
            {#each colors as color, i}
                <circle
                    cx={0}
                    cy={0}
                    {r}
                    fill="none"
                    stroke="{color}"
                    stroke-width="1"
                    class="shockwave shockwave-infinite"
                    style="animation-delay: {i * 150}ms;"
                />
            {/each}
        {/if}

        <circle
            cx={0}
            cy={0}
            {r}
            {fill}
            stroke-width="2"
            style="transform: scale({isHoveredAcrossTimeline ? 1.25 : 1})"
        />

        {#if isPick && pickAtCenter}
            {#if pickLetter == "Y"}
                <g transform="scale(0.7) translate(-10, -11)">
                    <path d="M10,0C4.5,0,0,4.5,0,10v7c0,1.7,1.3,3,3,3h1c1.7,0,3-1.3,3-3v-3c0-1.7-1.3-3-3-3h-2v-1C2,5.6,5.6,2,10,2s8,3.6,8,8v1h-2c-1.7,0-3,1.3-3,3v3c0,1.7,1.3,3,3,3h1c1.7,0,3-1.3,3-3v-7C20,4.5,15.5,0,10,0Z"/>
                </g>
            {:else}
                <g transform="scale(0.7) translate(-9, -10)">
                    <path d="M18,2v10c0,3.3-2.7,6-6,6s-1-.4-1-1v-2c0-.6.4-1,1-1,1.1,0,2-.9,2-2v-1c0-.6-.4-1-1-1-1.1,0-2-.9-2-2V2c0-1.1.9-2,2-2h3c1.1,0,2,.9,2,2ZM5,0h-3C.9,0,0,.9,0,2v6c0,1.1.9,2,2,2s1,.4,1,1v1c0,1.1-.9,2-2,2s-1,.4-1,1v2c0,.6.4,1,1,1,3.3,0,6-2.7,6-6V2c0-1.1-.9-2-2-2Z"/>
                </g>
            {/if}
        {/if}
    </g>
</g>

<style>
    .circle-container {
        transition:
            opacity 400ms ease,
            transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        cursor: default;
        pointer-events: all;
        outline: none;
    }

    .circle-container.is-pick {
        cursor: pointer;
    }

    .circle-container.is-dimmed {
        opacity: 0.1;
    }

    /* INNER GROUP TRANSFORM ORIGIN & PULSE */
    .pulse-wrapper {
        transform-origin: 0 0;
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    @keyframes audio-group-pulse {
        0% {
            transform: scale(1);
        }
        30% {
            transform: scale(1.5); /* Dramatic peak pop */
        }
        100% {
            transform: scale(1);
        }
    }

    .pulse-wrapper.audio-pulsing {
        animation: audio-group-pulse 0.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
    }

    /* SHOCKWAVE RIPPLES */
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
        stroke-width: 4px;
        opacity: 0.8;
        animation: shockwave 1.5s ease-out forwards;
        pointer-events: none;
    }

    .shockwave-infinite {
        animation-iteration-count: infinite;
    }
</style>