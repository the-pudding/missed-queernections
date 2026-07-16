<script>
    import { getContext, onMount } from "svelte";
    import Footer from "$components/Footer.svelte";
    import Intro from "$components/Intro.svelte";
    import Network from "$components/Network.svelte";
    import Timeline from "$components/NEWTimeline.svelte";
    import { userId, addedEvents } from "$runes/misc.svelte.js";
    // Import our shared runes
    import { currentStep, totalSteps, pastNetwork } from "$runes/misc.svelte.js";

    import generateId from "$utils/generateId.js";

    let introHeight = $state(0);
	let introComplete = $state(false);

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

    // 1. Reactive trigger: Automatically scrolls to the timeline when the intro finishes
    $effect(() => {
        if (currentStep.value >= totalSteps.value && totalSteps.value > 0) {
			introComplete = true;
            scrollToTimeline();
        }
    });

    $effect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("added_events", JSON.stringify($addedEvents));
        }
    });

    function scrollToTimeline() {
        const el = document.getElementById("timeline-section");
        el?.scrollIntoView({ behavior: "smooth" });
    }
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
    <!-- No props needed here anymore, Intro just updates the global rune! -->
    <Intro />
    
    <div class="network-container" bind:clientHeight={introHeight}>
        <Network scrollIndex={currentStep.value} pastNetwork={pastNetwork.value} {introComplete} />
    </div>

    <div id="timeline-section">
        <Timeline {introHeight} />
    </div>
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