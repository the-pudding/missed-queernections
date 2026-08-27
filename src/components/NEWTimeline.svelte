<script>
    // ─── IMPORTS ──────────────────────────────────────────────────────────────
    import { base } from "$app/paths";
    import * as d3 from "d3";
    import combinedData from "$data/combined.csv";
    import copy from "$data/copy.json";
    import {
        themes,
        colors,
        activeSection,
        instructionsVisible,
        isAudioMuted,
        audioUnlocked
    } from "$runes/misc.svelte.js";
    import Path from "$components/NEWTimeline.Side.Path.svelte";
    import Circle from "$components/NEWTimeline.Side.Circle.svelte";
    import Tooltip from "$components/NEWTimeline.Side.Tooltip.svelte";
    import Blowout from "$components/NEWTimeline.Side.Blowout.svelte";
    import YourEvents from "$components/YourEvents.svelte";
    import inView from "$actions/inView.js";
    import Nav from "$components/NEWTimeline.Nav.svelte";
    import Instructions from "$components/NEWTimeline.Instructions.svelte";
    import Scrolly from "$components/helpers/Scrolly.svelte";

    // ─── SECTION STATE ───────────────────────────────────────────────────────
    function changeActiveSection(view) {
        const newSection = view === "enter" ? "timeline" : null;
        $activeSection = newSection;
    }

    // ─── SVG + SCROLL STATE ───────────────────────────────────────────────────
    let svgHeight = $state(60000); // Tall canvas
    let svgWidth = $state(0);
    let scrollY = $state(0);
    let windowHeight = $state(0);
    let maxScroll = $state(0);
    let pathStrokeWidth = $derived(svgWidth < 460 ? 4 : 6);

    const timelineScroll = $derived(scrollY);

    // ─── DATE SCALE ───────────────────────────────────────────────────────────
    const allDates = combinedData
        .map((d) => new Date(d.longDate || d.date))
        .filter(Boolean);
    const [minDate, maxDate] = d3.extent(allDates);

    const yScale = d3
        .scaleTime()
        .domain([minDate, maxDate])
        .range([-100, svgHeight]);

    const yearTicks = d3.timeYear.range(minDate, d3.timeYear.offset(maxDate, 1));

    const isAtEnd = $derived(
        windowHeight > 0 && timelineScroll + windowHeight >= svgHeight - 1000
    );

    // ─── BLOWOUT STATE ────────────────────────────────────────────────────────
    let activeBlowoutId = $state(null);
    let blowoutData = $state(null);
    let blowoutColor = $state(null);
    let blowoutOriginX = $state("50%");
    let blowoutOriginY = $state("50%");
    let currentPickIndex = $state(-1);

    let svgEl = $state(null);
    let timelineSectionElement = $state(null);

    // Look up live rendered coordinates for any event name
    function getCircleCoords(eventKey) {
        if (!renderedData) return null;
        for (const side of renderedData) {
            for (const theme of side.themesData) {
                const found = theme.circles.find((c) => c.event === eventKey);
                if (found) return { cx: found.cx, cy: found.cy, activationKey: found.activationKey };
            }
        }
        return null;
    }

    // Calculates pixel-exact viewport screen coordinates for any circle or pick event
    function getCircleOrigin(circleOrPick) {
        if (!svgEl) return { x: "50%", y: "50%" };

        let cx = circleOrPick.cx;
        let cy = circleOrPick.cy;

        if (cx === undefined || cy === undefined) {
            const coords = getCircleCoords(circleOrPick.event);
            if (coords) {
                cx = coords.cx;
                cy = coords.cy;
            } else {
                cx = svgWidth / 2;
                cy = circleOrPick.cy;
            }
        }

        const rect = svgEl.getBoundingClientRect();
        return {
            x: `${rect.left + cx}px`,
            y: `${rect.top + cy}px`
        };
    }

    function handlePickClick(circle, themeColor) {
        activeBlowoutId = circle.event + circle.cy;
        blowoutData = { ...circle, color: themeColor };
        blowoutColor = themeColor;
        currentPickIndex = allPickEvents.findIndex((p) => p.event === circle.event);

        if (circle.activationKey != null && !activeSegmentKeys.has(circle.activationKey)) {
            const next = new Set(activeSegmentKeys);
            next.add(circle.activationKey);
            activeSegmentKeys = next;
        }

        document.body.style.overflow = "hidden";

        const origin = getCircleOrigin(circle);
        blowoutOriginX = origin.x;
        blowoutOriginY = origin.y;
    }

    function scrollToYear(yearStr) {
        const yearDate = new Date(parseInt(yearStr), 0, 1);
        const yPixel = yScale(yearDate);
        if (yPixel > maxScroll) maxScroll = yPixel;
        const targetScrollY = Math.max(0, yPixel - windowHeight / 2);
        window.scrollTo({ top: targetScrollY, behavior: "smooth" });
    }

    function closeBlowout() {
        activeBlowoutId = null;
        blowoutData = null;
        currentPickIndex = -1;
        document.body.style.overflow = "auto";
    }

    function navigateToIndex(index) {
        if (
            index < 0 ||
            index >= allPickEvents.length ||
            index === currentPickIndex
        )
            return;

        currentPickIndex = index;
        const pick = allPickEvents[index];
        blowoutData = { ...pick };
        blowoutColor = pick.color;
        activeBlowoutId = pick.event + pick.cy;

        if (pick.activationKey != null) {
            const next = new Set(activeSegmentKeys);
            next.add(pick.activationKey);
            activeSegmentKeys = next;
        }

        if (pick.cy > maxScroll) maxScroll = pick.cy;

        const svgRect = svgEl?.getBoundingClientRect();
        const svgPageTop = (svgRect?.top || 0) + window.scrollY;
        const circlePageY = svgPageTop + pick.cy;
        const targetScrollY = Math.max(0, circlePageY - windowHeight / 2);

        document.body.style.overflow = "auto";
        window.scrollTo({ top: targetScrollY });
        document.body.style.overflow = "hidden";

        const origin = getCircleOrigin(pick);
        blowoutOriginX = origin.x;
        blowoutOriginY = origin.y;
    }

    function navigateBlowout(direction) {
        navigateToIndex(currentPickIndex + direction);
    }

    // ─── HOVER STATE ──────────────────────────────────────────────────────────
    let hoveredId = $state(null);
    let hoveredEventName = $state(null);

    let activeHoverThemes = $derived.by(() => {
        if (!hoveredEventName) return [];
        const associatedThemes = new Set();
        renderedData.forEach((side) => {
            side.themesData.forEach((theme) => {
                if (theme.circles.some((c) => c.event === hoveredEventName)) {
                    associatedThemes.add(theme.themeName);
                }
            });
        });
        return Array.from(associatedThemes);
    });

    // ─── DATA PROCESSING ──────────────────────────────────────────────────────
    const processData = (rawData) => {
        const formattedData = rawData
            .map((d) => ({ ...d, parsedDate: new Date(d.longDate || d.date) }))
            .filter((d) => !isNaN(d.parsedDate));

        const dateRange = d3.timeDay.range(minDate, d3.timeDay.offset(maxDate, 1));

        const sides = [
            { key: "ashleé", themeCol: "ashleéTheme" },
            { key: "jan", themeCol: "janTheme" }
        ];

        const sidesData = sides.map((side) => {
            const groupedByTheme = d3.group(formattedData, (d) => {
                const val = d[side.themeCol];
                return val && val.trim() !== "" ? val.trim() : "none";
            });

            return {
                side: side.key,
                themesData: themes.map((themeName) => {
                    const realEvents = groupedByTheme.get(themeName) || [];
                    const eventMap = d3.group(realEvents, (d) =>
                        d3.timeFormat("%B %-d, %Y")(d.parsedDate)
                    );

                    const realEventIndices = [];
                    const dailyEvents = dateRange.map((date, i) => {
                        const dateString = d3.timeFormat("%B %-d, %Y")(date);
                        const existing = eventMap.get(dateString);
                        const isCenterMatch =
                            existing &&
                            existing[0].janTheme === existing[0].ashleéTheme &&
                            String(existing[0].match) === "1";
                        
                        const rawPick = existing ? String(existing[0].pick ?? "").trim() : "";
                        const isPick = ["Y", "J", "A"].includes(rawPick);
                        const pickLetter = isPick ? rawPick : null;

                        if (isCenterMatch)
                            realEventIndices.push({
                                index: i,
                                type: "center",
                                parsedDate: date
                            });
                        else if (existing)
                            realEventIndices.push({
                                index: i,
                                type: "lane",
                                parsedDate: date
                            });

                        return existing
                            ? {
                                    ...existing[0],
                                    isPlaceholder: false,
                                    parsedDate: date,
                                    isCenterMatch,
                                    isPick,
                                    pickLetter,
                                    audio: existing[0].audio
                                }
                            : { parsedDate: date, isPlaceholder: true };
                    });

                    const WINDOW = 45;
                    const BRIDGE = 100;

                    dailyEvents.forEach((day, i) => {
                        let finalPull = 0;
                        let triggerDate = day.parsedDate;

                        const prevEvent = [...realEventIndices]
                            .reverse()
                            .find((e) => e.index <= i);
                        const nextEvent = realEventIndices.find((e) => e.index > i);
                        const prevDepth = prevEvent
                            ? prevEvent.type === "center"
                                ? 1.0
                                : 0.5
                            : 0;
                        const nextDepth = nextEvent
                            ? nextEvent.type === "center"
                                ? 1.0
                                : 0.5
                            : 0;

                        if (prevEvent?.index === i) {
                            finalPull = prevDepth;
                            triggerDate = prevEvent.parsedDate;
                        } else if (
                            prevEvent &&
                            nextEvent &&
                            nextEvent.index - prevEvent.index < BRIDGE
                        ) {
                            const t =
                                (i - prevEvent.index) / (nextEvent.index - prevEvent.index);
                            finalPull =
                                prevDepth +
                                (nextDepth - prevDepth) * ((1 - Math.cos(t * Math.PI)) / 2);
                            triggerDate = prevEvent.parsedDate;
                        } else {
                            let rampPull = 0;
                            if (prevEvent && i - prevEvent.index <= WINDOW) {
                                const t = (i - prevEvent.index) / (WINDOW + 1);
                                rampPull = prevDepth * ((1 + Math.cos(Math.PI * t)) / 2);
                                triggerDate = prevEvent.parsedDate;
                            }
                            if (nextEvent && nextEvent.index - i <= WINDOW) {
                                const t = (nextEvent.index - i) / (WINDOW + 1);
                                const incomingPull =
                                    nextDepth * ((1 + Math.cos(Math.PI * t)) / 2);
                                if (incomingPull > rampPull) {
                                    rampPull = incomingPull;
                                    triggerDate = nextEvent.parsedDate;
                                }
                            }
                            finalPull = rampPull;
                        }

                        day.combinedPull = finalPull;
                        day.triggerY = yScale(triggerDate);
                    });

                    let runStartKey = null;
                    for (const day of dailyEvents) {
                        if (day.combinedPull > 0) {
                            if (runStartKey === null) runStartKey = yScale(day.parsedDate);
                            day.segmentKey = runStartKey;
                        } else {
                            runStartKey = null;
                            day.segmentKey = null;
                        }
                    }

                    const pathPoints = dailyEvents.filter((d, i, arr) => {
                        if (i === 0 || i === arr.length - 1) return true;
                        if (!d.isPlaceholder) return true;
                        return (
                            d.combinedPull !== arr[i - 1].combinedPull ||
                            d.triggerY !== arr[i - 1].triggerY ||
                            i % 10 === 0
                        );
                    });

                    const circlePoints = dailyEvents.filter((d) => !d.isPlaceholder);

                    return { themeName, pathPoints, circlePoints };
                })
            };
        });

        // ─── SYNCHRONIZE SEGMENT KEYS FOR CENTER MATCHES ───────────────────
        themes.forEach((_, themeIdx) => {
            const janTheme = sidesData[0].themesData[themeIdx];
            const ashleeTheme = sidesData[1].themesData[themeIdx];

            janTheme.circlePoints.forEach((janCircle) => {
                if (janCircle.isCenterMatch && janCircle.segmentKey != null) {
                    const janKey = janCircle.segmentKey;
                    const ashleeCircle = ashleeTheme.circlePoints.find(
                        (c) => c.parsedDate.getTime() === janCircle.parsedDate.getTime()
                    );
                    if (ashleeCircle && ashleeCircle.segmentKey != null) {
                        const ashleeKey = ashleeCircle.segmentKey;
                        const unifiedKey = Math.min(janKey, ashleeKey);

                        [janTheme, ashleeTheme].forEach((sideTheme) => {
                            sideTheme.pathPoints.forEach((p) => {
                                if (p.segmentKey === janKey || p.segmentKey === ashleeKey) {
                                    p.segmentKey = unifiedKey;
                                }
                            });
                            sideTheme.circlePoints.forEach((c) => {
                                if (c.segmentKey === janKey || c.segmentKey === ashleeKey) {
                                    c.segmentKey = unifiedKey;
                                }
                            });
                        });
                    }
                }
            });
        });

        return sidesData;
    };

    const baseData = processData(combinedData);

    // ─── AUDIO ENGINE & CROSSFADER ────────────────────────────────────────────
    let activeAudio = null;
    let activeFadeOuts = [];
    const currentlyActiveAudioKeys = new Set();

    function playWithCrossfade(src, circleId, fadeDuration = 350) {
        const clamp = (val) => Math.max(0, Math.min(1, val));

        if (activeAudio) {
            const oldAudio = activeAudio;
            activeFadeOuts.push(oldAudio);
            const startVol = clamp(oldAudio.volume);
            const startTime = performance.now();

            function fadeOut(now) {
                const elapsed = now - startTime;
                const progress = elapsed / fadeDuration;
                oldAudio.volume = clamp(startVol * (1 - progress));

                if (progress < 1) {
                    requestAnimationFrame(fadeOut);
                } else {
                    oldAudio.pause();
                    oldAudio.currentTime = 0;
                    activeFadeOuts = activeFadeOuts.filter((a) => a !== oldAudio);
                }
            }
            requestAnimationFrame(fadeOut);
        }

        const newAudio = new Audio(src);
        newAudio.volume = 0;
        activeAudio = newAudio;

        newAudio.addEventListener("ended", () => {
            if (currentPlayingAudioCircleId === circleId) {
                currentPlayingAudioCircleId = null;
            }
        });

        newAudio
            .play()
            .then(() => {
                const startTime = performance.now();
                function fadeIn(now) {
                    const elapsed = now - startTime;
                    const progress = elapsed / fadeDuration;
                    newAudio.volume = clamp(progress);

                    if (progress < 1 && activeAudio === newAudio) {
                        requestAnimationFrame(fadeIn);
                    }
                }
                requestAnimationFrame(fadeIn);
            })
            .catch((err) => {
                console.warn("Audio playback blocked or failed:", err);
            });
    }

    const audioMatches = (() => {
        const list = [];
        const seen = new Set();
        for (const sideData of baseData) {
            for (const theme of sideData.themesData) {
                for (const d of theme.circlePoints) {
                    if (
                        d.isCenterMatch &&
                        d.audio &&
                        !seen.has(d.audio + d.parsedDate.getTime())
                    ) {
                        seen.add(d.audio + d.parsedDate.getTime());
                        list.push({
                            audio: d.audio,
                            segmentKey: d.segmentKey ?? yScale(d.parsedDate),
                            circleId: d.event + yScale(d.parsedDate)
                        });
                    }
                }
            }
        }
        return list;
    })();

    const allPickEvents = (() => {
        const seen = new Set();
        const picks = [];
        for (const sideData of baseData) {
            for (const [themeIndex, theme] of sideData.themesData.entries()) {
                for (const d of theme.circlePoints) {
                    if (d.isPick && !seen.has(d.event)) {
                        seen.add(d.event);
                        picks.push({
                            event: d.event,
                            date: d.date,
                            eventSecondary: d.eventSecondary,
                            color: colors[themeIndex],
                            cy: yScale(d.parsedDate),
                            activationKey: d.segmentKey ?? yScale(d.parsedDate),
                            pickLetter: d.pickLetter
                        });
                    }
                }
            }
        }
        return picks.sort((a, b) => a.cy - b.cy);
    })();

    let currentPlayingAudioCircleId = $state(null);

    // ─── AUDIO PLAYBACK TRIGGER EFFECT ─────────────────────────────────────────
    $effect(() => {
        // If blowout overlay is active, audio is muted, or audio isn't unlocked -> pause & cancel
        if (activeBlowoutId !== null || isAudioMuted.value || !audioUnlocked.value) {
            if (activeAudio) {
                activeAudio.pause();
                activeAudio.currentTime = 0;
                activeAudio = null;
            }
            currentPlayingAudioCircleId = null;
            return;
        }

        for (const match of audioMatches) {
            const isActive = activeSegmentKeys.has(match.segmentKey);
            const wasActive = currentlyActiveAudioKeys.has(match.segmentKey);

            if (isActive && !wasActive) {
                currentlyActiveAudioKeys.add(match.segmentKey);
                currentPlayingAudioCircleId = match.circleId;

                const audioPath = `${base}/assets/audio/clips/${match.audio}.mp3`;
                playWithCrossfade(audioPath, match.circleId);
            } else if (!isActive && wasActive) {
                currentlyActiveAudioKeys.delete(match.segmentKey);
                if (currentPlayingAudioCircleId === match.circleId) {
                    currentPlayingAudioCircleId = null;
                }
            }
        }
    });

    // ─── SCROLL HIGH-WATER MARK ───────────────────────────────────────────────
    $effect(() => {
        const threshold = timelineScroll + windowHeight * 0.7;
        if (threshold > maxScroll) maxScroll = threshold;
    });

    // ─── SEGMENT ACTIVATION ──────────────────────────────────────────────────
    const allActivationKeys = (() => {
        const keys = new Set();
        for (const sideData of baseData) {
            for (const theme of sideData.themesData) {
                for (const point of theme.pathPoints) {
                    const key = point.segmentKey ?? point.triggerY;
                    if (key != null) keys.add(key);
                }
            }
        }
        return keys;
    })();

    let activeSegmentKeys = $state(new Set());

    $effect(() => {
        const midpointThreshold = timelineScroll + windowHeight * 0.5;

        let changed = false;
        const next = new Set(activeSegmentKeys);

        for (const key of allActivationKeys) {
            if (!next.has(key) && key <= midpointThreshold) {
                next.add(key);
                changed = true;
            } else if (next.has(key) && key > midpointThreshold) {
                next.delete(key);
                changed = true;
            }
        }

        if (changed) activeSegmentKeys = next;
    });

    // ─── INSTRUCTIONS STATE ───────────────────────────────────────────────────
    let currentInstructionIndex = $state(undefined);

    const instructionsCutoff = new Date("1992-06-01");
    const instructionsPastCutoff = $derived.by(() => {
        const midpointY = timelineScroll + windowHeight / 2;
        const date = yScale.invert(midpointY);
        return !!date && date >= instructionsCutoff;
    });

    // ─── CURRENT YEAR ─────────────────────────────────────────────────────────
    const [domainStart, domainEnd] = yScale.domain();
    const currentYear = $derived.by(() => {
        const midpointY = timelineScroll + windowHeight / 2;
        const date = yScale.invert(midpointY);
        if (!date) return null;
        const year = date.getFullYear();
        const clamped = Math.min(
            Math.max(year, domainStart.getFullYear()),
            domainEnd.getFullYear()
        );
        return clamped.toString();
    });

    // ─── DERIVED RENDER DATA ──────────────────────────────────────────────────
    const renderedData = $derived.by(() => {
        const active = activeSegmentKeys;
        const sw = svgWidth;

        const laneSpacing = pathStrokeWidth * 1.67;
        const edgeOffset = pathStrokeWidth / 2;

        return baseData.map((sideData, sideIndex) => {
            const direction = sideIndex === 0 ? 1 : -1;
            const centerX = sw / 2;

            return {
                ...sideData,
                themesData: sideData.themesData.map((theme, themeIndex) => {
                    const themeColor = colors[themeIndex];
                    const laneX =
                        (sideIndex === 0 ? edgeOffset : sw - edgeOffset) +
                        themeIndex * laneSpacing * direction;

                    function getX(d) {
                        const activationY = d.segmentKey ?? d.triggerY;
                        const p = active.has(activationY) ? d.combinedPull : 0;
                        return laneX + (centerX - laneX) * p;
                    }

                    const pathD = d3
                        .line()
                        .x((d) => getX(d))
                        .y((d) => yScale(d.parsedDate))
                        .curve(d3.curveLinear)(theme.pathPoints);

                    const circles = theme.circlePoints.map((day) => ({
                        cx: getX(day),
                        cy: yScale(day.parsedDate),
                        event: day.event,
                        date: day.date,
                        eventSecondary: day.eventSecondary,
                        segmentKey: day.segmentKey,
                        activationKey: day.segmentKey ?? day.triggerY,
                        isPick: day.isPick,
                        pickLetter: day.pickLetter,
                        isCenterMatch: day.isCenterMatch
                    }));

                    return { ...theme, themeColor, pathD, circles };
                })
            };
        });
    });
