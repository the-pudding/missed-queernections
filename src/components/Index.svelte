<script>
    import { getContext, onMount } from "svelte";
    import Timeline from "$components/NEWTimeline.svelte";
    import {
        userId,
        addedEvents,
        famous // <-- 1. Import famous
    } from "$runes/misc.svelte.js";
    import celebrityIds from "$data/celebrityIds.csv";
    import generateId from "$utils/generateId.js";
    import * as db from "$utils/database.js";

    onMount(async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const customId = urlParams.get("id") || urlParams.get("user");

        let storedId = localStorage.getItem("user_id");

        if (customId) {
            storedId = customId;
            localStorage.setItem("user_id", storedId);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        } else if (storedId) {
            console.log("💾 [LocalStorage Found] Loaded existing user_id:", storedId);
        } else {
            storedId = generateId();
            localStorage.setItem("user_id", storedId);
        }

        userId.set(storedId);

        // --- CELEBRITY LOOKUP ---
        const match = celebrityIds.find(
            (row) => String(row.id).trim() === String(storedId).trim()
        );
        const famousValue = match ? (match.famous || match.name) : null;

        if (famousValue) {
            localStorage.setItem("famous", famousValue);
            famous.set(famousValue); // <-- 2. Update the store
        } else {
            localStorage.removeItem("famous");
            famous.set(null); // <-- 2. Reset if standard user
        }

        // --- INITIAL DB SYNC ---
        try {
            await db.insert({ 
                user_id: storedId, 
                events: $addedEvents, 
                famous: famousValue 
            });
        } catch (err) {
            console.error("❌ [DB Insert Failed]:", err);
        }

        // Load existing events
        let storedEvents = localStorage.getItem("added_events");
        if (storedEvents) {
            try {
                addedEvents.set(JSON.parse(storedEvents));
            } catch (e) {
                console.error("Failed to parse added_events from localStorage:", e);
            }
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