<script>
    import * as d3 from 'd3';
    import { onMount } from 'svelte';
    import { spring } from 'svelte/motion';
    import { nodes, links } from '$utils/networkData.js';
    import { themes, colors } from "$runes/misc.svelte.js";
    import { springy } from '$actions/springy.js'; // 👈 Import the action
    import Link from "$components/Network.Link.svelte";
    import Node from "$components/Network.Node.svelte";
    import RingLink from "$components/Network.RingLink.svelte";
    import CrossLink from "$components/Network.CrossLink.svelte";
    
    let { scrollIndex } = $props();

    let width = $state(0);
    let height = $state(0);
    let simulationLinks = $state([]);
    let outerPositions = [];
    let outerRingLinks = [];
    let outerCrossLinks = [];

    // --- ANIMATION STORES ---
    // Re-introduce the spring stores. This will drive all animations.
    const nodeSprings = new Map();
    nodes.forEach(node => {
        nodeSprings.set(node.index, {
            // 👇 Give the springs an initial value of 0
            x: spring(0, { stiffness: 0.1, damping: 0.8 }),
            y: spring(0, { stiffness: 0.1, damping: 0.8 })
        });
    });

    // --- HELPER FUNCTIONS ---
    function computeOuterPositions(centerX, centerY) {
        const radius = Math.min(width, height) / 3;
        const outerNodeIds = nodes.slice(0, 8).map(d => d.index);
        
        // 👇 The function now returns the calculated values instead of setting state
        const newOuterPositions = outerNodeIds.map((id, i) => {
            const angle = (2 * Math.PI * i) / outerNodeIds.length;
            return { id, x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
        });

        const newOuterRingLinks = newOuterPositions.map((pos, i, arr) => ({
            source: pos,
            target: arr[(i + 1) % arr.length]
        }));

        const newOuterCrossLinks = [];
        for (let i = 0; i < newOuterPositions.length; i++) {
            for (let j = i + 1; j < newOuterPositions.length; j++) {
                newOuterCrossLinks.push({ source: newOuterPositions[i], target: newOuterPositions[j] });
            }
        }
        
        return { newOuterPositions, newOuterRingLinks, newOuterCrossLinks };
    }

    // --- EFFECTS ---

    // This effect runs the simulation and calculates layouts
    $effect(() => {
        if (width > 0 && height > 0) {
            const size = Math.min(width, height);
            
            const layouts = computeOuterPositions(size / 2, size / 2);
            outerPositions = layouts.newOuterPositions;
            outerRingLinks = layouts.newOuterRingLinks;
            outerCrossLinks = layouts.newOuterCrossLinks;

            const nodesCopy = JSON.parse(JSON.stringify(nodes));
            const linksCopy = JSON.parse(JSON.stringify(links));

            const simulation = d3.forceSimulation(nodesCopy)
                .force('link', d3.forceLink(linksCopy).id(d => d.index).distance(50))
                .force('charge', d3.forceManyBody().strength(-30))
                .force('center', d3.forceCenter(size / 2, size / 2))
                .force('collision', d3.forceCollide().radius(8).strength(0.6));

            // On every tick, update the spring stores
            simulation.on('tick', () => {
                simulation.nodes().forEach(node => {
                    const s = nodeSprings.get(node.index);
                    if (s) {
                        s.x.set(node.x);
                        s.y.set(node.y);
                    }
                });
            });

            simulationLinks = simulation.force('link').links();

            return () => simulation.stop();
        }
    });

    // This effect controls the animation based on scroll
    $effect(() => {
        if (outerPositions.length === 0) return;

        if (scrollIndex >= 1) {
            // Animate TO the octagon positions
            outerPositions.forEach(pos => {
                const s = nodeSprings.get(pos.id);
                if (s) {
                    s.x.set(pos.x);
                    s.y.set(pos.y);
                }
            });
        }
        // NOTE: We don't need an 'else' block because the 'tick' handler will
        // naturally pull the nodes back to their force-directed positions
        // when the simulation restarts or continues.
    });

    $effect(() => {
        console.log(scrollIndex);
    })
</script>

<div id="network" bind:clientWidth={width} bind:clientHeight={height}>
    <figure>
        {#if width > 0 && height > 0}
            <svg width={Math.min(width, height)} height={Math.min(width, height)} class="network-svg">
                <g class="links">
                    {#each simulationLinks as link, i (i)}
                        {@const sourceSprings = nodeSprings.get(link.source.index)}
                        {@const targetSprings = nodeSprings.get(link.target.index)}
                        {#if sourceSprings && targetSprings}
                            <Link 
                                {sourceSprings}
                                {targetSprings}
                                isOuter={link.source.index <= 7 || link.target.index <= 7}
                                {scrollIndex} />
                        {/if}
                    {/each}
                </g>
                <g class="ring-links">
                    {#each outerRingLinks as link, i}
                        <RingLink {link} {i} {scrollIndex} />
                    {/each}
                </g>
                <g class="cross-links">
                    {#each outerCrossLinks as link, i}
                        <CrossLink {link} {i} {scrollIndex} />
                    {/each}
                </g>
                <g class="nodes">
                    {#each nodes as node (node.index)}
                        <Node 
                            springs={nodeSprings.get(node.index)}
                            {node}
                            {scrollIndex}
                        />
                    {/each}
                </g>
            </svg>
        {/if}
    </figure>
</div>

<style>
    #network {
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }
    figure {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.5s ease;
    }

    .network-svg {
        display: block;
    }
</style>