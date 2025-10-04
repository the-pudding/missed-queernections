<script>
    import * as d3 from 'd3';
    import janData from "$data/jan.csv";
    import ashleeData from "$data/ashlee.csv";
    import Key from "$components/Key.svelte";
    import Story from "$components/Story.svelte";
    import Bands from "$components/Timeline.Bands.svelte";
    import Axis from "$components/Timeline.Axis.svelte";
    import Side from "$components/Timeline.Side.svelte";
    import Tooltip from "$components/Timeline.Tooltip.svelte";
    import Instructions from "$components/Timeline.Instructions.svelte";
    import YourEvents from "$components/YourEvents.svelte";
    import { themes, normalizeEventKey, addedEvents, instructionStep  } from "$runes/misc.svelte.js";

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

    // DOM ELEMENTS
    let figureElement;
    let highlightedTickIndex = $state(0);
    let highlightedTickDate = $state(0);
    let storyVisible = $state(false);
    let bulgedMonthIndices = $state(new Set());
    let instructionsVisible = $state(true);
    let timelineSectionElement;
    let animatedFadedSide = $state(null);

    // TOOLTIP
    let tooltipVisible = $state(false);
    let tooltipX = $state();
    let tooltipY = $state();
    let tooltipData = $state();

    // EVENTS
    let hoveredEventKey = $state(null);
    let hoveredThemes = $state([]);

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
        tooltipData = [dot, hoveredThemes];
    }

    function handleDotLeave() {
        hoveredEventKey = null;
        hoveredThemes = [];
        tooltipVisible = false;
    }

    function handleDotClick(event) {
        const eventKey = String(event.detail.dot.event ?? '').trim();
        if (!eventKey) return;
        
        if ($addedEvents.includes(eventKey)) {
            // Reassigning the auto-subscribed variable updates the store
            $addedEvents = $addedEvents.filter(ev => ev !== eventKey);
        } else {
            $addedEvents = [...$addedEvents, eventKey];
        }
    }

    // DATA
    const parseMonthYear = d3.timeParse("%B %Y");

    // Computes paths and dots from data
    function makePathsAndDots({ side, data, svgWidth, spacing, startX, bulgeAmount, yScale }) {
        const reverse = side === "ashlee";
        const baseOffset = 10;

        const monthMap = new Map();
        data.forEach(d => {
            if (d.date) {
                const monthStr = d3.timeFormat("%B %Y")(d.date);
                if (!monthMap.has(monthStr)) monthMap.set(monthStr, []);
                monthMap.get(monthStr).push(d);
            }
        });

        // Paths
        const paths = themes.map((theme, i) => {
            const baseX = reverse ? svgWidth - startX - i * spacing : startX + i * spacing;
            const months = d3.timeMonth.range(d3.min(data, d => d.date), d3.timeMonth.offset(d3.max(data, d => d.date), 1));
            
            const bulgedPoints = [];
            const straightPoints = [];

            months.forEach(month => {
                const y = yScale(month);
                const monthStr = d3.timeFormat("%B %Y")(month);
                const monthEvents = monthMap.get(monthStr) || [];

                const hasSelf = monthEvents.some(d => d[`${side}Themes`][theme] === '1');
                const hasOther = monthEvents.some(d => d[`${side === "jan" ? "ashlee" : "jan"}Themes`][theme] === '1');
                const width = svgWidth;
                let xOffset = baseX;
                if (hasSelf && hasOther) xOffset = width / 2;
                else if (hasSelf && side === "jan") xOffset = width / 4 + i * baseOffset;
                else if (hasSelf && side === "ashlee") xOffset = (3 * width) / 4 - i * baseOffset;
                bulgedPoints.push([xOffset, y]);
                straightPoints.push([baseX, y]);
            });
            return { theme, points: bulgedPoints, straightPoints };
        });

        // Rainbow line dots
        const dots = data.flatMap(d => {
            const otherSide = side === "jan" ? "ashlee" : "jan";
            return themes.flatMap((theme, themeIndex) => {
                if (d[`${side}Themes`][theme] !== '1') return [];
                const dotMonthStr = d3.timeFormat("%B %Y")(d.date);
                const monthEvents = monthMap.get(dotMonthStr) || [];

                const hasSelf = monthEvents.some(ev => ev[`${side}Themes`][theme] === '1');
                const hasOther = monthEvents.some(ev => ev[`${otherSide}Themes`][theme] === '1');
                const width = svgWidth; 
                const baseX = reverse ? svgWidth - startX - themeIndex * spacing : startX + themeIndex * spacing;
                let x = baseX;
                if (hasSelf && hasOther) x = width / 2;
                else if (hasSelf && side === "jan") x = width / 4 + themeIndex * baseOffset;
                else if (hasSelf && side === "ashlee") x = (3 * width) / 4 - themeIndex * baseOffset;
                return {
                    id: `${side}-${parseMonthYear(d.date)}-${theme}`, date: d.date, event: String(d[`${side}Themes`].event || '').trim(), eventSecondary: String(d[`${side}Themes`].eventSecondary || '').trim(), theme, x, y: yScale(d.date), baseX, monthStr: d3.timeFormat("%B %Y")(d.date), monthIndex: d3.timeMonth.count(minDate, d.date)
                };
            });
        });
        
        // Black line dots
        const emptyDots = data.filter(d => {
            const self = d[`${side}Themes`];
            const eventStr = Array.isArray(self.event) ? self.event[0] : self.event;
            const hasEvent = eventStr && eventStr !== "START" && eventStr !== "END";
            const allThemesZero = themes.every(theme => self[theme] !== '1');
            return hasEvent && allThemesZero;
        }).map(d => {
            const eventStr = String(d[`${side}Themes`].event || '').trim();
            const baseX = reverse ? svgWidth - blackLineX : blackLineX;
            return {
                id: `${side}-${parseMonthYear(d.date)}-empty-${eventStr}`, date: d.date, event: eventStr, eventSecondary: String(d[`${side}Themes`].eventSecondary || '').trim(), x: baseX, y: yScale(d.date), r: 6, baseX, monthStr: d3.timeFormat("%B %Y")(d.date), monthIndex: d3.timeMonth.count(minDate, d.date)
            };
        });

        return { paths, dots, emptyDots };
    }

    // Processes the data
    function generateTimelineData(janData, ashleeData) {
        if (!janData || !ashleeData) return { jan: { paths: [], dots: [], emptyDots: [] }, ashlee: { paths: [], dots: [], emptyDots: [] } };

        const allData = [];

        janData.forEach(e => {
            if (!e.date) return;
            allData.push({
                date: parseMonthYear(e.date),
                janThemes: (() => {
                    const obj = { event: [e.event], eventSecondary: [e.eventSecondary] };
                    themes.forEach(t => obj[t] = e[t] === "1" ? "1" : "0");
                    return obj;
                })(),
                ashleeThemes: {}
            });
        });

        ashleeData.forEach(e => {
            if (!e.date) return;
            allData.push({
                date: parseMonthYear(e.date),
                janThemes: {},
                ashleeThemes: (() => {
                    const obj = { event: [e.event], eventSecondary: [e.eventSecondary] };
                    themes.forEach(t => obj[t] = e[t] === "1" ? "1" : "0");
                    return obj;
                })()
            });
        });

        return {
            yScale,
            monthlyData: allData,
            jan: makePathsAndDots({ side: "jan", data: allData, svgWidth, spacing, startX, bulgeAmount, yScale }),
            ashlee: makePathsAndDots({ side: "ashlee", data: allData, svgWidth, spacing, startX, bulgeAmount, yScale })
        };
    }

    // Full dataset + axes
    const allDates = janData.concat(ashleeData).map(d => parseMonthYear(d.date));
    const minDate = d3.min(allDates);
    const maxDate = d3.max(allDates);

    const yScale = $derived(d3.scaleTime()
        .domain([minDate, maxDate])
        .range([margins.top, svgHeight - margins.top - margins.bottom]));

    const allTimelineData = $derived(generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX, bulgeAmount));

    let axisData = $derived(allTimelineData.yScale.ticks(d3.timeMonth.every(1)));

    // HELPER FUNCTIONS
    function handleInstructionsClose() {
        instructionsVisible = false;
    }

    // REACTIVE

    // Debounce hover on scroll
    $effect(() => {
        if (yScroll !== lastScrollY) {
            scrolling = true;

            if (scrollTimeout) clearTimeout(scrollTimeout);

            scrollTimeout = setTimeout(() => {
                scrolling = false;
            }, 100);

            lastScrollY = yScroll;
        }
    });

    // Highlight tick based on scroll
    $effect(() => {
        if (!allTimelineData || !axisData) return;

        const viewportCenterY = window.innerHeight / 2;

        const tickPositions = axisData.map((tickValue) => allTimelineData.yScale(tickValue));

        let closestDistance = Infinity;
        let closestIndex = -1;

        tickPositions.forEach((tickY, i) => {
            const distance = Math.abs(tickY - yScroll - viewportCenterY);
            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = i;
            }
        });

        highlightedTickIndex = closestIndex;
        highlightedTickDate = axisData[highlightedTickIndex];
    });

    // Animate line bulge based on highlight tick
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

    // Lock scroll when instructions are visible
    $effect(() => {
        // If instructions are not visible or the element isn't mounted yet, do nothing.
        if (!instructionsVisible || !timelineSectionElement) return;

        // Get the absolute top position of the timeline section
        const boundaryY = timelineSectionElement.offsetTop;

        // Handler for mouse wheel events
        const preventWheelScroll = (event) => {
            // Check the scroll direction from the event itself
            const isScrollingDown = event.deltaY > 0;
            
            // Use window.scrollY for the most up-to-date position
            const isAtOrPastBoundary = window.scrollY >= boundaryY;

            // If at the boundary AND trying to scroll down, prevent it
            if (isAtOrPastBoundary && isScrollingDown) {
                // Snap back to the boundary just in case the user scrolled past slightly
                window.scrollTo({ top: boundaryY, behavior: 'instant' });
                event.preventDefault();
            }
        };

        // Handler for touch events on mobile (your existing code was good)
        let lastTouchY = 0;
        const preventTouchScroll = (event) => {
            const touchY = event.touches[0].clientY;
            const isScrollingDown = touchY < lastTouchY;
            const isAtOrPastBoundary = window.scrollY >= boundaryY;
            
            if (isAtOrPastBoundary && isScrollingDown) {
                event.preventDefault();
            }
            lastTouchY = touchY;
        };

        // Add the listeners
        // { passive: false } is crucial for event.preventDefault() to work reliably
        window.addEventListener('wheel', preventWheelScroll, { passive: false });
        window.addEventListener('touchmove', preventTouchScroll, { passive: false });


        // Cleanup function: THIS IS THE PART THAT RELEASES THE SCROLL LOCK
        // It runs automatically when `instructionsVisible` becomes false.
        return () => {
            window.removeEventListener('wheel', preventWheelScroll);
            window.removeEventListener('touchmove', preventTouchScroll);
        }
    });

    // Instruction fade
    $effect(() => {
        let timeout1, timeout2, timeout3;

        if ($instructionStep === 1) {
            // Start the sequence
            timeout1 = setTimeout(() => {
                animatedFadedSide = 'jan';
                console.log(animatedFadedSide); // Log after the change
            }, 500);

            timeout2 = setTimeout(() => {
                animatedFadedSide = 'ashlee';
                console.log(animatedFadedSide); // Log after the change
            }, 1500);

            timeout3 = setTimeout(() => {
                animatedFadedSide = null;
                console.log(animatedFadedSide); // Log after the change
            }, 2500);
        }

        // Cleanup function
        return () => {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            clearTimeout(timeout3);
            animatedFadedSide = null;
        };
    });

    $effect(() => {
        let targetDate;

        // 1. Check for the instruction step and set the date

        if ($instructionStep === 3) {
            targetDate = parseMonthYear("August 1989");
        } else if ($instructionStep === 4) {
            targetDate = parseMonthYear("September 1990");
        }

        // 2. If a target date was set for the current step, scroll to it
        if (targetDate && yScale) {
            const targetY = yScale(targetDate);
        
            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });
        }
    });
