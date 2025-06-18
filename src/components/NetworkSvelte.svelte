<script>
    import { onMount, tick } from 'svelte';
    import { writable, derived } from 'svelte/store';
    import { draw } from 'svelte/transition';
    import * as d3 from 'd3';
    import { nodes, links } from '$utils/networkData.js'; // Rename to avoid conflict
    
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';

    const nodeTweens = new Map();

    nodes.forEach(node => {
    nodeTweens.set(node.index, {
        x: tweened(node.x, { duration: 800, easing: cubicOut }),
        y: tweened(node.y, { duration: 800, easing: cubicOut }),
    });
    });

    const tweenedPositions = derived(
        Array.from(nodeTweens.values()).flatMap(({ x, y }) => [x, y]),
        (stores, set) => {
            const values = {};
            const unsubscribers = [];

            // Track all values as they come in
            nodeTweens.forEach((tween, id) => {
            values[id] = { x: 0, y: 0 };

            unsubscribers.push(
                tween.x.subscribe(v => {
                values[id].x = v;
                set({ ...values }); // update full object
                }),
                tween.y.subscribe(v => {
                values[id].y = v;
                set({ ...values });
                })
            );
            });

            return () => {
            unsubscribers.forEach(unsub => unsub());
            };
        },
        {} // ✅ start with empty object so Svelte has a fallback
        );

    let { scrollIndex } = $props();

    // DIMENSIONS
    let svgEl = $state();
    let width = $state(0); // Initialize with 0
    let height = $state(0); // Initialize with 0

    // SIMULATION
    let simulation;
    const processedData = writable([]);
    const processedLinks = writable([]);

    const outerNodeIds = nodes.slice(0, 10).map(d => d.index);
    let outerPositions = [];

    const runSimulation = () => {
        computeOuterPositions(width / 2, height / 2);
        if (simulation) simulation.stop();

        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.index).distance(50))
            .force('charge', d3.forceManyBody().strength(-50))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .alpha(1)
            .alphaDecay(0.01);

        simulation.on('tick', () => {
            processedData.set([...nodes]);
            processedLinks.set([...links]);

            if (simulation.alpha() < 0.01) {
                simulation.stop();
            }
        });
    }

    function computeOuterPositions(centerX, centerY, radius = width/2.5) {
        outerPositions = outerNodeIds.map((id, i) => {
            const angle = (2 * Math.PI * i) / outerNodeIds.length;
            return {
                id,
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });
    }

    function updateNodeTweens(scrollIndex) {
        if (scrollIndex >= 1) {
            for (const pos of outerPositions) {
            const tween = nodeTweens.get(pos.id);
            if (tween) {
                tween.x.set(pos.x);
                tween.y.set(pos.y);
            }
            }
        } else {
            for (const node of nodes) {
            const tween = nodeTweens.get(node.index);
            if (tween) {
                tween.x.set(node.x);
                tween.y.set(node.y);
            }
            }
        }
        }

    function updateScroll(scrollIndex) {
        console.log('scrollIndex', scrollIndex);
        updateNodeTweens(scrollIndex);
    }

    $effect(async () => {
        if (width > 0 && height > 0) {
            await tick(); // wait for svgEl to be bound
            if (svgEl) {
                runSimulation();
            }
        }
    });

    $effect(() => {
        updateScroll(scrollIndex);
    });
</script>

<div id="network" bind:clientWidth={width} bind:clientHeight={height}>
    <figure>
        {#if width && height}
        <svg bind:this={svgEl} {width} {height} class="network-svg">
            <g class="links">
                {#each $processedLinks as link, i (i)}
                    {#if $tweenedPositions[link.source.index] && $tweenedPositions[link.target.index]}
                    <line
                        class="link"
                        x1={$tweenedPositions[link.source.index]?.x ?? link.source.x}
                        y1={$tweenedPositions[link.source.index]?.y ?? link.source.y}
                        x2={$tweenedPositions[link.target.index]?.x ?? link.target.x}
                        y2={$tweenedPositions[link.target.index]?.y ?? link.target.y}
                    />
                    {/if}
                {/each}
                </g>

            <g class="nodes">
                {#each $processedData as node (node.index)}
                    {#if $tweenedPositions[node.index]}
                        <circle
                        r={5}
                        cx={$tweenedPositions[node.index]?.x ?? node.x}
                        cy={$tweenedPositions[node.index]?.y ?? node.y}
                        />
                    {/if}
                {/each}
            </g>
        </svg>
        {/if}
    </figure>
</div>

<style>
    #network {
        width: 100%; /* Use 100vw to ensure it takes full width */
        height: 100vh; /* Use 100vh to ensure it takes full height */
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background-color: #f0f0f0; /* For debugging visibility */
    }
    figure {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        display: flex; /* Also make figure a flex container to center SVG */
        align-items: center;
        justify-content: center;
    }
    .network-svg {
        display: block;
        border: 1px solid blue; /* For debugging SVG bounds */
    }
    :global(.link) {
        stroke: var(--color-fg, black);
        stroke-width: 1px;
        transition: opacity 0.5s ease; /* Add CSS transition for opacity */
    }
    :global(.link.extra) {
        stroke: var(--color-fg, black);
        stroke-width: 1px;
        transition: opacity 0.5s ease, stroke-dashoffset 1s ease; /* Add transition for dashoffset */
    }
    :global(.circle) {
        fill: var(--color-fg, black);
        transition: opacity 0.5s ease, cy 1s ease; /* Add transition for opacity and cy */
    }
</style>