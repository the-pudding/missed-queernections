<script>
    // ------------------- IMPORTS -------------------
    import * as d3 from 'd3';
    import janData from "$data/jan.csv";
    import ashleeData from "$data/ashlee.csv";
    import inView from "$actions/inView.js";
    import { fade, fly } from 'svelte/transition';
    import { themes, colors, normalizeEventKey, addedEvents, instructionStep, activeSection  } from "$runes/misc.svelte.js";

    // ------------------- COMPONENTS -------------------
    import Nav from "$components/Timeline.Nav.svelte";
    import Story from "$components/Story.svelte";
    import Bands from "$components/Timeline.Bands.svelte";
    import Axis from "$components/Timeline.Axis.svelte";
    import Side from "$components/Timeline.Side.svelte";
    import Tooltip from "$components/Timeline.Tooltip.svelte";
    import Instructions from "$components/Timeline.Instructions.svelte";
    import YourEvents from "$components/YourEvents.svelte";

    let { introHeight } = $props();

    // ------------------- DIMENSIONS -------------------
    let svgHeight = $state(0);
    let svgWidth = $state(0);
    const margins = {top: 0, right: 12, bottom: 0, left: 12}
    const spacing = 8;
    const startX = 50;
    const blackLineX = 30;

    // ------------------- SCROLL -------------------
    let yScroll = $state(0);
    let lastScrollY = 0;
    let scrollTimeout = null;
    let scrolling = $state(false);
    let timelineOffset = $state(0);

    // ------------------- DOM -------------------
    let figureElement;
    let timelineSectionElement;

    // DATA
    let highlightedTickIndex = $state(0);
    let highlightedTickDate = $state(0);
    let bulgedMonthIndices = $state(new Set());

    // ANIMATIONS
    let animatedFadedSide = $state(null);
    let storyBubbleOrigin = $state({ x: '50%', y: '50%' });
    let meetingEventAnimation = $state({
        y: null,
        color: null,
        dotId: null,
        active: false
    });

    // VISIBILITY
    let storyVisible = $state(false);
    let instructionsVisible = $state(true);

    // TOOLTIP
    let tooltipVisible = $state(false);
    let tooltipX = $state();
    let tooltipY = $state();
    let tooltipData = $state();

    // ------------------- EVENTS -------------------
    let hoveredEventKey = $state(null);
    let hoveredThemes = $state([]);

    // DOT ENTER
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

    // DOT EXIT
    function handleDotLeave() {
        hoveredEventKey = null;
        hoveredThemes = [];
        tooltipVisible = false;
    }

    // DOT CLICK
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

    // ------------------- HELPER FUNCTIONS -------------------
    function handleInstructionsClose() { instructionsVisible = false; }
    const parseMonthYear = d3.timeParse("%B %Y");
    const bisectDate = d3.bisector(d => d).left;
    function changeActiveSection(view) {
        const newSection = view === "enter" ? "timeline" : null;
        $activeSection = newSection;
    }

    // ------------------- DATA PROCESSING -------------------
    
    // COMPUTE PATHS AND DOTS
    function makePathsAndDots({ side, data, svgWidth, spacing, startX, yScale }) {
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
            const meetsInCenter = [];

            months.forEach((month, monthIndex) => {
                const y = yScale(month);
                const monthStr = d3.timeFormat("%B %Y")(month);
                const monthEvents = monthMap.get(monthStr) || [];

                const hasSelf = monthEvents.some(d => d[`${side}Themes`][theme] === '1');
                const hasOther = monthEvents.some(d => d[`${side === "jan" ? "ashlee" : "jan"}Themes`][theme] === '1');

                meetsInCenter[monthIndex] = hasSelf && hasOther;

                const width = svgWidth;
                let xOffset = baseX;
                if (hasSelf && hasOther) xOffset = width / 2;
                else if (hasSelf && side === "jan") xOffset = width / 4 + i * baseOffset;
                else if (hasSelf && side === "ashlee") xOffset = (3 * width) / 4 - i * baseOffset;
                bulgedPoints.push([xOffset, y]);
                straightPoints.push([baseX, y]);
            });
            return { theme, points: bulgedPoints, straightPoints, meetsInCenter };
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

    // PROCESS DATA
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
            jan: makePathsAndDots({ side: "jan", data: allData, svgWidth, spacing, startX, yScale }),
            ashlee: makePathsAndDots({ side: "ashlee", data: allData, svgWidth, spacing, startX, yScale })
        };
    }

    // FULL DATA + AXES
    const allDates = janData.concat(ashleeData).map(d => parseMonthYear(d.date));
    const minDate = d3.min(allDates);
    const maxDate = d3.max(allDates);

    const yScale = $derived(d3.scaleTime()
        .domain([minDate, maxDate])
        .range([margins.top, svgHeight - margins.top - margins.bottom]));

    const allTimelineData = $derived(generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX));

    let axisData = $derived(allTimelineData?.yScale.ticks(d3.timeMonth.every(1)) || []);
    
    // ------------------- DATA PROCESSING -------------------

    // DEBOUNCE SCROLL HOVER
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

    $effect(() => {
        if ($activeSection === 'timeline' && timelineSectionElement) {
            timelineOffset = timelineSectionElement.offsetTop;
        }
    });

    // HIGHLIGHT TICK BY SCROLL
    $effect(() => {
    // This effect runs on every scroll
    if ($activeSection !== 'timeline' || !allTimelineData?.yScale || !axisData || axisData.length === 0) {
        return;
    }

    const viewportCenterY = window.innerHeight / 2;
    const tickPositions = axisData.map((tickValue) => allTimelineData.yScale(tickValue));

    let closestDistance = Infinity;
    let closestIndex = -1;

    tickPositions.forEach((tickY, i) => {
        // 👇 This is the fast and accurate calculation
        const distance = Math.abs((introHeight + tickY) - (yScroll + viewportCenterY));

        if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
        }
    });
    
    if (closestIndex !== -1) {
        highlightedTickIndex = closestIndex;
        highlightedTickDate = axisData[closestIndex];
    }
});

    // TIMELINE: LINE/DOTS BULGE + COLLIDE
    $effect(() => {
        if (!highlightedTickDate || !minDate || !allTimelineData.jan?.paths) return;

        // --- Logic to find which new months to bulge ---
        const windowStartDate = d3.timeMonth.offset(highlightedTickDate, -2);
        const startIndex = d3.timeMonth.count(minDate, windowStartDate);
        
        let needsUpdate = false;
        const newIndices = new Set(bulgedMonthIndices);
        const justAddedIndices = [];

        for (let i = 0; i < 3; i++) {
            const currentIndex = startIndex + i;
            if (currentIndex >= 0 && !newIndices.has(currentIndex)) {
                newIndices.add(currentIndex);
                justAddedIndices.push(currentIndex);
                needsUpdate = true;
            }
        }

        // --- If a new bulge is happening, check for a "meet" event ---
        if (needsUpdate) {
            bulgedMonthIndices = newIndices;

            let meetingEvent = null;
            for (const pathData of allTimelineData.jan.paths) {
                for (const monthIndex of justAddedIndices) {
                    if (pathData.meetsInCenter[monthIndex]) {
                        meetingEvent = { monthIndex, theme: pathData.theme };
                        break;
                    }
                }
                if (meetingEvent) break;
            }

            // 👇 If a "meet" is detected, trigger all animations
            if (meetingEvent) {
        const bulgeAnimationDuration = 300;
        const totalAnimationTime = 3000;

        setTimeout(() => {
            // --- 1. Calculate all necessary data for the animations ---
            const dotId = `${meetingEvent.monthIndex}-${meetingEvent.theme}`;
            const targetDate = d3.timeMonth.offset(minDate, meetingEvent.monthIndex);
            const yPosInSVG = yScale(targetDate);
            const themeIndex = themes.indexOf(meetingEvent.theme);
            const themeColor = colors[themeIndex];
            
            // 👇 THIS IS THE FIX: Get the position *right before* you use it
            const figureRect = figureElement.getBoundingClientRect();
            const originX = figureRect.left + (svgWidth / 2);
            const originY = figureRect.top + yPosInSVG;
            
            // --- 2. Activate all animations by setting state ---
            meetingEventAnimation = {
                y: yPosInSVG,
                color: themeColor,
                dotId: dotId,
                active: true
            };
            
            storyBubbleOrigin = { x: `${originX}px`, y: `${originY}px` };
            highlightedTickDate = targetDate;

        }, bulgeAnimationDuration);

        // --- 3. Schedule the cleanup (this part remains the same) ---
        setTimeout(() => {
            meetingEventAnimation = { y: null, color: null, dotId: null, active: false };
        }, bulgeAnimationDuration + totalAnimationTime);
    }
        }
    });

    // STORY: VISIBILITY
    $effect(() => {
        if (storyVisible) {
            document.body.classList.add('no-scroll');
        } else {
            document.body.classList.remove('no-scroll');
        }

        // Cleanup function to ensure the class is removed if the component unmounts
        return () => {
            document.body.classList.remove('no-scroll');
        };
    });

    // INSTRUCTION: LOCK
    $effect(() => {
        if ($activeSection !== 'timeline' || !instructionsVisible || storyVisible || !timelineSectionElement) {
            return; // Do nothing if the timeline is not in view
        }

        const boundaryY = timelineSectionElement.offsetTop;

        // Scroll
        const preventWheelScroll = (event) => {
            const isScrollingDown = event.deltaY > 0;
            
            const isAtOrPastBoundary = window.scrollY >= boundaryY;

            if (isAtOrPastBoundary && isScrollingDown) {
                window.scrollTo({ top: boundaryY, behavior: 'instant' });
                event.preventDefault();
            }
        };

        // Touch
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

        // Listeners
        window.addEventListener('wheel', preventWheelScroll, { passive: false });
        window.addEventListener('touchmove', preventTouchScroll, { passive: false });


        // Cleanup 
        return () => {
            window.removeEventListener('wheel', preventWheelScroll);
            window.removeEventListener('touchmove', preventTouchScroll);
        }
    });

    // INSTRUCTION: SIDE FADE
    $effect(() => {
        let timeout1, timeout2, timeout3;

        if ($instructionStep === 1) {
            // Start the sequence
            timeout1 = setTimeout(() => {
                animatedFadedSide = 'jan';
            }, 500);

            timeout2 = setTimeout(() => {
                animatedFadedSide = 'ashlee';
            }, 1500);

            timeout3 = setTimeout(() => {
                animatedFadedSide = null;
            }, 2500);
        }

        // Cleanup
        return () => {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            clearTimeout(timeout3);
            animatedFadedSide = null;
        };
    });

    // INSTRUCTION: DATE SCROLL
    $effect(() => {
        let targetDate;

        if ($instructionStep === 3) {
            targetDate = parseMonthYear("August 1989");
        } else if ($instructionStep === 4) {
            targetDate = parseMonthYear("September 1990");
        }

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

<section id="timeline" 
    bind:this={timelineSectionElement}
    use:inView={{ top: 0 }} 
 	onenter={() => changeActiveSection("enter")}
    onexit={() => changeActiveSection("exit")}
>
    {#if $activeSection === 'timeline'}
        <div in:fade={{ duration: 500, delay: 1000 }}>
            <Bands />
        </div>
    {/if}
    <Instructions {instructionsVisible} on:close={handleInstructionsClose} />
    <Story 
        isOpen={storyVisible} 
        updateIsOpen={(newValue) => storyVisible = newValue}
        {highlightedTickDate} 
        origin={storyBubbleOrigin} 
        on:close={() => {
            storyVisible = false
        }} 
    />
    <Tooltip {tooltipVisible} {tooltipX} {tooltipY} {tooltipData} />
    <div class="sticky-header">
        <Nav {yScale} {axisData} {instructionsVisible} />
    </div>
    <YourEvents />
    <figure bind:this={figureElement} style="height: {svgHeight}px;">
        <Axis {margins} {svgHeight} {allTimelineData} {axisData} />
        <div class="svg-wrapper">
            <svg width={svgWidth} height={60000} bind:clientHeight={svgHeight} bind:clientWidth={svgWidth}>
                {#if svgHeight > 0}
                    {#if meetingEventAnimation.active}
                        <circle
                            class="shockwave"
                            cx={svgWidth / 2}
                            cy={meetingEventAnimation.y}
                            stroke={meetingEventAnimation.color}
                            r="0"
                        />
                    {/if}

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
                            {blackLineX}
                            pulsingDotId={meetingEventAnimation.dotId}
                            isFaded={animatedFadedSide === side}
                            on:hover={handleDotHover}
                            on:leave={handleDotLeave} 
                            on:click={handleDotClick} />
                    {/each}
                {/if}
            </svg>
        </div>
    </figure>
</section>

<style>
    /* GLOBAL BODY */
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
        top: 0;
        left: 0;
        height: 1.75rem;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        z-index: 900;
    }

    figure {
        width: 100%;
        position: relative;
    }

    .svg-wrapper {
        position: relative;
        z-index: 2;
    }

    svg {
        width: 100%;
        height: auto;
    }

    /* ANIMATIONS */
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

    :global(.pulse) {
        animation: pulse-animation 2s ease-in-out infinite;
    }

    @keyframes pulse-color {
        from {
            transform: scale(1);
        }
        to {
            transform: scale(2.5);
        }
    }

    :global(.pulseColor) {
        animation: pulse-color 1s ease-out forwards;
        animation-iteration-count: 3;
    }

    @keyframes shockwave-animation {
        from {
            r: 0;
            opacity: 0.8;
            stroke-width: 4px;
        }
        to {
            r: 300px;
            opacity: 0;
            stroke-width: 0px;
        }
    }

    .shockwave {
        fill: none;
        animation: shockwave-animation 1s ease-out forwards;
        animation-iteration-count: 3;
    }
</style>