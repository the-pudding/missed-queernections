<script>
    import { colors } from '$runes/misc.svelte.js';
    let { node, s, scrollIndex } = $props();
</script>

<circle
    r={scrollIndex >= 3 && node.index <= 7 ? 10 : 4}
    cx={s.x}
    cy={s.y}
    opacity={scrollIndex >= 4 && node.index > 7 ? 0 : 
            scrollIndex >= 5 && node.index !== 0 && node.index !== 5 ? 0 : 1}
    fill={node.index <= 7 && scrollIndex >= 3 ? colors[node.index] : "#191919"}
/>