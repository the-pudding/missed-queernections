<script>
    import { fly } from 'svelte/transition';

    let { scrollIndex, springs, name, snapToFinalPosition = () => {} } = $props();

    let x = $state(0);
    let y = $state(0);
    let isVisible = $derived((scrollIndex === 6) ||
                      (scrollIndex === 7 && name.name === "Jan") ||
                      (scrollIndex === 8 && name.name === "Ashleé") ||
                      (scrollIndex >= 9));

    let settled = $state(false);
    let prevVisible = false;

    $effect(() => {
        if (isVisible && !prevVisible) {
            // Snap the node to its final position first, then show immediately.
            // This guarantees correct placement whether arriving via fast or slow scroll,
            // and in either direction.
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

    $effect(() => {
        if (!nameplateEl) return;
        const navEl = document.querySelector('#Jan-target-nameplate');
        if (!navEl) return;

        let animationFrameId;

        function checkPosition() {
            const nameplateRect = nameplateEl.getBoundingClientRect();
            const navRect = navEl.getBoundingClientRect();
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
        class:is-static={scrollIndex >= 10}
        class:jan={name.name === 'Jan'}
        class:ashlee={name.name === 'Ashleé'}
        style="--x: {x}px; --y: {y}px;"
        in:fly={{ duration: 500, x: name.name === 'Jan' ? -20 : 20 }}
        out:fly={{ duration: 300, x: name.name === 'Jan' ? -20 : 20 }}
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
        transition: top 0.8s ease-in-out, left 0.8s ease-in-out, opacity 0.5s ease;
        
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
        transition: top 0.8s ease-in-out, left 0.8s ease-in-out, opacity 0s ease;
        pointer-events: none; /* Make it unclickable when hidden */
    }
</style>