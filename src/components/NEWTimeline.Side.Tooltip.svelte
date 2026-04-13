<script>
    let { circle,
          sideData,
          isCenter,
          uniqueId,
          hoveredId,
          hoveredEventName } = $props();
</script>

<div 
    class="html-tooltip"
    class:side-jan={sideData.side === 'jan'}
    class:side-ashlee={sideData.side === 'ashleé'}
    class:is-center={isCenter}
    class:is-hovered={hoveredId === uniqueId}
    class:is-dimmed={hoveredId !== null && hoveredEventName !== circle.event}
    class:is-active-hover={hoveredEventName === circle.event}
    style="left: {circle.cx}px; top: {circle.cy}px;"
>
    <div class="tooltip-content">
        <p class="date">{circle.date}</p>
        <p class="event">{circle.event}</p>
        {#if circle.eventSecondary}
            <p class="event-secondary">{circle.eventSecondary}</p>
        {/if}
    </div>
</div>

<style>
    .html-tooltip {
        position: absolute;
        width: max-content;
        max-width: 160px;
        pointer-events: none;
        z-index: 1;
        transition: all 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        will-change: left, top, transform;
    }

    .html-tooltip.is-hovered, .html-tooltip.is-active-hover {
        z-index: 101; /* Pop to the very top */
        opacity: 1 !important;
    }

    .html-tooltip.is-dimmed {
        opacity: 0.2;
        transition: opacity 300ms ease;
    }

    .html-tooltip.is-active-hover .tooltip-content {
        transform: scale(1.125);
        z-index: 100; /* Ensure the scaled tooltip is on top of neighbors */
    }

    .html-tooltip.side-jan {
        transform: translate(14px, -50%);
    }

    /* ASHLEÉ'S SIDE: Stick to the left of the dot */
    .html-tooltip.side-ashlee {
        /* -100% moves the entire width of the div to the left of the anchor point */
        transform: translate(calc(-100% - 14px), -50%);
    }

    /* CENTER MATCH: Move above the dot so it doesn't overlap either side */
    .html-tooltip.is-center {
       transform: translate(-50%, calc(-100% - 14px)) !important;
    }

    .tooltip-content {
        background: white;
        padding: 0.5rem;
        border-radius: 0.25rem;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94), 
                    box-shadow 300ms ease,
                    opacity 300ms ease;
        backface-visibility: hidden;
        -webkit-font-smoothing: antialiased;
        transform-origin: center center;
        font-size: 10px;
        font-family: var(--sans);
    }

    .tooltip-content p {
        margin: 0;
    }

    p.date {
        font-weight: 700;
    }

    p.event-secondary {
        font-style: italic
    }
</style>