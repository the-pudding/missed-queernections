<script>
    import { getContext } from "svelte";
    import Network from "$components/Network.svelte";
    import wordmark from "$svg/wordmark_script_stacked_plain.svg";
    import title from "$svg/title.svg";

    const copy = getContext("copy");
    
    // Core State
    let currentStep = $state(0);
    let isPlaying = $state(false);
    let hasStarted = $state(false);
    let audioEl = $state(null);

    // Derived States
    const totalSteps = copy.scrollSteps.length;
    const pastNetwork = $derived(currentStep >= totalSteps - 1);
    const currentAudioSrc = $derived(`/assets/audio/intro-${currentStep}.mp3`);

    let currentTime = $state(0);
    let duration = $state(0);
    const audioProgress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

    // Reactive effect to handle track changes when the step increments
    $effect(() => {
        // 1. Explicitly read the derived source so Svelte tracks this effect's dependency on it
        const track = currentAudioSrc; 

        // 2. Only attempt to play if the experience has started and is currently unpaused
        if (hasStarted && isPlaying && audioEl) {
            audioEl.load(); // Force the audio element to load the new source
            audioEl.play().catch(err => {
                console.error("Audio play blocked or interrupted:", err);
            });
        }
    });

    function startExperience() {
        hasStarted = true;
        isPlaying = true;
    }

    function togglePlay() {
        if (!hasStarted) return startExperience();
        isPlaying = !isPlaying;
        if (audioEl) {
            if (isPlaying) audioEl.play();
            else audioEl.pause();
        }
    }

    function handleAudioEnded() {
        if (currentStep < totalSteps - 1) {
            currentStep++;
        } else {
            isPlaying = false; // End of the narrative
        }
    }

    // Handles Left / Right Tap Navigation (Instagram Story style)
    function handleOverlayTap(e) {
        // Prevent step jumping if the user clicked an actual button or link
        if (e.target.closest('button') || e.target.closest('a')) return;
        
        // Only allow tap navigation once the experience starts
        if (!hasStarted) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isRightSide = clickX > rect.width / 2;

        if (isRightSide) {
            if (currentStep < totalSteps - 1) {
                currentStep++;
            }
        } else {
            if (currentStep > 0) {
                currentStep--;
            }
        }
    }
</script>

<!-- Hidden Audio Element -->
{#if hasStarted}
    <audio 
        bind:this={audioEl} 
        src={currentAudioSrc} 
        bind:currentTime={currentTime}
        bind:duration={duration}
        onended={handleAudioEnded}
    ></audio>
{/if}

<section id="intro">
    <!-- Visual Layer -->
    <div class="network-container">
        <Network scrollIndex={currentStep} {pastNetwork} />
    </div>

    <!-- Narrative Overlay + Tap Zones -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="narrative-container" onclick={handleOverlayTap}>
        {#if !hasStarted}
            <!-- Initial User Gesture Prompt -->
            <div class="start-prompt">
                <div class="wordmark">
                    <a href="https://pudding.cool" aria-label="The Pudding" target="_self"
                        >{@html wordmark}</a
                    >
                </div>
                <div class="title">
                    {@html title}
                    <div class="inset-right">
                        <p>How Pop Culture Coded Our Coming Out</p>
                        <button onclick={startExperience} class="btn-start">Start Audio Story</button>
                    </div>
                </div>
            </div>
        {:else}
            <!-- Persistent Top Bar: Progress Segments & Controls -->
            <div class="step-top">
                <div class="step-inner">
                    <div class="progress-segments">
                        {#each copy.scrollSteps as _, i}
                            <div class="progress-bar">
                                <div 
                                    class="progress-fill" 
                                    style="width: {i < currentStep ? 100 : i === currentStep ? audioProgress : 0}%"
                                ></div>
                            </div>
                        {/each}
                    </div>
                    <div class="controls">
                        <button onclick={togglePlay}>
                            {isPlaying ? "⏸" : "▶"}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Contextual Bottom Subtitles: Display only the active step text -->
            {#each copy.scrollSteps as step, i}
                {#if i === currentStep}
                    <div class="active-step step-bottom">
                        <div class="step-inner">
                            <p>{@html step.value}</p>
                        </div>
                    </div>
                {/if}
            {/each}
        {/if}
    </div>
</section>

<style>
    #intro {
        position: relative;
        width: 100%;
        height: 100svh;
        overflow: hidden;
        pointer-events: none;
    }

    .network-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 70%;
        z-index: 1;
        pointer-events: none;
    }

    .narrative-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2;
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: auto;
        cursor: pointer; /* Visual feedback for story navigation */
    }

    .start-prompt {
        width: 100%;
        height: 100svh;
        position: absolute;
        bottom: -3px;
        left: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-start;
        padding: 0 2rem;
        cursor: default; /* Keeps natural cursor over intro screen */
    }

    .title {
        width: 100%;
        position: relative;
    }

    .inset-right {
        position: absolute;
        top: 0;
        right: 0;
        font-family: var(--sans);
        max-width: 32%;
    }

    .inset-right p {
        font-size: var(--36px);
        padding: 0;
    }

    :global(.title svg) {
        width: 100%;
        height: auto;
    }

    .wordmark {
        max-width: 160px;
        margin-bottom: 2rem;
    }

    .step-bottom {
        position: absolute;
        bottom: 0;
        width: 100%;
        display: flex;
        justify-content: center;
        pointer-events: auto;
    }

    .step-bottom p {
        font-family: var(--sans, sans-serif);
        font-size: var(--24px);
        max-width: 700px;
        padding: 1rem;
        text-align: left;
        line-height: 1.65;
        margin: 0;
    }

    .step-top {
        position: absolute;
        top: 0;
        width: 100%;
        padding: 1rem;
        box-sizing: border-box;
        pointer-events: auto;
    }

    .step-inner {
        max-width: 600px;
        margin: 0 auto;
    }

    .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.5rem;
    }

    .progress-segments {
        display: flex;
        gap: 6px;
        width: 100%;
    }

    .progress-bar {
        flex: 1;
        height: 6px;
        background-color: var(--color-gray-800);
        border-radius: 2px;
        overflow: hidden;
    }

    .progress-fill {
        height: 100%;
        background-color: var(--color-white);
        transition: width 0.1s linear;
    }

    .btn-start {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
        background: #000;
        color: #fff;
        border: none;
        cursor: pointer;
        border-radius: 4px;
    }
</style>