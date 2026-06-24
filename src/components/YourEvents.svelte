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
		class:list-visible={listVisible}
		onclick={toggleShow}
		style="top: {listVisible ? '-0.25rem' : '-2.75rem'};"
	>
		<p>{listVisible ? "Timeline" : "Your Events"}</p>
		<div
			class="chevron-wrapper"
			style="transform: rotate({listVisible ? 0 : 180}deg);"
		>
			<ChevronDown />
		</div>
		<p class="count" style="top: {listVisible ? '2.5rem' : '-0.5rem'}">
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
						<button
							class="remove-btn"
							onclick={() => removeEvent(event)}
							aria-label="Remove {event}">
								<p>{event}</p>
								<div class="strikethrough"></div>
								<svg
									width="12"
									height="12"
									viewBox="-5 -5 10 10"
									class="icon"
									style="transform: rotate(45deg)"
								>
									<line
										x1="0"
										y1="-5"
										x2="0"
										y2="5"
										stroke="white"
										stroke-width="2"
										stroke-linecap="round"
									/>
									<line
										x1="-5"
										y1="0"
										x2="5"
										y2="0"
										stroke="white"
										stroke-width="2"
										stroke-linecap="round"
									/>
								</svg>
							</button
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
		background: rgba(25 ,25 ,25 ,0.99);
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
		height: 3.5rem;
		top: -2.75rem;
		left: 50%;
		transform: translate(-50%, 0);
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
		padding: 0 0 8px 0;
		transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.show-toggle.list-visible {
		padding: 8px 0 0 0;
	}

	.show-toggle:hover {
		transform: translate(-50%, -4px);
	}

	.show-toggle.list-visible:hover {
		transform: translate(-50%, 4px);
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
		border: 2px solid var(--color-gray-800);
		border-radius: 4px;
		width: 100%;
	}

	.event-list li {
		display: flex;
		align-items: flex-start;
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
		width: 100%;
		height: 100%;
		border: none;
		cursor: pointer;
		font-size: 10px;
		padding: 0.25rem 0 0.25rem 0.5rem;
		opacity: 1;
		color: var(--color-fg);
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		align-items: center;
		position: relative;
	}

	.remove-btn:hover {
		opacity: 0.5;
	}

	.remove-btn:hover .strikethrough {
		opacity: 1;
	}

	.strikethrough {
		opacity: 0;
		position: absolute;
		left: 0;
		top: 50%;
		width: 100%;
		border-bottom: 1px solid var(--color-fg);
	}

	.remove-all {
		background: var(--color-fg);
		font-family: var(--marsha);
		text-transform: uppercase;
		font-size: var(--16px);
		font-weight: 700;
		padding: 1rem 1.2rem 0.8rem 1.2rem;
		margin-top: 1rem;
		border-radius: 50px;
		transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.remove-all:hover {
		transform: translateY(-4px);
	}

	p {
		font-size: var(--16px);
		margin: 0;
	}

	@media(max-width: 760px) {
		.show-toggle {
			width: 10rem;
		}
		p, .events-label, .remove-all {
			font-size: var(--14px);
		}

		.connection-count {
			font-size: var(--24px);
		}
	}
</style>
