<script>
    import { getContext } from "svelte";
    import wordmark from "$svg/wordmark_script_stacked_plain.svg";
    import title from "$svg/title.svg";
    import { currentStep, totalSteps } from "$runes/misc.svelte.js";

    const copy = getContext("copy");
    
    totalSteps.value = copy.scrollSteps.length;

    // Core Local Component State
    let isPlaying = $state(false);
    let hasStarted = $state(false);
    let audioEl = $state(null);

    // Derived States
    const currentAudioSrc = $derived(`/assets/audio/intro-${currentStep.value}.mp3`);

    let currentTime = $state(0);
    let duration = $state(0);
    const audioProgress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

    // Reactive effect to handle track changes when the step increments
    $effect(() => {
        const track = currentAudioSrc; 

        if (hasStarted && isPlaying && audioEl && currentStep.value < totalSteps.value) {
            audioEl.load(); 
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
        currentStep.value++;
        
        if (currentStep.value >= totalSteps.value) {
            isPlaying = false; 
        }
    }

    // Handles Left / Right Tap Navigation (Instagram Story style)
    function handleOverlayTap(e) {
        if (e.target.closest('button') || e.target.closest('a')) return;
        if (!hasStarted) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isRightSide = clickX > rect.width / 2;

        if (isRightSide) {
            currentStep.value++;
            // If we are still within valid audio bounds, force play the next track
            if (currentStep.value < totalSteps.value) {
                isPlaying = true;
            }
        } else {
            if (currentStep.value > 0) {
                currentStep.value--;
                isPlaying = true; // Force play audio when clicking back
            }
        }
    }
</script>

<!-- Hidden Audio Element -->
{#if hasStarted && currentStep.value < totalSteps.value}
    <audio 
        bind:this={audioEl} 
        src={currentAudioSrc} 
        bind:currentTime={currentTime}
        bind:duration={duration}
        onended={handleAudioEnded}
    ></audio>
{/if}

<section id="intro">
    <!-- Narrative Overlay + Tap Zones -->
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="narrative-container" onclick={handleOverlayTap}>
        {#if !hasStarted}
            <!-- Initial User Gesture Prompt -->
            <div class="start-prompt">
                <div class="top">
                    <div class="wordmark">
                        <a href="https://pudding.cool" aria-label="The Pudding" target="_self"
                            >{@html wordmark}</a
                        >
                    </div>
                    <button onclick={startExperience} class="btn-start">Start Audio Story</button>
                </div>
                <div class="title">
                    {@html title}
                    <div class="inset-right">
                        <p>How Pop Culture Coded Our Coming Out</p>
                    </div>
                </div>
            </div>
        {:else}
            <!-- Persistent Top Bar: Progress Segments & Controls -->
            <div class="controls-wrapper">
                <div class="progress-segments">
                    {#each copy.scrollSteps as _, i}
                        <div class="progress-bar">
                            <div 
                                class="progress-fill" 
                                style="width: {i < currentStep.value ? 100 : i === currentStep.value ? audioProgress : 0}%"
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

            <!-- Contextual Bottom Subtitles: Display only the active step text -->
            {#each copy.scrollSteps as step, i}
                {#if i === currentStep.value}
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
        margin-bottom: 4rem;
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
        cursor: pointer;
    }

    .start-prompt {
        width: 100%;
        height: 100svh;
        position: absolute;
        bottom: -3px;
        left: 0;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: flex-start;
        padding: 0 2rem;
        cursor: default;
    }

    .top {
        display: flex;
        flex-direction: row;
        align-items: center;
        width: 100%;
        justify-content: space-between;
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
        margin-top: 1rem;
    }

    .step-bottom {
        position: absolute;
        bottom: 2rem;
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

    .controls-wrapper {
        position: absolute;
        top: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        padding: 0.5rem;
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
        background: var(--color-fg);
        color: var(--color-bg);
        border: none;
        cursor: pointer;
        border-radius: 4px;
    }
</style>