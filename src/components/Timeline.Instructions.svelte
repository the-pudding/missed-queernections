<script>
    // ------------------- IMPORTS -------------------
    import { getContext, createEventDispatcher } from "svelte";
    import { ChevronLeft, ChevronRight } from "@lucide/svelte";
    import { instructionStep, activeSection } from "$runes/misc.svelte.js";

    // ------------------- COPY -------------------
    const copy = getContext("copy");

    // ------------------- VARIABLES -------------------
    let currStep = $state(0);
    const progressPercent = $derived(
        ((currStep + 1) / copy.timelineInstructions.length) * 100
    );
    let { instructionsVisible } = $props();

    // ------------------- HELPERS -------------------
    const dispatch = createEventDispatcher();


    // ------------------- EVENTS -------------------
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
</script>

{#if instructionsVisible}
    <div class="instructions">
        <div class="progress">
            <div class="progress-dots background">
                {#each copy.timelineInstructions as dot, i}
                    <div class="progress-dot"></div>
                {/each}
            </div>

            <div 
                class="progress-dots filled" 
                style="clip-path: inset(0 {100 - progressPercent}% 0 0);"
            >
                {#each copy.timelineInstructions as dot, i}
                    <div class="progress-dot"></div>
                {/each}
            </div>
        </div>
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
                <ChevronLeft size={24}/>
                Prev
            </button>
            <button class="skip-btn" onclick={skipClick}>   
                Just let me explore
            </button>
            <button 
                class="progress-btn"
                onclick={nextClick}
            >
                {currStep < copy.timelineInstructions.length - 1 ? "Next" : "Let's go!"}
                <ChevronRight size={24}/>
            </button>
        </div>
    </div>
{/if}

<style>
    .instructions {
        position: absolute;
        top: 25rem;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        max-width: 500px;
        background: rgba(255, 255, 255, 0.98);
        border-radius: 4px;
        display: flex; 
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        z-index: 900;
        font-family: var(--sans);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
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
        padding: 2rem;
    }

    .progress {
        display: flex;
        width: 100%;
        position: relative;
        padding: 0.5rem;
        height: 1.5rem; 
    }

    .progress-dots {
        position: absolute;
        top: 0.5rem;
        left: 0.5rem;
        right: 0.5rem;
        bottom: 0.5rem;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
    }

    .progress-dot {
        flex: 1;
        height: 0.5rem;
        border-radius: 4px;
    }

    .background .progress-dot {
        background: #F2ECFF;
    }

    .filled .progress-dot {
        background: var(--color-fg);
    }

    .filled {
        transition: clip-path 0.4s ease-out;
    }

    .progress-btn {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0.25rem;
        background: var(--color-fg);
        color: var(--color-bg);
        width: 7rem;
    }

    .progress-btn:first-of-type {
        padding-left: 0;
    }

    .progress-btn:last-of-type {
        padding-right: 0;
    }

    :global(.instructions .progress-btn svg) {
        width: auto;
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
        background-size: 75%;
        border-radius: 50%;
        margin-right: 1rem;
    }

    :global(.XSign::before) {
        transform: rotate(45deg)
    }
</style>