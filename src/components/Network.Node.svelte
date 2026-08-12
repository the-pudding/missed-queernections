<script>
    import { tick } from 'svelte';
    import { colors } from "$runes/misc.svelte.js";
    import { springy } from '$actions/springy.js';
    import { currentStep, pastNetwork } from "$runes/misc.svelte.js";
    let { springs, node } = $props();

    const isOuter = node.index <= 6;
    const appearDelay = node.index * 8;

    let appeared = $state(false);

    $effect(() => {
        // Start hidden, then trigger the staggered fade-in on next tick
        tick().then(() => { appeared = true; });
    });

    const shouldHide = $derived(
        !appeared ||
        (!isOuter && currentStep.value >= 4) ||
        (node.index !== 0 && node.index !== 4 && currentStep.value >= 6) ||
        (currentStep.value >= 9)
    );

    const shouldPulse = $derived(isOuter && currentStep.value >= 2 && currentStep.value <= 5);
</script>

<circle
    class="node"
    class:hidden={shouldHide}
    class:pulse={shouldPulse}
    fill={(isOuter && currentStep.value <= 5) ? colors[node.index] : "#ffffff"}
    r={(isOuter && currentStep.value >= 4 && currentStep.value <= 5) ? 12 : 5}
    style="
        --node-color: {colors[node.index]}; 
        transition-delay: {appeared ? appearDelay : 0}ms;"
    use:springy={{ cx: springs.x, cy: springs.y }}
/>

<style>
    .node {
        opacity: 1;
        transition: opacity 0.5s ease, fill 0.5s ease-in-out 1s, r 0.5s ease-in-out 1s;
    }

    .node.hidden {
        opacity: 0;
    }

    .node.pulse {
        animation: pulse-radius 1.5s ease-in-out infinite;
    }

    @keyframes pulse-radius {
        0%, 100% {
            r: 8px;
        }
        50% {
            r: 12px; /* Adjust peak pulse size as needed */
        }
    }
</style>