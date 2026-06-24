<script>
	import { getContext } from "svelte";
	import { base } from "$app/paths";
	import { addedEvents, userId } from "$runes/misc.svelte.js";
	import * as db from "$utils/database.js";
	// ------------------- COPY -------------------
	const copy = getContext("copy");

	let {
		allPickEvents,
		activeBlowoutId,
		blowoutData,
		blowoutColor,
		originX = "50%",
		originY = "50%",
		onClose,
		onPrev,
		onNext,
		onNavigateTo,
		canGoPrev,
		canGoNext,
		currentIndex
	} = $props();

	const eventObject = $derived(
		copy.expandedEvents.find(item => item?.event === blowoutData?.event)
	);

	const bgImageUrl = $derived(
		eventObject?.img 
			? `url('${base}/assets/imgs/blowouts/${eventObject.img}')` 
			: 'none'
	);

	$effect(() => {
		console.log(blowoutData, eventObject)
	})
	
	let wrapperEl = $state(null);

	const isAdded = $derived(
		blowoutData
			? $addedEvents.includes(String(blowoutData.event ?? "").trim())
			: false
	);

	function handleAddClick() {
		if (!blowoutData) return;
		const eventKey = String(blowoutData.event ?? "").trim();
		if (!eventKey) return;
		if ($addedEvents.includes(eventKey)) {
			$addedEvents = $addedEvents.filter((ev) => ev !== eventKey);
		} else {
			$addedEvents = [...$addedEvents, eventKey];
		}
		db.insert({ user_id: $userId, events: $addedEvents });
	}

	$effect(() => {
		currentIndex; // track changes
		if (wrapperEl) wrapperEl.scrollTop = 0;
	});
</script>

<div
	class="blowout-overlay"
	class:is-expanded={activeBlowoutId !== null}
	style="--theme-color: {blowoutData?.color ||
		blowoutColor}; --origin-x: {originX}; --origin-y: {originY}; --bg-image: {bgImageUrl}"
