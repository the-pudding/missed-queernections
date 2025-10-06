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
        if (scrollIndex >= 4) {
            // Wait for the DOM to update
            tick().then(() => {
                // Then wait for your desired delay before starting the animation
                setTimeout(() => {
                    readyToDraw = true;
                }, 500); // 500ms = 0.5 second delay
            });
        } else {
            readyToDraw = false;
        }
    });
</script>

<line
    class="drawable-link"
    class:draw={readyToDraw}
    style="stroke-dasharray: {lineLength};
    stroke-dashoffset: {readyToDraw ? 0 : lineLength};"
    x1={link.source.x} y1={link.source.y}
    x2={link.target.x} y2={link.target.y}
    stroke={"#191919"}
/>

<style>
    .drawable-link {
        stroke: var(--color-fg);
        stroke-width: 2;
        transition: stroke-dashoffset 1s ease-in-out;
    }
</style>