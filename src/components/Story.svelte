<script>
    import { createEventDispatcher, onDestroy } from 'svelte';
    import * as d3 from 'd3';
    import copy from '$data/copy.json';


    let { highlightedTickDate } = $props();
    let dateMatch = $derived(
        highlightedTickDate
            ? copy.expandedEvents.find(e => {
                const eventDate = new Date(e.date);
                return (
                eventDate.getFullYear() === highlightedTickDate.getFullYear() &&
                eventDate.getMonth() === highlightedTickDate.getMonth() &&
                eventDate.getDate() === highlightedTickDate.getDate()
                );
            })
            : null
        );

    // ARRAYS
    const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];
    const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];

    const dispatch = createEventDispatcher();

    let storyW = $state(0);
    let storyH = $state(0);
    let keepContents = $state(false);
    let activeMatch = $state(null);
    let isOpen = $state(false);
    let closeTimer = null;
    const CLOSE_DURATION = 750;

    function onCloseClick() {
        dispatch("close");
    }

    $effect(() => {
        // clear any pending close timer whenever this effect runs
        if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
        }

        if (dateMatch) {
            console.log("match")
            // immediate: set the active content and open the bubble
            activeMatch = dateMatch;
            keepContents = true;
            isOpen = true;
        } else {
            // no exact match: start closing sequence only if we currently have mounted contents
            if (keepContents) {
                isOpen = false; // triggers CSS clip-path transition to close
                // wait until the visual transition finishes, then unmount and clear activeMatch
                closeTimer = setTimeout(() => {
                    keepContents = false;
                    activeMatch = null;
                    closeTimer = null;
                }, CLOSE_DURATION);
            }
        }
    });

    onDestroy(() => {
        if (closeTimer) clearTimeout(closeTimer);
    });
</script>

<section class="story" bind:clientWidth={storyW} bind:clientHeight={storyH}>
    <!-- Bubble as clipping mask -->
    <div 
        class="bubble-mask"
        style="--clip-size: {isOpen ? Math.max(storyW, storyH) * 1.5 + 'px' : '0px'};
        background: {activeMatch ? colors[themes.indexOf(activeMatch.theme)] : null};"
    >   
        {#if keepContents}
            <div class="contents">
                <div class="theme">
                    <p>{activeMatch.theme}</p>
                </div>
                <div class="details">
                    <div class="image-wrapper">
                        <img src="assets/imgs/green-ranger.png" alt="Green Ranger" />
                    </div>
                    <div class="text-wrapper">
                        <h3>{activeMatch.event}</h3>
                        {#each activeMatch.text as graf, i}
                            <p>{graf.value}</p>
                        {/each}
                    </div>
                </div>
                <button 
                    id="close-btn"
                    onclick={onCloseClick}
                >
                    Close</button>
            </div>
        {/if}
    </div>
</section>

<style>
.story {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100svh;
    z-index: 1000;
    overflow: hidden;
    pointer-events: none;
}

/* The mask grows as a circle */
.bubble-mask {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    transform: translate(-50%, -50%);
    clip-path: circle(var(--clip-size, 0px) at 50% 50%);
    transition: clip-path 0.75s ease-in-out;
    background: var(--mq-purple); /* optional */
    pointer-events: none;
}

/* Contents inside mask */
.contents {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 2rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    pointer-events: auto;
}

.details {
    position: absolute;
    top: 50%;
    left:50%;
    transform: translate(-50%, -50%);
    width:80%;
    display: flex;
    flex-direction: row;
    gap: 2rem;
}

.details h3 {
    font-family: var(--sans);
    font-size: var(--48px);
    color: var(--color-bg);
    font-weight: 700;
    text-transform: uppercase;
    margin: 0;
    padding: 0;
}

.details p {
   font-family: var(--sans);
    font-size: var(--16px);
    color: var(--color-bg);
    font-weight: 500;
}

.details .text-wrapper {
    width: calc(100% - 200px - 2rem);
}

.details .image-wrapper {
    width: 180px;
    height: 260px;
}

.details .image-wrapper img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* Theme content */
.theme {
    position: absolute;
    top: 2rem;
    left: 2rem;
    border: 1px solid var(--color-bg);
    border-radius: 1rem;
    display: flex;
    align-items: center;
    height: 2rem;
}

.theme p {
    font-family: var(--mono);
    text-transform: uppercase;
    color: var(--color-bg);
    font-size: var(--12px);
    padding: 0.125rem 0.5rem;
    margin: 0;
}
#close-btn {
    position: absolute;
    bottom: 2rem;
    left: 2rem;
} 
</style>
