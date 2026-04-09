<script>
    let { activeBlowoutId, blowoutData, blowoutColor, onClose } = $props();
</script>

<div 
    class="blowout-overlay" 
    class:is-expanded={activeBlowoutId !== null}
    style="--theme-color: {blowoutData?.color || blowoutColor}"
>
    {#if blowoutData}
        <div class="blowout-content">
            <button onclick={onClose} class="close-button">✕ Close</button>
            <p class="date">{blowoutData.date}</p>
            <h1>{blowoutData.event}</h1>
            {#if blowoutData.eventSecondary}
                <p class="secondary">{blowoutData.eventSecondary}</p>
            {/if}
        </div>
    {/if}
</div>

<style>
    .blowout-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: var(--theme-color);
    
    /* Reveal from the dead center of the screen */
    clip-path: circle(0% at 50% 50%);
    transition: clip-path 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.blowout-overlay.is-expanded {
    clip-path: circle(150% at 50% 50%);
    pointer-events: all;
}

.blowout-content {
    color: white;
    text-align: center;
    font-family: var(--sans);
    /* No transitions needed here, the clip-path handles the reveal */
}

.close-button {
    position: absolute;
    top: 2rem;
    right: 2rem;
    background: white;
    border: none;
    padding: 0.8rem 1.2rem;
    border-radius: 50px;
    cursor: pointer;
    font-weight: bold;
    color: black;
}

</style>