<script>
	import {
		addedEvents,
		instructionStep,
		activeSection,
		visitors
	} from "$runes/misc.svelte.js";
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
		$visitors.filter((v) => (v.events ?? []).some((e) => $addedEvents.includes(e))).length
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
		<p class="connection-count">
			{#if $addedEvents.length === 0}
				Add events to see your connections
			{:else}
				You've made  
				{connectionCount}
				{connectionCount === 1 ? "queernection" : "queernections"}
			{/if}
		</p>
		<p class="panel-title">Showing your shared events between you and the last 99 people to read this story</p>
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
		<button onclick={clearAll} class="remove-all">Clear all events</button>
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
		background: rgba(25 ,25 ,25 ,0.975);
		z-index: 1000;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		justify-content: space-between;
		padding: 5rem 2rem 2rem;
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
		width: 12rem;
		height: 3rem;
		top: -2.75rem;
		left: 50%;
		transform: translateX(-50%);
		background: var(--color-gray-900);
		border: 2px solid var(--color-gray-800);
		border-radius: 4px;
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		text-transform: uppercase;
		font-family: var(--marsha);
		font-size: var(--18px);
		color: var(--color-fg);
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
		align-items: center;
	}

	.connection-count {
		font-size: var(--36px);
		line-height: 1;
		font-weight: 700;
		font-family: var(--marsha);
		text-transform: uppercase;
		margin: 0;
	}

	.panel-title {
		font-size: var(--14px);
		margin: 0;
	}

	/* Network */
	.network-wrapper {
		height: 38vh;
		width: 100%;
		flex-shrink: 0;
	}

	/* Bottom group */
	.bottom-info {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		max-width: 500px;
		width: 100%;
		flex-shrink: 0;
	}

	.events-label {
		font-size: var(--16px);
		font-family: var(--marsha);
		font-weight: 700;
		text-transform: uppercase;
		margin: 0;
		width: 100%;
	}

	.event-list {
		list-style: none;
		margin: 0;
		padding: 0;
		max-height: 10rem;
		overflow-y: auto;
		border: 1px solid var(--color-fg);
		border-radius: 4px;
		width: 100%;
	}

	.event-list li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		font-family: var(--sans);
		font-size: var(--14px);
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
		color: var(--color-fg);
	}

	.remove-btn:hover {
		opacity: 1;
	}

	.remove-all {
		width: 100%;
		background: var(--color-fg);
		font-family: var(--marsha);
		text-transform: uppercase;
		font-size: var(--16px);
		font-weight: 700;
		padding: 0.5rem;
		max-width: 300px;
		margin-top: 1rem;
	}

	p {
		font-size: var(--16px);
		margin: 0;
	}
</style>
