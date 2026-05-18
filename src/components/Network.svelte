<script>
    import { getContext } from "svelte";
    import * as d3 from 'd3';
    import { spring } from 'svelte/motion';
    import { fly } from 'svelte/transition';
    import { nodes, links } from '$utils/networkData.js';
    import Link from "$components/Network.Link.svelte";
    import Node from "$components/Network.Node.svelte";
    import RingLink from "$components/Network.RingLink.svelte";
    import CrossLink from "$components/Network.CrossLink.svelte";
    import Comment from "$components/Network.Comment.svelte";
    import Nameplate from "$components/Nameplate.svelte";

    const copy = getContext("copy");

    let { scrollIndex, pastNetwork = false } = $props();

    let width = $state(0);
    let height = $state(0);
    let simulationLinks = $state([]);
    let outerPositions = [];
    let outerRingLinks = [];
    let outerCrossLinks = [];

    const COMMENT_STEPS = new Set([1, 2, 3, 4]);
    const matchingComment = $derived(copy.comments.find(comment => parseInt(comment.step) === scrollIndex));
    const commentIndexes = $derived(matchingComment ? JSON.parse(matchingComment.indexes) : []);
    const effectiveCommentIndexes = $derived(
        (!pastNetwork && COMMENT_STEPS.has(scrollIndex)) ? commentIndexes : []
    );

    // --- ANIMATION STORES ---
    const nodeSprings = new Map();
    nodes.forEach(node => {
        nodeSprings.set(node.index, {
            x: spring(0, { stiffness: 0.1, damping: 0.8 }),
            y: spring(0, { stiffness: 0.1, damping: 0.8 })
        });
    });

    // Snapshot of where each node "wants to be" (simulation or octagon position).
    // Mouse repulsion temporarily overrides the spring target; these let us restore it.
    const nodeTargets = new Map();
    nodes.forEach(node => nodeTargets.set(node.index, { x: 0, y: 0 }));

    const rotation = spring(0, { stiffness: 0.01, damping: 0.4 });
    let animationFrameId;


    // --- AMBIENT DRIFT ---
    const DRIFT_AMOUNT = 10;  // px — max displacement from resting position
    const DRIFT_SPEED = 0.001; // how fast nodes wander (lower = slower)

    // Each inner node gets a unique phase offset so they don't move in sync
    const driftPhases = new Map();
    nodes.forEach(node => {
        if (node.index > 6) {
            driftPhases.set(node.index, {
                phaseX: Math.random() * Math.PI * 2,
                phaseY: Math.random() * Math.PI * 2,
                freqX: 0.6 + Math.random() * 0.8,  // varied frequencies
                freqY: 0.6 + Math.random() * 0.8,
            });
        }
    });

    let driftFrameId;

    $effect(() => {
        // Pause drift when user has scrolled past the network into the timeline
        const active = scrollIndex !== 'exit';

        if (!active) return;

        function tick(t) {
            nodeSprings.forEach((s, index) => {
                if (index <= 6) return;
                const target = nodeTargets.get(index);
                const phase = driftPhases.get(index);
                if (!target || !phase) return;

                s.x.set(target.x + Math.sin(t * DRIFT_SPEED * phase.freqX + phase.phaseX) * DRIFT_AMOUNT);
                s.y.set(target.y + Math.sin(t * DRIFT_SPEED * phase.freqY + phase.phaseY) * DRIFT_AMOUNT);
            });
            driftFrameId = requestAnimationFrame(tick);
        }

        driftFrameId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(driftFrameId);
    });

    // --- HELPER FUNCTIONS ---
    function computeOuterPositions(centerX, centerY) {
        const radius = Math.min(width, height) / 3;
        const outerNodeIds = nodes.slice(0, 7).map(d => d.index);

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

    // Runs the simulation and calculates layouts
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

            simulation.on('tick', () => {
                simulation.nodes().forEach(node => {
                    const target = nodeTargets.get(node.index);
                    if (!target) return;
                    target.x = node.x;
                    target.y = node.y;
                    // Outer nodes aren't drifted, so set their springs directly.
                    // Inner nodes are driven by the drift loop — only update their target.
                    if (node.index <= 6) {
                        const s = nodeSprings.get(node.index);
                        if (s) { s.x.set(node.x); s.y.set(node.y); }
                    }
                });
            });

            simulationLinks = simulation.force('link').links();

            return () => simulation.stop();
        }
    });

    // Controls the spin animation
    $effect(() => {
        const shouldSpin = scrollIndex >= 5 && scrollIndex < 6;

        function animate() {
            if (scrollIndex >= 5 && scrollIndex < 6) {
                rotation.update(n => (n + 0.3));
                animationFrameId = requestAnimationFrame(animate);
            }
        }

        if (shouldSpin) {
            animationFrameId = requestAnimationFrame(animate);
        } else {
            cancelAnimationFrame(animationFrameId);
            rotation.set(0);
        }
        return () => cancelAnimationFrame(animationFrameId);
    });

    // Animates outer nodes to octagon positions on scroll, and back on reverse
    $effect(() => {
        if (outerPositions.length === 0 || width === 0 || height === 0) return;

        const size = Math.min(width, height);
        const centerY = size / 2;

        outerPositions.forEach(pos => {
            const s = nodeSprings.get(pos.id);
            const target = nodeTargets.get(pos.id);
            if (!s || !target) return;

            if (scrollIndex >= 6 && (pos.id === 0 || pos.id === 4)) {
                // Snap immediately to their line endpoints — works for both fast and slow scroll
                s.x.set(pos.x, { hard: true });
                s.y.set(centerY, { hard: true });
            } else if (scrollIndex >= 2) {
                // Move to octagon position
                target.x = pos.x;
                target.y = pos.y;
                s.x.set(pos.x);
                s.y.set(pos.y);
            } else {
                // Return to force-directed position (simulation keeps nodeTargets current)
                s.x.set(target.x);
                s.y.set(target.y);
            }
        });
    });
