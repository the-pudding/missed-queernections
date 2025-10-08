<script>
    import { springy } from '$actions/springy.js';
    import { getContext } from "svelte";
    import { fade } from 'svelte/transition';

    let { comment, i, springs, scrollIndex } = $props();
    const copy = getContext("copy");

    const commentText = $derived(() => {
        const matchingStep = copy.comments.find(c => parseInt(c.step) === scrollIndex);
        // Safely access the text using the index 'i' passed from the parent
        return matchingStep?.text[i]?.value || ''; 
    });
</script>

<div
    class="node-label"
    use:springy={{
        left: springs.x,
        top: springs.y
    }}
>
    <p>{commentText()}</p>
</div>

<style>
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