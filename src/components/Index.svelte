<script>
    import { getContext, onMount } from "svelte";
    import Header from "$components/Header.svelte";
    import Footer from "$components/Footer.svelte";
    import Intro from "$components/Intro.svelte";
    import Network from "$components/Network.svelte";
    import Timeline from "$components/NEWTimeline.svelte";
    import {
        userId,
        addedEvents,
        currentStep,
        totalSteps,
        pastNetwork,
        introComplete,
        isAudioMuted,
        audioUnlocked
    } from "$runes/misc.svelte.js";

    import generateId from "$utils/generateId.js";

    let introHeight = $state(0);
    let ignoreReset = false;

    // Handles global audio configuration and unlocks browser audio policy
    function handleStartExperience(withAudio) {
        isAudioMuted.value = !withAudio;
        audioUnlocked.value = true;

        if (withAudio) {
            const silentAudio = new Audio();
            silentAudio.play().catch(() => {});
        }
    }

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

        const handleScrollReset = () => {
            if (ignoreReset) return;

            if (window.scrollY < 15 && introComplete.value) {
                introComplete.value = false;
            }
        };

        window.addEventListener("scroll", handleScrollReset, { passive: true });
        return () => window.removeEventListener("scroll", handleScrollReset);
    });

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

        if (!introComplete.value) {
            window.addEventListener("wheel", preventDefault, { passive: false });
            window.addEventListener("touchmove", preventDefault, { passive: false });
            window.addEventListener("keydown", preventScrollKeys, { passive: false });
        }

        return () => {
            window.removeEventListener("wheel", preventDefault);
            window.removeEventListener("touchmove", preventDefault);
            window.removeEventListener("keydown", preventScrollKeys);
        };
    });

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
        const DURATION = 1200; 
        
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
    <!-- <Header /> -->
    <Intro onstart={handleStartExperience} />
    
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