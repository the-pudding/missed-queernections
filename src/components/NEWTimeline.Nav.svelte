<script>
	// ------------------- IMPORTS -------------------
	import keyData from "$data/categories.csv";
	import * as d3 from "d3";
	import { instructionStep, colors } from "$runes/misc.svelte.js";
	import VolumeOff from "$svg/icons/volume-off.svg";
    import Volume2 from "$svg/icons/volume-2.svg";
    import { isAudioMuted, audioUnlocked } from "$runes/misc.svelte.js";

	// ------------------- PROPS -------------------
	let {
		yScale,
		instructionsVisible,
		timelineSectionElement,
		index = -1,
		onYearSelect,
		currentYear = null
	} = $props();

	// ------------------- VARIABLES -------------------
	let userHoveredIndex = $state(null);
	let animatedVisibleIndex = $state(null);

	const [domainStart, domainEnd] = yScale.domain();
	const yearOptions = d3.timeYear
		.range(domainStart, d3.timeYear.offset(domainEnd, 1))
		.map((d) => d.getFullYear().toString());

	let year = $state(yearOptions[0] ?? "1989");

	// ------------------- HELPERS -------------------
	let isAutoScrolling = false;
	let scrollStopTimer = null;

	function yearChange() {
		isAutoScrolling = true;
		onYearSelect?.(year);

		const onScroll = () => {
			clearTimeout(scrollStopTimer);
			scrollStopTimer = setTimeout(() => {
				isAutoScrolling = false;
				window.removeEventListener("scroll", onScroll);
			}, 150);
		};

		window.addEventListener("scroll", onScroll, { passive: true });

		// Fallback in case scroll never fires (e.g. already at target)
		setTimeout(() => {
			isAutoScrolling = false;
			window.removeEventListener("scroll", onScroll);
		}, 2000);
	}

	function toggleMute() {
        isAudioMuted.value = !isAudioMuted.value;
    }

	$effect(() => {
		if (currentYear && !isAutoScrolling) year = currentYear;
	});
</script>

<svg style="display:none">
	<defs>
		<filter id="gooey">
			<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
			<feColorMatrix
				in="blur"
				mode="matrix"
				values="1 0 0 0 0  
                0 1 0 0 0  
                0 0 1 0 0  
                0 0 0 30 -15"
				result="goo"
			/>
			<feComposite in="SourceGraphic" in2="goo" operator="atop" />
		</filter>
	</defs>
</svg>

