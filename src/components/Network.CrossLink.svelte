<script>
    import { tick } from 'svelte';
    import { colors } from "$runes/misc.svelte.js";
    import { currentStep, pastNetwork } from "$runes/misc.svelte.js";

    let { link, i, overrideY = null, introComplete } = $props();

    let readyToDraw = $state(false);

    const lineLength = $derived(
        Math.hypot(link.target.x - link.source.x, link.target.y - link.source.y)
    );

    const strokeColor = $derived(colors[i % 2 === 0 ? link.source.id : link.target.id]);

    const isSpecialLink =
            (link.source.id === 0 && link.target.id === 4) ||
            (link.source.id === 4 && link.target.id === 0);

    $effect(() => {
        if (currentStep.value >= 5) {
            let cancelled = false;
            let timeoutId;
            tick().then(() => {
                if (!cancelled) {
                    timeoutId = setTimeout(() => { if (!cancelled) readyToDraw = true; }, 500);
                }
            });
            return () => { cancelled = true; clearTimeout(timeoutId); };
        } else {
            readyToDraw = false;
        }
    });
</script>

<line
    class="drawable-link"
    class:draw={readyToDraw}
    class:specialLink={isSpecialLink}
    style="stroke: {currentStep.value <= 5 ? strokeColor : "#ffffff"}; stroke-dasharray: {lineLength};
    stroke-dashoffset: {readyToDraw ? 0 : lineLength};
    opacity: {introComplete ? 0 : (currentStep.value <= 5) || (isSpecialLink && currentStep.value < 10) ? 1 : 0}"
    x1={link.source.x} y1={overrideY ?? link.source.y}
    x2={link.target.x} y2={overrideY ?? link.target.y}
/>

<style>
    .drawable-link {
        stroke-width: 2;
        transition: stroke-dashoffset 1s ease-in-out, opacity 0.5s ease-in-out, stroke 0.5s ease-in-out 1s;
    }
</style>
