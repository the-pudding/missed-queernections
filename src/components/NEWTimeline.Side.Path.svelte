<script>
    let { d, stroke, isDimmed } = $props();
</script>

<path 
    d={d}
    stroke={stroke}
    stroke-width="6"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
    style="
        opacity: {isDimmed ? 0.1 : 1};
        transition: opacity 400ms ease, d 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
    "
/>

<style>
    path {
        /* Animates path shape as segments activate on scroll */
        transition: d 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        shape-rendering: geometricPrecision;
        pointer-events: none;
    }
</style>