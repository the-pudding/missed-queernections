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
    import { currentStep, pastNetwork } from "$runes/misc.svelte.js";

    const copy = getContext("copy");

    let { introComplete } = $props();

    let width = $state(0);
    let height = $state(0);
    let simulationLinks = $state([]);
    let outerPositions = $state([]);
    let outerRingLinks = $state([]);
    let outerCrossLinks = $state([]);

    // Dynamic Viewport Offset Tracking Elements
    let canvasEl = $state(null);
    let offsetX = $state(0);
    let offsetY = $state(0);

    const COMMENT_STEPS = new Set([1, 2, 3, 4]);
    const matchingComment = $derived(copy.comments.find(comment => parseInt(comment.step) === currentStep.value));
    const commentIndexes = $derived(matchingComment ? JSON.parse(matchingComment.indexes) : []);
    const effectiveCommentIndexes = $derived(
        (!pastNetwork.value && COMMENT_STEPS.has(currentStep.value)) ? commentIndexes : []
    );

    // Automatically recalculates matching viewport alignments on mount and resize changes
    $effect(() => {
        const w = width;
        const h = height;
        if (canvasEl) {
            const rect = canvasEl.getBoundingClientRect();
            offsetX = rect.left;
            offsetY = rect.top;
        }
    });

    // --- ANIMATION STORES ---
    const nodeSprings = new Map();
    nodes.forEach(node => {
        nodeSprings.set(node.index, {
            x: spring(0, { stiffness: 0.1, damping: 0.8 }),
            y: spring(0, { stiffness: 0.1, damping: 0.8 })
        });
    });

    const nodeTargets = new Map();
    nodes.forEach(node => nodeTargets.set(node.index, { x: 0, y: 0 }));

    const rotation = spring(0, { stiffness: 0.01, damping: 0.4 });
    let animationFrameId;

    // --- AMBIENT DRIFT ---
    const DRIFT_AMOUNT = 30;  
    const DRIFT_SPEED = 0.001; 

    // 1. Generate drift phases for ALL nodes (inner and outer)
    const driftPhases = new Map();
    nodes.forEach(node => {
        driftPhases.set(node.index, {
            phaseX: Math.random() * Math.PI * 2,
            phaseY: Math.random() * Math.PI * 2,
            freqX: 0.6 + Math.random() * 0.8,  
            freqY: 0.6 + Math.random() * 0.8,
        });
    });

    let driftFrameId;

    // 2. Drift inner nodes always, and outer nodes ONLY when step < 2
    $effect(() => {
        const active = currentStep.value !== 'exit';

        if (!active) return;

        function tick(t) {
            nodeSprings.forEach((s, index) => {
                const isOuter = index <= 6;
                // Stop drifting outer nodes once they lock into outer positions (step >= 2)
                if (isOuter && currentStep.value >= 2) return;

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
        const radius = Math.min(width, height) / 2.125;
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
                .force('link', d3.forceLink(linksCopy).id(d => d.index).distance(size / 4))
                .force('charge', d3.forceManyBody().strength(-30))
                .force('center', d3.forceCenter(size / 2, size / 2))
                .force('collision', d3.forceCollide().radius(8).strength(0.6));

            // 3. Update target coordinates for all nodes without forcing spring updates on outer nodes directly
            simulation.on('tick', () => {
                simulation.nodes().forEach(node => {
                    const target = nodeTargets.get(node.index);
                    if (!target) return;
                    target.x = node.x;
                    target.y = node.y;
                });
            });

            simulationLinks = simulation.force('link').links();

            return () => simulation.stop();
        }
    });

    // Controls the spin animation
    $effect(() => {
        const shouldSpin = currentStep.value >= 5 && currentStep.value < 6;

        function animate() {
            if (currentStep.value >= 5 && currentStep.value < 6) {
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

            if (currentStep.value >= 6 && (pos.id === 4 || pos.id === 0)) {
                s.x.set(pos.x, { hard: true });
                s.y.set(centerY, { hard: true });
            } else if (currentStep.value >= 2) {
                target.x = pos.x;
                target.y = pos.y;
                s.x.set(pos.x);
                s.y.set(pos.y);
            }
        });
    });
</script>

<div id="network" role="group" bind:clientWidth={width} bind:clientHeight={height}>
    <figure>
        {#if width > 0 && height > 0}
            {@const size = Math.min(width, height)}

            <div class="canvas-container" bind:this={canvasEl} style="width: {size}px; height: {size}px;">
                {#each effectiveCommentIndexes as comment, i (comment)}
                    {@const springs = nodeSprings.get(comment)}
                    <div class="comment-wrapper"
                        in:fly={{ duration: 250, y: 50, delay: i*1000 }}>
                        <Comment {comment} {i} {springs} scrollIndex={currentStep.value} />
                    </div>
                {/each}
            </div>

            <div class="nameplate-container">
                {#each [{name: "Jan", id: 4}, {name: "Ashleé", id: 0}] as name}
                    {@const springs = nodeSprings.get(name.id)}
                    {#if springs}
                        <Nameplate
                            {springs} {name} {introComplete} {offsetX} {offsetY}
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
                                isOuter={link.source.index <= 6 || link.target.index <= 6} />
                        {/if}
                    {/each}
                </g>
                <g class="inner-nodes">
                    {#each nodes as node (node.index)}
                        {#if node.index > 6}
                            <Node springs={nodeSprings.get(node.index)} {node} />
                        {/if}
                    {/each}
                </g>
                <g class="spinning-container" style="transform: rotate({$rotation}deg);">
                    <g class="ring-links">
                        {#each outerRingLinks as link, i}
                            <RingLink {link} {i} />
                        {/each}
                    </g>
                    <g class="cross-links">
                        {#each outerCrossLinks as link, i}
                            {@const isSpecial = (link.source.id === 0 && link.target.id === 4) || (link.source.id === 4 && link.target.id === 0)}
                            <CrossLink {link} {i} overrideY={isSpecial && currentStep.value >= 6 ? size / 2 : null} {introComplete} />
                        {/each}
                    </g>
                    <g class="outer-nodes">
                        {#each nodes as node (node.index)}
                            {#if node.index <= 6}
                                <Node springs={nodeSprings.get(node.index)} {node} />
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
        height: 100%;
        padding-top: 6rem;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        pointer-events: none; 
    }
    .canvas-container {
        position: absolute;
        flex-shrink: 0;
        pointer-events: none;
    }
    .nameplate-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100svh;
        pointer-events: none;
        z-index: 10;
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