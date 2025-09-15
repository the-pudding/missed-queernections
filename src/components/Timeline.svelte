<script>
    import * as d3 from 'd3';
    import janData from "$data/jan.csv";
    import ashleeData from "$data/ashlee.csv";
    import Key from "$components/Key.svelte";
    import Story from "$components/Story.svelte";

    // DIMENSIONS
    let svgHeight = $state(0);
    let svgWidth = $state(0);
    const margins = {top: 0, right: 12, bottom: 0, left: 12}
    const spacing = margins.left;
    const startX = 40; // Increased startX to give left right padding
    const bulgeAmount = $derived(svgWidth/8);
    let yScroll = $state(0);

    // STYLES
    const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];
    const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];
    
    // DOM ELEMENTS
    let figureElement;
    let highlightedTickIndex = $state(0);
    let storyVisible = $state(false);

    // DATA
    let addedEvents = $state([]);
    let tickLocked = $state(false);

    // Computes paths and dots from the data
    function makePathsAndDots({ side, data, svgWidth, spacing, startX, bulgeAmount, yScale }) {
        const reverse = side === "ashlee";

        // Paths
        const paths = themes.map((theme, i) => {
            const baseX = reverse
                ? svgWidth - startX - i * spacing
                : startX + i * spacing;

            const points = data.map(d => {
                // Bulges - small for one side, large for both sides
                const hasSelf = d[`${side}Themes`][theme] === '1';
                const hasOther = d[`${side === "jan" ? "ashlee" : "jan"}Themes`][theme] === '1';

                let xOffset = 0;
                if (hasSelf && hasOther) xOffset = 2 * bulgeAmount + i * 12;
                else if (hasSelf) xOffset = bulgeAmount + i * 12;

                return [
                    reverse ? baseX - xOffset : baseX + xOffset,
                    yScale(d.date)
                ];
            });

            return { theme, points };
        });

        // Rainbow line dots
        const dots = data
            .filter(d => themes.some(theme => d[`${side}Themes`][theme] === '1'))
            .flatMap(d =>
                themes.filter(theme => d[`${side}Themes`][theme] === '1').map(theme => {
                    // Bulges - small for one side, large for both sides
                    const hasSelf = d[`${side}Themes`][theme] === '1';
                    const hasOther = d[`${side === "jan" ? "ashlee" : "jan"}Themes`][theme] === '1';

                    const themeIndex = themes.indexOf(theme);

                    let xOffset = 0;
                    if (hasSelf && hasOther) xOffset = 2 * bulgeAmount + themeIndex * 12;
                    else if (hasSelf) xOffset = bulgeAmount + themeIndex * 12;

                    const baseX = reverse
                        ? svgWidth - startX - themeIndex * spacing
                        : startX + themeIndex * spacing;

                    return {
                        id: `${side}-${new Date(d.date).getTime()}-${theme}`,
                        date: d.date,
                        event: String(d[`${side}Themes`].event || '').trim(),
                        theme,
                        bulge: xOffset, // keep same as applied
                        x: reverse ? baseX - xOffset : baseX + xOffset,
                        y: yScale(d.date)
                    };
                })
            );
        
        // Black line
        const emptyDots = data
            .filter(d => {
                const ev = d[`${side}Themes`].event;
                return ev && ev !== "START" && ev !== "END" &&
                    themes.every(theme => !d[`${side}Themes`][theme]);
            })
            .map(d => {
                const eventStr = String(d[`${side}Themes`].event || '').trim();
                return {
                    id: `${side}-${new Date(d.date).getTime()}-empty-${eventStr || 'noevent'}`,
                    date: d.date,
                    event: eventStr,
                    x: reverse ? svgWidth - 19 : 19,
                    y: yScale(d.date)
                };
            })

        return { paths, dots, emptyDots };
    }

    // Process data and generate path points
    function generateTimelineData(janData, ashleeData) {
        if (!janData || !ashleeData) return { jan: { paths: [], dots: [] }, ashlee: { paths: [], dots: [] } };

        const monthlyData = d3.timeMonth.range(d3.timeMonth.floor(minDate), d3.timeMonth.ceil(maxDate)).map(d => {
            const janEvent = janData.find(event => d3.timeMonth.floor(new Date(event.date)).getTime() === d.getTime());
            const ashleeEvent = ashleeData.find(event => d3.timeMonth.floor(new Date(event.date)).getTime() === d.getTime());
            return {
                date: d,
                janThemes: janEvent || {},
                ashleeThemes: ashleeEvent || {}
            };
        });

        return {
            yScale,
            monthlyData,
            jan: makePathsAndDots({ side: "jan", data: monthlyData, svgWidth, spacing, startX, bulgeAmount, yScale }),
            ashlee: makePathsAndDots({ side: "ashlee", data: monthlyData, svgWidth, spacing, startX, bulgeAmount, yScale })
        };
    }

    // Creates full dataset + axes
    const allDates = janData.concat(ashleeData).map(d => new Date(d.date));
    const minDate = d3.min(allDates);
    const maxDate = d3.max(allDates);

    const yScale = $derived(d3.scaleTime()
        .domain([minDate, maxDate])
        .range([margins.top, svgHeight - margins.top - margins.bottom]));

    const allTimelineData = $derived(generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX, bulgeAmount));
    let axisData = $derived(allTimelineData.yScale.ticks(d3.timeMonth.every(1)));

    // Defines the line generator
    const lineGenerator = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBumpY);

    // TOOLTIP
    let tooltipVisible = $state(false);
    let tooltipX = $state();
    let tooltipY = $state();
    let dotDate = $state();
    let dotEvent = $state();
    let dotTheme = $state();
    const formatMonthYear = d3.timeFormat("%b %Y");
    const formatYear = d3.timeFormat("%Y");

    // EVENT HANDLERS
    function circleMouseEnter(e, dot, dotType) {
        const eventKey = normalizeEventKey(dot.event);
        if (!eventKey) return;

        const matchingDots = d3.selectAll(`.circle-group[data-id='${eventKey}']`);

        matchingDots.attr("transform", function() {
            const x = this.dataset.x;
            const y = this.dataset.y;
            return `translate(${x}, ${y}) scale(1.2)`;
        });

        const themes = [];
        matchingDots.each(function(d) {
            if (this.dataset.theme) {
                themes.push(this.dataset.theme);
            }
        });

        dotTheme = Array.from(new Set(themes));
        dotDate = formatMonthYear(dot.date);
        dotEvent = dot.event;

        tooltipX = e.x > svgWidth/2 ? e.x - 210 : e.x + 10;
        tooltipY = e.y+10;;

        tooltipVisible = true;
    
        // Find the closest axis tick to the dot's date and highlight it
        const dotDateValue = new Date(dot.date);
            let closestIndex = -1;
            let closestDistance = Infinity;

            axisData.forEach((tickValue, i) => {
                const distance = Math.abs(tickValue.getTime() - dotDateValue.getTime());
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestIndex = i;
                }
            });
        
        highlightedTickIndex = closestIndex;
    }

    function circleMouseExit(e, dot, dotType) {
        const eventKey = normalizeEventKey(dot.event);
        d3.selectAll(`.circle-group[data-id='${eventKey}']`)
            .attr("transform", function() {
                const x = this.dataset.x;
                const y = this.dataset.y;
                return `translate(${x}, ${y}) scale(1)`;
            });
        tooltipVisible = false;
    }

    function circleClickAdd(e, dot) {
        const eventKey = String(dot.event ?? '').trim();
        if (!eventKey) return; // ignore blanks

        if (addedEvents.includes(eventKey)) {
            addedEvents = addedEvents.filter(ev => ev !== eventKey);
        } else {
            addedEvents = [...addedEvents, eventKey];
        }

        console.log("toggled", eventKey, { addedEvents });
    }

    // REACTIVE
    $effect(() => {
        if (!figureElement || !allTimelineData) return;

        // Finds nearest tick on scroll
        const containerTop = figureElement.getBoundingClientRect().top + yScroll;
        const viewportCenterY = window.innerHeight / 2 + yScroll;

        let closestDistance = Infinity;
        let closestIndex = -1;

        allTimelineData.monthlyData.forEach((month, i) => {
            const tickY = allTimelineData.yScale(month.date);
            const tickWindowY = tickY + containerTop;
            const distance = Math.abs(tickWindowY - viewportCenterY);

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        });

        highlightedTickIndex = closestIndex;

        storyVisible = highlightedTickIndex == 57;

        // if (storyVisible) {
        //     d3.select("body").style("overflow", "hidden");
        // }
});

    function normalizeEventKey(str) {
        return String(str || '')
            .toLowerCase()              // optional: lowercase everything
            .replace(/\s+/g, '')        // remove all whitespace
            .replace(/[^a-z0-9\-]/g, ''); // remove all non-alphanumeric characters (keep dash if needed)
    }
