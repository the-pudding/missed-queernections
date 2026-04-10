<script>
    let { activeBlowoutId, blowoutData, blowoutColor, originX = '50%', originY = '50%', onClose, onPrev, onNext, canGoPrev, canGoNext, currentIndex, total } = $props();
</script>

<div
    class="blowout-overlay"
    class:is-expanded={activeBlowoutId !== null}
    style="--theme-color: {blowoutData?.color || blowoutColor}; --origin-x: {originX}; --origin-y: {originY}"
>
    {#if blowoutData}
        <div class="blowout-content">
            <button onclick={onClose} class="close-button">✕ Close</button>
            <p class="date">{blowoutData.date}</p>
            <h1>{blowoutData.event}</h1>
            {#if blowoutData.eventSecondary}
                <p class="secondary">{blowoutData.eventSecondary}</p>
            {/if}
            <div class="nav">
                <button onclick={onPrev} disabled={!canGoPrev} class="nav-button">← Prev</button>
                <span class="nav-count">{currentIndex + 1} / {total}</span>
                <button onclick={onNext} disabled={!canGoNext} class="nav-button">Next →</button>
            </div>
        </div>
    {/if}
</div>

<style>
    .blowout-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    background: var(--theme-color);
    
    /* Reveal from the circle's actual position */
    clip-path: circle(0% at var(--origin-x, 50%) var(--origin-y, 50%));
    /* Closing transition */
    transition: clip-path 0.75s cubic-bezier(0.16, 1, 0.3, 1);
    
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
}

.blowout-overlay.is-expanded {
    clip-path: circle(150% at var(--origin-x, 50%) var(--origin-y, 50%));
    pointer-events: all;
    /* Opening transition — longer to match perceived closing speed */
    transition: clip-path 1.5s cubic-bezier(0.16, 1, 0.3, 1);
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

.nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    margin-top: 2rem;
    justify-content: center;
}

.nav-button {
    background: white;
    border: none;
    padding: 0.8rem 1.2rem;
    border-radius: 50px;
    cursor: pointer;
    font-weight: bold;
    color: black;
}

.nav-button:disabled {
    opacity: 0.3;
    cursor: default;
}

.nav-count {
    font-size: 0.9rem;
    opacity: 0.8;
}

</style>