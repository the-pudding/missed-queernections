<script>
    let { d, stroke } = $props();
</script>

<path 
    d={d}
    stroke={stroke}
    stroke-width="6"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
/>

<style>
    path { 
        /*
            Animates the SVG path shape (`d` attribute) when segments activate.
            cubic-bezier gives a snappy-but-smooth feel.
            shape-rendering: geometricPrecision prevents jagged edges on
            diagonal strokes at sub-pixel positions.
        */
        transition: d 300ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        shape-rendering: geometricPrecision; 
        pointer-events: none; /* clicks pass through to circles underneath */
    }
</style>