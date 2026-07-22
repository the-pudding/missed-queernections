<script>
    import { fly, fade } from 'svelte/transition';
    import { currentStep } from "$runes/misc.svelte.js";

    let { springs, name, introComplete, snapToFinalPosition = () => {}, offsetX = 0, offsetY = 0 } = $props();

    let x = $state(0);
    let y = $state(0);
    let isVisible = $derived((currentStep.value === 6) ||
                      (currentStep.value === 7 && name.name === "Jan") ||
                      (currentStep.value === 8 && name.name === "Ashleé") ||
                      (currentStep.value >= 9));

    let settled = $state(false);
    let prevVisible = false;

    $effect(() => {
        if (isVisible && !prevVisible) {
            snapToFinalPosition();
            settled = true;
            prevVisible = true;
        } else if (!isVisible) {
            settled = false;
            prevVisible = false;
        }
    });

    let nameplateEl = $state(null);
    let isOverlapping = $state(true);

    $effect(() => {
        if (!(springs && springs.x && springs.y)) return;
        const unsubX = springs.x.subscribe(x_val => { x = x_val; });
        const unsubY = springs.y.subscribe(y_val => { y = y_val; });
        return () => { unsubX(); unsubY(); };
    });

    // Collision Detection Loop
    $effect(() => {
        if (!nameplateEl) return;
        
        // FIX 1: Dynamically match target element IDs based on name strings
        const dynamicSelector = `#${name.name}-target-nameplate`;
        const navEl = document.querySelector(dynamicSelector) || document.querySelector('#Jan-target-nameplate');
        if (!navEl) return;

        let animationFrameId;

        function checkPosition() {
            const nameplateRect = nameplateEl.getBoundingClientRect();
            const navRect = navEl.getBoundingClientRect();
            
            // True means "above target zone", false means "crossed paths with timeline nav"
            const isNowOverlapping = !(nameplateRect.top > navRect.bottom - 48);
            if (isNowOverlapping !== isOverlapping) isOverlapping = isNowOverlapping;
            
            animationFrameId = requestAnimationFrame(checkPosition);
        }

        checkPosition();
        return () => cancelAnimationFrame(animationFrameId);
    });
</script>

{#if isVisible && settled}
    <div
        bind:this={nameplateEl}
        id="{name.name}-nameplate"
        class="nameplate"
        class:hidden={!isOverlapping}
        class:is-static={introComplete}
        class:jan={name.name === 'Jan'}
        class:ashlee={name.name === 'Ashleé'}
        style="--x: {x + offsetX}px; --y: {y + offsetY}px;"
        in:fly={{ duration: 500, x: name.name === 'Jan' ? -20 : 20 }}
        out:fly={{ duration: 300, x: name.name === 'Jan' ? -20 : 20 }}
    >
        <p>{name.name}</p>
        <!-- Jan's Image (Step 7 / Step 9) -->
        {#if name.name === 'Jan' && !introComplete && (currentStep.value === 7 || currentStep.value === 9)}
            {@const fileName = currentStep.value === 7 ? 'jan-then.jpg' : 'jan-now.jpg'}
            <div class="img-wrapper" transition:fade={{ duration: 500, delay: 200 }}>
                <img src={`assets/imgs/intro/${fileName}`} alt="Jan" class="intro-img" />
            </div>
        {/if}

        <!-- Ashleé's Image (Step 8 / Step 9) -->
        {#if name.name === 'Ashleé' && !introComplete && (currentStep.value === 8 || currentStep.value === 9)}
            {@const fileName = currentStep.value === 8 ? 'ashlee-then.jpg' : 'ashlee-now.jpg'}
            <div class="img-wrapper" transition:fade={{ duration: 500, delay: 200 }}>
                <img src={`assets/imgs/intro/${fileName}`} alt="Ashleé" class="intro-img" />
            </div>
        {/if}
    </div>
{/if}
{#if currentStep.value === 6 && name.name=="Jan"}
    <div class="img-wrapper" in:fade={{ duration: 500, delay: 500 }}>
        <img src="assets/imgs/intro/wku.jpg" alt="Jan" class="intro-img" />
    </div>
{/if}

<style>
    .nameplate {
        position: absolute;
        transform: translate(-50%, -50%);
        
        left: var(--x);
        top: var(--y);

        transition: top 0.8s ease-in-out, left 0.8s ease-in-out, opacity 0.5s ease;
        will-change: top, left, opacity;

        font-family: var(--marsha);
        text-transform: uppercase;
        font-weight: 700;
        font-size: var(--18px);
        width: 120px;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-fg);
        border-radius: 1.25rem;
        border: 2px solid var(--color-bg);
        color: var(--color-bg);
        box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    }

    .nameplate.is-static.jan {
        top: calc(100svh - 3rem + 1.25rem);
        left: calc(0vw + 8px + 60px);
    }
    
    .nameplate.is-static.ashlee {
        top: calc(100svh - 3rem + 1.25rem);
        left: calc(100vw - 8px - 60px);
    }

    .nameplate.hidden {
        opacity: 0;
        /* Instant 0s opacity switch allows a seamless visual handoff to the timeline element */
        transition: top 0.8s ease-in-out, left 0.8s ease-in-out, opacity 0s ease;
        pointer-events: none;
    }

    .nameplate .img-wrapper {
        max-width: 15vw;
        position: absolute;
        top: -9vw;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 15vw;
    }

    .img-wrapper {
        position: absolute;
        left: 50%;
        top: 25%;
        transform: translate(-50%, -50%);
        max-width: 15vw;
    }

    .img-wrapper img {
        width: 100%;
        height: auto;
    }

    @media(max-width: 760px) {
        .nameplate {
            font-size: var(--16px);
            height: 2.25rem;
        }
    }
</style>