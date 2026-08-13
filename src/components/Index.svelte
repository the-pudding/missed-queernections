<script>
    import { getContext, onMount } from "svelte";
    import Timeline from "$components/NEWTimeline.svelte";
    import {
        userId,
        addedEvents
    } from "$runes/misc.svelte.js";

    import generateId from "$utils/generateId.js";

    onMount(() => {
        let storedId = localStorage.getItem("user_id");

        if (!storedId) {
            storedId = generateId();
            localStorage.setItem("user_id", storedId);
        }

        userId.set(storedId);

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
    <!-- <Header /> -->
    <!-- <Intro onstart={handleStartExperience} /> -->
    
    <!-- <div class="network-container" bind:clientHeight={introHeight}>
        <Network 
            scrollIndex={currentStep.value} 
            pastNetwork={pastNetwork.value} 
            introComplete={introComplete.value} 
        />
    </div> -->

    <div id="timeline-section">
        <Timeline />
    </div>

    <!-- <Footer /> -->
</svelte:boundary>

<style>
    .network-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 80%;
        z-index: 1;
        pointer-events: none;
    }
</style>