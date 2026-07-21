<script>
	import { getContext } from "svelte";
	import { fly } from "svelte/transition";
	const copy = getContext("copy");

	let { index = -1 } = $props();
</script>

{#each copy.timelineInstructions as step, i}
	{#if i === index}
		<div class="step" transition:fly={{ y: 10, duration: 200 }}>
			<p>{@html step.text}</p>
		</div>
	{/if}
{/each}

<style>
	.step {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		padding: 1rem;
		border-radius: 3px;
		/* background: var(--color-gray-100);
		border: 1px solid black; */
		max-width: 500px;
	}

	:global(.interaction-span) {
		color: var(--color-gray-300);
		font-style: italic;
		font-size: var(--14px);
		display: block;
		margin: 1rem 0;
	}

	p {
		font-family: var(--sans);
		font-size: var(--22px);
		margin: 0;
	}

	:global(.plus-icon, .headphone-icon, .quote-icon) {
		font-weight: 700;
		margin-left: 1.125rem;
		position: relative;
		white-space: nowrap;
	}

	:global(.plus-icon::before, .headphone-icon::before, .quote-icon::before) {
		content: "";
		position: absolute;
		top: 55%;
		transform: translateY(-50%);
		left: -1.125rem;
		width: 1rem;
		height: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 50%;
		background-color: var(--color-gray-300);
		background-image: url("../svg/plus-icon.svg");
		background-position: center;
    	background-repeat: no-repeat;
		line-height: 1;
	}

	:global(.plus-icon::before) {
		background-image: url("../svg/plus-icon.svg");
		background-size: contain;
	}

	:global(.headphone-icon::before) {
		background-image: url("../svg/icons/headphones.svg");
		background-size: 60%;
	}

	:global(.quote-icon::before) {
		background-image: url("../svg/icons/quote.svg");
		background-size: 60%;
	}

	@media(max-width: 760px) {
		p {
			font-size: var(--14px);
		}
			
	}
</style>
