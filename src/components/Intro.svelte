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
        <!-- Passing currentStep instead of scrollIndex -->
        <Network scrollIndex={currentStep} {pastNetwork} />
    </div>

    <!-- Narrative Overlay -->
    <div class="narrative-container">
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
            <!-- Display only the active step -->
            {#each copy.scrollSteps as step, i}
                {#if i === currentStep}
					<div class="active-step step-top">
                        <div class="step-inner">
							<div class="progress-bar">
								<div class="progress-fill" style="width: {audioProgress}%"></div>
							</div>
							<div class="controls">
                                <button onclick={togglePlay}>
                                    {isPlaying ? "⏸" : "▶"}
                                </button>
                            </div>
                        </div>
                    </div>
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
        height: 100%;
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
    }

	.start-prompt {
		background: var(--color-bg);
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

    .step {
        width: 100%;
        pointer-events: auto; /* Re-enable clicks inside the card */
		position: absolute;
		display: flex;
		align-items: center;
    }

	.step-bottom {
		position: absolute;
		bottom: 0;
		width: 100%;
		display: flex;
		justify-content: center;
	}

	.step-bottom p {
		font-family: var(--sans, sans-serif);
        font-size: var(--24px);
		max-width: 700px;
		padding: 1rem;
	}

	.step-top {
		position: absolute;
		top: 0;
		width: 100%;
	}

    .step p {
        text-align: left;
        font-family: var(--sans, sans-serif);
        font-size: var(--18px, 18px);
        line-height: 1.65;
		padding: 1rem;
		margin: 0;
		max-width: 600px;
    }

    .controls {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1rem;
        padding-top: 0.75rem;
    }

	.progress-bar {
		width: 100%;
		height: 8px;
		background-color: var(--color-gray-800);
	}

	.progress-fill {
		height: 100%;
		background-color: var(--color-white);
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