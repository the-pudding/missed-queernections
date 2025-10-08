<script>
    import { colors } from "$runes/misc.svelte.js";
    import { springy } from '$actions/springy.js';
    let { springs, node, scrollIndex } = $props();

    const isOuter = node.index <= 7;
</script>

<circle
    class="node"
    r={6}
    style="opacity: {scrollIndex >= 4 && !isOuter ? 0 : 1};
        fill: {isOuter && scrollIndex >= 3 ? colors[node.index] : "#191919"}"
    use:springy={{
        cx: springs.x,
        cy: springs.y
    }}
/>

<style>
    .node {
        transition: opacity 0.5s ease, fill 0.5s ease;
    }
</style>