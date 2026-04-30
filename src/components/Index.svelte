<script>
	import { getContext, onMount } from "svelte";
	import Footer from "$components/Footer.svelte";
	import Intro from "$components/Intro.svelte";
	import Timeline from "$components/NEWTimeline.svelte";
	import { userId, addedEvents } from "$runes/misc.svelte.js";

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
	<div bind:clientHeight={introHeight}>
		<Intro />
	</div>
	<Timeline {introHeight} />

	<!-- <Footer recirc={true} /> -->
</svelte:boundary>

<style>
	
</style>
