<script>
    import { getContext } from "svelte";
    import wordmark from "$svg/wordmark_script_stacked_plain.svg";
    import title from "$svg/title.svg";
    import Play from '$svg/icons/play.svg';
    import Pause from '$svg/icons/pause.svg';
    import VolumeOff from '$svg/icons/volume-off.svg';
    import Volume2 from '$svg/icons/volume-2.svg';
    import { currentStep, totalSteps, introComplete } from "$runes/misc.svelte.js";
    import rawCsv from '$data/timestamps/intro.csv?raw';

    const copy = getContext("copy");
    
    totalSteps.value = copy.scrollSteps.length;

    // Core Local Component State
    let isPlaying = $state(false);
    let hasStarted = $state(false);
    let isMuted = $state(false);
    let audioEl = $state(null);

    // Derived States
    const currentAudioSrc = $derived(`/assets/audio/intro-${currentStep.value}.mp3`);

    let currentTime = $state(0);
    let duration = $state(0);
    const audioProgress = $derived(duration > 0 ? (currentTime / duration) * 100 : 0);

    // FIX 1: Instantly reset currentTime to 0 whenever step changes
    $effect(() => {
        const step = currentStep.value; // Explicit step dependency
        
        // Zero out time state and audio element immediately
        currentTime = 0;
        if (audioEl) {
            audioEl.currentTime = 0;
        }

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
        goNext();
    }

    // Step Navigation Helpers
    function goNext() {
        if (!hasStarted) return startExperience(true);
        if (currentStep.value < totalSteps.value - 1) {
            currentStep.value++;
            isPlaying = true;
        } else {
            isPlaying = false; 
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
            isPlaying = true; 
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

    // Handles Left / Right Tap Navigation (Instagram Story style)
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

    // Time conversion helper
    function timeToSeconds(timeStr) {
        if (!timeStr) return 0;
        const parts = timeStr.trim().split(':');
        if (parts.length === 2) {
            return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
        } else if (parts.length === 3) {
            return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
        }
        return parseFloat(timeStr) || 0;
    }

    // Parse the entire CSV once into memory
    function parseMasterCSV(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length <= 1) return [];

        return lines.slice(1).map(line => {
            const cols = line.split(',');
            
            // 1. Rejoin everything from column index 5 in case the word has commas
            let cleanWord = cols.slice(5).join(',').trim();

            // 2. Unescape standard CSV double quotes ("" -> ")
            cleanWord = cleanWord.replace(/""/g, '"');

            // 3. Deduplicate stacked leading quotes (e.g., ““ or "“ -> “)
            cleanWord = cleanWord.replace(/^[“"]+/g, match => match.slice(-1));

            // 4. Deduplicate stacked trailing quotes (e.g., ”” or ”" -> ”)
            cleanWord = cleanWord.replace(/["”]+$/g, match => match[0]);

            return {
                step: cols[0]?.trim(),           
                wordIndex: parseInt(cols[1], 10), 
                start: timeToSeconds(cols[2]),   
                end: timeToSeconds(cols[3]),     
                duration: parseFloat(cols[4]),   
                word: cleanWord
            };
        });
    }

    // Store parsed dataset
    const allTranscriptWords = parseMasterCSV(rawCsv);

    // Reactively filter words for the active step
    const currentWords = $derived(
        allTranscriptWords.filter(item => item.step === `intro-${currentStep.value}`)
    );
</script>

<svelte:window onkeydown={handleKeydown} />

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
                    
                    <div class="btn-group">
                        <button onclick={() => startExperience(true)} class="btn-start">{@html Volume2} Begin with Audio</button>
                        <button onclick={() => startExperience(false)} class="btn-start btn-muted">{@html VolumeOff} Begin Muted</button>
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
                            {@html Pause}
                        {:else}
                            {@html Play}
                        {/if}
                    </button>

                    <button onclick={() => isMuted = !isMuted} class="btn-icon" aria-label="Toggle mute">
                        {#if isMuted}
                            {@html VolumeOff}
                        {:else}
                            {@html Volume2}
                        {/if}
                    </button>
                </div>
            </div>
        {/if}

        <!-- Contextual Bottom Subtitles -->
        {#if !introComplete.value && copy.scrollSteps[currentStep.value]}
            <div class="active-step step-bottom">
                <div class="step-inner">
                    <!-- FIX 2: Keying by currentStep guarantees clean re-renders on step change -->
                    {#key currentStep.value}
                        <p class="subtitle-text">
                            {#if currentWords.length > 0}
                                {#each currentWords as item, idx (idx)}
                                    <span 
                                        class="word" 
                                        class:active={currentTime >= item.start && currentTime < item.end}
                                        class:past={currentTime >= item.end}
                                    >
                                        {item.word}{' '}
                                    </span>
                                {/each}
                            {:else}
                                <!-- Fallback if CSV is loading or unavailable -->
                                {@html copy.scrollSteps[currentStep.value].value}
                            {/if}
                        </p>
                    {/key}
                </div>
            </div>
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

    .btn-group {
        display: flex;
        gap: 0.75rem;
        margin-top: 1rem;
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

    :global(.btn-start svg, .btn-control svg) {
        width: 20px;
    }

    :global(.btn-control svg) {
        width: 16px;
    }

    :global(.btn-icon svg) {
        width: 20px;
    }

    :global(.btn-start svg path) {
        fill: black;
    }

    :global(.btn-start.btn-muted svg path) {
        fill: white;
    }

    .btn-start:hover {
        opacity: 0.85;
    }

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

    .subtitle-text {
        font-family: var(--sans, sans-serif);
        font-size: var(--22px);
        max-width: 700px;
        padding: 1rem;
        text-align: left;
        line-height: 1.65;
        margin: 0;
    }

    /* Base style for inactive/upcoming words */
    .word {
        color: var(--color-gray-400);
        transition: none;
    }

    /* Word actively being spoken */
    .word.active {
        color: var(--color-white);
    }

    /* Words already spoken (karaoke style effect) */
    .word.past {
        color: var(--color-white);
    }
</style>