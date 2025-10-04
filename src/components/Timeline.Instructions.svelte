<script>
    import { getContext, createEventDispatcher } from "svelte";
    import { ChevronLeft, ChevronRight } from "@lucide/svelte";
    import { instructionStep } from "$runes/misc.svelte.js";

    const copy = getContext("copy");

    let currStep = $state(0);
    let { instructionsVisible } = $props();
    const dispatch = createEventDispatcher();

    function prevClick() {
        --currStep;
        $instructionStep = currStep;
    }

    function nextClick() {
        if (currStep < copy.timelineInstructions.length - 1) {
            currStep++;
            $instructionStep = currStep;
        } else {
            $instructionStep = null;
            dispatch('close');
        }
    }

    function skipClick() {
        $instructionStep = null;
        dispatch('close');
    }

    $effect(() => {
        console.log($instructionStep)
    })
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
                class="progress-btn"
                onclick={prevClick}
                disabled={currStep == 0}
            >   
                <ChevronLeft />
                Prev
            </button>
            <button class="skip-btn" onclick={skipClick}>   
                Just let me explore
            </button>
            <button 
                class="progress-btn"
                onclick={nextClick}
            >
                {currStep < copy.timelineInstructions.length - 1 ? "Next" : "Done"}
                <ChevronRight />
            </button>
        </div>
        <div class="progress">
            {#each copy.timelineInstructions as dot, i}
                <div class="progress-dot" style="width: {100/(copy.timelineInstructions.length - 1)}%; background: {currStep >= i ? "#191919" : "rgb(239, 239, 239)"}"></div>
            {/each}
        </div>
    </div>
{/if}

<style>
    .instructions {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        max-width: 500px;
        background: rgba(255, 255, 255, 0.98);
        border: 2px solid var(--color-fg);
        border-radius: 4px;
        display: flex; 
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        z-index: 900;
        font-family: var(--sans);
        box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
    }

    .steps {
        height: 14rem;
        width: 100%;
        padding: 2rem;
    }

    .step p {
        margin: 0;
        width: 100%;
    }

    .themes {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: repeat(4, auto);
        grid-auto-flow: column;
        gap: 0.25rem;
        padding: 1rem 0;
    }

    .themes p {
        width: 100%;
        padding: 0.5rem;
        font-size: var(--12px);
        border-radius: 4px;
        text-align: center;
        font-weight: 700;
    }

    .controls {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        padding: 0 2rem;
    }

    .progress {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem;
        width: 100%;
    }

    .progress-dot {
        background: var(--color-fg);
        height: 0.5rem;
        border-radius: 4px;
        transition: transform 0.5s ease-out;
    }

    .progress-btn {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.25rem;
        background: var(--color-fg);
        color: var(--color-bg);
        width: 5rem;
    }

    :global(.instructions .progress-btn svg) {
        width: 2rem;
        height: 2rem;
    }

    .skip-btn {
        background: transparent;
        color: var(--color-gray-700);
        font-size: var(--12px);
    }

    :global(span.girlPower) {
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
        background: #008E00;
    }

    :global(.bold) {
        font-weight: 700;
    }

    :global(.plusSign, .XSign) {
        font-weight: 700;
        position: relative;
        margin-left: 1.5rem;
    }

    :global(.plusSign::before, .XSign::before) {
        content: '';
        position: absolute;
        left: -1.5rem;
        top: 2px;
        width: 1.25rem;
        height: 1.25rem;
        background-color: var(--color-fg);
        background-image: url('../svg/plus.svg');
        background-repeat: no-repeat;
        background-position: center;
        background-size: 75%; /* Adjust size of SVG inside the circle */
        border-radius: 50%;
        margin-right: 1rem;
    }

    :global(.XSign::before) {
        transform: rotate(45deg)
    }
</style>