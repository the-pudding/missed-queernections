<script>
    import {
        addedEvents,
        activeSection,
        visitors, 
        colors
    } from "$runes/misc.svelte.js";
    import { ChevronDown } from "@lucide/svelte";
    import UserNetwork from "$components/UserNetwork.svelte";
    import copy from "$data/copy.json";
    import Footer from "$components/Footer.svelte";

    let { index = -1, atEnd = false } = $props();
    const seamlessColors = [...colors, colors[0]];
    const animatedGradient = $derived(`linear-gradient(90deg, ${seamlessColors.join(", ")})`);

    let listVisible = $state(false);
    let hasAutoOpenedAtEnd = $state(false);
    let hasInstructionAutoOpened = $state(false);

    // Snapshot on load to identify returning users who already had saved events
    const isReturningUser = $addedEvents.length > 0;

    function toggleShow() {
        listVisible = !listVisible;
    }

    function clearAll() {
        $addedEvents = [];
        listVisible = false;
    }

    function removeEvent(event) {
        $addedEvents = $addedEvents.filter((e) => e !== event);
    }

    $effect(() => {
        if (atEnd) {
            if (!hasAutoOpenedAtEnd) {
                listVisible = true;
                hasAutoOpenedAtEnd = true;
            }
        } else {
            // Reset the flag when scrolling away from the end so it can fire again next time!
            hasAutoOpenedAtEnd = false;
        }
    });

    const connectionCount = $derived(
        $visitors.filter((v) => (v.events ?? []).some((e) => $addedEvents.includes(e))).length
    );

    // Auto pop-out ONLY when a new user adds their first event EVER and index >= 8
    $effect(() => {
        const isNewUser = !isReturningUser;
        const hasEvents = $addedEvents.length > 0;
        const isAtOrPastStep8 = index >= 8;

        if (isNewUser && hasEvents && isAtOrPastStep8 && !hasInstructionAutoOpened) {
            listVisible = true;
            hasInstructionAutoOpened = true;
        }
    });

    // Lock body scroll when panel is visible
    $effect(() => {
        if (!listVisible) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    });
</script>

<div
    class="events-wrapper"
    class:wiggle={index == 5}
    style="transform: translateY({(index < 8 && !atEnd)
        ? '200%'
        : listVisible
            ? 0
            : $activeSection == 'timeline'
                ? '100%'
                : '120%'})"