>
	{#if blowoutData && eventObject}
		<div class="button-group">
			<button
				class="add-button"
				class:is-added={isAdded}
				onclick={handleAddClick}
				aria-label={isAdded ? "Remove event" : "Add event"}
			>
				{#if isAdded}
					Added!
				{:else}
					<svg width="12" height="12" viewBox="-5 -5 10 10" class="icon">
						<line x1="0" y1="-3.75" x2="0" y2="3.75" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
						<line x1="-3.75" y1="0" x2="3.75" y2="0" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
					</svg>
					Add
				{/if}
			</button>
			<button onclick={onClose} class="close-button">✕ Close</button>
		</div>

		<div class="blowout-content-wrapper" bind:this={wrapperEl}>
			<div class="blowout-content">
				<div class="blowout-image" style="background-image: {bgImageUrl}"></div>
				<p class="date">{eventObject.date}</p>
				<h3>{eventObject.event}</h3>
				{#if eventObject.eventSecondary}
					<p class="secondary">{eventObject.eventSecondary}</p>
				{/if}
				{#each eventObject.text as graf, i}
					<p class="graf">{@html graf.value}</p>
				{/each}
			</div>
		</div>

		<nav class="mini-timeline">
			<div class="mini-line"></div>
			<div class="dir-wrapper prev-wrapper" class:disabled={!canGoPrev}>
				<button onclick={onPrev} class="mini-arrow" aria-label="Previous event">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<polyline
							points="4,14 10,6 16,14"
							stroke={blowoutData?.color || blowoutColor}
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>

			<div class="mini-picks">
				{#if allPickEvents.length > 0}
					{@const minCy = allPickEvents[0].cy}
					{@const maxCy = allPickEvents[allPickEvents.length - 1].cy}
					{@const cyRange = maxCy - minCy || 1}
					{@const currentPct =
						((allPickEvents[currentIndex].cy - minCy) / cyRange) * 100}
					<div class="tracker-dot" style="top: {currentPct}%"></div>
					{#each allPickEvents as pick, i}
						{@const pct = ((pick.cy - minCy) / cyRange) * 100}
						<span class="dot-label" style="top: {pct}%"
							>{new Date(pick.date).getFullYear()}</span
						>
						<button
							class="mini-dot"
							class:is-current={i === currentIndex}
							onclick={() => onNavigateTo(i)}
							aria-label={pick.event}
							style="background: {pick.color}; top: {pct}%"
						></button>
					{/each}
				{/if}
			</div>

			<div class="dir-wrapper next-wrapper" class:disabled={!canGoNext}>
				<button onclick={onNext} class="mini-arrow" aria-label="Next event">
					<svg width="20" height="20" viewBox="0 0 20 20" fill="none">
						<polyline
							points="4,6 10,14 16,6"
							stroke={blowoutData?.color || blowoutColor}
							stroke-width="2.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</button>
			</div>
		</nav>
	{/if}
</div>

<style>
	.blowout-overlay {
		position: fixed;
		inset: 0;
		z-index: 10000;
		background: var(--theme-color);
		overflow: hidden;

		/* Reveal from the circle's actual position */
		clip-path: circle(0% at var(--origin-x, 50%) var(--origin-y, 50%));
		/* Closing transition */
		transition: clip-path 0.75s cubic-bezier(0.16, 1, 0.3, 1);

		display: flex;
		align-items: center;
		justify-content: center;
		pointer-events: none;
	}

	.blowout-overlay::before {
		content: "";
		position: absolute;
		inset: -20px;
		background: var(--bg-image) center / cover no-repeat;
		filter: grayscale(1) blur(0px);
		mix-blend-mode: multiply;
		opacity: 0.1;
		pointer-events: none;
		transition: background-image 0.3s ease;
	}

	.blowout-overlay.is-expanded {
		clip-path: circle(150% at var(--origin-x, 50%) var(--origin-y, 50%));
		pointer-events: all;
		/* Opening transition — longer to match perceived closing speed */
		transition: clip-path 1.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	/* ── Main content ────────────────────────────────────────────────────── */
	.blowout-content-wrapper {
		width: 100%;
		height: 100svh;
		overflow-y: auto;
		display: flex;
		justify-content: center;
	}

	.blowout-content {
		width: 100%;
		padding: 2rem 2rem 6rem;
		margin: 2rem;
		max-width: 600px;
		color: white;
		font-family: var(--sans);
		isolation: isolate;
	}

	h3 {
		font-family: var(--marsha);
		font-weight: 700;
		line-height: 1;
		text-transform: uppercase;
		font-size: var(--48px);
	}

	.blowout-image {
		width: 100%;
		max-width: 400px;
		margin: 0 auto;
		aspect-ratio: 1 / 1;
		background-size: cover;
		background-position: center;
	}

	.graf:last-of-type {
		padding-bottom: 4rem;
	}

	.button-group {
		position: absolute;
		bottom: 2rem;
		left: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.close-button {
		background: white;
		border: none;
		padding: 0.8rem 1.2rem;
		border-radius: 50px;
		cursor: pointer;
		font-weight: bold;
		color: black;
	}

	.add-button {
		border: none;
		background: white;
		color: black;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.8rem 1.2rem;
		border-radius: 50px;
		font-weight: bold;
		transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.add-button:hover {
		transform: scale(1.1);
	}

	.icon {
		display: block;
	}

	/* ── Mini timeline ───────────────────────────────────────────────────── */
	.mini-timeline {
		position: absolute;
		right: 1rem;
		top: 2rem;
		bottom: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4rem 0;
		gap: 0.5rem;
		color: white;
	}

	.mini-line {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 1.5px;
		background: white;
		transform: translateX(-50%);
		pointer-events: none;
		z-index: 1;
	}

	.dir-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		position: absolute;
		z-index: 999;
	}

	.dir-wrapper.prev-wrapper {
		top: 0;
		left: 50%;
		transform: translate(-50%, 0);
	}

	.dir-wrapper.next-wrapper {
		bottom: 0;
		left: 50%;
		transform: translate(-50%, 0);
	}

	.dir-wrapper.prev-wrapper.disabled,
	.dir-wrapper.next-wrapper.disabled {
		opacity: 0;
		pointer-events: none;
	}

	.mini-arrow {
		background: white;
		border: none;
		border-radius: 50%;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		color: white;
		flex-shrink: 0;
		transition: all 300ms ease;
		z-index: 100;
	}

	.mini-arrow:hover:not(:disabled) {
		transform: scale(1.1);
	}

	.mini-arrow:disabled {
		opacity: 0.25;
		cursor: default;
	}

	.mini-label {
		font-family: var(--sans);
		font-size: 0.65rem;
		font-weight: bold;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: white;
	}

	.mini-label.prev-label {
		position: absolute;
		top: -1.5rem;
		left: 50%;
		transform: translate(-50%, 0);
	}

	.mini-label.next-label {
		position: absolute;
		bottom: -1.5rem;
		left: 50%;
		transform: translate(-50%, 0);
	}

	.mini-picks {
		flex: 1;
		position: relative;
		width: 2rem;
	}

	.dot-label {
		position: absolute;
		right: calc(100%);
		top: 0;
		transform: translateY(-50%);
		font-family: var(--sans);
		font-size: 0.6rem;
		font-weight: bold;
		letter-spacing: 0.05em;
		text-transform: uppercase;
		color: white;
		white-space: nowrap;
		pointer-events: none;
	}

	.tracker-dot {
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: white;
		z-index: 1;
		pointer-events: none;
		transition: top 0.5s cubic-bezier(0.16, 1, 0.3, 1);
	}

	.mini-dot {
		position: absolute;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		border: 1.5px solid white;
		cursor: pointer;
		padding: 0;
		transition:
			background 200ms ease,
			transform 200ms ease,
			width 200ms ease,
			height 200ms ease;
		z-index: 999;
	}

	.mini-dot:hover {
		transform: translate(-50%, -50%) scale(1.4);
	}

	.mini-dot.is-current {
		width: 20px;
		height: 20px;
		box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.4);
		pointer-events: none;
		transform: translate(-50%, -50%);
	}
</style>
