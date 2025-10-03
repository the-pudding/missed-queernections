<script>
    import * as d3 from 'd3';
    import janData from "$data/jan.csv";
    import ashleeData from "$data/ashlee.csv";
    import Key from "$components/Key.svelte";
    import Story from "$components/Story.svelte";
    import Bands from "$components/Timeline.Bands.svelte";
    import Axis from "$components/Timeline.Axis.svelte";
    import Side from "$components/Timeline.Side.svelte";
    import { themes, colors, normalizeEventKey } from "$runes/misc.svelte.js";

    // DIMENSIONS
    let svgHeight = $state(0);
    let svgWidth = $state(0);
    const margins = {top: 0, right: 12, bottom: 0, left: 12}
    const spacing = 8;
    const startX = 40; // Increased startX to give left right padding
    const bulgeAmount = $derived(svgWidth/8);
    const blackLineX = 20;

    // SCROLL
    let yScroll = $state(0);
    let lastScrollY = 0;
    let scrollTimeout = null;
    let scrolling = $state(false);
    let bulgedMonthIndices = $state(new Set());

    let addedEvents = $state([]);
    let hoveredEventKey = $state(null);
    let hoveredThemes = $state([]);

    // NEW: Centralized event handlers
    function handleDotHover(event) {
        const { dot, clientX, clientY } = event.detail;
        if (scrolling) return;

        hoveredEventKey = normalizeEventKey(dot.event);
        
        // Find all themes associated with this event
        const themesForEvent = new Set();
        const allDots = allTimelineData.jan.dots.concat(allTimelineData.ashlee.dots);
        allDots.forEach(d => {
            if (normalizeEventKey(d.event) === hoveredEventKey) {
                themesForEvent.add(d.theme);
            }
        });
        hoveredThemes = Array.from(themesForEvent);

        // Update tooltip
        tooltipX = clientX > window.innerWidth / 2 ? clientX - 210 : clientX + 10;
        tooltipY = clientY + 10;
        tooltipVisible = true;
        dotDate = d3.timeFormat("%b %Y")(dot.date);
        dotEvent = dot.event;
        dotTheme = hoveredThemes;
    }

    function handleDotLeave() {
        hoveredEventKey = null;
        hoveredThemes = [];
        tooltipVisible = false;
    }

    function handleDotClick(event) {
        const eventKey = String(event.detail.dot.event ?? '').trim();
        if (!eventKey) return;
        
        if (addedEvents.includes(eventKey)) {
            addedEvents = addedEvents.filter(ev => ev !== eventKey);
        } else {
            addedEvents = [...addedEvents, eventKey];
        }
    }
    
    // DOM ELEMENTS
    let figureElement;
    let highlightedTickIndex = $state(0);
    let highlightedTickDate = $state(0);
    let storyVisible = $state(false);

    // DATA
    const parseMonthYear = d3.timeParse("%B %Y");

    // COMPUTES PATHS AND DOTS FROM THE EVENT DATA
    function makePathsAndDots({ side, data, svgWidth, spacing, startX, bulgeAmount, yScale }) {
        const reverse = side === "ashlee";
        const baseOffset = 10;

        // Paths
        const paths = themes.map((theme, i) => {
            const baseX = reverse
                ? svgWidth - startX - i * spacing
                : startX + i * spacing;

            const months = d3.timeMonth.range(
                d3.timeMonth.floor(d3.min(data, d => d.date)),
                d3.timeMonth.offset(d3.timeMonth.ceil(d3.max(data, d => d.date)), 1)
            );

            // We now generate two sets of points for each path
            const bulgedPoints = [];
            const straightPoints = [];

            months.forEach(month => {
                const y = yScale(month);
                const monthStr = d3.timeFormat("%B %Y")(month);
                const monthEvents = data.filter(d => d3.timeFormat("%B %Y")(d.date) === monthStr);

                const hasSelf = monthEvents.some(d => d[`${side}Themes`][theme] === '1');
                const hasOther = monthEvents.some(d => d[`${side === "jan" ? "ashlee" : "jan"}Themes`][theme] === '1');

                const width = svgWidth;
                let xOffset = baseX;

                if (hasSelf && hasOther) {
                    xOffset = width / 2;
                } else if (hasSelf && side === "jan") {
                    xOffset = width / 4 + i * baseOffset;
                } else if (hasSelf && side === "ashlee") {
                    xOffset = (3 * width) / 4 - i * baseOffset;
                }

                bulgedPoints.push([xOffset, y]);
                straightPoints.push([baseX, y]); // The straight path always uses baseX
            });

            // Return both point arrays
            return { theme, points: bulgedPoints, straightPoints };
        });

        // Rainbow line dots
        const dots = data.flatMap(d => {
            const otherSide = side === "jan" ? "ashlee" : "jan";

            return themes.flatMap((theme, themeIndex) => {
                if (d[`${side}Themes`][theme] !== '1') return [];

                const dotMonthStr = d3.timeFormat("%B %Y")(d.date);
                const monthEvents = data.filter(ev => d3.timeFormat("%B %Y")(ev.date) === dotMonthStr);

                const hasSelf = monthEvents.some(ev => ev[`${side}Themes`][theme] === '1');
                const hasOther = monthEvents.some(ev => ev[`${otherSide}Themes`][theme] === '1');

                const width = svgWidth; 
                const baseX = reverse ? svgWidth - startX - themeIndex * spacing : startX + themeIndex * spacing;
                let x = baseX;

                if (hasSelf && hasOther) {
                    x = width / 2;
                } else if (hasSelf && side === "jan") {
                    x = width / 4 + themeIndex * baseOffset;
                } else if (hasSelf && side === "ashlee") {
                    x = (3 * width) / 4 - themeIndex * baseOffset;
                }

                return {
                    id: `${side}-${parseMonthYear(d.date)}-${theme}`,
                    date: d.date,
                    event: String(d[`${side}Themes`].event || '').trim(),
                    theme,
                    x: x, // Final bulged X
                    y: yScale(d.date),
                    baseX: baseX, // Add the initial straight X
                    monthStr: d3.timeFormat("%B %Y")(d.date) // Add month string for easier selection
                };
            });
        });
        
        // Also update emptyDots to have baseX for consistency
        const emptyDots = data
            .filter(d => {
                const self = d[`${side}Themes`];
                const eventStr = Array.isArray(self.event) ? self.event[0] : self.event;
                const hasEvent = eventStr && eventStr !== "START" && eventStr !== "END";
                const allThemesZero = themes.every(theme => self[theme] !== '1');
                return hasEvent && allThemesZero;
            })
            .map(d => {
                const eventStr = String(d[`${side}Themes`].event || '').trim();
                const baseX = reverse ? svgWidth - blackLineX : blackLineX;

                return {
                    id: `${side}-${parseMonthYear(d.date)}-empty-${eventStr}`,
                    date: d.date,
                    event: eventStr,
                    x: baseX, // In this case, x and baseX are the same
                    y: yScale(d.date),
                    r: 6,
                    baseX: baseX,
                    monthStr: d3.timeFormat("%B %Y")(d.date)
                };
            });

        return { paths, dots, emptyDots };
    }

    // PROCESS DATA AND GENERATE POINTS
    function generateTimelineData(janData, ashleeData) {
        if (!janData || !ashleeData) return { jan: { paths: [], dots: [], emptyDots: [] }, ashlee: { paths: [], dots: [], emptyDots: [] } };

        // Prepare data: each event stays as its own object
        const allData = [];

        janData.forEach(e => {
            if (!e.date) return;
            allData.push({
                date: parseMonthYear(e.date),
                janThemes: (() => {
                    const obj = { event: [e.event] }; // keep event as array
                    themes.forEach(t => obj[t] = e[t] === "1" ? "1" : "0");
                    return obj;
                })(),
                ashleeThemes: {} // empty for Jan events
            });
        });

        ashleeData.forEach(e => {
            if (!e.date) return;
            allData.push({
                date: parseMonthYear(e.date),
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

    // FULL DATASET + AXES
    const allDates = janData.concat(ashleeData).map(d => parseMonthYear(d.date));
    const minDate = d3.min(allDates);
    const maxDate = d3.max(allDates);

    const yScale = $derived(d3.scaleTime()
        .domain([minDate, maxDate])
        .range([margins.top, svgHeight - margins.top - margins.bottom]));

    const allTimelineData = $derived(generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX, bulgeAmount));
    let axisData = $derived(allTimelineData.yScale.ticks(d3.timeMonth.every(1)));

    // LINE GENERATOR
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

    // REACTIVE: HIGHLIGHT TICK BASED ON SCROLL
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
        highlightedTickDate = axisData[highlightedTickIndex];
    });

    // REACTIVE: DEBOUNCE HOVER DURING SCROLL
    $effect(() => {
        if (yScroll !== lastScrollY) {
            scrolling = true;

            // clear previous timeout
            if (scrollTimeout) clearTimeout(scrollTimeout);

            // after 100ms of no scroll, consider scroll stable
            scrollTimeout = setTimeout(() => {
                scrolling = false;
            }, 100);

            lastScrollY = yScroll;
        }
    });

    // REACTIVE: ANIMATE BULGE BASED ON HIGHLIGHTED TICK
    $effect(() => {
        if (!highlightedTickDate || !minDate) return;

        // Get the index of the start of the 5-month bulge window
        const windowStartDate = d3.timeMonth.offset(highlightedTickDate, -2);
        const startIndex = d3.timeMonth.count(minDate, windowStartDate);
        
        let needsUpdate = false;
        const newIndices = new Set(bulgedMonthIndices);

        // Check the 5-month window and add any new indices
        for (let i = 0; i < 3; i++) {
            const currentIndex = startIndex + i;
            if (currentIndex >= 0 && !newIndices.has(currentIndex)) {
                newIndices.add(currentIndex);
                needsUpdate = true;
            }
        }

        // Only trigger the animation effect if there are new months to bulge
        if (needsUpdate) {
            bulgedMonthIndices = newIndices;
        }
    });


    // REACTIVE: ANIMATE ELEMENTS WHEN THE SET OF BULGED MONTHS CHANGES
    $effect(() => {
        if (bulgedMonthIndices.size === 0 || !minDate) return;

        const animationDuration = 300;
        const animationEase = d3.easeCubicOut;
        const sides = ['jan', 'ashlee'];

        // --- Animate Dots (More Efficiently) ---
        // Select only dots that are in a bulged month AND haven't been animated yet
        d3.selectAll(".circle-group:not(.bulged), .empty-dot-group:not(.bulged)")
            .filter(function() {
                const g = d3.select(this);
                const monthStr = g.attr('data-month');
                if (!monthStr) return false;

                const dotDate = parseMonthYear(monthStr);
                const monthIndex = d3.timeMonth.count(minDate, dotDate);
                
                return bulgedMonthIndices.has(monthIndex);
            })
            .classed('bulged', true) // Mark as bulged to prevent re-animating
            .transition()
            .duration(animationDuration)
            .ease(animationEase)
            .attr("transform", function() {
                const g = d3.select(this);
                return `translate(${g.attr('data-x')}, ${g.attr('data-y')}) scale(1)`;
            });

        // --- Animate Paths ---
        d3.selectAll("path.timeline-path").each(function() {
            const pathElement = d3.select(this);
            const sideIndex = pathElement.attr('data-side-index');
            const pathIndex = pathElement.attr('data-path-index');
            const side = sides[sideIndex];
            
            const pathData = allTimelineData[side].paths[pathIndex];
            if (!pathData) return;

            // Generate path using a quick Set lookup instead of a slow loop
            const newPoints = pathData.straightPoints.map((point, i) => {
                return bulgedMonthIndices.has(i) ? pathData.points[i] : point;
            });
            
            const newPathD = lineGenerator(newPoints);
            
            // This transition will run for the whole path, but it's very fast
            pathElement.transition()
                .duration(animationDuration)
                .ease(animationEase)
                .attr("d", newPathD);
        });
    });
</script>

<svelte:window bind:scrollY={yScroll}></svelte:window>

<section id="timeline">
    <Bands />
    <Story bind:isOpen={storyVisible} {highlightedTickDate}
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
        <Axis {margins} {svgHeight} {allTimelineData} {axisData} />
        <svg width={svgWidth} height={60000} bind:clientHeight={svgHeight} bind:clientWidth={svgWidth}>
            {#if svgHeight > 0}
                {#each ["jan", "ashlee"] as side, sideIndex}
                    <Side 
                        {side} 
                        {sideIndex} 
                        {svgWidth} 
                        {svgHeight} 
                        {allTimelineData} 
                        {scrolling} 
                        {tooltipVisible} 
                        {tooltipX} 
                        {tooltipY} 
                        {axisData} 
                        {highlightedTickIndex} 
                        {bulgedMonthIndices}
                        {hoveredEventKey}
                        {hoveredThemes}
                        {addedEvents}
                        on:hover={handleDotHover}
                        on:leave={handleDotLeave}
                        on:click={handleDotClick} />
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

    .highlighted p {
        font-weight: 700;
        font-size: var(--36px);
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