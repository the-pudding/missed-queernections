<script>
    import { base } from "$app/paths";
    import { getContext, untrack } from "svelte";
	import { addedEvents, userId, longThemes, isAudioMuted, colors } from "$runes/misc.svelte.js";    import * as db from "$utils/database.js";
    import timestampData from "$data/timestamps/intro.csv?raw";
    import Quote from "$svg/icons/quote.svg";
    
    const copy = getContext("copy");

    let {
        allPickEvents,
        activeBlowoutId,
        blowoutData,
        blowoutColor,
        originX = "50%",
        originY = "50%",
        onClose,
        onPrev,
        onNext,
        onNavigateTo,
        canGoPrev,
        canGoNext,
        currentIndex
    } = $props();

    const eventObject = $derived(
        copy.expandedEvents.find(item => item?.event === blowoutData?.event)
    );
	const seamlessColors = [...colors, colors[0]];
    const animatedGradient = $derived(`linear-gradient(45deg, ${seamlessColors.join(", ")})`);
    const bgImageUrl = $derived(
        eventObject?.img 
            ? `url('${base}/assets/imgs/blowouts/${eventObject.img}')` 
            : 'none'
    );
    const blowoutTheme = $derived(
        longThemes.find(item => item.theme === eventObject?.theme)
    );
    let wrapperEl = $state(null);
    let currentTime = $state(0);
    let timestamps = $state([]);
    let audioElement = $state(null);
    let isPaused = $state(true);
    const isAdded = $derived(
        blowoutData
            ? $addedEvents.includes(String(blowoutData.event ?? "").trim())
            : false
    );

    function parseTime(timeStr) {
        if (!timeStr) return 0;
        const cleanStr = timeStr.replace(/\r/g, "").trim();
        const parts = cleanStr.split(":");
        
        if (parts.length === 2) {
            const minutes = parseFloat(parts[0]) || 0;
            const seconds = parseFloat(parts[1]) || 0;
            return minutes * 60 + seconds;
        }
        if (parts.length === 3) {
            const hours = parseFloat(parts[0]) || 0;
            const minutes = parseFloat(parts[1]) || 0;
            const seconds = parseFloat(parts[2]) || 0;
            return hours * 3600 + minutes * 60 + seconds;
        }
        return parseFloat(cleanStr) || 0;
    }

    $effect(() => {
        if (eventObject?.perspective === "both") {
            const parsed = [];

            if (typeof timestampData === "string") {
                const lines = timestampData.replace(/\r\n/g, "\n").trim().split("\n");
                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(",").map((c) => c.trim());
                    if (cols.length >= 3) {
                        parsed.push({
                            start: parseTime(cols[1]),
                            end: parseTime(cols[2])
                        });
                    }
                }
            } else if (Array.isArray(timestampData)) {
                for (const row of timestampData) {
                    if (row.start && row.end) {
                        parsed.push({
                            start: parseTime(row.start),
                            end: parseTime(row.end)
                        });
                    }
                }
            }

            timestamps = parsed;
        }
    });

    // Auto-play audio when blowout expands or active blowout changes
    $effect(() => {
        const id = activeBlowoutId;
        const currentEvent = eventObject?.event;

        untrack(() => {
            if (id !== null && eventObject?.perspective === "both" && audioElement) {
                currentTime = 0;
                audioElement.play().catch((err) => {
                    console.warn("Autoplay blocked:", err);
                });
            } else if (audioElement) {
                audioElement.pause();
            }
        });
    });

    const activeGrafIndex = $derived.by(() => {
        if (!timestamps.length) return -1;
        return timestamps.findIndex(
            (item) => currentTime >= item.start && currentTime < item.end
        );
    });

    function togglePlay() {
		if (!audioElement) return;

		if (isPaused) {
			audioElement.play().catch(console.error);
		} else {
			audioElement.pause();
		}
	}

    function handleAddClick() {
        if (!blowoutData) return;
        const eventKey = String(blowoutData.event ?? "").trim();
        if (!eventKey) return;
        if ($addedEvents.includes(eventKey)) {
            $addedEvents = $addedEvents.filter((ev) => ev !== eventKey);
        } else {
            $addedEvents = [...$addedEvents, eventKey];
        }
        db.insert({ user_id: $userId, events: $addedEvents });
    }

    let miniPicksHeight = $state(0);

    // Calculate label visibility anchored at currentIndex
    const visibleLabelIndexes = $derived.by(() => {
        if (!allPickEvents.length || !miniPicksHeight) return new Set();

        const minCy = allPickEvents[0].cy;
        const maxCy = allPickEvents[allPickEvents.length - 1].cy;
        const cyRange = maxCy - minCy || 1;
        const MIN_GAP_PX = 18; // Minimum vertical pixels required between labels

        // Calculate vertical pixel position for every item
        const positions = allPickEvents.map((pick) => {
            const pct = (pick.cy - minCy) / cyRange;
            return pct * miniPicksHeight;
        });

        const visible = new Set();
        const validCurrentIndex =
            currentIndex >= 0 && currentIndex < allPickEvents.length
                ? currentIndex
                : 0;

        // 1. Active label is always visible
        visible.add(validCurrentIndex);

        // 2. Scan upwards from current index
        let lastKeptUpPos = positions[validCurrentIndex];
        for (let i = validCurrentIndex - 1; i >= 0; i--) {
            if (lastKeptUpPos - positions[i] >= MIN_GAP_PX) {
                visible.add(i);
                lastKeptUpPos = positions[i];
            }
        }

        // 3. Scan downwards from current index
        let lastKeptDownPos = positions[validCurrentIndex];
        for (let i = validCurrentIndex + 1; i < allPickEvents.length; i++) {
            if (positions[i] - lastKeptDownPos >= MIN_GAP_PX) {
                visible.add(i);
                lastKeptDownPos = positions[i];
            }
        }

        return visible;
    });

    $effect(() => {
        currentIndex;
        if (wrapperEl) wrapperEl.scrollTop = 0;
    });
