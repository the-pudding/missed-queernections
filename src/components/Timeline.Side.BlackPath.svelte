<script>
    const blackLineX = 20;

    let {svgWidth, svgHeight, side} = $props();
</script>

<line x1={side == "jan" ? blackLineX : svgWidth - blackLineX} y1=0 x2={side == "jan" ? blackLineX : svgWidth - blackLineX} y2={svgHeight} stroke="black" stroke-width={3}></line>