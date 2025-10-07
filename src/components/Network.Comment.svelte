<script>
    import { springy } from '$actions/springy.js';
    import { getContext } from "svelte";
    import { fade } from 'svelte/transition';

    let { node, springs, scrollIndex } = $props();
    const copy = getContext("copy");

    let isVisible = $derived(() => {
        const commentData = copy.comments[scrollIndex];
        if (!commentData || !commentData.indexes) {
            return false;
        }

        let indexesArray;
        try {
            indexesArray = JSON.parse(commentData.indexes);
        } catch (e) {
            console.error("Failed to parse indexes:", commentData.indexes);
            return false;
        }
        if (!Array.isArray(indexesArray)) {
            return false;
        }
        return indexesArray.includes(node.index);
    });

    $effect(() => {
        console.log(isVisible())
    })

</script>
{#if isVisible()}
    <div
        class="node-label"
        class:visible={isVisible()}
        use:springy={{
            left: springs.x,
            top: springs.y
        }}
        in:fade={{ duration: 400, delay: node.index*100 }}
        out:fade={{ duration: 250 }}
    >
        <p>checking</p>
    </div>
{/if}

<style>
    .node-label {
        color: var(--color-fg);
        position: absolute;
        font-family: sans-serif;
        font-size: 12px;
        transform: translate(-50%, -50%);
        pointer-events: none;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        background-color: var(--color-bg);
        max-width: 200px;
        border-radius: 8px;
        padding: 1rem;
        opacity: 0;
    }

    .node-label.visible {
        opacity: 1;
    }

    .node-label p {
        margin: 0;
    }
</style>