</script>

<div
    class="blowout-overlay"
    class:is-expanded={activeBlowoutId !== null}
    style="--theme-color: {blowoutData?.color ||
        blowoutColor}; --origin-x: {originX}; --origin-y: {originY}; --bg-image: {bgImageUrl}"
>
    {#if blowoutData && eventObject}
        <div class="button-group">
            <button onclick={onClose} class="close-button">
            <svg
                width="20"
                height="20"
                viewBox="-5 -5 10 10"
                class="icon rotated"
            >
                <line
                    x1="0"
                    y1="-3.75"
                    x2="0"
                    y2="3.75"
                    stroke="#191919"
                    stroke-width="1.5"
                    stroke-linecap="butt"
                />
                <line
                    x1="-3.75"
                    y1="0"
                    x2="3.75"
                    y2="0"
                    stroke="#191919"
                    stroke-width="1.5"
                    stroke-linecap="butt"
                />
            </svg>
                <p>Close</p>
            </button>
        </div>

        <div class="blowout-content-wrapper" bind:this={wrapperEl}>
            <div class="blowout-content">
				<div class="img-wrapper" style="--animated-gradient: {animatedGradient}">
                	<div class="blowout-image" style="background-image: {bgImageUrl}"></div>
				</div>
				<h3>
                    <button
                        class="add-btn"
                        onclick={handleAddClick}
                        aria-label={isAdded ? "Remove event" : "Add event"}
                    >
                        <svg
                            width="12"
                            height="12"
                            viewBox="-5 -5 10 10"
                            class="icon"
                            class:rotated={isAdded}
                        >
                            <line
                                x1="0"
                                y1="-3.75"
                                x2="0"
                                y2="3.75"
                                stroke="white"
                                stroke-width="2"
                                stroke-linecap="butt"
                            />
                            <line
                                x1="-3.75"
                                y1="0"
                                x2="3.75"
                                y2="0"
                                stroke="white"
                                stroke-width="2"
                                stroke-linecap="butt"
                            />
                        </svg>
                    </button>
                    {eventObject.event}
                </h3>
                {#if eventObject.eventSecondary}
                    <p class="secondary">{eventObject.eventSecondary}</p>
                {/if}
                <div class="date-theme-wrapper">
                    {#if eventObject.perspective == "both"}
                        <div class="audio-controls">
                            <button
                                class="play-pause-btn"
                                onclick={togglePlay}
                                aria-label={isPaused ? "Start dialogue" : "Pause dialogue"}
                            >
                                {#if isPaused}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                    <span>Start Dialogue</span>
                                {:else}
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                    </svg>
                                    <span>Pause Dialogue</span>
                                {/if}
                            </button>
                            <audio
                                bind:this={audioElement}
                                bind:currentTime={currentTime}
                                bind:paused={isPaused}
                                muted={isAudioMuted.value}
                                src={eventObject.audio ? `${base}/assets/audio/convos/${eventObject.audio}` : `${base}/assets/audio/convos/convo-0.mp3`}
                                preload="auto"
                            ></audio>
                        </div>
                    {:else}
                        <p>
                            <span class="essay-icon">{@html Quote}</span>
                            By {eventObject.perspective}
                        </p>
                    {/if}
                    <p>{blowoutTheme.longTheme}</p>
                    <p class="date">{eventObject.date}</p>
                </div>
                {#if eventObject.perspective == "both"}
                    {#each eventObject.text as graf, i}
                        <p class="graf" class:highlighted={i === activeGrafIndex}>
                            <span class="speaker">{@html graf.speaker}:</span> {@html graf.words}
                        </p>
                    {/each}
                {:else}
                        {#each eventObject.text as graf, i}
                            <p class="graf">{@html graf.value}</p>
                        {/each}
                {/if}
            </div>
        </div>

        <nav class="mini-timeline">
            <div class="mini-line"></div>
            <div class="dir-wrapper prev-wrapper" class:disabled={!canGoPrev}>
                <button onclick={onPrev} class="mini-arrow" aria-label="Previous event">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <polyline
                            points="4,14 10,6 16,14"
                            stroke={"#191919"}
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>
            </div>

            <div class="mini-picks" bind:clientHeight={miniPicksHeight}>
                {#if allPickEvents.length > 0}
                    {@const minCy = allPickEvents[0].cy}
                    {@const maxCy = allPickEvents[allPickEvents.length - 1].cy}
                    {@const cyRange = maxCy - minCy || 1}
                    {@const currentPct =
                        ((allPickEvents[currentIndex].cy - minCy) / cyRange) * 100}
                    <div class="tracker-dot" style="top: {currentPct}%"></div>
                    {#each allPickEvents as pick, i}
                        {@const pct = ((pick.cy - minCy) / cyRange) * 100}
                        <span
                            class="dot-label"
                            class:is-current={i === currentIndex}
                            class:is-hidden={!visibleLabelIndexes.has(i)}
                            style="top: {pct}%"
                        >
                            {pick.date?.slice(-4)}
                        </span>
                        <button
                            class="mini-dot"
                            class:is-current={i === currentIndex}
                            onclick={() => onNavigateTo(i)}
                            aria-label={pick.event}
                            style="background: {pick.color}; top: {pct}%"
                        ></button>
                    {/each}
                {/if}
            </div>

            <div class="dir-wrapper next-wrapper" class:disabled={!canGoNext}>
                <button onclick={onNext} class="mini-arrow" aria-label="Next event">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <polyline
                            points="4,6 10,14 16,6"
                            stroke={"#191919"}
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </button>
            </div>
        </nav>
    {/if}
</div>

<style>
    .blowout-overlay {
        position: fixed;
        inset: 0;
        z-index: 999;
        background: var(--theme-color);
        overflow: hidden;

        clip-path: circle(0% at var(--origin-x, 50%) var(--origin-y, 50%));
        transition: clip-path 0.75s cubic-bezier(0.16, 1, 0.3, 1);

        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: none;
    }

    .blowout-overlay::before {
        content: "";
        position: absolute;
        inset: -20px;
        background: var(--bg-image) center / cover no-repeat;
        filter: grayscale(1) blur(0px);
        mix-blend-mode: multiply;
        opacity: 0.05;
        pointer-events: none;
        transition: background-image 0.3s ease;
    }

    .blowout-overlay.is-expanded {
        clip-path: circle(150% at var(--origin-x, 50%) var(--origin-y, 50%));
        pointer-events: all;
        transition: clip-path 1.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ── Main content ────────────────────────────────────────────────────── */
    .blowout-content-wrapper {
        width: 100%;
        height: 100svh;
        overflow-y: auto;
        display: flex;
        justify-content: center;
    }

    .blowout-content {
        width: 100%;
        padding: 4rem 4rem 2rem 2rem;
        margin: 2rem;
        max-width: 800px;
        color: var(--color-bg);
        font-family: var(--sans);
        isolation: isolate;
    }

	.date-theme-wrapper {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 0.25rem;
	}

	.date-theme-wrapper p {
		font-family: var(--marsha);
        font-weight: 700;
        line-height: 1;
        text-transform: uppercase;
        border: 2px solid var(--color-bg);
        padding: 0.8rem 1.2rem 0.8rem 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 1.5rem;
        font-size: var(--14px);
        margin: 0;
	}

    .essay-icon {
        width: 14px;
        aspect-ratio: 1;
        margin: -3px 0.5rem 0 0;
    }

    h3 {
        font-family: var(--marsha);
        font-weight: 700;
        line-height: 1;
        text-transform: uppercase;
        font-size: var(--64px);
        position: relative;
    }

	.secondary {
		font-family: var(--marsha);
        text-transform: uppercase;
        font-weight: 700;
        line-height: 1;
		font-size: var(--36px);
	}

    .add-btn {
        background: var(--color-bg);
        border-radius: 50%;
        padding: 0;
        margin: 0;
        height: 30px;
        width: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: 28px;
        left: -3rem;
        transform: translateY(-50%);
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .add-btn:hover {
        transform: scale(1.1) translateY(-50%);
    }

    .add-btn svg line {
        fill: var(--color-fg);
    }

	@keyframes flow {
        0% {
            background-position: 0% 50%;
        }
        50% {
            background-position: 100% 50%;
        }
        100% {
            background-position: 0% 50%;
        }
    }

	.img-wrapper {
        position: relative;
        width: 100%;
        max-width: 460px;
        aspect-ratio: 1;
        border-radius: 0.75rem;
        overflow: hidden;
        isolation: isolate;
        box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.2);
        margin-bottom: 3rem;
    }

	.img-wrapper::after {
        content: "";
        position: absolute;
        inset: 0;
        background-image: var(--animated-gradient);
        background-size: 300% 300%;
        animation: flow 8s ease infinite;
        mix-blend-mode: multiply;
        opacity: 0.6;
        pointer-events: none;
    }

    .blowout-image {
        width: 100%;
        aspect-ratio: 1 / 1;
        background-size: cover;
        background-position: center;
		filter: grayscale(1);
		border-radius: 0.75rem;
    }

    /* ── Audio & Paragraph Highlighting ──────────────────────────────────── */
    .audio-controls {
        display: flex;
        align-items: center;
    }

    .play-pause-btn {
        background: var(--color-fg);
        border: none;
        padding: 0.8rem 1.2rem 0.8rem 1rem;
        width: 190px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50px;
        cursor: pointer;
        font-weight: bold;
        color: var(--color-bg);
        font-family: var(--marsha);
        font-size: var(--14px);
        text-transform: uppercase;
        line-height: 1;
        display: flex;
        align-items: center;
        gap: 0.125rem;
        z-index: 1000;
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .play-pause-btn:hover {
        transform: translateY(-4px);
    }

	:global(.play-pause-btn svg) {
		margin-top: -2px;
	}

    .graf {
        font-size: var(--18px);
        line-height: 1.65;
        margin: 1.5rem 0;
        border-radius: 6px;
        transition: background-color 0.25s ease, transform 0.25s ease;
    }

    .graf.highlighted {
        background-color: rgba(255, 255, 255, 0.25);
    }

    .graf .speaker {
        font-weight: 700;
        text-transform: capitalize;
    }

    .graf:last-of-type {
        padding-bottom: 4rem;
    }

    .button-group {
        position: absolute;
        top: 1rem;
        left: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
    }

    .close-button {
        background: var(--color-fg);
        border: none;
        padding: 0.8rem 1.2rem 0.8rem 1rem;
        border-radius: 50px;
        cursor: pointer;
        font-weight: bold;
        color: var(--color-bg);
        font-family: var(--marsha);
        text-transform: uppercase;
        line-height: 1;
        height: 2.5rem;
        display: flex;
        align-items: center;
        gap: 0.125rem;
        z-index: 1001;
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .close-button:hover {
        transform: translateY(-4px);
    }

    .close-button p {
        padding: 0;
        padding-top: 2px;
        margin: 0;
		pointer-events: none;
    }

    .icon {
        display: block;
        transition: transform 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }

    .icon.rotated {
        transform: rotate(45deg);
    }

    /* ── Mini timeline ───────────────────────────────────────────────────── */
    .mini-timeline {
        position: absolute;
        right: 1rem;
        top: 1rem;
        bottom: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 4rem 0;
        gap: 0.5rem;
        color: var(--color-bg);
    }

    .mini-line {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 50%;
        width: 1.5px;
        background: var(--color-bg);
        transform: translateX(-50%);
        pointer-events: none;
        z-index: 1;
    }

    .dir-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: absolute;
        z-index: 999;
    }

    .dir-wrapper.prev-wrapper {
        top: 0;
        left: 50%;
        transform: translate(-50%, 0);
    }

    .dir-wrapper.next-wrapper {
        bottom: 0;
        left: 50%;
        transform: translate(-50%, 0);
    }

    .dir-wrapper.prev-wrapper.disabled,
    .dir-wrapper.next-wrapper.disabled {
        opacity: 0;
        pointer-events: none;
    }

    .mini-arrow {
        background: white;
        border: none;
        border-radius: 50%;
        width: 2.5rem;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        color: var(--color-fg);
        flex-shrink: 0;
        transition: all 300ms ease;
        z-index: 100;
    }

    .mini-arrow:hover:not(:disabled) {
        transform: scale(1.1);
    }

    .mini-arrow:disabled {
        opacity: 0.25;
        cursor: default;
    }

    .mini-picks {
        flex: 1;
        position: relative;
        width: 2rem;
    }

    .dot-label {
        position: absolute;
        right: calc(100%);
        top: 0;
        transform: translateY(-50%);
        font-family: var(--sans);
        font-size: 0.6rem;
        font-weight: bold;
        text-transform: uppercase;
        color: var(--color-bg);
        white-space: nowrap;
        pointer-events: none;
    }

    .dot-label.is-hidden {
        opacity: 0;
        visibility: hidden;
    }

    .dot-label.is-current {
        font-size: 0.8rem;
        opacity: 1;
        visibility: visible;
    }

    .tracker-dot {
        position: absolute;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: var(--color-bg);
        z-index: 1;
        pointer-events: none;
        transition: top 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .mini-dot {
        position: absolute;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid var(--color-bg);
        cursor: pointer;
        padding: 0;
        transition:
            background 200ms ease,
            transform 200ms ease,
            width 200ms ease,
            height 200ms ease;
        z-index: 999;
    }

    .mini-dot:hover {
        transform: translate(-50%, -50%) scale(1.4);
    }

    .mini-dot.is-current {
        width: 20px;
        height: 20px;
        box-shadow: 0 0 0 5px rgba(255, 255, 255, 0.4);
        pointer-events: none;
        transform: translate(-50%, -50%);
    }

    @media(max-width: 800px) {
        .date-theme-wrapper {
            flex-direction: column;
            align-items: flex-start;
        }
    }

    @media(max-width: 760px) {
        .blowout-content-wrapper {
            justify-content: flex-start;
        }

        .blowout-content {
            padding: 6rem 6rem 3rem 2.5rem;
            margin: 0;
        }

        .button-group {
            top: 0.5rem;
            left: 0.25rem;
        }

        .theme-group {
            top: 0.5rem;
            left: 0.5rem;
        }

        .mini-timeline {
            top: 0.5rem;
            bottom: 0.5rem;
            right: 0.5rem;
        }

        h3 {
            font-size: var(--36px);
        }

        .secondary {
            font-size: var(--24px);
        }

        .add-btn {
            top: 16px;
            left: -2rem;
            width: 24px;
            height: 24px;
        }
    }
</style>