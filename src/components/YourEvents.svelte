<script>
    import janData from "$data/jan.csv";
    import { addedEvents } from "$runes/misc.svelte.js";
    import { X } from "@lucide/svelte";

    function clearAll() {
        $addedEvents = [];
    }

    function clearSingle(eventToRemove) {
        $addedEvents = $addedEvents.filter(event => event !== eventToRemove); 
    }
</script>

<div class="events-wrapper">
    <h5>Your Events</h5>
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
        top: 50%;
        right: 0;
        width: 300px;
        transform: translateY(-50%);
        background: white;
        z-index: 1000;
        padding: 1rem;
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