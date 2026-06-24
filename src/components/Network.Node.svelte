<script>
    import { tick } from 'svelte';
    import { colors } from "$runes/misc.svelte.js";
    import { springy } from '$actions/springy.js';
    let { springs, node, scrollIndex } = $props();

    const isOuter = node.index <= 6;
    const appearDelay = node.index * 8;

    let appeared = $state(false);

    $effect(() => {
        // Start hidden, then trigger the staggered fade-in on next tick
        tick().then(() => { appeared = true; });
    });

    const shouldHide = $derived(
        !appeared ||
        (!isOuter && scrollIndex >= 4) ||
        (node.index !== 0 && node.index !== 4 && scrollIndex >= 6) ||
        (scrollIndex >= 9)
    );
</script>

<circle
    class="node"
    class:hidden={shouldHide}
    fill={(isOuter && scrollIndex >= 4 && scrollIndex <= 5) ? colors[node.index] : "#ffffff"}
    r={(isOuter && scrollIndex >= 4 && scrollIndex <= 5) ? 10 : 6}
    style="transition-delay: {appeared ? appearDelay : 0}ms;"
    use:springy={{ cx: springs.x, cy: springs.y }}
/>

<style>
    .node {
        opacity: 1;
        transition: opacity 0.5s ease, fill 0.5s ease-in-out 1s, r 0.5s ease-in-out 1s;
    }

    .node.hidden {
        opacity: 0;
    }
</style>
