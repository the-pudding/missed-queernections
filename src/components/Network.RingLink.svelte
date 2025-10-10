<script>
    import { tick } from 'svelte';
    import { colors } from "$runes/misc.svelte.js";

    let { link, i, scrollIndex } = $props();

    let readyToDraw = $state(false);

    const lineLength = $derived(
        Math.hypot(link.target.x - link.source.x, link.target.y - link.source.y)
    );

    // This effect controls the animation trigger
    $effect(() => {
        // When the scrollIndex is correct...
        if (scrollIndex >= 3) {
            // ...wait for the next frame, THEN set readyToDraw to true.
            tick().then(() => {
                readyToDraw = true;
            });
        } else {
            // Reset if we scroll away
            readyToDraw = false;
        }
    });
</script>

<line
    class="drawable-link"
    class:draw={readyToDraw}
    class:visible={scrollIndex <= 4}
    style="stroke: {colors[i]}; stroke-dasharray: {lineLength};
    stroke-dashoffset: {readyToDraw ? 0 : lineLength};"
    x1={link.source.x} y1={link.source.y}
    x2={link.target.x} y2={link.target.y}
    stroke={"#191919"}
/>

<style>
    .drawable-link {
        stroke: var(--color-fg);
        stroke-width: 2;
        opacity: 0;
        transition: stroke-dashoffset 1s ease-in-out, opacity 0.5s ease-in-out;
    }

    .drawable-link.visible {
        opacity: 1;
    }
</style>