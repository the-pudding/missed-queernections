<script>
	import { getContext, onMount } from "svelte";
	import Footer from "$components/Footer.svelte";
	import Intro from "$components/Intro.svelte";
	import Network from "$components/Network.svelte";
	import Timeline from "$components/NEWTimeline.svelte";
	import { userId, addedEvents } from "$runes/misc.svelte.js";
	import { currentStep, pastNetwork } from "$runes/misc.svelte.js";

	import generateId from "$utils/generateId.js";

	let introHeight = $state(0);

	onMount(() => {
		let storedId = localStorage.getItem("user_id");

		if (!storedId) {
			storedId = generateId();
			localStorage.setItem("user_id", storedId);
		}

		userId.set(storedId);
		console.log("User ID:", $userId);

		let storedEvents = localStorage.getItem("added_events");

		if (storedEvents) {
			try {
				addedEvents.set(JSON.parse(storedEvents));
			} catch (e) {
				console.error("Failed to parse added_events from localStorage:", e);
			}
		}
	});

	$effect(() => {
		if (typeof window !== "undefined") {
			localStorage.setItem("added_events", JSON.stringify($addedEvents));
		}
	});
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
	<Intro />
	<div bind:clientHeight={introHeight}>
		<div class="network-container">
			<Network scrollIndex={currentStep} {pastNetwork} />
		</div>
	</div>

	<!-- <div class="temp"> -->
	<Timeline {introHeight} />
	<!-- </div> -->

	<!-- <Footer recirc={true} /> -->
</svelte:boundary>

<style>
	 .network-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 70%;
        z-index: 1;
        pointer-events: none;
    }
</style>
