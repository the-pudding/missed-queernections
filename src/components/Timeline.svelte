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

    // ARRAYS
    const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];
    const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];
    
    // DOM ELEMENTS
    let figureElement;
    let highlightedTickIndex = $state(0);
    let storyVisible = $state(false);

    // DATA
    let addedEvents = $state([]);

    // HELPER FUNCTIONS
    function normalizeEventKey(str) {
        return String(str || '')
            .toLowerCase()              // optional: lowercase everything
            .replace(/\s+/g, '')        // remove all whitespace
            .replace(/[^a-z0-9\-]/g, ''); // remove all non-alphanumeric characters (keep dash if needed)
    }

    // Computes paths and dots from the data
    function makePathsAndDots({ side, data, svgWidth, spacing, startX, bulgeAmount, yScale }) {
        const reverse = side === "ashlee";

        // Paths
        const paths = themes.map((theme, i) => {
            const baseX = reverse
                ? svgWidth - startX - i * spacing
                : startX + i * spacing;

            // Get all months in the data range
            const months = d3.timeMonth.range(
                d3.timeMonth.floor(d3.min(data, d => d.date)),
                d3.timeMonth.ceil(d3.max(data, d => d.date))
            );

            const points = months.map(month => {
                // All events in this month
                const monthEvents = data.filter(d => d3.timeMonth.floor(d.date).getTime() === month.getTime());

                // Check if any event in this month has theme on self/other
                const hasSelf = monthEvents.some(d => d[`${side}Themes`][theme] === '1');
                const hasOther = monthEvents.some(d => d[`${side === "jan" ? "ashlee" : "jan"}Themes`][theme] === '1');

                // Compute bulge
                let xOffset = 0;
                if (hasSelf && hasOther) xOffset = 2 * bulgeAmount + i * 12;
                else if (hasSelf) xOffset = bulgeAmount + i * 12;

                return [
                    reverse ? baseX - xOffset : baseX + xOffset,
                    yScale(month)
                ];
            });

            return { theme, points };
        });

        // Rainbow line dots
        const dots = data.flatMap(d => {
            const reverse = side === "ashlee";
            const otherSide = side === "jan" ? "ashlee" : "jan";

            return themes.flatMap((theme, themeIndex) => {
                if (d[`${side}Themes`][theme] !== '1') return [];

                // Find all events in this month for self and other
                const monthEvents = data.filter(
                    ev => d3.timeMonth.floor(ev.date).getTime() === d3.timeMonth.floor(d.date).getTime()
                );

                const hasSelf = monthEvents.some(ev => ev[`${side}Themes`][theme] === '1');
                const hasOther = monthEvents.some(ev => ev[`${otherSide}Themes`][theme] === '1');

                // Bulge calculation (same as paths)
                let xOffset = 0;
                if (hasSelf && hasOther) xOffset = 2 * bulgeAmount + themeIndex * 12;
                else if (hasSelf) xOffset = bulgeAmount + themeIndex * 12;

                const baseX = reverse
                    ? svgWidth - startX - themeIndex * spacing
                    : startX + themeIndex * spacing;

                return {
                    id: `${side}-${+new Date(d.date)}-${theme}`,
                    date: d.date,
                    event: String(d[`${side}Themes`].event || '').trim(),
                    theme,
                    bulge: xOffset,
                    x: reverse ? baseX - xOffset : baseX + xOffset,
                    y: yScale(d.date)
                };
            });
        });
        
        // Black line
        const emptyDots = data
            .filter(d => {
                const self = d[`${side}Themes`];
                const hasEvent = self.event && self.event !== "START" && self.event !== "END";
                const allThemesZero = themes.every(theme => self[theme] !== '1');
                return hasEvent && allThemesZero;
            })
            .map(d => {
                const eventStr = String(d[`${side}Themes`].event || '').trim();
                const reverse = side === "ashlee";

                const baseX = reverse ? svgWidth - spacing - 5 : spacing + 5;

                return {
                    id: `${side}-${+new Date(d.date)}-empty-${eventStr}`,
                    date: d.date,
                    event: eventStr,
                    x: baseX,
                    y: yScale(d.date),
                    r: 8
                };
            });

        return { paths, dots, emptyDots };
    }

    // Process data and generate path points
    function generateTimelineData(janData, ashleeData) {
        if (!janData || !ashleeData) return { jan: { paths: [], dots: [], emptyDots: [] }, ashlee: { paths: [], dots: [], emptyDots: [] } };

        // Prepare data: each event stays as its own object
        const allData = [];

        janData.forEach(e => {
            allData.push({
                date: new Date(e.date),
                janThemes: (() => {
                    const obj = { event: [e.event] }; // keep event as array
                    themes.forEach(t => obj[t] = e[t] === "1" ? "1" : "0");
                    return obj;
                })(),
                ashleeThemes: {} // empty for Jan events
            });
        });

        ashleeData.forEach(e => {
            allData.push({
                date: new Date(e.date),
                janThemes: {}, // empty for Ashlee events
                ashleeThemes: (() => {
                    const obj = { event: [e.event] };
                    themes.forEach(t => obj[t] = e[t] === "1" ? "1" : "0");
                    return obj;
                })()
            });
        });

        return {
            yScale, // pass the scale
            monthlyData: allData, // just a flat array of events
            jan: makePathsAndDots({ side: "jan", data: allData, svgWidth, spacing, startX, bulgeAmount, yScale }),
            ashlee: makePathsAndDots({ side: "ashlee", data: allData, svgWidth, spacing, startX, bulgeAmount, yScale })
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

        // Scales all related dots
        const matchingDots = d3.selectAll(`.circle-group[data-id='${eventKey}']`);

        matchingDots.attr("transform", function() {
            const x = this.dataset.x;
            const y = this.dataset.y;
            return `translate(${x}, ${y}) scale(1.2)`;
        });

        // Sets tooltip info
        tooltipX = e.x > svgWidth/2 ? e.x - 210 : e.x + 10;
        tooltipY = e.y+10;;
        tooltipVisible = true;
        const themesLocal = [];
        matchingDots.each(function(d) {
            if (this.dataset.theme) {
                themesLocal.push(this.dataset.theme);
            }
        });

        dotTheme = Array.from(new Set(themesLocal));
        dotDate = formatMonthYear(dot.date);
        dotEvent = dot.event;

        // Path lightness
        // Resets
        d3.selectAll("path").each(function() {
            const pathId = this.getAttribute("id") || "";
            const parts = pathId.split("-"); // ["theme", "index", "path"]
            const themeIndex = parseInt(parts[1]);
            if (!isNaN(themeIndex)) {
                d3.select(this).attr("stroke", colors[themeIndex]);
            }
        });

        // Lighten non-matching paths
        const trimmedDotTheme = dotTheme.map(t => t.trim());

        d3.selectAll("path").each(function() {
            const pathId = this.getAttribute("id") || "";
            const theme = pathId.split("-")[0]; // get the theme from the id

            if (!trimmedDotTheme.includes(theme)) {
                const pathColor = d3.color(this.getAttribute("stroke"));
                if (pathColor) {
                    pathColor.opacity = 0.2; // lighten by reducing opacity
                    d3.select(this).attr("stroke", pathColor.formatRgb());
                }
            }
        });

        // Lighten non-matching circles
        d3.selectAll(".circle-group circle").each(function() {
            const parent = this.parentNode;
            const eventId = parent.dataset.id; // normalized event key
            const theme = parent.dataset.theme;
            if (!theme) return;
            const themeIndex = themes.indexOf(theme);
            console.log(eventId, eventKey, theme, themeIndex)

            if (eventId !== eventKey && themeIndex !== -1) {
                const originalColor = colors[themeIndex];
                const color = d3.color(originalColor);
                if (color) {
                    color.opacity = 0.2; // lighten
                    d3.select(this).attr("fill", color.formatRgb());
                }
            } else if (eventId === eventKey && themeIndex !== -1) {
                // restore original color if this is the hovered event
                d3.select(this).attr("fill", colors[themeIndex]);
            }
        });
    
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
        
        // Reset dot scale
        d3.selectAll(`.circle-group[data-id='${eventKey}']`)
            .attr("transform", function() {
                const x = this.dataset.x;
                const y = this.dataset.y;
                return `translate(${x}, ${y}) scale(1)`;
            });

        // Reset path lightness
        d3.selectAll("path").each(function() {
            const pathId = this.getAttribute("id") || "";
            const parts = pathId.split("-"); // ["theme", "index", "path"]
            const themeIndex = parseInt(parts[1]);
            if (!isNaN(themeIndex)) {
                d3.select(this).attr("stroke", colors[themeIndex]);
            }
        });

        // Reset circle lightness
        d3.selectAll(".circle-group circle").each(function() {
            const parent = this.parentNode;
            const theme = parent.dataset.theme; // may be undefined for emptyDots
            if (!theme) return; // skip emptyDots
            const themeIndex = themes.indexOf(theme);
            if (themeIndex === -1) return;

            // Restore original color
            d3.select(this).attr("fill", colors[themeIndex]);
        });

        // Tooltip info
        tooltipVisible = false;
    }

    function circleClickAdd(e, dot) {
        const eventKey = String(dot.event ?? '').trim();
        if (!eventKey) return;

        // TO-DO push this to database
        if (addedEvents.includes(eventKey)) {
            addedEvents = addedEvents.filter(ev => ev !== eventKey);
        } else {
            addedEvents = [...addedEvents, eventKey];
        }
    }

    // REACTIVE
    $effect(() => {
        if (!allTimelineData || !axisData) return;

        const viewportCenterY = window.innerHeight / 2;

        // Precompute tick positions
        const tickPositions = axisData.map((tickValue) => allTimelineData.yScale(tickValue));

        let closestDistance = Infinity;
        let closestIndex = -1;

        tickPositions.forEach((tickY, i) => {
            // tickY is relative to SVG container
            const distance = Math.abs(tickY - yScroll - viewportCenterY);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        });

        highlightedTickIndex = closestIndex;
        storyVisible = highlightedTickIndex === 57;
    });
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
        <svg width={svgWidth} height={30000} bind:clientHeight={svgHeight} bind:clientWidth={svgWidth}>
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
                            <path id="{themePath.theme}-{i}-path" d={lineGenerator(themePath.points)} stroke={colors[i]} fill="none" stroke-width={8} />
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

    :global(path.faded) {
        opacity: 0.4;
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