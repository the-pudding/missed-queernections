<script>
    import { onMount } from 'svelte'; // 1. Import onMount
    import { fade } from 'svelte/transition';

    let { scrollIndex, springs, name } = $props();

    let x = $state(0);
    let y = $state(0);
    let isVisible = $derived((scrollIndex === 6) || 
                      (scrollIndex === 7 && name.name === "Jan") || 
                      (scrollIndex === 8 && name.name === "Ashleé") || 
                      (scrollIndex >= 9));

    let nameplateEl = $state(null);
    let isOverlapping = $state(false);

    let debugNameplateTop = $state(0);
    let debugNavBottom = $state(0);

    $effect(() => {
        if (springs && springs.x && springs.y) {
            const unsubX = springs.x.subscribe(x_val => {
                x = x_val;
            });

            const unsubY = springs.y.subscribe(y_val => {
                y = y_val;
            });

            return () => {
                unsubX();
                unsubY();
            };
        }
    });

    $effect(() => {
        // This will run only after the `{#if}` block is true and `bind:this` has populated nameplateEl
        if (nameplateEl) {
            const navEl = document.querySelector('#Jan-target-nameplate');
            if (!navEl) return;
            
            let animationFrameId;

            console.log("Setting up position check for:", {nameplateEl, navEl});

            function checkPosition() {
                const nameplateRect = nameplateEl.getBoundingClientRect();
                const navRect = navEl.getBoundingClientRect();
                
                debugNameplateTop = nameplateRect.top;
                debugNavBottom = navRect.bottom;

                // 👇 THIS IS THE FIX:
                // This condition is now 'true' when the nameplate should be VISIBLE.
                const shouldBeVisible = nameplateRect.top > navRect.bottom - 48;
                
                // We set isOverlapping to the OPPOSITE of shouldBeVisible.
                // The .hidden class is applied when isOverlapping is true.
                const isNowOverlapping = !shouldBeVisible;
                
                if (isNowOverlapping !== isOverlapping) {
                    isOverlapping = isNowOverlapping;
                }
                
                animationFrameId = requestAnimationFrame(checkPosition);
            }

            checkPosition();
            
            // The effect's return function handles cleanup when the element is destroyed
            return () => {
                cancelAnimationFrame(animationFrameId);
            };
        }
    });
</script>

{#if isVisible}
    <div
        bind:this={nameplateEl}
        id="{name.name}-nameplate"
        class="nameplate"
        class:hidden={!isOverlapping}
        class:is-static={scrollIndex >= 9}
        class:jan={name.name === 'Jan'}
        class:ashlee={name.name === 'Ashleé'}
        style="--x: {x}px; --y: {y}px;"
        transition:fade={{ duration: 500 }}
    >
        <p>{name.name}</p>
    </div>
{/if}

<style>
    .nameplate {
        position: absolute;
        transform: translate(-50%, -50%);
        
        /* 4. By default, position using the CSS variables from the script */
        left: var(--x);
        top: var(--y);

        /* 5. A transition on left/top will animate any changes to them */
        transition: top 0.8s ease-in-out, left 0.8s ease-in-out, right 0.8s ease-in-out, bottom 0.8s ease-in-out, opacity 0.5s ease;
        
        /* ... other styles ... */
        font-family: var(--sans);
        font-weight: 700;
        font-size: var(--18px);
        width: 120px;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg);
        border-radius: 1.25rem;
        border: 2px solid var(--color-fg);
        box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    }

    /* 6. When the is-static class is added, these rules override the default left/top */
    .nameplate.is-static {
        position: fixed;
        /* Reset the centering transform for simple top/left positioning */
        transform: translate(0, 0);
    }
    .nameplate.is-static.jan {
        top: calc(100% - 3rem);
        left: calc(0% + 8px);
    }
    .nameplate.is-static.ashlee {
        top: calc(100% - 3rem);
        left: calc(100% - 120px - 8px);
    }

    .nameplate.hidden {
        opacity: 0;
        transition: top 0.8s ease-in-out, left 0.8s ease-in-out, right 0.8s ease-in-out, bottom 0.8s ease-in-out, opacity 0s ease;
        pointer-events: none; /* Make it unclickable when hidden */
    }
</style>