>
    <!-- Toggle button stays anchored at the top of the screen -->
    <button
        class="show-toggle"
        class:list-visible={listVisible}
        onclick={toggleShow}
        style="top: {listVisible ? '-0.25rem' : '-2.75rem'};"
    >
        <p>{listVisible ? "Back to Timeline" : "Your Events"}</p>
        <div
            class="chevron-wrapper"
            style="transform: rotate({listVisible ? 0 : 180}deg);"
        >
            <ChevronDown />
        </div>
        <p class="count" style="top: {listVisible ? '2.5rem' : '-0.5rem'}">
            {$addedEvents.length}
        </p>
    </button>

    <!-- Scrollable content viewport -->
    <div class="scroll-container">
        <div class="top-info">
            {#if atEnd}
                <div class="closing-text">
                    {#each copy.closing as graf}
                        <p>{@html graf.value}</p>
                    {/each}
                </div>
            {/if}
            <p class="connection-count">
                {#if $addedEvents.length === 0}
                    Add events to see your “queernections” with the last 99 people to visit this site.
                {:else}
                    You've made  
                    {$addedEvents.length}
                    {$addedEvents.length === 1 ? `“queernection”` : `“queernections”`}
                    with the last 99 people to visit this site.
                {/if}
            </p>
        </div>

        <div class="network-wrapper">
            <UserNetwork />
        </div>

        <div class="bottom-info">
            {#if $addedEvents.length > 0}
                <p class="events-label">Your events ({$addedEvents.length})</p>
                <ul class="event-list">
                    {#each $addedEvents as event}
                        <li>
                            <button
                                class="remove-btn"
                                onclick={() => removeEvent(event)}
                                aria-label="Remove {event}">
                                    <p>{event}</p>
                                    <div class="strikethrough"></div>
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="-5 -5 10 10"
                                        class="icon"
                                        style="transform: rotate(45deg)"
                                    >
                                        <line
                                            x1="0"
                                            y1="-5"
                                            x2="0"
                                            y2="5"
                                            stroke="#191919"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                        />
                                        <line
                                            x1="-5"
                                            y1="0"
                                            x2="5"
                                            y2="0"
                                            stroke="#191919"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                        />
                                    </svg>
                                </button>
                        </li>
                    {/each}
                </ul>
                <button onclick={clearAll} class="remove-all">Clear all events</button>
            {/if}
        </div>

        {#if atEnd}
            <div class="notes">
                <h5 class="events-label">Notes</h5>
                {#each copy.notes as graf}
                    <p>{@html graf.value}</p>
                {/each}
            </div>
            <Footer />
        {/if}
    </div>
</div>

<style>
    .events-wrapper {
        --mesh-gradient: 
            radial-gradient(at 10% 15%, #FF94CD 0px, transparent 55%),
            radial-gradient(at 85% 15%, #FF7676 0px, transparent 55%),
            radial-gradient(at 50% 35%, #FFAE58 0px, transparent 50%),
            radial-gradient(at 15% 55%, #FFD426 0px, transparent 50%),
            radial-gradient(at 80% 55%, #B18CFF 0px, transparent 50%),
            radial-gradient(at 30% 85%, #5CE1E1 0px, transparent 50%),
            radial-gradient(at 85% 85%, #7CD67C 0px, transparent 50%);
        font-family: var(--sans);
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        height: 100vh;
        color: var(--color-bg);
        background-color: var(--color-fg);
        background-image: var(--mesh-gradient);
        background-attachment: fixed;
        z-index: 1000;
        transition: transform 0.5s ease-out;
        box-sizing: border-box;
    }

    /* Inner scrollable area */
    .scroll-container {
        width: 100%;
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 5rem 2rem 4rem;
        gap: 2.5rem;
        box-sizing: border-box;
        -webkit-overflow-scrolling: touch;
    }

    @keyframes wiggle {
        0%,
        100% {
            transform: translateX(-50%);
        }
        25% {
            transform: translateX(-51%);
        }
        75% {
            transform: translateX(-49%);
        }
    }

    .show-toggle {
        position: absolute;
        width: 14rem;
        height: 3.5rem;
        top: -2.75rem;
        left: 50%;
        transform: translate(-50%, 0);
        background: var(--color-gray-900);
        border: 2px solid var(--color-gray-800);
        border-bottom: none;
        border-radius: 4px 4px 0 0;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        text-transform: uppercase;
        font-family: var(--marsha);
        font-size: var(--18px);
        color: var(--color-fg);
        padding: 0 0 8px 0;
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        z-index: 1001;
    }

    .show-toggle p {
        color: var(--color-fg);
    }

    .show-toggle.list-visible {
        padding: 8px 0 0 0;
        background-color: var(--color-fg);
        border: 2px solid var(--color-gray-800);
        border-top: none;
        border-radius: 0 0 4px 4px;
        color: var(--color-bg);
    }

    .show-toggle.list-visible p {
        color: var(--color-bg);
    }

    .show-toggle:hover {
        transform: translate(-50%, -4px);
    }

    .show-toggle.list-visible:hover {
        transform: translate(-50%, 4px);
    }

    .wiggle .show-toggle {
        animation: wiggle 0.5s ease-in-out infinite;
    }

    :global(.show-toggle svg) {
        width: 2rem;
        height: 2rem;
    }

    .show-toggle p.count {
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

    .list-visible.show-toggle p.count {
        background: var(--color-bg);
        color: var(--color-fg);
    }

    .chevron-wrapper {
        transition: transform 150ms ease;
    }

    /* Top group */
    .top-info {
        max-width: 700px;
        width: 100%;
        gap: 2rem;
        display: flex;
        flex-direction: column;
        margin-top: 4rem;
    }

    .closing-text {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .closing-text p {
        font-family: var(--sans);
        font-size: var(--20px);
        line-height: 1.5;
        margin: 0;
        text-align: left;
        color: var(--color-bg);
    }

    :global(.closing-text p a, .notes p a) {
        color: var(--color-bg);
        text-decoration: underline;
    }

     :global(.closing-text p a:hover, .notes p a:hover) {
        opacity: 0.7;
    }

    .connection-count, .top-info p.connection-count {
        font-size: var(--24px);
        line-height: 1.2;
        font-weight: 700;
        font-family: var(--marsha);
        text-transform: uppercase;
        margin: 0;
        text-align: left;
        color: var(--color-bg);
    }

    /* Network */
    .network-wrapper {
        height: 42vh;
        min-height: 320px;
        width: 100%;
        max-width: 800px;
        flex-shrink: 0;
    }

    /* Bottom group */
    .bottom-info {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        max-width: 500px;
        width: 100%;
        flex-shrink: 0;
    }

    .events-label {
        font-size: var(--16px);
        font-family: var(--marsha);
        font-weight: 700;
        text-transform: uppercase;
        margin: 0;
        width: 100%;
    }

    .event-list {
        list-style: none;
        margin: 0;
        padding: 0;
        max-height: 12rem;
        overflow-y: auto;
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 4px;
        width: 100%;
    }

    .event-list li {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 0.5rem;
        font-family: var(--sans);
        font-size: var(--14px);
        color: var(--color-bg);
    }

    .event-list li + li {
        border-top: 1px solid rgba(255, 255, 255, 0.5);
    }

    .remove-btn {
        background: transparent;
        width: 100%;
        height: 100%;
        border: none;
        cursor: pointer;
        font-size: 10px;
        padding: 0.25rem 0 0.25rem 0.5rem;
        opacity: 1;
        color: var(--color-fg);
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        position: relative;
    }

    .remove-btn:hover p {
        opacity: 0.5;
    }

    .remove-btn:hover .strikethrough {
        opacity: 1;
    }

    .strikethrough {
        opacity: 0;
        position: absolute;
        left: 0;
        top: calc(50% - 1px);
        width: 100%;
        border-bottom: 2px solid var(--color-bg);
    }

    .remove-all {
        background: var(--color-fg);
        color: var(--color-bg);
        font-family: var(--marsha);
        text-transform: uppercase;
        font-size: var(--16px);
        font-weight: 700;
        padding: 1rem 1.2rem 0.8rem 1.2rem;
        margin-top: 1rem;
        border-radius: 50px;
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .remove-all:hover {
        transform: translateY(-4px);
    }

    p {
        font-size: var(--16px);
        margin: 0;
        color: var(--color-bg);
    }

    .notes {
        max-width: 700px;
        margin-top: 4rem;
    }

    .notes p {
        padding: 0.5rem 0;
    }

    @media(max-width: 760px) {
        .scroll-container {
            padding: 4rem 1.25rem 3rem;
            gap: 1.75rem;
        }

        .show-toggle {
            width: 12rem;
        }

        .closing-text p {
            font-size: var(--16px);
        }

        .connection-count, .top-info p.connection-count {
            font-size: var(--20px);
        }

        p, .events-label, .remove-all {
            font-size: var(--14px);
        }
    }
</style>