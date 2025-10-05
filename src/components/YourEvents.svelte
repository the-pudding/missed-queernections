<script>
    import janData from "$data/jan.csv";
    import { addedEvents, instructionStep } from "$runes/misc.svelte.js";
    import { X, ChevronDown } from "@lucide/svelte";

    let listVisible = $state(false);

    function toggleShow() {
        listVisible = !listVisible;
    }

    function clearAll() {
        $addedEvents = [];
        listVisible = false;
    }

    function clearSingle(eventToRemove) {
        $addedEvents = $addedEvents.filter(event => event !== eventToRemove); 
    }
</script>

<div class="events-wrapper" class:wiggle={$instructionStep == 5} style="transform: translateY({listVisible ? 0 : '100%'})">
    <button class="show-toggle" onclick={toggleShow} style="top: {listVisible ? '-0.25rem' : '-2.75rem'}">
        <p>Your Events</p>
        <div class="chevron-wrapper" style="transform: rotate({listVisible ? 0 : 180}deg);">
            <ChevronDown />
        </div>
        <p class="count" style="top: {listVisible ? '2rem' : '-0.5rem'}">{$addedEvents.length}</p>
    </button>
    <div class="events">
        {#each $addedEvents as eventName, i}
            {@const eventData = janData.find(d => d.event === eventName)}
            <div class="event">
                <button onclick={() => clearSingle(eventName)} class="remove">
                    <X/>
                </button>
                {#if eventData}
                    <div class="text-wrapper">
                        <p class="bold">{eventData.date}</p>
                        <p>{eventName}</p>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
    <button onclick={clearAll} class="remove-all">Clear all events</button>
</div>

<style>
    .events-wrapper {
        font-family: var(--sans);
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        height: 100vh;
        background: rgba(255, 255, 255, 0.98);
        z-index: 1000;
        padding: 10rem 4rem;
        transition: transform 0.5s ease-out;
    }

    @keyframes wiggle {
        0%, 100% { transform: translateX(-50%) }
        25% { transform: translateX(-51%) }
        75% { transform: translateX(-49%) }
    }

    .show-toggle {
        position: absolute;
        width: 10rem;
        height: 3rem;
        top: -2.75rem;
        left: 50%;
        transform: translateX(-50%);
        background: var(--color-bg);
        border: 2px solid var(--color-fg);
        border-radius: 4px;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        text-transform: uppercase;
    }

    .wiggle .show-toggle {
        /* Apply the animation to the toggle button itself */
        animation: wiggle 0.5s ease-in-out infinite; /* Runs the animation twice */
    }

    :global(.show-toggle svg) {
        width: 2rem;
        height: 2rem;
    }

    .count {
        position: absolute;
        right: -0.5rem;
        background: var(--color-fg);
        width: 1.25rem;
        height: 1.25rem;
        border-radius: 50%;
        color: var(--color-bg);
        font-size: 10px;
        font-weight: 700;
        padding: 0;
        margin: 0;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .chevron-wrapper {
        transition: transform 150ms ease;
    }

    .events {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    h5 {
        font-weight: 700;
        font-size: var(--24px);
    }

    .event {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
        align-items: center;
    }

    :global(button.remove svg) {
        width: 1rem;
        height: 1rem;
    }

    .remove {
        background: var(--color-fg);
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        color: var(--color-bg);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
    }

    .text-wrapper {
        width: calc(100% - 2rem)
    }

    p {
        font-size: var(--12px);
        margin: 0;
    }

    p.bold {
        font-weight: 700;
    }

    .remove-all {
        width: 100%;
        border: 1px solid var(--color-fg);
        background: transparent;
        text-transform: uppercase;
        font-size: var(--12px);
        font-weight: 700;
        margin-top: 2rem;
    }
</style>