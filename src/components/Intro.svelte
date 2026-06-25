<script>
	import { getContext } from "svelte";
	import Scrolly from "$components/helpers/Scrolly.svelte";
	import Network from "$components/Network.svelte";

	const copy = getContext("copy");
	let scrollIndex = $state(0);

	let scrollY = $state(0);
	let introHeight = $state(0);
	const pastNetwork = $derived(introHeight > 0 && scrollY >= introHeight);
</script>

<svelte:window bind:scrollY />

<section id="intro" bind:clientHeight={introHeight}>
	<div class="sticky">
		<Network {scrollIndex} {pastNetwork} />
	</div>
	<!-- Pull steps up to overlap the sticky so step 0 is visible on load -->
	<div class="scrolly-container">
		<Scrolly bind:value={scrollIndex}>
			<!-- for each paragraph in the steps object in the copy, add another step -->
			{#each copy.scrollSteps as step, i}
				<div class="step">
					<div class="step-inner">
						<p>{@html step.value}</p>
					</div>
				</div>
			{/each}
		</Scrolly>
	</div>
</section>

<style>
	.sticky {
		width: 100%;
		height: 100svh;
		position: sticky;
		top: 0;
		left: 0;
		z-index: 1;
		overflow: hidden;
	}

	.scrolly-container {
		margin-top: -50svh;
	}

	.step {
		height: 100svh;
		z-index: 1000;
		max-width: 550px;
		margin: 0 auto;
		opacity: 1;
		pointer-events: none;
		z-index: 1000;
	}

	.step-inner {
		padding: 2rem;
		border-radius: 4px;
		position: relative;
		background-color: var(--color-bg);
		border: 2px solid var(--color-gray-800);
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
		z-index: 1000;
	}

	.step p {
		text-align: left;
		max-width: 600px;
		font-family: var(--sans);
		font-size: var(--18px);
		line-height: 1.65;
		background: none;
		z-index: 1000;
		margin: 0;
		pointer-events: auto;
	}
</style>
