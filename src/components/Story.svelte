<script>
    import { createEventDispatcher } from 'svelte';
    import * as d3 from 'd3';
    let { storyVisible } = $props();

    const dispatch = createEventDispatcher();

    let storyW = $state(0);
    let storyH = $state(0);
    let multiplier = 1.5;
    let storyDimMax = $derived(d3.max([storyW, storyH]) * multiplier);

    function onCloseClick() {
        dispatch("close");
    }

    $effect(() => {
        console.log(storyVisible)
    })
</script>

<section class="story" bind:clientWidth={storyW} bind:clientHeight={storyH}>
    <!-- Bubble as clipping mask -->
    <div 
        class="bubble-mask"
        style="--clip-size: {storyVisible ? Math.max(storyW, storyH) * 1.5 + 'px' : '0px'}"
    >
        <div class="contents">
            <div class="theme">
                <p>Trying on our true selves</p>
            </div>
            <div class="details">
                <div class="image-wrapper">
                    <img src="assets/imgs/green-ranger.png" alt="Green Ranger" />
                </div>
                <div class="text-wrapper">
                        <h3>Green Ranger</h3>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec eu magna a magna maximus interdum vitae consequat ipsum. Phasellus scelerisque ipsum sed sem commodo fringilla. Donec et magna at est iaculis efficitur vitae ac dolor. Suspendisse in vehicula ipsum. Cras at neque enim. Suspendisse accumsan dolor quis pharetra suscipit. Nulla facilisi. Morbi malesuada sapien ut rutrum efficitur. Sed quis erat turpis. Integer et ullamcorper dui. Praesent sit amet nisl sed sapien blandit tincidunt. In commodo turpis turpis, in sollicitudin urna sollicitudin quis. Nunc hendrerit dui eget magna suscipit, in molestie nulla lacinia.</p>
                    <p>Praesent quis lacus rutrum, rutrum justo sed, mollis mi. Sed porttitor placerat ante eget feugiat. Aliquam maximus id risus in posuere. Nullam blandit, eros bibendum sodales aliquam, dui urna fermentum mauris, rhoncus condimentum metus purus blandit arcu. Quisque consequat massa nisl, ut egestas nibh scelerisque nec. Fusce in neque vitae mi euismod tincidunt. Nunc lacus ligula, molestie vel rhoncus eu, scelerisque imperdiet ante. Maecenas quis placerat mi, ac vehicula lorem.</p>
                </div>
            </div>
            <button 
                id="close-btn"
                onclick={onCloseClick}
            >
                Close</button>
        </div>
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
