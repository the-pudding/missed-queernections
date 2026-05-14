<script>
	import { colors } from "$runes/misc.svelte.js";

	let {
		circle,
		fill,
		centerX,
		isPick,
		isDimmed,
		onhover,
		onleave,
		hoveredEventName,
		onclick = undefined
	} = $props();

	let queernection = $state(false);
	let isHoveredAcrossTimeline = $derived(hoveredEventName === circle.event);
	const r = 10;

	function handleTransitionEnd(event) {
		if (event.propertyName.includes("transform")) {
			const isAtCenter = Math.abs(circle.cx - centerX) < 1;
			// Only fire the one-shot queernection pulse for non-pick center circles.
			// Pick circles use their own always-on infinite loop instead.
			if (isAtCenter && !isPick) {
				queernection = true;
			}
		}
	}
</script>

<defs>
	<radialGradient
		id="rainbowGradient"
		cx="50%"
		cy="50%"
		r="50%"
		fx="50%"
		fy="50%"
	>
		{#each colors as color, i}
			<stop
				offset="{(i * 100) / (colors.length - 1)}%"
				style="stop-color: {color};"
			/>
		{/each}
	</radialGradient>
</defs>

<g
	class="circle-container"
	transform={`translate(${circle.cx}, ${circle.cy})`}
	ontransitionend={handleTransitionEnd}
	class:is-active-hover={isHoveredAcrossTimeline}
	class:is-dimmed={isDimmed}
	class:is-pick={isPick}
	role={isPick ? "button" : "presentation"}
	tabindex={isPick ? 0 : undefined}
	onclick={isPick ? onclick : undefined}
	onkeydown={isPick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onclick?.(); } } : undefined}
	onmouseenter={onhover}
	onmouseleave={onleave}
>
	{#if isPick}
		{#each colors as color, i}
			<circle
				cx={0}
				cy={0}
				{r}
				fill="none"
				stroke={color}
				stroke-width="1"
				class="shockwave shockwave-infinite"
				style="animation-delay: {i * 150}ms;"
			/>
		{/each}
	{/if}

	{#if queernection}
		<circle cx={0} cy={0} {r} {fill} class="pulse" />
	{/if}

	<circle
		cx={0}
		cy={0}
		{r}
		{fill}
		stroke-width="2"
		style="transform: scale({isHoveredAcrossTimeline ? 1.25 : 1})"
	/>


</g>

<style>
	.circle-container {
		/*
            Animates cx (horizontal position) when a segment activates,
            matching the path transition timing exactly so dots and lines
            move together.
        */
		transition:
			opacity 400ms ease,
			transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
		cursor: default;
		pointer-events: all;
		transform-box: fill-box;
		transform-origin: center;
		outline: none;
	}

	.circle-container.is-pick {
		cursor: pointer;
	}

	circle {
		transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.circle-container.is-dimmed {
		opacity: 0.1;
	}

	/* THE CONTINUOUS PULSE (Solid/Aura) */
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

	.pulse {
		animation: pulse-animation 2s ease-out forwards;
		animation-iteration-count: 2;
		pointer-events: none;
	}

	/* THE BURST RIPPLES (Thin Rings) */
	@keyframes shockwave {
		from {
			r: 0;
			opacity: 0.8;
			stroke-width: 3px;
		}
		to {
			r: 100px;
			opacity: 0;
			stroke-width: 0px;
		}
	}

	.shockwave {
		fill: none;
		stroke-width: 4px;
		opacity: 0.8;
		animation: shockwave 1.5s ease-out forwards;
		animation-iteration-count: 2;
		pointer-events: none;
	}

	.shockwave-infinite {
		animation-iteration-count: infinite;
	}
</style>
