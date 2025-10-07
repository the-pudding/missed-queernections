<script>
    import { springy } from '$actions/springy.js';
    import { getContext } from "svelte";
    import { fade } from 'svelte/transition';

    let { comment, i, springs, scrollIndex } = $props();
    const copy = getContext("copy");

    let currComments = $state(copy.comments[scrollIndex].text);

    $effect(() => {
        console.log(currComments[i])
    })

</script>

<div
    class="node-label"
    use:springy={{
        left: springs.x,
        top: springs.y
    }}
>
    <p>{currComments[i].value}</p>
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