<script>
    import wordmark from "$svg/wordmark_script_stacked_plain.svg";
    import VolumeOff from "$svg/icons/volume-off.svg";
    import Volume2 from "$svg/icons/volume-2.svg";
    import { isAudioMuted, audioUnlocked } from "$runes/misc.svelte.js";

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
</script>

<header class="sticky-header">
    <div class="header-inner">
        <div class="wordmark">
            <a href="https://pudding.cool" aria-label="The Pudding" target="_self">
                {@html wordmark}
            </a>
        </div>

        <div class="audio-controls">
            {#if !audioUnlocked.value}
                <!-- Initial Choice -->
                <div class="btn-group">
                    <button onclick={() => selectAudioOption(true)} class="btn-audio">
                        {@html Volume2} Begin with Audio
                    </button>
                    <button onclick={() => selectAudioOption(false)} class="btn-audio btn-muted">
                        {@html VolumeOff} Begin Muted
                    </button>
                </div>
            {:else}
                <!-- Persistent Single Toggle -->
                <button onclick={toggleMute} class="btn-toggle" aria-label="Toggle audio">
                    {#if isAudioMuted.value}
                        {@html VolumeOff}
                        <span>Muted</span>
                    {:else}
                        {@html Volume2}
                        <span>Sound On</span>
                    {/if}
                </button>
            {/if}
        </div>
    </div>
</header>

<style>
    .sticky-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 1000;
        pointer-events: none; /* Allows click-through to background elements when not on controls */
        padding: 1rem 1.5rem;
    }

    .header-inner {
        display: flex;
        justify-content: space-between;
        align-items: center;
        max-width: 1400px;
        margin: 0 auto;
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

    .audio-controls {
        pointer-events: auto;
    }

    .btn-group {
        display: flex;
        gap: 0.5rem;
    }

    .btn-audio {
        padding: 0.5rem 0.85rem;
        font-size: 0.875rem;
        background: var(--color-fg);
        color: var(--color-bg);
        border: 2px solid var(--color-fg);
        cursor: pointer;
        border-radius: 4px;
        font-family: var(--sans, sans-serif);
        font-weight: bold;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: opacity 0.2s ease;
    }

    .btn-audio:hover {
        opacity: 0.85;
    }

    .btn-audio.btn-muted {
        background: transparent;
        color: var(--color-fg);
    }

    .btn-toggle {
        padding: 0.4rem 0.75rem;
        font-size: 0.85rem;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(8px);
        color: var(--color-white, #fff);
        border: 1px solid rgba(255, 255, 255, 0.25);
        cursor: pointer;
        border-radius: 20px;
        font-family: var(--sans, sans-serif);
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: all 0.2s ease;
    }

    .btn-toggle:hover {
        background: rgba(0, 0, 0, 0.85);
        border-color: rgba(255, 255, 255, 0.4);
    }

    :global(.btn-audio svg, .btn-toggle svg) {
        width: 16px;
        height: 16px;
    }

    :global(.btn-audio svg path, .btn-toggle svg path) {
        fill: currentColor;
    }
</style>