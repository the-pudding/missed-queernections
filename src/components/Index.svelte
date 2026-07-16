<script>
    import { getContext, onMount } from "svelte";
    import Footer from "$components/Footer.svelte";
    import Intro from "$components/Intro.svelte";
    import Network from "$components/Network.svelte";
    import Timeline from "$components/NEWTimeline.svelte";
    import { userId, addedEvents } from "$runes/misc.svelte.js";
    import { currentStep, totalSteps, pastNetwork, introComplete } from "$runes/misc.svelte.js";

    import generateId from "$utils/generateId.js";

    let introHeight = $state(0);
    
    // Safety lock flag to prevent the window scroll animation from accidentally tripping the top-scroll reset rule
    let ignoreReset = false;

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

        // RESET MECHANISM: Resets introComplete when the user manually scrolls back to the very top
        const handleScrollReset = () => {
            if (ignoreReset) return;

            if (window.scrollY < 15 && introComplete.value) {
                introComplete.value = false;
            }
        };

        window.addEventListener("scroll", handleScrollReset, { passive: true });
        return () => window.removeEventListener("scroll", handleScrollReset);
    });

    // JANK-FREE INPUT SCROLL LOCK: Intercepts manual inputs rather than thrashing CSS layout overflows
    $effect(() => {
        if (typeof window === "undefined") return;

        const preventDefault = (e) => {
            e.preventDefault();
        };

        const preventScrollKeys = (e) => {
            const keys = [" ", "PageUp", "PageDown", "End", "Home", "ArrowUp", "ArrowDown"];
            if (keys.includes(e.key)) {
                e.preventDefault();
            }
        };

        // If the intro isn't finished, bind non-passive blocking interceptors
        if (!introComplete.value) {
            window.addEventListener("wheel", preventDefault, { passive: false });
            window.addEventListener("touchmove", preventDefault, { passive: false });
            window.addEventListener("keydown", preventScrollKeys, { passive: false });
        }

        // Svelte clean-up function automatically destroys handlers when state updates or unmounts
        return () => {
            window.removeEventListener("wheel", preventDefault);
            window.removeEventListener("touchmove", preventDefault);
            window.removeEventListener("keydown", preventScrollKeys);
        };
    });

    // Reactive trigger: Automatically schedules the scroll when introComplete flips to true
    $effect(() => {
        if (introComplete.value) {
            scrollToTimeline();
        }
    });

    $effect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("added_events", JSON.stringify($addedEvents));
        }
    });

    // CUSTOM SMOOTH SCROLLER: Programmatic animation control over velocity and timeline duration
    function customScrollTo(targetY, duration) {
        const startY = window.scrollY;
        const difference = targetY - startY;
        let startTime = null;

        function easeInOutCubic(t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }

        function animateScroll(currentTime) {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            
            window.scrollTo(0, startY + (difference * easeInOutCubic(progress)));

            if (timeElapsed < duration) {
                requestAnimationFrame(animateScroll);
            }
        }

        requestAnimationFrame(animateScroll);
    }

    function scrollToTimeline() {
        ignoreReset = true; 
        
        // --- CUSTOM SPEED CONFIGURATION ---
        const DURATION = 1200; 
        
        // Delay timing: 850ms allows the Nameplate's 0.8s CSS transit to finish settling first
        setTimeout(() => {
            const el = document.getElementById("timeline-section");
            const yOffset = el ? (el.getBoundingClientRect().top + window.scrollY) : window.innerHeight;
            
            customScrollTo(yOffset, DURATION);
            
            setTimeout(() => {
                ignoreReset = false;
            }, DURATION + 100);
        }, 850);
    }
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
    <Intro />
    
    <div class="network-container" bind:clientHeight={introHeight}>
        <Network 
            scrollIndex={currentStep.value} 
            pastNetwork={pastNetwork.value} 
            introComplete={introComplete.value} 
        />
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