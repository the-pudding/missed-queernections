<script>
    // 👇 Accept individual spring stores for each coordinate
    let { link, sourceX, sourceY, targetX, targetY, scrollIndex } = $props();

    function isNotInnerToInner(l) {
        return l.source.index <= 7 || l.target.index <= 7;
    }
</script>

<line
    class="link"
    class:outerLink={isNotInnerToInner(link)}
    x1={sourceX}
    y1={sourceY}
    x2={targetX}
    y2={targetY}
    opacity={scrollIndex >= 4 && !isNotInnerToInner(link) ? 0 : 1}
/>