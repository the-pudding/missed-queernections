<script>
	import { addedEvents, userId } from "$runes/misc.svelte.js";
	import * as db from "$utils/database.js";
	import { fade } from "svelte/transition";

	let {
		circle,
		sideData,
		fill,
		isCenter,
		isPick = false,
		uniqueId,
		hoveredId,
		hoveredEventName,
		onhover,
		onleave
	} = $props();

	let isAdded = $derived(
		$addedEvents.includes(String(circle.event ?? "").trim())
	);

	function handleClick(e) {
		console.log("click");
		e.stopPropagation();
		const eventKey = String(circle.event ?? "").trim();
		if (!eventKey) return;
		if ($addedEvents.includes(eventKey)) {
			$addedEvents = $addedEvents.filter((ev) => ev !== eventKey);
		} else {
			$addedEvents = [...$addedEvents, eventKey];
		}
		db.insert({ user_id: $userId, events: $addedEvents });
	}
</script>

<div
	transition:fade={{ duration: 250 }}
	class="html-tooltip"
	class:side-jan={sideData.side === "jan"}
	class:side-ashlee={sideData.side === "ashleé"}
	class:is-center={isCenter}
	class:is-hovered={hoveredId === uniqueId}
	class:is-dimmed={hoveredId !== null && hoveredEventName !== circle.event}
	class:is-active-hover={hoveredEventName === circle.event}
	class:is-added={isAdded}
	style="left: {circle.cx}px; top: {circle.cy}px;"
>
	<div
		class="tooltip-content"
		role="tooltip"
		onmouseenter={onhover}
		onmouseleave={onleave}
	>
		<button
			class="add-btn"
			onclick={handleClick}
			aria-label={isAdded ? "Remove event" : "Add event"}
		>
			<svg
				width="8"
				height="8"
				viewBox="-5 -5 10 10"
				class="icon"
				class:rotated={isAdded}
			>
				<line
					x1="0"
					y1="-3.75"
					x2="0"
					y2="3.75"
					stroke="white"
					stroke-width="2"
					stroke-linecap="butt"
				/>
				<line
					x1="-3.75"
					y1="0"
					x2="3.75"
					y2="0"
					stroke="white"
					stroke-width="2"
					stroke-linecap="butt"
				/>
			</svg>
		</button>
		<p class="date">{circle.date}</p>
		<p class="event">{circle.event}</p>
		{#if circle.eventSecondary}
			<p class="event-secondary">{circle.eventSecondary}</p>
		{/if}
	</div>
</div>

<style>
	.html-tooltip {
		position: absolute;
		width: max-content;
		max-width: 160px;
		pointer-events: none;
		z-index: 1;
		transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
		will-change: left, top, transform;
	}

	.html-tooltip.is-hovered,
	.html-tooltip.is-active-hover {
		z-index: 101; /* Pop to the very top */
		opacity: 1 !important;
	}

	.html-tooltip.is-dimmed {
		opacity: 0.2;
		transition: opacity 300ms ease;
	}

	.html-tooltip.is-active-hover .tooltip-content {
		transform: scale(1.125);
		z-index: 100; /* Ensure the scaled tooltip is on top of neighbors */
	}

	.html-tooltip.side-jan {
		transform: translate(calc(-100% - 14px), -50%);
	}

	/* ASHLEÉ'S SIDE: Stick to the left of the dot */
	.html-tooltip.side-ashlee {
		/* -100% moves the entire width of the div to the left of the anchor point */
		transform: translate(14px, -50%);
	}

	/* CENTER MATCH: Move above the dot so it doesn't overlap either side */
	.html-tooltip.is-center {
		transform: translate(-50%, calc(-100% - 14px)) !important;
	}

	.tooltip-content {
		position: relative;
		background: var(--color-gray-900);
		padding: 0.5rem;
		border: 2px solid var(--color-gray-800);
		border-radius: 0.25rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
		transition:
			transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
			box-shadow 300ms ease,
			opacity 300ms ease;
		backface-visibility: hidden;
		-webkit-font-smoothing: antialiased;
		transform-origin: center center;
		font-size: var(--12px);
		font-family: var(--sans);
		pointer-events: auto;
	}

	.add-btn {
		position: absolute;
		top: -7px;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		pointer-events: auto;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background-color: var(--color-fg);
		transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.is-added .add-btn {
		background-color: var(--color-fg);
	}

	.add-btn:hover {
		transform: scale(1.15);
	}

	.add-btn svg line {
		stroke: var(--color-bg);
	}

	.side-jan .add-btn {
		right: -7px;
	}

	.side-ashlee .add-btn {
		left: -7px;
	}

	/* center overrides whichever side it belongs to */
	.is-center .add-btn {
		left: unset;
		right: -7px;
	}

	.is-added .tooltip-content {
		outline: 2px solid var(--color-fg);
	}

	.icon {
		transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
		display: block;
	}

	.icon.rotated {
		transform: rotate(45deg);
	}

	.tooltip-content p {
		margin: 0;
	}

	p.date {
		font-family: var(--marsha);
		text-transform: uppercase;
		font-weight: 700;
	}

	p.event-secondary {
		font-style: italic;
	}
</style>