</script>

<div id="network" role="group" bind:clientWidth={width} bind:clientHeight={height}>
    <figure>
        {#if width > 0 && height > 0}
            {@const size = Math.min(width, height)}
            <div class="canvas-container" style="width: {size}px; height: {size}px;">
                {#each effectiveCommentIndexes as comment, i (comment)}
                    {@const springs = nodeSprings.get(comment)}
                    <div class="comment-wrapper"
                        in:fly={{ duration: 250, y: 50, delay: i*500 }}>
                        <Comment {comment} {i} {springs} {scrollIndex} />
                    </div>
                {/each}
                {#each [{name: "Jan", id: 4}, {name: "Ashleé", id: 0}] as name}
                    {@const springs = nodeSprings.get(name.id)}
                    {#if springs}
                        <Nameplate
                            {scrollIndex} {springs} {name}
                            snapToFinalPosition={() => {
                                const size = Math.min(width, height);
                                const s = nodeSprings.get(name.id);
                                const pos = outerPositions.find(p => p.id === name.id);
                                if (!s) return;
                                if (pos) s.x.set(pos.x, { hard: true });
                                s.y.set(size / 2, { hard: true });
                            }}
                        />
                    {/if}
                {/each}
            </div>
            <svg width={size} height={size} class="network-svg">
                <g class="links">
                    {#each simulationLinks as link, i (i)}
                        {@const sourceSprings = nodeSprings.get(link.source.index)}
                        {@const targetSprings = nodeSprings.get(link.target.index)}
                        {#if sourceSprings && targetSprings}
                            <Link
                                {sourceSprings}
                                {targetSprings}
                                isOuter={link.source.index <= 6 || link.target.index <= 6}
                                {scrollIndex} />
                        {/if}
                    {/each}
                </g>
                <g class="inner-nodes">
                    {#each nodes as node (node.index)}
                        {#if node.index > 6}
                            <Node springs={nodeSprings.get(node.index)} {node} {scrollIndex} />
                        {/if}
                    {/each}
                </g>
                <!-- Spinning group: rotates outer ring during steps 3–4 -->
                <g class="spinning-container" style="transform: rotate({$rotation}deg);">
                    <g class="ring-links">
                        {#each outerRingLinks as link, i}
                            <RingLink {link} {i} {scrollIndex} />
                        {/each}
                    </g>
                    <g class="cross-links">
                        {#each outerCrossLinks as link, i}
                            {@const isSpecial = (link.source.id === 0 && link.target.id === 4) || (link.source.id === 4 && link.target.id === 0)}
                            <CrossLink {link} {i} {scrollIndex} overrideY={isSpecial && scrollIndex >= 6 ? size / 2 : null} />
                        {/each}
                    </g>
                    <g class="outer-nodes">
                        {#each nodes as node (node.index)}
                            {#if node.index <= 6}
                                <Node springs={nodeSprings.get(node.index)} {node} {scrollIndex} />
                            {/if}
                        {/each}
                    </g>
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
    .canvas-container {
        position: absolute;
        flex-shrink: 0;
        pointer-events: none;
    }
    figure {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .network-svg {
        display: block;
    }
    .spinning-container {
        transform-origin: center;
    }
</style>
