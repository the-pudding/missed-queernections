<script>
    import { getContext, createEventDispatcher } from "svelte";
    import { ChevronLeft, ChevronRight } from "@lucide/svelte";

    const copy = getContext("copy");

    let currStep = $state(0);
    let { instructionsVisible } = $props();
    const dispatch = createEventDispatcher();

    function prevClick() {
        currStep = currStep - 1;
    }

    function nextClick() {
        if (currStep < copy.timelineInstructions.length - 1) {
            currStep++;
        } else {
            dispatch('close');
        }
    }
</script>

{#if instructionsVisible}
    <div class="instructions">
        <div class="steps">
            {#each copy.timelineInstructions as step, i}
                {#if currStep == i}
                    <div class="step">
                        <p>{@html step.value}</p>
                    </div>
                {/if}
            {/each}
        </div>
        <div class="controls">
            <button 
                onclick={prevClick}
                disabled={currStep == 0}
            >   
                <ChevronLeft />
                Prev
            </button>
            <div class="progress">
                {#each copy.timelineInstructions as dot, i}
                    <div class="progress-dot" style="transform: scale({i == currStep ? '1.5' : 1})"></div>
                {/each}
            </div>
            <button 
                onclick={nextClick}
            >
                {currStep < copy.timelineInstructions.length - 1 ? "Next" : "Done"}
                <ChevronRight />
            </button>
        </div>
    </div>
{/if}

<style>
    .instructions {
        position: absolute;
        top: 6rem;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
        max-width: 500px;
        background: rgba(255, 255, 255, 0.98);
        border: 3px solid var(--color-fg);
        border-radius: 4px;
        display: flex; 
        flex-direction: column;
        padding: 2rem;
        z-index: 1000;
        font-family: var(--sans);
    }

    .steps {
        height: 14rem;
    }

    .step p {
        margin: 0;
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }

    .progress {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5rem;
    }

    .progress-dot {
        background: var(--color-fg);
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        transition: transform 0.5s ease-out;
    }

    button {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.25rem;
        background: var(--color-fg);
        color: var(--color-bg);
        width: 5rem;
    }

    :global(.instructions button svg) {
        width: 2rem;
        height: 2rem;
    }
</style>