<script>
    import { springy } from '$actions/springy.js';
    
    let { sourceSprings, targetSprings, isOuter, scrollIndex } = $props();

    let lineLength = $state(0);
    const isInnerLink = !isOuter;

    // This effect will set up manual subscriptions to the spring stores.
    // It runs once when the component is created.
    $effect(() => {
        // An object to hold the most recent values from the springs
        const currentValues = { sx: 0, sy: 0, tx: 0, ty: 0 };

        // A function to recalculate length when any value changes
        const updateLength = () => {
            lineLength = Math.hypot(
                currentValues.ty - currentValues.sy, 
                currentValues.tx - currentValues.sx
            );
        };

        // Manually subscribe to each of the four spring stores
        const unsubSX = sourceSprings.x.subscribe(v => {
            currentValues.sx = v;
            updateLength();
        });
        const unsubSY = sourceSprings.y.subscribe(v => {
            currentValues.sy = v;
            updateLength();
        });
        const unsubTX = targetSprings.x.subscribe(v => {
            currentValues.tx = v;
            updateLength();
        });
        const unsubTY = targetSprings.y.subscribe(v => {
            currentValues.ty = v;
            updateLength();
        });

        // Return a cleanup function to unsubscribe when the component is destroyed.
        // This is CRITICAL to prevent memory leaks.
        return () => {
            unsubSX();
            unsubSY();
            unsubTX();
            unsubTY();
        };
    });
</script>

<line
    class="link"
    style="
        stroke-dasharray: {lineLength};
        stroke-dashoffset: {isOuter && scrollIndex >= 2 ? lineLength : 0};
        opacity: {scrollIndex >= 4 && isInnerLink ? 0 : 1};"
    shape-rendering="geometricPrecision"
    use:springy={{
        x1: sourceSprings.x,
        y1: sourceSprings.y,
        x2: targetSprings.x,
        y2: targetSprings.y
    }}
/>

<style>
    .link {
        stroke: var(--color-fg);
        stroke-width: 1;
        transition: stroke-dashoffset 0.8s ease-in-out, opacity 0.5s ease-in-out;
    }
</style>