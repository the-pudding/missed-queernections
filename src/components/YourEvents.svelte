<script>
	import {
		addedEvents,
		instructionStep,
		activeSection
	} from "$runes/misc.svelte.js";
	import { fakeVisitors } from "$data/fakeVisitors.js";
	import { ChevronDown } from "@lucide/svelte";
	import UserNetwork from "$components/UserNetwork.svelte";

	let listVisible = $state(false);

	function toggleShow() {
		listVisible = !listVisible;
	}

	function clearAll() {
		$addedEvents = [];
		listVisible = false;
	}

	function removeEvent(event) {
		$addedEvents = $addedEvents.filter((e) => e !== event);
	}

	const connectionCount = $derived(
		fakeVisitors.filter((v) => v.some((e) => $addedEvents.includes(e))).length
	);

	$effect(() => {
		if (!listVisible) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	});
</script>

<div
	class="events-wrapper"
	class:wiggle={$instructionStep == 5}
	style="transform: translateY({listVisible
		? 0
		: $activeSection == 'timeline'
			? '100%'
			: '120%'})"
>
	<button
		class="show-toggle"
		onclick={toggleShow}
		style="top: {listVisible ? '-0.25rem' : '-2.75rem'}"
	>
		<p>Your Events</p>
		<div
			class="chevron-wrapper"
			style="transform: rotate({listVisible ? 0 : 180}deg);"
		>
			<ChevronDown />
		</div>
		<p class="count" style="top: {listVisible ? '2rem' : '-0.5rem'}">
			{$addedEvents.length}
		</p>
	</button>

	<div class="top-info">
		<p class="panel-title">You + the last 99 people to read this story</p>

		<p class="connection-count">
			{#if $addedEvents.length === 0}
				Add events to see your connections
			{:else}
				{connectionCount}
				{connectionCount === 1 ? "person shares" : "people share"} events with you
			{/if}
		</p>
	</div>

	<div class="network-wrapper">
		<UserNetwork />
	</div>

	<div class="bottom-info">
		{#if $addedEvents.length > 0}
			<p class="events-label">Your events ({$addedEvents.length})</p>
			<ul class="event-list">
				{#each $addedEvents as event}
					<li>
						<span>{event}</span>
						<button
							class="remove-btn"
							onclick={() => removeEvent(event)}
							aria-label="Remove {event}">✕</button
						>
					</li>
				{/each}
			</ul>
		{/if}
		<button onclick={clearAll} class="remove-all">Clear your events</button>
	</div>
</div>

<style>
	.events-wrapper {
		font-family: var(--sans);
		position: fixed;
		top: 0;
		right: 0;
		width: 100%;
		height: 100vh;
		background: rgba(255, 255, 255, 0.98);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: clamp(0.5rem, 5vh, 5rem);
		padding: 4.5rem 2rem 1.5rem;
		transition: transform 0.5s ease-out;
		box-sizing: border-box;
	}

	@keyframes wiggle {
		0%,
		100% {
			transform: translateX(-50%);
		}
		25% {
			transform: translateX(-51%);
		}
		75% {
			transform: translateX(-49%);
		}
	}

	.show-toggle {
		position: absolute;
		width: 10rem;
		height: 3rem;
		top: -2.75rem;
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-bg);
		border: 2px solid var(--color-fg);
		border-radius: 4px;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		text-transform: uppercase;
	}

	.wiggle .show-toggle {
		animation: wiggle 0.5s ease-in-out infinite;
	}

	:global(.show-toggle svg) {
		width: 2rem;
		height: 2rem;
	}

	.count {
		position: absolute;
		right: -0.5rem;
		background: var(--color-fg);
		width: 1.25rem;
		height: 1.25rem;
		border-radius: 50%;
		color: var(--color-bg);
		font-size: 10px;
		font-weight: 700;
		padding: 0;
		margin: 0;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.chevron-wrapper {
		transition: transform 150ms ease;
	}

	/* Top group */
	.top-info {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		text-align: center;
		flex-shrink: 0;
	}

	.connection-count {
		font-size: var(--12px);
		font-weight: 700;
		text-transform: uppercase;
		margin: 0;
	}

	.panel-title {
		font-size: var(--16px);
		font-weight: 700;
		text-transform: uppercase;
		margin: 0;
	}

	/* Network */
	.network-wrapper {
		height: 38vh;
		flex-shrink: 0;
	}

	/* Bottom group */
	.bottom-info {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 420px;
		width: 100%;
		margin: 0 auto;
		flex-shrink: 0;
	}

	.events-label {
		font-size: var(--12px);
		font-weight: 700;
		text-transform: uppercase;
		margin: 0;
	}

	.event-list {
		list-style: none;
		margin: 0;
		padding: 0.1rem 0.5rem;
		max-height: 12rem;
		overflow-y: auto;
		border: 1px solid var(--color-fg);
	}

	.event-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.2rem 0;
		font-family: var(--sans);
		font-size: var(--12px);
	}

	.event-list li + li {
		border-top: 1px solid color-mix(in srgb, var(--color-fg) 15%, transparent);
	}

	.remove-btn {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 10px;
		padding: 0 0 0 0.5rem;
		opacity: 0.5;
		flex-shrink: 0;
	}

	.remove-btn:hover {
		opacity: 1;
	}

	.remove-all {
		width: 100%;
		border: 1px solid var(--color-fg);
		background: transparent;
		text-transform: uppercase;
		font-size: var(--12px);
		font-weight: 700;
		padding: 0.4rem 0;
	}

	p {
		font-size: var(--12px);
		margin: 0;
	}
</style>
