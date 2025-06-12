<script>
	import { getContext } from "svelte";
	import Footer from "$components/Footer.svelte";
	import Scrolly from "$components/helpers/Scrolly.svelte";
	import Network from "$components/Network.svelte";

	// const copy = getContext("copy");
	// const data = getContext("data");

	let scrollIndex = $state();
	const steps = [0,1,2,3,4,5]
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
	<div class="sticky">
		<Network {scrollIndex}/>
	</div>
	<!-- scrolly container to house steps -->
	<Scrolly bind:value={scrollIndex}>
		<!-- for each paragraph in the steps object in the copy, add another step -->
		{#each steps as step, i}
			<div class="step">
			<div class="step-inner">
				<p>{step}</p>
			</div>
			</div>
		{/each}
	</Scrolly>

	<!-- <Footer recirc={true} /> -->
</svelte:boundary>

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

	.step {
		height: 100vh;
        z-index: 1000;
        max-width: 550px;
        margin: 0 auto;
        opacity: 1;
        pointer-events: none;
        z-index: 1000;
	}

	.step-inner {
        padding: 2rem; 
        border-radius: 3px;
        position: relative;
		background: white;
		border: 1px solid black;
		z-index: 1000;
    }

	.step p {
        text-align: left;
        max-width: 600px;
        font-size: var(--18px);
        line-height: 1.65;
        background: none;
        z-index: 1000;
        margin: 0;
        pointer-events: auto;
    }
</style>