</script>

<svelte:window bind:scrollY={yScroll}></svelte:window>

<section id="timeline">
    <Story {storyVisible} 
        on:close={() => {
            storyVisible = false}} 
        />
    <div id="tooltip" class:visible={tooltipVisible} style="left: {tooltipX}px; top: {tooltipY}px">
        <p><strong>{dotDate}</strong></p>
        {#if dotTheme}
            <p>
                {#each dotTheme as t}
                    <span class="theme-span theme-{t}">{t}</span>{" "}
                {/each}
            </p>
        {/if}
        <p>{dotEvent}</p>
    </div>
    <div class="sticky-header">
        <Key />
        <div class="names">
            <p>Jan</p>
            <p>Ashleé</p>
        </div>
    </div>
    <figure bind:this={figureElement} style="height: {svgHeight}px;">
        <div class="axis-container" style="height: {svgHeight}px;">
            {#each axisData as tickValue, i}
                <div id="tick-{i}" class="axis-tick" 
                    style="top: {allTimelineData.yScale(tickValue) - margins.top}px;"
                    class:highlighted={i === highlightedTickIndex}
                >
                    {#if d3.timeMonth.floor(tickValue).getMonth() === 0}
                        <p class="year">{formatYear(tickValue)}</p>
                    {:else}
                        <p class="month">{formatMonthYear(tickValue)}</p>
                    {/if}
                </div>
            {/each}
        </div>
        <svg width={svgWidth} height={40000} bind:clientHeight={svgHeight} bind:clientWidth={svgWidth}>
            {#if svgHeight > 0}
                <defs>
                    {#each themes as theme, i}
                        <linearGradient id={"gradient-" + i} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={"stop-color: " + d3.color(colors[i]).darker(1)} />
                            <stop offset="50%" style={"stop-color: " + colors[i]} />
                            <stop offset="100%" style={"stop-color: " + d3.color(colors[i]).darker(1)} />
                        </linearGradient>

                        <radialGradient id={"radial-gradient-" + i} cx="30%" cy="30%" r="50%" fx="30%" fy="30%">
                            <stop offset="0%" style={"stop-color: " + d3.color(colors[i]).brighter(1)} />
                            <stop offset="80%" style={"stop-color: " + colors[i]} />
                            <stop offset="100%" style={"stop-color: " + d3.color(colors[i]).darker(0.5)} />
                        </radialGradient>
                    {/each}
                </defs>
                
                {#each ["jan", "ashlee"] as side}
                    <g class="g-{side}">
                        <line x1={side == "jan" ? 20 : svgWidth - 20} y1=0 x2={side == "jan" ? 10 : svgWidth - 10} y2={svgHeight} stroke="black" stroke-width={4}></line>

                        {#each allTimelineData[side].paths as themePath, i}
                            <path d={lineGenerator(themePath.points)} stroke={colors[i]} fill="none" stroke-width={8} />
                        {/each}

                        {#each allTimelineData[side].dots as dot}
                            <g 
                                class="circle-group"
                                data-id={normalizeEventKey(dot.event)}
                                data-x={dot.x}
                                data-y={dot.y}
                                data-theme={dot.theme}
                                role="tooltip"
                                transform={`translate(${dot.x}, ${dot.y}) scale(1)`}
                                onmouseenter={(e) => circleMouseEnter(e, dot, "theme")}
                                onmouseleave={(e) => circleMouseExit(e, dot, "theme")}
                                onclick={(e) => circleClickAdd(e, dot)}
                            >
                                <circle
                                    r={12}
                                    fill={colors[themes.indexOf(dot.theme)]}
                                />
                                <!-- Plus sign -->
                                <g 
                                    class="icon"
                                    class:rotated={addedEvents.includes(dot.event)}>
                                    <line
                                        x1="0" y1="-4"
                                        x2="0" y2="4"
                                        stroke="white"
                                        stroke-width="2"
                                        pointer-events="none"
                                    />
                                    <line
                                        x1="-4" y1="0"
                                        x2="4" y2="0"
                                        stroke="white"
                                        stroke-width="2"
                                        pointer-events="none"
                                    />
                                </g>
                            </g>
                        {/each}

                        {#each allTimelineData[side].emptyDots as dot}
                            <g 
                                class="circle-group"
                                data-id={normalizeEventKey(dot.event)}
                                data-x={dot.x}
                                data-y={dot.y}
                                role="tooltip"
                                transform={`translate(${dot.x}, ${dot.y}) scale(1)`}
                                onmouseenter={(e) => circleMouseEnter(e, dot, "theme")}
                                onmouseleave={(e) => circleMouseExit(e, dot, "theme")}
                                onclick={(e) => circleClickAdd(e, dot)}
                            >
                                <circle
                                    r={8}
                                    fill="black"
                                />
                                <!-- Plus sign -->
                                <g 
                                    class="icon"
                                    class:rotated={addedEvents.includes(dot.event)}>
                                    <line
                                        x1="0" y1="-4"
                                        x2="0" y2="4"
                                        stroke="white"
                                        stroke-width="2"
                                        pointer-events="none"
                                    />
                                    <line
                                        x1="-4" y1="0"
                                        x2="4" y2="0"
                                        stroke="white"
                                        stroke-width="2"
                                        pointer-events="none"
                                    />
                                </g>
                            </g>
                        {/each}
                    </g>
                {/each}
            {/if}
        </svg>
    </figure>
</section>

<style>
    #tooltip {
        position: fixed;
        opacity: 0;
        background: var(--color-bg);
        width: 200px;
        border-radius: 8px;
        padding: 1rem;
        z-index: 1000;
        font-family: var(--sans);
        font-size: var(--12px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        transition: opacity 100ms linear;
        pointer-events: none;
    }

    #tooltip.visible {
        opacity: 1;
    }

    #tooltip p {
        margin: 0;
    }

    #timeline {
        width: 100%;
        position: relative;
        margin-top: 10rem;
    }

    .bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100svh;
    }

    .bg-img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url("assets/imgs/kelly-kapowski.jpg");
        background-size: 25%;
        filter: grayscale(1) blur(2px);
        opacity: 0.15;
    }

    .bg-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: linearGradient(var(--mq-pink), var(--mq-red));
        mix-blend-mode: overlay;
        opacity: 0.5;
    }

    .sticky-header {
        position: sticky;
        top: 1rem;
        left: 0;
        height: 1.75rem;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        z-index: 900;
    }

    .sticky-header .names {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin-top: -2rem;
    }

    .sticky-header p {
        font-family: var(--sans);
        font-weight: 700;
        font-size: var(--18px);
        width: 140px;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg);
        border-radius: 1.25rem;
        border: 2px solid var(--color-fg);
        box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    }

    figure {
        width: 100%;
        position: relative;
    }

    .circle-group {
        transition: transform 150ms ease;
    }

    .icon {
        transition: transform 150ms ease;
        transform-box: fill-box;       /* make transform-origin use the box of the element */
        transform-origin: 50% 50%;     /* center of the group */
    }

    .icon.rotated {
        transform: rotate(45deg);
    }

    svg, .axis-container {
        position: absolute;
        width: 100%;
        top: 0;
        left: 0;
    }

    .axis-tick {
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
    }

    .axis-tick p {
        transition: all 0.25s linear;
    }

    .year, .month {
        font-family: var(--sans);
        margin: 0;
        padding: 0;
        line-height: 1;
        font-size: var(--14px);
        font-weight: 500;
    }

    .year {
       font-weight: 700; 
    }

    .highlighted p {
        font-weight: 700;
        font-size: var(--36px);
    }

    :global(#timeline svg circle) {
        cursor: pointer;
        /* transition: all 0.3s linear; */
    }

    .theme-span {
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
    }

    .theme-lust {
        background: #FF69B4;
    }

    .theme-representation {
        background: #FF0000;
    }

    .theme-beHer {
        background: #FF8E00;
    }

    .theme-genderConstruct {
        background: #FFCC00;
    }

    .theme-girlPower {
        background: #008E00;
    }

    .theme-gaySeeGay {
        background: #00C0C0;
    }

    .theme-publicOpinion {
        background: #400098;
    }

    .theme-trueSelves {
        background: #8E008E;
    }
</style>