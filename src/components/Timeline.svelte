<script>
    // ------------------- IMPORTS -------------------
    import * as d3 from 'd3';
    import combinedData from "$data/combined.csv";
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
    let innerHeight = 0;
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
    let timelineSectionElement = $state(null);

    // DATA
    let highlightedTickIndex = $state(0);
    // FIX: Initialize highlightedTickDate to null
    let highlightedTickDate = $state(null); 
    // BULGE CHANGE: Now tracks day indices instead of month indices
    let bulgedDayIndices = $state(new Set()); 

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
    let instructionsVisible = $state(false);
    let instructionsDone = $state(false);

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
        // Accessing the dots from allTimelineData (already defined)
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
    function handleInstructionsClose() { 
        instructionsVisible = false; 
        instructionsDone = true;
    }
    // FIX: Using the single, correct format for "Month Day, Year"
    const parseMonthYear = d3.timeParse("%B %d, %Y");
    const bisectDate = d3.bisector(d => d).left;
    function changeActiveSection(view) {
        const newSection = view === "enter" ? "timeline" : null;
        $activeSection = newSection;
    }

    // ------------------- DATA PROCESSING -------------------

    // COMPUTE PATHS AND DOTS (IMPLEMENTS PROJECTED BULGE SWEEP)
    function makePathsAndDots({ side, data, svgWidth, spacing, startX, yScale, minDate, maxDate }) {
        const reverse = side === "ashlee";
        const baseOffset = 10;
        const selfThemeKey = side === "jan" ? "janTheme" : "ashleéTheme";
        const otherThemeKey = side === "jan" ? "ashleéTheme" : "janTheme";
        
        const dailyData = d3.group(data, d => d3.timeFormat("%Y-%m-%d")(d.date));
        
        const days = d3.timeDay.range(d3.timeDay.floor(minDate), d3.timeDay.offset(d3.timeDay.ceil(maxDate), 1));
        const totalDays = days.length;

        // CONFIG: How long (in days) the line should sweep back to the straight position after an event.
        const sweepDurationDays = 120; // 120 days = approx 4 months
        const bulgeVerticalOffset = 10; // Nudge to make the curve visually steeper/taller

        // Paths
        const paths = themes.map((theme, i) => {
            const baseX = reverse ? svgWidth - startX - i * spacing : startX + i * spacing;
            
            const bulgedPoints = [];
            const straightPoints = [];
            const meetsInCenter = [];
            
            // NEW: Array to track the projected X-position for every day index (default to baseX)
            const projectedXPositions = new Array(totalDays).fill(baseX); 
            
            // PASS 1: DETERMINE MAX BULGE AND PROJECT BACKWARDS
            for (let dayIndex = totalDays - 1; dayIndex >= 0; dayIndex--) {
                const dayStr = d3.timeFormat("%Y-%m-%d")(days[dayIndex]);
                const dailyEvents = dailyData.get(dayStr) || []; 

                const hasSelf = dailyEvents.some(d => d[selfThemeKey] === theme);
                const hasOther = dailyEvents.some(d => d[otherThemeKey] === theme);
                
                let targetX = baseX;

                // 1. Calculate the MAX horizontal shift for this specific day
                if (hasSelf && hasOther) {
                    targetX = svgWidth / 2;
                } else if (hasSelf && side === "jan") {
                    targetX = svgWidth / 4 + i * baseOffset;
                } else if (hasSelf && side === "ashlee") {
                    targetX = (3 * svgWidth) / 4 - i * baseOffset;
                }
                
                // 2. If a bulge exists for this day, project it backwards for the sweepDurationDays
                if (targetX !== baseX) {
                    for (let j = 0; j < sweepDurationDays && dayIndex - j >= 0; j++) {
                        const sweepIndex = dayIndex - j;
                        const currentProjectedX = projectedXPositions[sweepIndex];
                        
                        // Use a safety check to ensure we only push the projection wider,
                        // or if the current spot is still on the straight line.
                        const currentDistance = Math.abs(currentProjectedX - (svgWidth / 2));
                        const targetDistance = Math.abs(targetX - (svgWidth / 2));
                        
                        // Logic to ensure the path stays wide, simulating the desired visual sweep
                        if (targetDistance <= currentDistance) {
                             projectedXPositions[sweepIndex] = targetX;
                        }
                    }
                }
            }


            // PASS 2: GENERATE POINTS using the projected X positions
            days.forEach((day, dayIndex) => {
                const originalY = yScale(day);
                
                // Get the calculated X position from the projection map
                const xOffset = projectedXPositions[dayIndex];
                
                // Track meets in center (still based on instantaneous day event, used for meetingEventAnimation)
                const dayStr = d3.timeFormat("%Y-%m-%d")(day);
                const dailyEvents = dailyData.get(dayStr) || []; 
                const hasSelf = dailyEvents.some(d => d[selfThemeKey] === theme);
                const hasOther = dailyEvents.some(d => d[otherThemeKey] === theme);
                meetsInCenter[dayIndex] = hasSelf && hasOther;
                
                let y = originalY;
                
                // TALLER BULGE IMPLEMENTATION: Nudge Y position down if the path is shifted horizontally
                if (xOffset !== baseX) {
                    y = originalY + bulgeVerticalOffset;
                }
                
                bulgedPoints.push([xOffset, y]);
                straightPoints.push([baseX, originalY]); // Straight points must always use the true Y
            });
            
            return { theme, points: bulgedPoints, straightPoints, meetsInCenter };
        });

        // Rainbow line dots
        const dots = data.flatMap(d => {
            const theme = d[selfThemeKey];
            if (!theme) return []; 
            
            const themeIndex = themes.indexOf(theme);
            if (themeIndex === -1) return []; 

            const dotDayStr = d3.timeFormat("%Y-%m-%d")(d.date);

            const hasSelf = theme === d[selfThemeKey];
            const hasOther = theme === d[otherThemeKey];
            const width = svgWidth; 
            const baseX = reverse ? svgWidth - startX - themeIndex * spacing : startX + themeIndex * spacing;
            let x = baseX;
            
            if (hasSelf && hasOther) x = width / 2;
            else if (hasSelf && side === "jan") x = width / 4 + themeIndex * baseOffset;
            else if (hasSelf && side === "ashlee") x = (3 * width) / 4 - themeIndex * baseOffset;
            
            const dotY = yScale(d.date); 
            const dayIndex = d3.timeDay.count(minDate, d.date);

            return {
                id: `${side}-${dotDayStr}-${theme}-${d.event}`, 
                date: d.date, 
                event: String(d.event || '').trim(), 
                theme, 
                x, 
                y: dotY,
                baseX, 
                dayStr: dotDayStr, 
                dayIndex
            };
        });
        
        // Black line dots (for events with NO theme)
        const emptyDots = data.filter(d => {
            const hasEvent = String(d.event || '').trim() !== "START" && String(d.event || '').trim() !== "END";
            const noTheme = !d[selfThemeKey];
            return hasEvent && noTheme;
        }).map(d => {
            const eventStr = String(d.event || '').trim();
            const baseX = reverse ? svgWidth - blackLineX : blackLineX;
            return {
                id: `${side}-${d3.timeFormat("%Y-%m-%d")(d.date)}-empty-${eventStr}`, 
                date: d.date, 
                event: eventStr, 
                x: baseX, 
                y: yScale(d.date), 
                r: 6, 
                baseX, 
                dayStr: d3.timeFormat("%Y-%m-%d")(d.date), 
                dayIndex: d3.timeDay.count(minDate, d.date)
            };
        });

        return { paths, dots, emptyDots, totalDays }; 
    }

    // PROCESS DATA
    function generateTimelineData(combinedData) {
        if (!combinedData || combinedData.length === 0) return { jan: { paths: [], dots: [], emptyDots: [] }, ashlee: { paths: [], dots: [], emptyDots: [] } };

        const parsedData = combinedData
            .map(d => ({
                ...d,
                date: parseMonthYear(d.date)
            }))
            .filter(d => d.date); 

        return {
            yScale,
            monthlyData: parsedData,
            jan: makePathsAndDots({ side: "jan", data: parsedData, svgWidth, spacing, startX, yScale, minDate, maxDate }),
            ashlee: makePathsAndDots({ side: "ashlee", data: parsedData, svgWidth, spacing, startX, yScale, minDate, maxDate })
        };
    }

    // FULL DATA + AXES
    const allDates = combinedData.map(d => parseMonthYear(d.date)).filter(d => d);

    const minDate = d3.min(allDates);
    const maxDate = d3.max(allDates);

    const yScale = $derived(d3.scaleTime()
        .domain([minDate, maxDate])
        .range([margins.top, svgHeight - margins.top - margins.bottom]));

    const allTimelineData = $derived(generateTimelineData(combinedData));

    let axisData = $derived(allTimelineData?.yScale.ticks(d3.timeDay.every(1)) || []);
    
    // ------------------- DATA PROCESSING -------------------

    // DEBOUNCE SCROLL HOVER (No change)
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
            instructionsVisible = true;
        }
    });

    // HIGHLIGHT TICK BY SCROLL (Monthly snap logic)
    $effect(() => {
        if ($activeSection !== 'timeline' || !allTimelineData?.yScale || !axisData || axisData.length === 0) {
            return;
        }

        const viewportCenterY = window.innerHeight / 2;
        
        // Step 1: Find the Date at the exact viewport center
        const centerAbsoluteY = yScroll + viewportCenterY - introHeight;
        const dateAtCenter = allTimelineData.yScale.invert(centerAbsoluteY);

        // Step 2: Snap the center date to the start of the current month
        const newHighlightedDate = d3.timeMonth.floor(dateAtCenter);

        // Step 3: Find the index of this snapped month-start date in the axisData (if needed)
        let closestIndex = -1;
        if (newHighlightedDate.getTime() !== highlightedTickDate?.getTime()) {
            closestIndex = axisData.findIndex(d => d.getTime() === newHighlightedDate.getTime());
        }

        if (
            newHighlightedDate &&
            (
                !highlightedTickDate ||
                newHighlightedDate.getTime() !== highlightedTickDate.getTime()
            )
        ) {
            highlightedTickDate = newHighlightedDate;
            if (closestIndex !== -1) {
                highlightedTickIndex = closestIndex;
            }
        }
    });

    // TIMELINE: LINE/DOTS BULGE + COLLIDE (21-Day Window centered on Month-Start)
    $effect(() => {
        if (!highlightedTickDate || !minDate || !allTimelineData.jan?.paths) return;

        // --- 1. Define the Bulge Window based on the new Month-Hit logic ---
        const bulgeDaysBefore = 10;
        const bulgeDaysAfter = 10; 

        const windowStartDate = d3.timeDay.offset(highlightedTickDate, -bulgeDaysBefore);
        const windowEndDate = d3.timeDay.offset(highlightedTickDate, bulgeDaysAfter + 1);

        const startIndex = d3.timeDay.count(d3.timeDay.floor(minDate), windowStartDate);
        
        let needsUpdate = false;
        const newIndices = new Set();
        const justAddedIndices = [];

        // --- 2. Populate the new set with indices in the 21-day window ---
        const totalDays = allTimelineData.jan.totalDays; 
        
        for (let i = 0; i <= bulgeDaysBefore + bulgeDaysAfter; i++) {
            const currentIndex = startIndex + i;
            
            if (currentIndex >= 0 && currentIndex < totalDays) {
                newIndices.add(currentIndex);
                if (!bulgedDayIndices.has(currentIndex)) {
                    justAddedIndices.push(currentIndex);
                }
            }
        }

        if (newIndices.size !== bulgedDayIndices.size || justAddedIndices.length > 0) {
            bulgedDayIndices = newIndices;
            needsUpdate = true;
        }

        // --- 3. If a "meet" is detected in the new window, trigger all animations ---
        if (needsUpdate && justAddedIndices.length > 0) {
            let meetingEvent = null;
            
            for (const pathData of allTimelineData.jan.paths) {
                for (const dayIndex of justAddedIndices) {
                    if (pathData.meetsInCenter[dayIndex]) { 
                        meetingEvent = { dayIndex, theme: pathData.theme };
                        break;
                    }
                }
                if (meetingEvent) break;
            }

            if (meetingEvent) {
                const bulgeAnimationDuration = 300;
                const totalAnimationTime = 3000;

                setTimeout(() => {
                    // --- 1. Calculate all necessary data for the animations ---
                    const dotId = `${meetingEvent.dayIndex}-${meetingEvent.theme}`;
                    const targetDate = d3.timeDay.offset(d3.timeDay.floor(minDate), meetingEvent.dayIndex); 
                    const yPosInSVG = yScale(targetDate);
                    const themeIndex = themes.indexOf(meetingEvent.theme);
                    const themeColor = colors[themeIndex];
                    
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

        return () => {
            document.body.classList.remove('no-scroll');
        };
    });

    // INSTRUCTION: LOCK (No change)
    $effect(() => {
        if ($activeSection !== 'timeline' || !instructionsVisible || storyVisible || !timelineSectionElement || instructionsDone) {
            return;
        }

        const boundaryY = timelineSectionElement.offsetTop;

        const preventWheelScroll = (event) => {
            const isScrollingDown = event.deltaY > 0;
            const isAtOrPastBoundary = window.scrollY >= boundaryY;

            if (isAtOrPastBoundary && isScrollingDown) {
                window.scrollTo({ top: boundaryY, behavior: 'instant' });
                event.preventDefault();
            }
        };

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

        window.addEventListener('wheel', preventWheelScroll, { passive: false });
        window.addEventListener('touchmove', preventTouchScroll, { passive: false });


        return () => {
            window.removeEventListener('wheel', preventWheelScroll);
            window.removeEventListener('touchmove', preventTouchScroll);
        }
    });

    // INSTRUCTION: SIDE FADE (No change)
    $effect(() => {
        let timeout1, timeout2, timeout3;

        if ($instructionStep === 1) {
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

        return () => {
            clearTimeout(timeout1);
            clearTimeout(timeout2);
            clearTimeout(timeout3);
            animatedFadedSide = null;
        };
    });

    // INSTRUCTION: DATE SCROLL (No change)
    $effect(() => {
        let targetDate;

        if ($instructionStep === 3) {
            // Updated instruction dates to match the new parser
            targetDate = parseMonthYear("August 1, 1989"); 
        } else if ($instructionStep === 4) {
            // Updated instruction dates to match the new parser
            targetDate = parseMonthYear("September 1, 1990"); 
        }

        if (targetDate && yScale && timelineSectionElement) {
            const targetY = yScale(targetDate);
            const timelineOffset = timelineSectionElement.offsetTop;
            const absolutePosition = timelineOffset + targetY;
            const finalScrollPosition = absolutePosition - (window.innerHeight / 1.5);
        
            window.scrollTo({
                top: finalScrollPosition,
                behavior: 'smooth'
            });
        }
    });
</script>

<svelte:window bind:innerHeight={innerHeight} bind:scrollY={yScroll}></svelte:window>

<section id="timeline" 
    bind:this={timelineSectionElement}
    use:inView={{ top: 0, bottom: innerHeight - 1 }} 
    onenter={() => {
        changeActiveSection("enter")
        instructionsVisible = true;
        }}
    onexit={() => {
        changeActiveSection("exit");
        instructionsVisible = false;
    }}
>
    {#if $activeSection === 'timeline'}
        <div in:fade={{ duration: 500, delay: 1000 }}>
            <Bands />
        </div>
    {/if}
    <Instructions {instructionsVisible} {instructionsDone} on:close={handleInstructionsClose} />
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
        <Nav {yScale} {axisData} {instructionsVisible} {timelineSectionElement} />
    </div>
    <YourEvents />
    <figure bind:this={figureElement} style="height: {svgHeight}px;">
        <Axis {margins} {svgHeight} {allTimelineData} {axisData} />
        <div class="svg-wrapper">
            <svg width={svgWidth} height={60000} bind:clientHeight={svgHeight} bind:clientWidth={svgWidth}>
                {#if svgHeight > 0}
                    {#if meetingEventAnimation.active}
                        <g style="mix-blend-mode: screen;">
                            {#each colors as color, i}
                                <circle
                                    class="shockwave"
                                    cx={svgWidth / 2}
                                    cy={meetingEventAnimation.y}
                                    stroke={color}
                                    r="0"
                                    style="animation-delay: {i * 50}ms;"
                                />
                            {/each}
                        </g>
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
                            bulgedDayIndices={bulgedDayIndices}
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
        0% {
            transform: scale(1);
            opacity: 1; /* Start fully visible */
        }
        100% {
            transform: scale(2.5); /* Grow */
            opacity: 0; /* Fade out */
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
            r: 100px;
            opacity: 0;
            stroke-width: 0px;
        }
    }

    .shockwave {
        fill: none;
        stroke-width: 4px; /* Set initial stroke-width */
        opacity: 0.8; /* Set initial opacity */
        animation: shockwave-animation 1s ease-out forwards;
        animation-iteration-count: 3;
        pointer-events: none;
    }
</style>