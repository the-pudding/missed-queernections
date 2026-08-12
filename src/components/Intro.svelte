<script>
    import { getContext } from "svelte";
    import { colors, currentStep, totalSteps, introComplete, isAudioMuted, audioUnlocked } from "$runes/misc.svelte.js";
    import VolumeOff from "$svg/icons/volume-off.svg";
    import Volume2 from "$svg/icons/volume-2.svg";
    import wordmark from "$svg/wordmark_script_stacked_plain.svg";

    const copy = getContext("copy");
    
    totalSteps.value = copy.scrollSteps.length;

    // Derived State: starts automatically once the user makes an audio selection in Header
    const hasStarted = $derived(audioUnlocked.value);

    function selectAudioOption(withAudio) {
        isAudioMuted.value = !withAudio;
        audioUnlocked.value = true;

        if (withAudio) {
            // Unlocks browser audio policy
            const silent = new Audio();
            silent.play().catch(() => {});
        }
    }

    function toggleMute() {
        isAudioMuted.value = !isAudioMuted.value;
    }

    // Step Navigation Helpers
    function goNext() {
        if (!hasStarted) return;
        if (currentStep.value < totalSteps.value - 1) {
            currentStep.value++;
        } else {
            introComplete.value = true;
        }
    }

    function goPrev() {
        if (!hasStarted) return;
        if (introComplete.value) {
            introComplete.value = false;
        }
        if (currentStep.value > 0) {
            currentStep.value--;
        }
    }

    // Keyboard Arrow Navigation
    function handleKeydown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            goNext();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            goPrev();
        }
    }

    // Handles Left / Right Tap Navigation
    function handleOverlayTap(e) {
        if (e.target.closest('button') || e.target.closest('a')) return;
        if (!hasStarted) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const isRightSide = clickX > rect.width / 2;

        if (isRightSide) {
            goNext();
        } else {
            goPrev();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<section id="intro">
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
    <div class="narrative-container" onclick={handleOverlayTap}>
        {#if !audioUnlocked.value}
            <div class="intro-splash">
                <div class="wordmark">
                    <a href="https://pudding.cool" aria-label="The Pudding" target="_self">
                        {@html wordmark}
                    </a>
                </div>
                <h1>This is a story about missed connections</h1>
                <div class="audio-controls">
                    <!-- Initial Choice -->
                    <div class="btn-group">
                        <button onclick={() => selectAudioOption(true)} class="btn-audio">
                            {@html Volume2} Begin with Audio
                        </button>
                        <button onclick={() => selectAudioOption(false)} class="btn-audio btn-muted">
                            {@html VolumeOff} Begin Muted
                        </button>
                    </div>
                </div>
            </div>
        {:else}
            <button onclick={toggleMute} class="btn-toggle" aria-label="Toggle audio">
                {#if isAudioMuted.value}
                    {@html VolumeOff}
                    <span>Off</span>
                {:else}
                    {@html Volume2}
                    <span>On</span>
                {/if}
            </button>
        {/if}
        {#if hasStarted}
            <!-- Persistent Top Bar: Progress Segments -->
            <div class="controls-wrapper">
                <div class="progress-segments">
                    {#each copy.scrollSteps as _, i}
                        <div class="progress-bar">
                            <div 
                                class="progress-fill" 
                                style="width: {i <= currentStep.value || introComplete.value ? 100 : 0}%"
                            ></div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- Active Step Text -->
            {#if !introComplete.value && copy.scrollSteps[currentStep.value]}
                <div class="active-step step-bottom">
                    <div class="step-inner">
                        {#key currentStep.value}
                            <p class="subtitle-text">
                                {@html copy.scrollSteps[currentStep.value].value}
                            </p>
                        {/key}
                    </div>
                </div>
            {/if}
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

    .intro-splash {
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding: 1rem 1rem 4rem 1rem;
    }

    h1 {
        font-family: var(--marsha);
        text-transform: uppercase;
        -webkit-text-stroke-width: 1.5px;
        -webkit-text-stroke-color: var(--color-fg);
        color: rgba(25, 25, 25, 0.96);
        font-size: clamp(2rem, 10vw, 10rem);
        text-align: center;
        line-height: 1;
        margin-bottom: 10rem;
        filter: drop-shadow(0 0 12px rgba(0, 0, 0, 0.9)) 
                drop-shadow(0 0 24px rgba(0, 0, 0, 0.2));
    }

    .btn-toggle {
        position: absolute;
        bottom: 1rem;
        right: 1rem;
        display: flex;
        background-color: var(--color-gray-900);
		border: 2px solid var(--color-gray-800);
		color: var(--color-fg);
		flex-direction: row;
		gap: 0.5rem;
    }

    .btn-group {
        display: flex;
        flex-direction: row;
        gap: 1rem;
    }

    .btn-audio {
        display: flex;
        background-color: var(--color-gray-900);
		border: 2px solid var(--color-gray-800);
		color: var(--color-fg);
		flex-direction: row;
		gap: 0.5rem;
    }

    .wordmark {
        max-width: 9em;
        transform: rotate(-4deg);
        pointer-events: auto;
    }

    .wordmark a {
        border: none;
        display: block;
        color: var(--color-fg);
    }

    .step-bottom {
        position: absolute;
        bottom: 2rem;
        width: 100%;
        display: flex;
        justify-content: center;
        pointer-events: auto;
    }

    .controls-wrapper {
        position: absolute;
        top: 0; /* Offset slightly below sticky header wordmark */
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 1rem;
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
        transition: width 0.2s ease;
    }

    .subtitle-text {
        font-family: var(--sans, sans-serif);
        font-size: var(--22px);
        max-width: 700px;
        padding: 1rem;
        text-align: left;
        line-height: 1.65;
        margin: 0;
        color: var(--color-white);
    }
</style>