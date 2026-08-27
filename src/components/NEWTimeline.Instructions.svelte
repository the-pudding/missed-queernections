<script>
    import wordmark from "$svg/wordmark_script_stacked_plain.svg";
    import { getContext } from "svelte";
    import { fly } from "svelte/transition";
    const copy = getContext("copy");
    import { isAudioMuted, audioUnlocked, colors } from "$runes/misc.svelte.js";
    import VolumeOff from "$svg/icons/volume-off.svg";
    import Volume2 from "$svg/icons/volume-2.svg";

    const seamlessColors = [...colors, colors[0]];
    const animatedGradient = $derived(`linear-gradient(45deg, ${seamlessColors.join(", ")})`);

    // Lock body scroll until audio preference is selected
    $effect(() => {
        if (!audioUnlocked.value) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        } else {
            document.body.style.overflow = "";
        }
    });

    function selectAudioOption(withAudio) {
        isAudioMuted.value = !withAudio;
        audioUnlocked.value = true;

        // 1. Synchronously unlock scroll before calling scrollBy
        document.body.style.overflow = "";

        if (withAudio) {
            const silent = new Audio();
            silent.play().catch(() => {});
        }

        // 2. Defer scroll by 1 frame so browser registers unlocked overflow
        requestAnimationFrame(() => {
            window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
        });
    }

    let { index = -1 } = $props();

    $effect(() => {
        const isAudioActive = audioUnlocked.value && !isAudioMuted.value;
        const isWithinRange = index >= 1 && index <= 6;
        const currentClip = copy.timelineInstructions[index]?.clip;

        if (isAudioActive && isWithinRange && currentClip) {
            const audio = new Audio(`assets/audio/clips/${currentClip}.mp3`);
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch((err) => {
                    if (err.name !== 'AbortError') {
                        console.warn("Audio playback error:", err);
                    }
                });
            }
            return () => {
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            audio.pause();
                            audio.currentTime = 0;
                        })
                        .catch(() => {});
                } else {
                    audio.pause();
                    audio.currentTime = 0;
                }
            };
        }
    });
</script>

{#each copy.timelineInstructions as step, i}
    {#if i === index}
        <div class="step" transition:fly={{ y: 10, duration: 200 }}>
            {#if index == 0}
                <div class="wordmark">
                    <a href="https://pudding.cool" aria-label="The Pudding" target="_self">
                        {@html wordmark}
                    </a>
                </div>
                <h1 style="background-image: {animatedGradient};">Missed Queer- nections</h1>
                <p class="centered">{@html step.text}</p>
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
            {:else}
                {#if step.img}
                    <div class="img-wrapper" style="--animated-gradient: {animatedGradient}">
                        <img src={`assets/imgs/intro/${step.img}.jpg`} alt="TKTK" />
                    </div>
                {/if}
                <p>{@html step.text}</p>
            {/if}
        </div>
    {/if}
{/each}

<style>

    h1 {
        font-family: var(--marsha);
        font-size: clamp(2rem, 6vw, 20rem);
        text-transform: uppercase;
        line-height: 0.9;
        padding: 1rem 0;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
        display: inline-block;
        background-size: 300% 300%;
        animation: flow 8s ease infinite;
        text-align: center;
    }

    @keyframes flow {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

    .wordmark {
        max-width: 12em;
        transform: rotate(-4deg);
        pointer-events: auto;
    }

    .wordmark a {
        border: none;
        display: block;
        color: var(--color-fg);
    }

    .step {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 1rem;
        max-width: 500px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        pointer-events: auto;
        padding: 0;
    }

    /* ── Image Overlay Container ────────────────────────────────────────── */
    .img-wrapper {
        position: relative;
        width: 100%;
        max-width: 300px;
        aspect-ratio: 1;
        overflow: hidden;
        isolation: isolate;
        box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
    }

    .img-wrapper img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }

    .img-wrapper::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: var(--animated-gradient);
        background-size: 300% 300%;
        animation: flow 8s ease infinite;
        mix-blend-mode: multiply;
        opacity: 0.6;
        pointer-events: none;
    }

    :global(.interaction-span) {
        color: var(--color-gray-300);
        font-style: italic;
        font-size: var(--14px);
        display: block;
        margin: 1rem 0;
    }

    p {
        font-family: var(--sans);
        font-size: var(--22px);
        margin: 0;
    }

    p.centered {
        text-align: center;
    }

    :global(.plus-icon, .headphone-icon, .quote-icon, .scroll-icon) {
        font-weight: 700;
        margin-left: 1.125rem;
        position: relative;
        white-space: nowrap;
    }

    :global(.scroll-icon) {
        font-weight: 700;
        margin-left: 1.125rem;
        position: relative;
        white-space: nowrap;
        display: inline-block;
        animation: bounce 0.75s ease-in-out infinite;
    }

    @keyframes bounce {
        0%, 100% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-4px);
        }
    }

    :global(.plus-icon::before, .headphone-icon::before, .quote-icon::before, .scroll-icon::before) {
        content: "";
        position: absolute;
        top: 55%;
        transform: translateY(-50%);
        left: -1.125rem;
        width: 1rem;
        height: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background-color: var(--color-gray-300);
        background-position: center;
        background-repeat: no-repeat;
        line-height: 1;
    }

    :global(.plus-icon::before) {
        background-image: url("../svg/plus-icon.svg");
        background-size: contain;
    }

    :global(.headphone-icon::before) {
        background-image: url("../svg/icons/headphones.svg");
        background-size: 60%;
    }

    :global(.quote-icon::before) {
        background-image: url("../svg/icons/quote.svg");
        background-size: 60%;
    }

    :global(.scroll-icon::before) {
        background-image: url("../svg/icons/circle-arrow-down.svg");
        background-size: 60%;
    }

    .audio-controls {
        margin-top: 1rem;
        width: 100%;
        display: flex;
        justify-content: center;
    }

    .btn-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
        max-width: 320px;
    }

    .btn-audio {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.85rem 1.25rem;
        font-family: var(--marsha);
        font-size: var(--16px);
        font-weight: 700;
        text-transform: uppercase;
        color: var(--color-bg);
        background: var(--color-fg);
        border: 2px solid var(--color-fg);
        border-radius: 50px;
        cursor: pointer;
        transition: transform 0.2s ease, opacity 0.2s ease;
    }

    .btn-audio:hover {
        transform: translateY(-2px);
    }

    .btn-audio.btn-muted {
        background: transparent;
        color: var(--color-fg);
        border: 2px solid color-mix(in srgb, var(--color-fg) 30%, transparent);
    }

    .btn-audio :global(svg) {
        width: 1.25rem;
        height: 1.25rem;
        fill: currentColor;
    }

    @media(max-width: 760px) {
        p {
            font-size: var(--16px);
        }
    }
</style>