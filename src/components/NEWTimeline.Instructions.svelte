<script>
    import wordmark from "$svg/wordmark_script_stacked_plain.svg";
    import { getContext, tick, onMount } from "svelte";
    import { fly } from "svelte/transition";
    const copy = getContext("copy");
    import { isAudioMuted, audioUnlocked, colors } from "$runes/misc.svelte.js";
    import VolumeOff from "$svg/icons/volume-off.svg";
    import Volume2 from "$svg/icons/volume-2.svg";

    const seamlessColors = [...colors, colors[0]];
    const animatedGradient = $derived(`linear-gradient(45deg, ${seamlessColors.join(", ")})`);

    let animationStartTime = $state(0);

    onMount(() => {
        animationStartTime = Date.now();

        copy.timelineInstructions.forEach((step) => {
            if (step.img) {
                const img = new Image();
                img.src = `assets/imgs/intro/${step.img}.jpg`;
                if (img.decode) {
                    img.decode().catch(() => {});
                }
            }
        });
    });

    const animationDelay = $derived.by(() => {
        if (!animationStartTime) return '0s';
        const elapsed = (Date.now() - animationStartTime) % 8000;
        return `-${elapsed}ms`;
    });

    $effect(() => {
        const isLocked = !audioUnlocked.value;
        
        document.body.style.overflow = isLocked ? "hidden" : "";
        document.documentElement.style.overflow = isLocked ? "hidden" : "";

        return () => {
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    });

    function selectAudioOption(withAudio) {
        // 1. MUST BE SYNCHRONOUS: Unlock audio policy immediately in user click stack
        if (withAudio) {
            const silent = new Audio();
            silent.play().catch(() => {});
        }

        isAudioMuted.value = !withAudio;
        audioUnlocked.value = true;

        // 2. MUST BE SYNCHRONOUS: Clear scroll lock inline so browser allows window.scrollTo
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";

        // 3. Defer scroll to next frame to allow DOM reflow
        requestAnimationFrame(() => {
            // Find the 2nd Scrolly target div (Step 1) or fallback to calculated offset
            const allScrollySteps = document.querySelectorAll(".html-overlay [style*='position: absolute']");
            const step1Target = allScrollySteps[1];

            if (step1Target) {
                const targetY = step1Target.getBoundingClientRect().top + window.scrollY;
                window.scrollTo({ top: targetY, behavior: "smooth" });
            } else {
                window.scrollTo({ top: window.innerHeight * 1.5, behavior: "smooth" });
            }
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
                <h1 style="background-image: {animatedGradient}; animation-delay: {animationDelay};">
                    Missed Queer- nections
                </h1>
                <p class="centered">{@html step.text}</p>
                <div class="audio-controls">
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
                    <div 
                        class="img-wrapper" 
                        style="--animated-gradient: {animatedGradient}; --anim-delay: {animationDelay};"
                    >
                        <img 
                            src={`assets/imgs/intro/${step.img}.jpg`} 
                            alt={step.text ? step.text.slice(0, 30) : "Intro image"} 
                            loading="eager"
                            decoding="async"
                        />
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
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
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

    .img-wrapper {
        position: relative;
        width: 100%;
        height: 100%;
        max-width: 300px;
        max-height: 300px;
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
        animation-delay: var(--anim-delay, 0s);
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

    .audio-controls {
        margin-top: 1rem;
        width: 100%;
        display: flex;
        justify-content: center;
        pointer-events: auto;
    }

    .btn-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
        max-width: 320px;
        pointer-events: auto;
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
        pointer-events: auto;
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
        pointer-events: none;
    }

    @media(max-width: 760px) {
        p {
            font-size: var(--16px);
        }
    }
</style>