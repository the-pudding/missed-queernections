<script>
    import { springy } from '$actions/springy.js';

    let { sourceSprings, targetSprings, isOuter, scrollIndex } = $props();

    let lineLength = $state(0);
    let frozenLength = $state(null);
    let frozenInnerLength = $state(null); // captured when inner links retrace
    const isInnerLink = !isOuter;

    // Only subscribe while the line is visible
    $effect(() => {
        const hidden = (isOuter && scrollIndex >= 3) || (isInnerLink && scrollIndex >= 4);
        if (hidden) return;

        const currentValues = { sx: 0, sy: 0, tx: 0, ty: 0 };

        const updateLength = () => {
            lineLength = Math.hypot(
                currentValues.ty - currentValues.sy,
                currentValues.tx - currentValues.sx
            );
        };

        const unsubSX = sourceSprings.x.subscribe(v => { currentValues.sx = v; updateLength(); });
        const unsubSY = sourceSprings.y.subscribe(v => { currentValues.sy = v; updateLength(); });
        const unsubTX = targetSprings.x.subscribe(v => { currentValues.tx = v; updateLength(); });
        const unsubTY = targetSprings.y.subscribe(v => { currentValues.ty = v; updateLength(); });

        return () => { unsubSX(); unsubSY(); unsubTX(); unsubTY(); };
    });

    // Freeze outer length the moment it hides so drift can't shift dashoffset
    $effect(() => {
        if (isOuter && scrollIndex >= 2) {
            if (frozenLength === null) frozenLength = lineLength;
        } else {
            frozenLength = null;
        }
    });

    // Freeze inner length the moment it should retrace, then clear once gone
    $effect(() => {
        if (isInnerLink && scrollIndex >= 4) {
            if (frozenInnerLength === null) frozenInnerLength = lineLength;
        } else {
            frozenInnerLength = null;
        }
    });

    const innerHidden = $derived(isInnerLink && scrollIndex >= 4);
    const outerHidden = $derived(isOuter && scrollIndex >= 3);
</script>

<line
    class="link"
    style="
        stroke-dasharray: {frozenInnerLength ?? lineLength};
        stroke-dashoffset: {
            outerHidden ? (frozenLength ?? lineLength) :
            innerHidden ? (frozenInnerLength ?? lineLength) :
            0
        };
        opacity: {outerHidden || innerHidden ? 0 : 1};"
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
        transition: stroke-dashoffset 0.6s ease-in-out, opacity 0.4s ease-in-out 0.5s;
    }
</style>
