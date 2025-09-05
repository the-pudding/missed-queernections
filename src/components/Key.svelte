<script>
    import keyData from "$data/categories.csv";
    import * as d3 from 'd3';

    const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];

    function circleMouseEnter(e) {
        const dot = d3.select(e.currentTarget);
        const desc = dot.node().nextElementSibling; // next sibling

        if (desc && desc.classList.contains("desc")) {
            d3.select(desc).classed("visible", true);
        }
    }

    function hexToRgba(hex, alpha) {
        const bigint = parseInt(hex.slice(1), 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;

        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function circleMouseExit(e) {
        const dot = d3.select(e.currentTarget);
        const desc = dot.node().nextElementSibling;

        if (desc && desc.classList.contains("desc")) {
            d3.select(desc).classed("visible", false);
        }
    }
</script>

<svg style="display:none">
  <defs>
    <filter id="gooey">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
      <feColorMatrix in="blur" mode="matrix"
        values="1 0 0 0 0  
                0 1 0 0 0  
                0 0 1 0 0  
                0 0 0 30 -15" result="goo" />
      <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
    </filter>
  </defs>
</svg>

<div id="key">
    {#each keyData as category, i}
        <div class="category category-{category.categoryShort}">
            <div class="goo-wrapper" style="filter:url(#gooey)">
                <div 
                    class="dot"
                    role="tooltip"
                    style="background-color: {colors[i]}"
                    onmouseenter={(e) => circleMouseEnter(e)}
                    onmouseleave={(e) => circleMouseExit(e)}
                >
                </div>
                <div 
                    class="desc"
                    style="background-color: {colors[i]}"
                >   
                    <p><span>{category.categoryLong}</span></p>
                    <p>{category.definition}</p>
                </div>
            </div>
        </div>
    {/each}
</div>

<style>
    #key {
        width: 100%;
        display: flex;
        flex-direction: row;
        margin: 0 auto;
        max-width: 400px;
    }

    .category {
        width: 12.5%;
        font-size: var(--12px);
        font-family: var(--sans);
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
    }

    .dot {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        cursor: pointer;
        transform: scale(1);
        transition: all 0.25s linear;
    }

    .dot:hover {
        transform: scale(1.1);
    }

    .desc {
        position: absolute;
        top: 2rem; /* pushed a little below the dot */
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        border-radius: 1rem;
        padding: 1rem;
        z-index: 1000;

        /* make it wider than the dot */
        width: 200px;

        /* blob reveal */
        clip-path: circle(0% at 50% 0%);
        opacity: 0;
        transition: clip-path 0.45s ease, opacity 0.25s ease;
    }

    .desc.visible {
        clip-path: circle(150% at 50% 0%);
        opacity: 1;
    }

    .desc p {
        padding: 0;
        margin: 0;
    }

    .desc p:first-of-type {
        font-weight: 700;
    }
</style>