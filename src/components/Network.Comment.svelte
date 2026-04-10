<script>
    import { springy } from '$actions/springy.js';
    import { getContext } from "svelte";

    let { comment, i, springs, scrollIndex } = $props();
    const copy = getContext("copy");

    let x = $state(0);
    let y = $state(0);

    $effect(() => {
        if (!(springs && springs.x && springs.y)) return;
        const unsubX = springs.x.subscribe(v => { x = v; });
        const unsubY = springs.y.subscribe(v => { y = v; });
        return () => { unsubX(); unsubY(); };
    });

    const commentText = $derived(
        copy.comments.find(c => parseInt(c.step) === scrollIndex)?.text[i]?.value ?? ''
    );
</script>

<div
    class="node-label"
    use:springy={{ left: springs.x, top: springs.y }}
>
    <p>{commentText}</p>
</div>

<style>
    .connector-svg {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        overflow: visible;
    }

    .connector-line {
        stroke: var(--color-fg);
        stroke-width: 1.5;
        opacity: 0.3;
    }

    .node-label {
        color: var(--color-fg);
        position: absolute;
        font-family: sans-serif;
        font-size: 12px;
        transform: translate(-50%, -120%);
        pointer-events: none;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        background-color: var(--color-bg);
        max-width: 200px;
        border-radius: 8px;
        padding: 1rem;
    }

    .node-label p {
        margin: 0;
    }
</style>
