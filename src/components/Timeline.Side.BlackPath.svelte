<script>
    // ------------------- PROPS -------------------
    let {svgWidth, svgHeight, side, blackLineX} = $props();
</script>

<line x1={side == "jan" ? blackLineX : svgWidth - blackLineX} y1=0 x2={side == "jan" ? blackLineX : svgWidth - blackLineX} y2={svgHeight} stroke="black" stroke-width={3}></line>