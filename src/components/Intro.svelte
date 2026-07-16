<script>
    import { getContext } from "svelte";
    import wordmark from "$svg/wordmark_script_stacked_plain.svg";
    import title from "$svg/title.svg";
    import Play from '@lucide/svelte/icons/play';
    import Pause from '@lucide/svelte/icons/pause';
    import VolumeOff from '@lucide/svelte/icons/volume-off';
    import Volume2 from '@lucide/svelte/icons/volume-2';
    import { currentStep, totalSteps, introComplete } from "$runes/misc.svelte.js";

    const copy = getContext("copy");
    
    totalSteps.value = copy.scrollSteps.length;

    // Core Local Component State
    let isPlaying = $state(false);
    let hasStarted = $state(false);
    let isMuted = $state(false); // New state to track if the audio is silenced
    let audioEl = $state(null);

    // Derived States
    const currentAudioSrc = $derived(`/assets/audio/intro-${currentStep.value}.mp3`);

    let currentTime = $state(0);
    let duration = $state(0);
    const audioProgress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

    // Reactive effect to handle track changes when the step increments
    $effect(() => {
        const track = currentAudioSrc; 

        if (hasStarted && isPlaying && audioEl && !introComplete.value) {
            audioEl.load(); 
            audioEl.play().catch(err => {
                console.error("Audio play blocked or interrupted:", err);
            });
        }
    });

    // Initializes the layout experience with the chosen audio configuration
    function startExperience(withAudio) {
        isMuted = !withAudio;
        hasStarted = true;
        isPlaying = true;
    }

    function togglePlay() {
        if (!hasStarted) return startExperience(true);
        isPlaying = !isPlaying;
        if (audioEl) {
            if (isPlaying) audioEl.play();
            else audioEl.pause();
        }
    }

    function handleAudioEnded() {
        if (currentStep.value < totalSteps.value - 1) {
            currentStep.value++;
        } else {
            isPlaying = false; 
            introComplete.value = true;
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
            if (currentStep.value < totalSteps.value - 1) {
                currentStep.value++;
                isPlaying = true;
            } else {
                isPlaying = false;
                introComplete.value = true;
            }
        } else {
            if (introComplete.value) {
                introComplete.value = false;
            }
            if (currentStep.value > 0) {
                currentStep.value--;
                isPlaying = true; 
            }
        }
    }
</script>

<!-- Hidden Audio Element -->
{#if hasStarted && !introComplete.value}
    <audio 
        bind:this={audioEl} 
        src={currentAudioSrc} 
        bind:currentTime={currentTime}
        bind:duration={duration}
        onended={handleAudioEnded}
        muted={isMuted}
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
                    
                    <!-- NEW: Split Option Entry Button Layout -->
                    <div class="btn-group">
                        <button onclick={() => startExperience(true)} class="btn-start"><Volume2 size={20} />Begin with Audio</button>
                        <button onclick={() => startExperience(false)} class="btn-start btn-muted"><VolumeOff size={20} />Begin Muted</button>
                    </div>
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
                                style="width: {i < currentStep.value || introComplete.value ? 100 : i === currentStep.value ? audioProgress : 0}%"
                            ></div>
                        </div>
                    {/each}
                </div>
                <div class="controls">
                    <button onclick={togglePlay} class="btn-control" aria-label="Toggle play/pause">
                        {#if isPlaying}
                            <Pause size={20} />
                        {:else}
                            <Play size={20} />
                        {/if}
                    </button>

                    <button onclick={() => isMuted = !isMuted} class="btn-icon" aria-label="Toggle mute">
                        {#if isMuted}
                            <VolumeOff size={20} />
                        {:else}
                            <Volume2 size={20} />
                        {/if}
                    </button>
                </div>
            </div>

            <!-- Contextual Bottom Subtitles: Display only the active step text -->
            {#each copy.scrollSteps as step, i}
                {#if i === currentStep.value && !introComplete.value}
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
        /* margin-bottom: 4rem; */
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

    /* Flex container for entry buttons */
    .btn-group {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
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
        padding: 0.75rem;
        font-size: 1rem;
        background: var(--color-fg);
        color: var(--color-bg);
        border: 2px solid var(--color-fg);
        cursor: pointer;
        border-radius: 4px;
        font-family: var(--sans, sans-serif);
        font-weight: bold;
        transition: opacity 0.2s ease;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
    }

    .btn-start:hover {
        opacity: 0.85;
    }

    /* Styling variant for the explicit muted option */
    .btn-start.btn-muted {
        background: transparent;
        color: var(--color-fg);
    }

    .btn-control {
        background: none;
        border: none;
        color: var(--color-white);
        cursor: pointer;
        font-size: 1.2rem;
        padding: 0.25rem 0.5rem;
    }

    .btn-icon {
        background: none;
        border: none;
        color: var(--color-white);
        cursor: pointer;
        font-size: 1.25rem;
        padding: 0.25rem 0.5rem;
    }
</style>