<div class="timeline-nav">
	<p id="Ashleé-target-nameplate" class="name" class:nav-hidden={index < 2} class:dimmed={index === 4}>Ashleé</p>
	<div class="middle-wrapper" class:nav-hidden={index < 1}>
		<div class="top-row">
			<div class="select-wrapper" class:nav-hidden={index < 7}>
				<label for="year-select">Jump to</label>
				<select
					bind:value={year}
					id="year-select"
					onchange={yearChange}
				>
					{#each yearOptions as option}
						{#if option >= "1987" && option <= "2026"}
							<option value={option}>{option}</option>
						{/if}
					{/each}
				</select>
			</div>
			<div class="btn-wrapper">
				<label for="audio-toggle">Sound</label>
				<button onclick={toggleMute} class="btn-toggle" aria-label="Toggle audio">
					{#if isAudioMuted.value}
						{@html VolumeOff}
						<span>Off</span>
					{:else}
						{@html Volume2}
						<span>On</span>
					{/if}
				</button>
			</div>
		</div>
		<div id="key" class:nav-hidden={index < 7}>
			{#each keyData as category, i}
				<div class="category category-{category.categoryShort}">
					<div class="goo-wrapper" style="filter:url(#gooey)">
						<div
							class="dot"
							role="tooltip"
							style="background-color: {colors[i]}"
							onmouseenter={() => (userHoveredIndex = i)}
							onmouseleave={() => (userHoveredIndex = null)}
						></div>
						<div
							class="desc"
							style="background-color: {colors[i]}"
							class:visible={userHoveredIndex !== null
								? i === userHoveredIndex
								: i === animatedVisibleIndex || (i === 1 && index === 7)}
						>
							<p><span>{category.categoryLong}</span></p>
							<p>{category.definition}</p>
						</div>
					</div>
				</div>
			{/each}
		</div>
	</div>
	<p id="Jan-target-nameplate" class="name" class:nav-hidden={index < 2} class:dimmed={index === 3}>Jan</p>
</div>

<style>
	.timeline-nav {
		display: flex;
		flex-direction: row;
		align-items: top;
		justify-content: space-between;
		width: 100%;
		pointer-events: none;
		padding: 0 0.5rem;
	}

	.middle-wrapper {
		display: flex;
		max-width: 400px;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding-top: 1rem;
		pointer-events: auto;
		opacity: 1;
		visibility: visible;
		transition:
			opacity 0.4s ease,
			visibility 0.4s ease;
	}

	.middle-wrapper.nav-hidden {
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
	}

	.top-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 2rem;
		width: 100%;
	}

	label {
		font-family: var(--sans);
	}

	.btn-wrapper {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-toggle {
		background-color: var(--color-gray-900);
		border: 2px solid var(--color-gray-800);
		color: var(--color-fg);
		display: flex;
		flex-direction: row;
		gap: 0.5rem;
	}

	.select-wrapper {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
	}

	.select-wrapper.nav-hidden {
		display: none;
	}

	select {
		background-color: var(--color-gray-900);
		border: 2px solid var(--color-gray-800);
		pointer-events: auto;
		color: var(--color-fg);
		background-image: url(data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20256%20448%22%20enable-background%3D%22new%200%200%20256%20448%22%3E%3Cstyle%20type%3D%22text%2Fcss%22%3E.arrow%7Bfill%3A%23FFFFFF%3B%7D%3C%2Fstyle%3E%3Cpath%20class%3D%22arrow%22%20d%3D%22M255.9%20168c0-4.2-1.6-7.9-4.8-11.2-3.2-3.2-6.9-4.8-11.2-4.8H16c-4.2%200-7.9%201.6-11.2%204.8S0%20163.8%200%20168c0%204.4%201.6%208.2%204.8%2011.4l112%20112c3.1%203.1%206.8%204.6%2011.2%204.6%204.4%200%208.2-1.5%2011.4-4.6l112-112c3-3.2%204.5-7%204.5-11.4z%22%2F%3E%3C%2Fsvg%3E%0A);
	}

	.name {
		font-family: var(--marsha);
		text-transform: uppercase;
		font-weight: 700;
		font-size: var(--18px);
		width: 120px;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-fg);
		border-radius: 1.25rem;
		border: 2px solid var(--color-bg);
		color: var(--color-bg);
		box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
		opacity: 1;
		visibility: visible;
		transition:
			opacity 0.4s ease,
			visibility 0.4s ease,
			filter 0.4s ease;
	}

	.name.nav-hidden {
		opacity: 0;
		visibility: hidden;
		pointer-events: none;
	}

	.name.dimmed {
		filter: brightness(0.4);
	}

	#key {
		width: 80%;
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		margin: 0 auto;
	}

	#key.nav-hidden {
		display: none;
	}

	.category {
		width: 14.28%;
		font-size: var(--14px);
		font-family: var(--sans);
		display: flex;
		flex-direction: column;
		align-items: center;
		position: relative;
	}

	.category span {
		font-family: var(--marsha);
		text-transform: uppercase;
		font-size: var(--16px);
	}

	.dot {
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		cursor: pointer;
		transform: scale(1);
		transition: all 0.25s linear;
	}

	.dot:hover {
		transform: scale(1.1);
	}

	.desc {
		position: absolute;
		top: 2rem; /* pushed a little below the dot */
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		flex-direction: column;
		border-radius: 1rem;
		padding: 1rem;
		z-index: 1000;
		color: var(--color-bg);
		/* make it wider than the dot */
		width: 260px;

		/* blob reveal */
		clip-path: circle(0% at 50% 0%);
		opacity: 0;
		transition:
			clip-path 0.45s ease,
			opacity 0.25s ease;
	}

	.desc.visible {
		clip-path: circle(150% at 50% 0%);
		opacity: 1;
	}

	.desc p {
		padding: 0;
		margin: 0;
	}

	.desc p:first-of-type {
		font-weight: 700;
	}

	@media(max-width: 760px) {
		.timeline-nav {
			align-items: flex-start;
			padding: 0.125rem;
		}
        .name {
            font-size: var(--16px);
			height: 2.25rem;
			width: 100px;
        }
    }

	@media(max-width: 600px) {
		.middle-wrapper {
			max-width: 260px;
			padding-top: 0.5rem;
		}

		.name {
			margin: 0.5rem 0;
		}

		#key {
			width: 100%;
		}

		.dot {
			width: 1.75rem;
			height: 1.75rem;
		}
		
		.desc {
			max-width: 200px;
		}

		label, .btn-toggle, select {
			font-size: var(--14px);
		}

		.top-row {
			gap: 1rem;
		}

		.select-wrapper, .btn-wrapper {
			gap: 0.25rem;
		}
	}

	@media(max-width: 500px) {
		.top-row {
			justify-content: center;
		}

		label {
			display: none;
		}

		.name {
			font-size: var(--14px);
			width: 80px;
		}
	}
</style>
