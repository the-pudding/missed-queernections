<script>
	// ─── IMPORTS ──────────────────────────────────────────────────────────────
	import * as d3 from "d3";
	import combinedData from "$data/combined.csv";
	import copy from "$data/copy.json";
	import {
		themes,
		colors,
		activeSection,
		instructionsVisible
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

	let { introHeight = 0 } = $props();

	// ─── SECTION STATE ───────────────────────────────────────────────────────
	function changeActiveSection(view) {
		const newSection = view === "enter" ? "timeline" : null;
		$activeSection = newSection;
	}

	// ─── SVG + SCROLL STATE ───────────────────────────────────────────────────
	let svgHeight = $state(60000); // Tall canvas — adjust to control spacing between events
	let svgWidth = $state(0); // Bound to SVG element; updates on resize
	let scrollY = $state(0);
	let windowHeight = $state(0);
	let maxScroll = $state(0); // High-water mark: only increases, driving one-way reveal

	// scrollY relative to the timeline's own top edge
	const timelineScroll = $derived(scrollY - introHeight);

	// ─── DATE SCALE ───────────────────────────────────────────────────────────
	// Maps JS Date → y-pixel on the SVG canvas. Built once, never changes.
	const allDates = combinedData
		.map((d) => new Date(d.longDate || d.date))
		.filter(Boolean);
	const [minDate, maxDate] = d3.extent(allDates);

	const yScale = d3
		.scaleTime()
		.domain([minDate, maxDate])
		.range([100, svgHeight - 100]);

	const yearTicks = d3.timeYear.range(minDate, d3.timeYear.offset(maxDate, 1));

	// (tooltip visibility is now driven by maxScroll vs circle.activationKey)

	// ─── BLOWOUT STATE ────────────────────────────────────────────────────────
	let activeBlowoutId = $state(null);
	let blowoutData = $state(null);
	let blowoutColor = $state(null);
	let blowoutOriginX = $state("50%");
	let blowoutOriginY = $state("50%");
	let currentPickIndex = $state(-1);

	let svgEl = $state(null);
	let timelineSectionElement = $state(null);

	// All pick events in chronological order — computed once from static baseData.
	// Used for blowout prev/next navigation.

	function handlePickClick(circle, themeColor) {
		const rect = svgEl?.getBoundingClientRect();
		blowoutOriginX = rect ? `${rect.left + circle.cx}px` : "50%";
		blowoutOriginY = rect ? `${rect.top + circle.cy}px` : "50%";
		activeBlowoutId = circle.event + circle.cy;
		blowoutData = { ...circle, color: themeColor };
		blowoutColor = themeColor;
		currentPickIndex = allPickEvents.findIndex((p) => p.event === circle.event);
		document.body.style.overflow = "hidden";
	}


	function scrollToYear(yearStr) {
		const yearDate = new Date(parseInt(yearStr), 0, 1);
		const yPixel = yScale(yearDate);
		if (yPixel > maxScroll) maxScroll = yPixel;
		const targetScrollY = Math.max(0, introHeight + yPixel - windowHeight / 2);
		window.scrollTo({ top: targetScrollY, behavior: "smooth" });
	}

	function closeBlowout() {
		activeBlowoutId = null;
		blowoutData = null;
		currentPickIndex = -1;
		document.body.style.overflow = "auto";
	}

	function navigateToIndex(index) {
		const newIndex = index;
		if (
			newIndex < 0 ||
			newIndex >= allPickEvents.length ||
			newIndex === currentPickIndex
		)
			return;
		currentPickIndex = newIndex;
		const pick = allPickEvents[newIndex];
		blowoutData = { ...pick };
		blowoutColor = pick.color;
		activeBlowoutId = pick.event + pick.cy;
		if (pick.cy > maxScroll) maxScroll = pick.cy;
		const targetScrollY = Math.max(0, introHeight + pick.cy - windowHeight / 2);
		document.body.style.overflow = "auto";
		window.scrollTo({ top: targetScrollY });
		document.body.style.overflow = "hidden";
		const rect = svgEl?.getBoundingClientRect();
		blowoutOriginX = rect ? `${rect.left + svgWidth / 2}px` : "50%";
		blowoutOriginY = `${windowHeight / 2}px`;
	}

	function navigateBlowout(direction) {
		const newIndex = currentPickIndex + direction;
		if (newIndex < 0 || newIndex >= allPickEvents.length) return;
		currentPickIndex = newIndex;
		const pick = allPickEvents[newIndex];
		blowoutData = { ...pick };
		blowoutColor = pick.color;
		activeBlowoutId = pick.event + pick.cy;

		// Activate the pick's segment if not yet revealed
		if (pick.cy > maxScroll) maxScroll = pick.cy;

		// Scroll so the pick circles are centered in the viewport.
		// Must briefly unlock overflow since body is locked during blowout.
		const targetScrollY = Math.max(0, introHeight + pick.cy - windowHeight / 2);
		document.body.style.overflow = "auto";
		window.scrollTo({ top: targetScrollY });
		document.body.style.overflow = "hidden";

		const rect = svgEl?.getBoundingClientRect();
		blowoutOriginX = rect ? `${rect.left + svgWidth / 2}px` : "50%";
		blowoutOriginY = `${windowHeight / 2}px`;
	}

	// ─── HOVER STATE ──────────────────────────────────────────────────────────
	let hoveredId = $state(null);
	let hoveredEventName = $state(null);
	// Derives which themes are associated with the currently-hovered event name.
	// Used to dim unrelated themes on hover.
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
	// Runs once at startup. Transforms raw CSV rows into a nested structure:
	//   [ { side, themesData: [ { themeName, pathPoints, circlePoints } ] } ]
	//
	// Key concepts:
	//   - combinedPull (0→1): how far a path point moves from its lane toward center
	//   - triggerY: y-pixel of the event that causes a day's pull
	//   - segmentKey: shared activation threshold for a connected pull region,
	//     so entire segments snap into view together rather than point-by-point
	const processData = (rawData) => {
		const formattedData = rawData
			.map((d) => ({ ...d, parsedDate: new Date(d.longDate || d.date) }))
			.filter((d) => !isNaN(d.parsedDate));

		const dateRange = d3.timeDay.range(minDate, d3.timeDay.offset(maxDate, 1));

		const sides = [
			{ key: "jan", themeCol: "janTheme" },
			{ key: "ashleé", themeCol: "ashleéTheme" }
		];

		return sides.map((side) => {
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

					// Build dense daily scaffold with real events merged in
					const realEventIndices = [];
					const dailyEvents = dateRange.map((date, i) => {
						const dateString = d3.timeFormat("%B %-d, %Y")(date);
						const existing = eventMap.get(dateString);
						const isCenterMatch =
							existing &&
							existing[0].janTheme === existing[0].ashleéTheme &&
							String(existing[0].match) === "1";
						// CHANGE HERE FOR ALL PICKS
						const isPick = existing && ["Y", "J", "A"].includes(String(existing[0].pick));

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
									isPick
								}
							: { parsedDate: date, isPlaceholder: true };
					});

					// ── Pass 1: compute combinedPull + triggerY ────────────
					// Pull sources: real event (full), bridge (interpolated between
					// two close events), or ramp (cosine fade around isolated event).
					const WINDOW = 45; // days to ramp in/out around an isolated event
					const BRIDGE = 100; // max gap (days) to bridge two events

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
							// At a real event: full pull
							finalPull = prevDepth;
							triggerDate = prevEvent.parsedDate;
						} else if (
							prevEvent &&
							nextEvent &&
							nextEvent.index - prevEvent.index < BRIDGE
						) {
							// Inside a bridge: cosine-eased interpolation between pulls
							const t =
								(i - prevEvent.index) / (nextEvent.index - prevEvent.index);
							finalPull =
								prevDepth +
								(nextDepth - prevDepth) * ((1 - Math.cos(t * Math.PI)) / 2);
							triggerDate = prevEvent.parsedDate;
						} else {
							// Ramp: cosine fade out from prev, fade in toward next
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

					// ── Pass 2: assign segmentKey ──────────────────────────
					// Lock the first triggerY of each connected pull region to all
					// days in that run, so the whole segment activates together.
					let runTriggerY = null;
					for (const day of dailyEvents) {
						if (day.combinedPull > 0) {
							if (runTriggerY === null) runTriggerY = day.triggerY;
							day.segmentKey = runTriggerY;
						} else {
							runTriggerY = null;
							day.segmentKey = null;
						}
					}

					// ── Path thinning ──────────────────────────────────────
					// Drop collinear placeholder days; keep inflection points,
					// segment boundaries, real events, and every 10th placeholder.
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
	};

	// Static base data — computed once, never reactive
	const baseData = processData(combinedData);

	// All pick events in chronological order — used for blowout prev/next navigation.
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
							cy: yScale(d.parsedDate)
						});
					}
				}
			}
		}
		return picks.sort((a, b) => a.cy - b.cy);
	})();

	// ─── SCROLL HIGH-WATER MARK ───────────────────────────────────────────────
	// Uses 0.7 to match the segment activation threshold so that maxScroll always
	// covers any circle whose segment has been activated, making tooltips reliable.
	$effect(() => {
		const threshold = timelineScroll + windowHeight * 0.7;
		if (threshold > maxScroll) maxScroll = threshold;
	});

	// ─── SEGMENT ACTIVATION WITH HYSTERESIS ──────────────────────────────────
	// Segments activate when their activationY scrolls into the top 30% of the
	// viewport, but only deactivate when scrolled back above the 70% mark.
	// The gap between those two thresholds is the dead zone where a segment
	// holds its current state regardless of scroll direction.
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
		const inThreshold = timelineScroll + windowHeight * 0.8;
		const outThreshold = timelineScroll + windowHeight * 0.8;

		let changed = false;
		const next = new Set(activeSegmentKeys);

		for (const key of allActivationKeys) {
			if (!next.has(key) && key <= inThreshold) {
				next.add(key);
				changed = true;
			} else if (next.has(key) && key > outThreshold) {
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
	// Re-runs whenever activeSegmentKeys or svgWidth changes.
	const renderedData = $derived.by(() => {
		const active = activeSegmentKeys;
		const sw = svgWidth;

		return baseData.map((sideData, sideIndex) => {
			// jan = left (dir +1), ashleé = right (dir -1)
			const direction = sideIndex === 0 ? 1 : -1;
			const centerX = sw / 2;

			return {
				...sideData,
				themesData: sideData.themesData.map((theme, themeIndex) => {
					const themeColor = colors[themeIndex];
					// Each theme gets its own lane, stacked 10px apart from the edge
					const laneX =
						(sideIndex === 0 ? 0 : sw) +
						40 * direction +
						themeIndex * 10 * direction;

					// Lerp from laneX (pull=0) to centerX (pull=1).
					// Uses segmentKey as the activation threshold so whole segments snap together.
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
						isPick: day.isPick
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

<YourEvents />

<section
	id="timeline"
	bind:this={timelineSectionElement}
	use:inView={{ top: 0, bottom: windowHeight - 1 }}
	onenter={() => {
		changeActiveSection("enter");
	}}
	onexit={() => {
		changeActiveSection("exit");
		// instructionsVisible = false;
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
		/>
	</div>
	<figure style="height: {svgHeight}px;" bind:clientWidth={svgWidth}>
		<!-- HTML tooltip layer: sits above SVG, shown once circle has settled -->
		<div class="html-overlay" style="height: {svgHeight}px;">
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
						<text x={svgWidth / 2} {y}>{year.getFullYear()}</text>
					{/each}
				</g>

				{#each renderedData as sideData}
					<g class="side-{sideData.side}">
						<!-- Paths rendered first (behind circles) -->
						{#each sideData.themesData as theme, themeIndex (theme.themeName)}
							{#if themeIndex !== -1}
								<g class="paths-{sideData.side}-{theme.themeName}">
									<Path
										d={theme.pathD}
										stroke={theme.themeColor}
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
											isDimmed={hoveredEventName !== null &&
												!activeHoverThemes.includes(theme.themeName)}
											isPick={circle.isPick}
											onclick={circle.isPick
												? () => handlePickClick(circle, theme.themeColor)
												: undefined}
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
		margin: -4rem 0 0 0;
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
		font-family: var(--sans);
		font-size: 250px;
		font-weight: bold;
		fill: rgba(0, 0, 0, 0.03);
		text-anchor: middle;
		dominant-baseline: middle;
		transform: translateY(10px);
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
</style>