</script>

<svelte:window bind:scrollY={yScroll}></svelte:window>

<section id="timeline" bind:this={timelineSectionElement}>
    <Bands />
    <Instructions {instructionsVisible} on:close={handleInstructionsClose} />
    <Story bind:isOpen={storyVisible} {highlightedTickDate}
        on:close={() => {
            storyVisible = false}} 
        />
    <Tooltip {tooltipVisible} {tooltipX} {tooltipY} {tooltipData} />
    <div class="sticky-header">
        <Key />
        <div class="names">
            <p>Jan</p>
            <p>Ashleé</p>
        </div>
    </div>
    <YourEvents />
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
                        isFaded={animatedFadedSide === side}
                        on:hover={handleDotHover}
                        on:leave={handleDotLeave}
                        on:click={handleDotClick} />
                {/each}
            {/if}
        </svg>
    </figure>
</section>

<style>
    :global(body.no-scroll) {
        overflow: hidden;
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
        width: 120px;
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

    @keyframes pulse-animation {
        0% {
            transform: scale(1);
            opacity: 0.6;
        }
        80% {
            transform: scale(2.5);
            opacity: 0;
        }
        100% {
            transform: scale(1);
            opacity: 0;
        }
    }

    /* Create a class to apply the animation */
    /* :global() is needed to target an element from the script tag */
    :global(.pulse) {
        /* Run the animation infinitely */
        animation: pulse-animation 2s ease-in-out infinite;
    }
</style>