<script>
    import { colors } from "$runes/misc.svelte.js";
    import { springy } from '$actions/springy.js';
    let { springs, node, scrollIndex } = $props();

    const isOuter = node.index <= 6;
</script>

<circle
    class="node"
    class:hidden={(!isOuter && scrollIndex >= 4) || (node.index !== 0 && node.index !== 4 && scrollIndex >= 5) || (scrollIndex >= 6)}
    fill={(isOuter && scrollIndex >= 3 && scrollIndex <= 4) ? colors[node.index] : "#191919"}
    r={6}
    use:springy={{
        cx: springs.x,
        cy: springs.y
    }}
/>

<style>
    .node {
        opacity: 1;
        transition: opacity 0.5s ease, fill 0.5s ease-in-out 1s;
    }

    .node.hidden {
        opacity: 0;
    }
</style>