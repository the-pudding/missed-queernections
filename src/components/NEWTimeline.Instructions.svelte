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
		max-width: 400px;
	}

	p {
		font-family: var(--sans);
		font-size: var(--18px);
		margin: 0;
	}
</style>
