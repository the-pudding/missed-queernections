<script>
    // ------------------- IMPORTS -------------------
    import * as d3 from 'd3';
    import combinedData from "$data/combined.csv";
    import Axis from "$components/Timeline.Axis.svelte";

    let { introHeight } = $props();

    console.log(combinedData)

    // ------------------- DIMENSIONS -------------------
    let svgHeight = $state(0);
    let svgWidth = $state(0);
    let innerHeight = 0;
    const margins = {top: 0, right: 12, bottom: 0, left: 12}
    const spacing = 8;
    const startX = 50;
    const blackLineX = 30;

    let yScroll = $state(0);

</script>

<svelte:window bind:innerHeight={innerHeight} bind:scrollY={yScroll}></svelte:window>

<section id="timeline">
    <figure style="height: {svgHeight}px;">
        <div class="svg-wrapper">
            <svg width={svgWidth} height={60000} bind:clientHeight={svgHeight} bind:clientWidth={svgWidth}>
                {#each ["jan", "ashleé"] as side, i}
                    <g id={side}>
                        <path></path>
                    </g>
                {/each}
            </svg>
        </div>
    </figure>
</section>

<style>
    /* GLOBAL BODY */
    :global(body.no-scroll) {
        overflow: hidden;
    }

    #timeline {
        width: 100%;
        position: relative;
        margin-top: 10rem;
    }

    .sticky-header {
        position: sticky;
        top: 0;
        left: 0;
        height: 1.75rem;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        z-index: 900;
    }

    figure {
        width: 100%;
        position: relative;
    }

    .svg-wrapper {
        position: relative;
        z-index: 2;
    }

    svg {
        width: 100%;
        height: auto;
    }

    /* ANIMATIONS */
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

    :global(.pulse) {
        animation: pulse-animation 2s ease-in-out infinite;
    }

    @keyframes pulse-color {
        0% {
            transform: scale(1);
            opacity: 1; /* Start fully visible */
        }
        100% {
            transform: scale(2.5); /* Grow */
            opacity: 0; /* Fade out */
        }
    }

    :global(.pulseColor) {
        animation: pulse-color 1s ease-out forwards;
        animation-iteration-count: 3;
    }

    @keyframes shockwave-animation {
        from {
            r: 0;
            opacity: 0.8;
            stroke-width: 4px;
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
        animation: shockwave-animation 1s ease-out forwards;
        animation-iteration-count: 3;
        pointer-events: none;
    }
</style>