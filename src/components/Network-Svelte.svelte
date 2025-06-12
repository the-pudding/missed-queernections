<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { nodes, links } from '$utils/networkData.js';

    let { scrollIndex } = $props();
    let svgEl = $state();
    let width = $state();
    let height = $state();

    let simulation;
    let outerForceStrength = 0;
    let outerForceTargetPositions = [];
    let outerNodeIds = [];
    let outerAnimationFrame = null;

    let outerLinksData = [];
    let crossLinksData = [];

    let previousScrollIndex = undefined;
    let linkRetractProgress = 0;
    let retractDirection = 1;
    let outerNodeIdsFrozen = false;
    let goingForward = true;

    // Reactive UI state:
    let polygonLinksData = [];
    let crossLinksDataReactive = [];
    let linkOpacities = [];
    let nodeOpacities = [];
    let nodeYOverrides = {};

    onMount(() => {
        simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.index).distance(5))
            .force('charge', d3.forceManyBody().strength(-50))
            .force('center', d3.forceCenter(width / 2, height / 2));

        simulation.on('tick', () => {
            // All positioning happens through Svelte reactivity
        });
    });

    function applyOuterCircleForces(targetPositions, strength) {
        simulation.force('outerX', d3.forceX(d => {
            const target = targetPositions.find(t => t.index === d.index);
            return target ? target.x : width / 2;
        }).strength(d => targetPositions.some(t => t.index === d.index) ? strength : 0));

        simulation.force('outerY', d3.forceY(d => {
            const target = targetPositions.find(t => t.index === d.index);
            return target ? target.y : height / 2;
        }).strength(d => targetPositions.some(t => t.index === d.index) ? strength : 0));
    }

    function startOuterForceAnimation(targetStrength) {
        const step = 0.1;
        if (outerAnimationFrame !== null) {
            cancelAnimationFrame(outerAnimationFrame);
            outerAnimationFrame = null;
        }
        function stepFunc() {
            if (Math.abs(outerForceStrength - targetStrength) > 0.01) {
                if (outerForceStrength < targetStrength) {
                    outerForceStrength += step;
                    if (outerForceStrength > targetStrength) outerForceStrength = targetStrength;
                } else {
                    outerForceStrength -= step;
                    if (outerForceStrength < targetStrength) outerForceStrength = targetStrength;
                }
                applyOuterCircleForces(outerForceTargetPositions, outerForceStrength);
                simulation.alpha(0.5).restart();
                outerAnimationFrame = requestAnimationFrame(stepFunc);
            } else {
                outerForceStrength = targetStrength;
                applyOuterCircleForces(outerForceTargetPositions, outerForceStrength);
                outerAnimationFrame = null;
            }
        }
        requestAnimationFrame(stepFunc);
    }

    function animateLinkRetract(targetProgress) {
        const step = 0.05;
        function stepFunc() {
            if (Math.abs(linkRetractProgress - targetProgress) > 0.01) {
                if (linkRetractProgress < targetProgress) {
                    linkRetractProgress += step;
                    if (linkRetractProgress > targetProgress) linkRetractProgress = targetProgress;
                } else {
                    linkRetractProgress -= step;
                    if (linkRetractProgress < targetProgress) linkRetractProgress = targetProgress;
                }
                simulation.alpha(0.5).restart();
                requestAnimationFrame(stepFunc);
            } else {
                linkRetractProgress = targetProgress;
            }
        }
        requestAnimationFrame(stepFunc);
    }

    function pinInnerNodes(pin) {
        nodes.forEach(d => {
            const isOuter = outerNodeIds.includes(d.index);
            if (!isOuter) {
                d.fx = pin ? d.x : null;
                d.fy = pin ? d.y : null;
            }
        });
    }

    function pinOuterNodesAtCurrentPosition(pin) {
        nodes.forEach(d => {
            const isOuter = outerNodeIds.includes(d.index);
            if (isOuter) {
                d.fx = pin ? d.x : null;
                d.fy = pin ? d.y : null;
            }
        });
    }

    function computeLineLength(d) {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function computeOuterRingLinks(outerNodeIds) {
        const links = [];
        for (let i = 0; i < outerNodeIds.length; i++) {
            const sourceId = outerNodeIds[i];
            const targetId = outerNodeIds[(i + 1) % outerNodeIds.length];
            const sourceNode = nodes.find(d => d.index === sourceId);
            const targetNode = nodes.find(d => d.index === targetId);
            if (sourceNode && targetNode) {
                links.push({ source: sourceNode, target: targetNode });
            }
        }
        return links;
    }

    function computeOuterCrossLinks(outerNodeIds) {
        const links = [];
        for (let i = 0; i < outerNodeIds.length; i++) {
            for (let j = i + 1; j < outerNodeIds.length; j++) {
                const sourceNode = nodes.find(d => d.index === outerNodeIds[i]);
                const targetNode = nodes.find(d => d.index === outerNodeIds[j]);
                if (sourceNode && targetNode) {
                    links.push({ source: sourceNode, target: targetNode });
                }
            }
        }
        return links;
    }

    function getEvenlySpacedOuterNodes(nSlices = 10) {
        const centerX = width / 2;
        const centerY = height / 2;

        const nodesWithAngle = nodes.map(d => {
            const dx = d.x - centerX;
            const dy = d.y - centerY;
            return {
                index: d.index,
                angle: Math.atan2(dy, dx),
                dist: Math.sqrt(dx * dx + dy * dy)
            };
        });

        nodesWithAngle.forEach(d => {
            if (d.angle < 0) d.angle += Math.PI * 2;
        });

        const sliceSize = (Math.PI * 2) / nSlices;
        const selectedNodes = [];

        for (let i = 0; i < nSlices; i++) {
            const sliceCenter = i * sliceSize + sliceSize / 2;
            let closest = null;
            let minAngleDiff = Infinity;

            nodesWithAngle.forEach(d => {
                const angleDiff = Math.abs(d.angle - sliceCenter);
                if (angleDiff < minAngleDiff) {
                    minAngleDiff = angleDiff;
                    closest = d;
                }
            });

            if (closest) {
                selectedNodes.push(closest.index);
            }
        }

        return selectedNodes;
    }

    function getOuterNodeTargetPositions(outerNodeIds, radius) {
        const centerX = width / 2;
        const centerY = height / 2;

        const angleStep = (Math.PI * 2) / outerNodeIds.length;

        return outerNodeIds.map((nodeId, i) => {
            const angle = i * angleStep;
            return {
                index: nodeId,
                x: centerX + Math.cos(angle) * radius,
                y: centerY + Math.sin(angle) * radius
            };
        });
    }

    function updateScroll(scrollIndex, previousScrollIndex) {
        goingForward = previousScrollIndex < scrollIndex;

        if (scrollIndex == undefined || scrollIndex == 0) {
            outerNodeIds = [];
            outerNodeIdsFrozen = false;
            outerForceTargetPositions = [];
            startOuterForceAnimation(0);
            animateLinkRetract(0);
            polygonLinksData = [];
            crossLinksDataReactive = [];
        } else if (scrollIndex == 1) {
            if (!outerNodeIdsFrozen) {
                outerNodeIds = getEvenlySpacedOuterNodes(10);
                outerNodeIdsFrozen = true;
            }
            const targetRadius = Math.min(width, height) * 0.48;
            outerForceTargetPositions = getOuterNodeTargetPositions(outerNodeIds, targetRadius);
            startOuterForceAnimation(5);
            animateLinkRetract(0);
            polygonLinksData = computeOuterRingLinks(outerNodeIds);
            crossLinksDataReactive = [];
        } else if (scrollIndex == 2) {
            retractDirection = goingForward ? 1 : -1;
            animateLinkRetract(goingForward ? 1 : 0);
            polygonLinksData = computeOuterRingLinks(outerNodeIds);
            crossLinksDataReactive = [];
        } else if (scrollIndex == 3) {
            animateLinkRetract(0);
            polygonLinksData = computeOuterRingLinks(outerNodeIds);
            crossLinksDataReactive = computeOuterCrossLinks(outerNodeIds);
        } else if (scrollIndex == 4) {
            polygonLinksData = [];
            crossLinksDataReactive = computeOuterCrossLinks(outerNodeIds);
        } else if (scrollIndex == 5) {
            polygonLinksData = [];
            crossLinksDataReactive = computeOuterCrossLinks(outerNodeIds).filter(d => {
                const srcIdx = outerNodeIds.indexOf(d.source.index);
                const tgtIdx = outerNodeIds.indexOf(d.target.index);
                return (srcIdx === 0 && tgtIdx === 5) || (srcIdx === 5 && tgtIdx === 0);
            });
        }
    }

    // Reactively update opacities and y overrides:

    $effect(() => {
        linkOpacities = links.map(d => {
            const sourceIsOuter = outerNodeIds.includes(d.source.index);
            const targetIsOuter = outerNodeIds.includes(d.target.index);
            if (scrollIndex === 4 || scrollIndex === 5) {
                return 0;
            }
            if (sourceIsOuter && targetIsOuter) return 0;
            return 1;
        });

        nodeOpacities = nodes.map(d => {
            if (scrollIndex === 5) {
                const idx = outerNodeIds.indexOf(d.index);
                return (idx === 0 || idx === 5) ? 1 : 0;
            }
            const isOuter = outerNodeIds.includes(d.index);
            return (scrollIndex >= 4 && !isOuter) ? 0 : 1;
        });

        nodeYOverrides = {};
        if (scrollIndex === 5) {
            const specialNodeIds = [outerNodeIds[0], outerNodeIds[5]];
            specialNodeIds.forEach(id => {
                nodeYOverrides[id] = height - 50;
            });
        } else {
            nodeYOverrides = {};
        }
    });

    $effect(() => {
        if (scrollIndex !== previousScrollIndex) {
            updateScroll(scrollIndex, previousScrollIndex);
            previousScrollIndex = scrollIndex;
        }
    });
</script>

<div id="network" bind:clientWidth={width} bind:clientHeight={height}>
    <figure>
        <svg bind:this={svgEl} {width} {height}>
            <!-- Cross Links -->
            <g class="cross-links">
                {#each crossLinksDataReactive as d (d.source.index + '-' + d.target.index)}
                    <line
                        class="link extra"
                        x1={d.source.x}
                        y1={d.source.y}
                        x2={d.target.x}
                        y2={d.target.y}
                        style="opacity: 1;" />
                {/each}
            </g>

            <!-- Polygon Links -->
            <g class="polygon-links">
                {#each polygonLinksData as d (d.source.index + '-' + d.target.index)}
                    <line
                        class="link extra"
                        x1={d.source.x}
                        y1={d.source.y}
                        x2={d.target.x}
                        y2={d.target.y}
                        style="opacity: 1;" />
                {/each}
            </g>

            <!-- Main Links -->
            <g class="links">
                {#each links as d, i}
                    <line
                        class="link"
                        x1={d.source.x}
                        y1={d.source.y}
                        x2={d.target.x}
                        y2={d.target.y}
                        style="opacity: {linkOpacities[i]}" />
                {/each}
            </g>

            <!-- Nodes -->
            <g class="nodes">
                {#each nodes as d, i (d.index)}
                    <circle
                        class="circle"
                        cx={d.x}
                        cy={nodeYOverrides[d.index] !== undefined ? nodeYOverrides[d.index] : d.y}
                        r={5}
                        style="opacity: {nodeOpacities[i]}" />
                {/each}
            </g>

        </svg>
    </figure>
</div>

<style>
    #network {
        width: 100%;
        height: 100svh;
    }
    figure {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
    }
    :global(.link) {
        stroke: var(--color-fg);
        stroke-width: 1px;
    }
    :global(.link.extra) {
        stroke: var(--color-fg);
        stroke-width: 1px;
    }
    :global(.circle) {
        fill: var(--color-fg);
    }
</style>