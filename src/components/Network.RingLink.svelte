<script>
    import { tick } from 'svelte';
    import { colors } from "$runes/misc.svelte.js";

    let { link, i, scrollIndex } = $props();

    let readyToDraw = $state(false);

    const lineLength = $derived(
        Math.hypot(link.target.x - link.source.x, link.target.y - link.source.y)
    );

    $effect(() => {
        if (scrollIndex >= 4) {
            let cancelled = false;
            tick().then(() => { if (!cancelled) readyToDraw = true; });
            return () => { cancelled = true; };
        } else {
            readyToDraw = false;
        }
    });
</script>

<line
    class="drawable-link"
    class:visible={scrollIndex <= 5}
    style="stroke: {colors[i]}; stroke-dasharray: {lineLength};
    stroke-dashoffset: {readyToDraw ? 0 : lineLength};
    transition-delay: {readyToDraw ? i * 120 : 0}ms;"
    x1={link.source.x} y1={link.source.y}
    x2={link.target.x} y2={link.target.y}
/>

<style>
    .drawable-link {
        stroke-width: 2;
        opacity: 0;
        transition: stroke-dashoffset 1s ease-in-out, opacity 0.5s ease-in-out;
    }

    .drawable-link.visible {
        opacity: 1;
    }
</style>