</script>

<svelte:window bind:scrollY bind:innerHeight={windowHeight} />

<!-- Blowout overlay: expands via clip-path from center when a pick event fires -->
<Blowout
    {allPickEvents}
    {activeBlowoutId}
    {blowoutData}
    {blowoutColor}
    originX={blowoutOriginX}
    originY={blowoutOriginY}
    onClose={closeBlowout}
    onPrev={() => navigateBlowout(-1)}
    onNext={() => navigateBlowout(1)}
    onNavigateTo={navigateToIndex}
    canGoPrev={currentPickIndex > 0}
    canGoNext={currentPickIndex < allPickEvents.length - 1}
    currentIndex={currentPickIndex}
/>

<YourEvents index={currentInstructionIndex} atEnd={isAtEnd} />

<section
    id="timeline"
    bind:this={timelineSectionElement}
    use:inView={{ top: 0, bottom: windowHeight - 1 }}
    onenter={() => {
        changeActiveSection("enter");
    }}
    onexit={() => {
        changeActiveSection("exit");
    }}
>
    <div class="sticky-header">
        <Nav
            {yScale}
            {instructionsVisible}
            {timelineSectionElement}
            index={currentInstructionIndex}
            onYearSelect={scrollToYear}
            {currentYear}
            {activeBlowoutId}
            {blowoutData}
        />
    </div>
    <figure style="height: {svgHeight}px;" bind:clientWidth={svgWidth}>
        <!-- HTML tooltip layer: sits above SVG -->
        <div class="html-overlay" style="height: {svgHeight}px;">
            <div class="curtain-container">
                {#each themes as _, i}
                    <div
                        class="curtain-strip"
                        class:reveal={currentInstructionIndex >= 1}
                        style="
                            width: calc(100% - {i * 20}px);
                            transition-delay: {i * 200}ms;
                            z-index: {10 - i};
                        "
                    ></div>
                {/each}
            </div>
            <Scrolly bind:value={currentInstructionIndex}>
                {#each copy.timelineInstructions as step, i}
                    {@const nextStep = copy.timelineInstructions[i + 1]}
                    <div
                        style="position: absolute; top: {yScale(
                            new Date(step.date)
                        )}px; height: {nextStep
                            ? yScale(new Date(nextStep.date)) - yScale(new Date(step.date))
                            : svgHeight - yScale(new Date(step.date))}px; width: 100%;"
                    ></div>
                {/each}
            </Scrolly>
            <Instructions
                index={instructionsPastCutoff ? -1 : currentInstructionIndex}
            />
            {#each renderedData as sideData}
                {#each sideData.themesData as theme}
                    {#each theme.circles as circle (circle.event + circle.cy)}
                        {@const uniqueId = circle.event + circle.cy}
                        {@const isCenter = Math.abs(circle.cx - svgWidth / 2) < 1}
                        {#if circle.cy <= timelineScroll + windowHeight * 0.7 || hoveredEventName === circle.event}
                            <Tooltip
                                {circle}
                                {sideData}
                                fill={theme.themeColor}
                                {isCenter}
                                {uniqueId}
                                {hoveredId}
                                {hoveredEventName}
                                isPick={circle.isPick}
                                onhover={() => {
                                    hoveredId = circle.event + circle.cy;
                                    hoveredEventName = circle.event;
                                }}
                                onleave={() => {
                                    hoveredId = null;
                                    hoveredEventName = null;
                                }}
                            />
                        {/if}
                    {/each}
                {/each}
            {/each}
        </div>

        {#if svgWidth > 0}
            <svg width="100%" height={svgHeight} bind:this={svgEl}>
                <g class="year-axis">
                    {#each yearTicks as year}
                        {@const y = yScale(year)}
                        {#if year.getFullYear() >= 1987 && year.getFullYear() !== 2027}
                            <text x={svgWidth / 2} y={y + 100}>{year.getFullYear()}</text>
                        {/if}
                    {/each}
                </g>

                {#each renderedData as sideData}
                    <g class="side-{sideData.side}" class:dimmed={(sideData.side === "ashleé" && currentInstructionIndex == 4) || (sideData.side === "jan" && currentInstructionIndex == 3)}>
                        <!-- Paths rendered first (behind circles) -->
                        {#each sideData.themesData as theme, themeIndex (theme.themeName)}
                            {#if themeIndex !== -1}
                                <g class="paths-{sideData.side}-{theme.themeName}">
                                    <Path
                                        d={theme.pathD}
                                        stroke={theme.themeColor}
                                        {pathStrokeWidth}
                                        isDimmed={hoveredEventName !== null &&
                                            !activeHoverThemes.includes(theme.themeName)}
                                    />
                                </g>
                            {/if}
                        {/each}

                        <!-- Circles rendered on top -->
                        {#each sideData.themesData as theme, themeIndex (theme.themeName)}
                            {#if themeIndex !== -1}
                                <g class="circles-{sideData.side}-{theme.themeName}">
                                    {#each theme.circles as circle}
                                        <Circle
                                            {circle}
                                            fill={theme.themeColor}
                                            centerX={svgWidth / 2}
                                            {hoveredEventName}
                                            isDimmed={hoveredEventName !== null && !activeHoverThemes.includes(theme.themeName)}
                                            isPick={circle.isPick}
                                            pickLetter={circle.pickLetter}
                                            isPlayingAudio={currentPlayingAudioCircleId === (circle.event + circle.cy)}
                                            onclick={circle.isPick ? () => handlePickClick(circle, theme.themeColor) : undefined}
                                            onhover={circle.isPick ? () => {
                                                hoveredId = circle.event + circle.cy;
                                                hoveredEventName = circle.event;
                                            } : undefined}
                                            onleave={circle.isPick ? () => {
                                                hoveredId = null;
                                                hoveredEventName = null;
                                            } : undefined}
                                        />                                          
                                    {/each}
                                </g>
                            {/if}
                        {/each}
                    </g>
                {/each}
            </svg>
        {/if}
    </figure>
</section>

<style>
    /* ── Layout ──────────────────────────────────────────────────────────── */
    #timeline {
        width: 100%;
        background: transparent;
    }
    .sticky-header {
        position: sticky;
        top: 0.5rem;
        left: 0;
        height: 1.75rem;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        z-index: 1000;
        pointer-events: none;
    }
    figure {
        width: calc(100% - 4.75rem);
        margin: 0 auto 0 auto;
        position: relative;
    }

    svg {
        display: block;
        overflow: visible;
    }

    .year-axis line {
        stroke: rgba(0, 0, 0, 0.2);
        stroke-width: 1;
    }

    .year-axis text {
        font-family: var(--marsha);
        text-transform: uppercase;
        font-size: 250px;
        font-weight: bold;
        fill: var(--color-gray-900);
        text-anchor: middle;
        dominant-baseline: middle;
        transform: translateY(10px);
    }

    .side-ashleé, .side-jan {
        transition: opacity 0.4s ease;
    }

    .side-ashleé.dimmed, .side-jan.dimmed {
        opacity: 0.3;
    }

    /* ── HTML tooltip overlay ────────────────────────────────────────────── */
    .html-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        pointer-events: none;
        z-index: 10;
    }

    .curtain-container {
        position: fixed;
        top: 0;
        left: 50%;
        transform: translateX(-50%);
        width: calc(100% - 3rem);
        height: 100vh;
        pointer-events: none;
        z-index: 5;
        overflow: hidden;
    }

    .curtain-strip {
        position: absolute;
        top: 0;
        left: 50%;
        transform: translate(-50%, 0);
        height: 100%;
        background-color: var(--color-bg);
        /* Smooth cubic-bezier curve for a clean drop */
        transition: transform 1.5s cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform;
    }

    .curtain-strip.reveal {
        transform: translate(-50%, 100%);
    }

    @media(max-width: 760px) {
        figure {
            width: calc(100% - 3.75rem);
        }

        .curtain-container {
            width: calc(100% - 2rem);
        }

        .year-axis text {
            font-size: 160px;
        }
    }

    @media(max-width: 600px) {
        figure {
            width: calc(100% - 2.5rem);
        }

        .curtain-container {
            width: calc(100% - 2.5rem);
        }

        .year-axis text {
            font-size: 80px;
        }   
    }
</style>