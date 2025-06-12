<script>
import { onMount } from 'svelte';
import * as d3 from 'd3';
import { nodes, links } from '$utils/networkData.js';

let { scrollIndex } = $props();
let svgEl = $state();
let width = $state();
let height = $state();

let simulation;
let link, node;
let polygonLinksSelection;
let crossLinksSelection;
let goingForward;

let outerForceStrength = 0;
let outerForceTargetPositions = [];
let outerNodeIds = [];
let outerAnimationFrame = null;

let outerLinksData = [];

let previousScrollIndex = undefined;
let linkRetractProgress = 0;
let retractDirection = 1;
let outerNodeIdsFrozen = false;

onMount(() => {
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.index).distance(5))
        .force('charge', d3.forceManyBody().strength(-50))
        .force('center', d3.forceCenter(width / 2, height / 2));

    const svg = d3.select(svgEl);

    link = svg.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('class', 'link');

    node = svg.append('g')
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', 5)
        .attr('class', 'circle');

    const polygonLinksLayer = svg.append('g').attr('class', 'polygon-links');
    const crossLinksLayer = svg.append('g').attr('class', 'cross-links');

    polygonLinksSelection = polygonLinksLayer
        .selectAll('line')
        .data([])
        .join('line')
        .attr('class', 'link extra')
        .style('opacity', 0);

    crossLinksSelection = crossLinksLayer
        .selectAll('line')
        .data([])
        .join('line')
        .attr('class', 'link extra')
        .style('opacity', 0);

    simulation.on('tick', () => {
        link
            .attr('x1', d => computeLinkX(d, true))
            .attr('y1', d => computeLinkY(d, true))
            .attr('x2', d => computeLinkX(d, false))
            .attr('y2', d => computeLinkY(d, false));

        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y);

        polygonLinksSelection
            .attr('x1', d => computePolygonX(d, true))
            .attr('y1', d => computePolygonY(d, true))
            .attr('x2', d => computePolygonX(d, false))
            .attr('y2', d => computePolygonY(d, false));

        crossLinksSelection
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
    });
});

// ---- Interpolation helpers ----

function interpolate(a, b, t) {
    return a * (1 - t) + b * t;
}

// ---- Link animation ----

function computeLinkX(d, isSource) {
    const sourceIsOuter = outerNodeIds.includes(d.source.index);
    const targetIsOuter = outerNodeIds.includes(d.target.index);
    const outerNode = sourceIsOuter ? d.source : d.target;
    const innerNode = sourceIsOuter ? d.target : d.source;

    if (scrollIndex === 2 && (sourceIsOuter || targetIsOuter)) {
        const t = linkRetractProgress;
        if (isSource) {
            return retractDirection === 1
                ? interpolate(innerNode.x, outerNode.x, t)
                : interpolate(outerNode.x, innerNode.x, t);
        } else {
            return retractDirection === 1
                ? outerNode.x
                : interpolate(outerNode.x, innerNode.x, t);
        }
    }
    return isSource ? d.source.x : d.target.x;
}

function computeLinkY(d, isSource) {
    const sourceIsOuter = outerNodeIds.includes(d.source.index);
    const targetIsOuter = outerNodeIds.includes(d.target.index);
    const outerNode = sourceIsOuter ? d.source : d.target;
    const innerNode = sourceIsOuter ? d.target : d.source;

    if (scrollIndex === 2 && (sourceIsOuter || targetIsOuter)) {
        const t = linkRetractProgress;
        if (isSource) {
            return retractDirection === 1
                ? interpolate(innerNode.y, outerNode.y, t)
                : interpolate(outerNode.y, innerNode.y, t);
        } else {
            return retractDirection === 1
                ? outerNode.y
                : interpolate(outerNode.y, innerNode.y, t);
        }
    }
    return isSource ? d.source.y : d.target.y;
}

// ---- Polygon animation ----

function computePolygonX(d, isSource) {
    const t = linkRetractProgress;
    if (scrollIndex === 2) {
        return retractDirection === 1
            ? interpolate(d.source.x, d.target.x, t)
            : interpolate(d.target.x, d.source.x, t);
    }
    return isSource ? d.source.x : d.target.x;
}

function computePolygonY(d, isSource) {
    const t = linkRetractProgress;
    if (scrollIndex === 2) {
        return retractDirection === 1
            ? interpolate(d.source.y, d.target.y, t)
            : interpolate(d.target.y, d.source.y, t);
    }
    return isSource ? d.source.y : d.target.y;
}

// ---- Forces ----

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

// ---- Pinning ----

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

// ---- Geometry utils ----

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

    // Dispatch to appropriate step function:
    if (scrollIndex == undefined || scrollIndex == 0) {
        enterScroll0(goingForward);
    } else if (scrollIndex == 1) {
        enterScroll1(goingForward);
    } else if (scrollIndex == 2) {
        enterScroll2(goingForward);
    } else if (scrollIndex == 3) {
        enterScroll3(goingForward);
    } else if (scrollIndex == 4) {
        enterScroll4(goingForward);
    } else if (scrollIndex == 5) {
        enterScroll5(goingForward);
    }
}

// -- Step 0 --

function enterScroll0(goingForward) {
    outerNodeIds = [];
    outerNodeIdsFrozen = false;
    outerForceTargetPositions = [];
    startOuterForceAnimation(0);
    animateLinkRetract(0);

    link.style("opacity", 1);
    node.style("opacity", 1);

    polygonLinksSelection.style("opacity", goingForward ? 0 : 1);
    crossLinksSelection.style("opacity", 0);

    pinInnerNodes(false);
    pinOuterNodesAtCurrentPosition(false);
}

// -- Step 1 --

function enterScroll1(goingForward) {
    if (!outerNodeIdsFrozen) {
        outerNodeIds = getEvenlySpacedOuterNodes(10);
        outerNodeIdsFrozen = true;
    }

    const targetRadius = Math.min(width, height) * 0.48;
    outerForceTargetPositions = getOuterNodeTargetPositions(outerNodeIds, targetRadius);

    outerLinksData = computeOuterRingLinks(outerNodeIds);
    polygonLinksSelection = d3.select('.polygon-links')
        .selectAll('line')
        .data(outerLinksData)
        .join('line')
        .attr('class', 'link extra')
        .style('opacity',0);

    startOuterForceAnimation(5);
    animateLinkRetract(0);

    link.style("opacity", d => {
        const sourceIsOuter = outerNodeIds.includes(d.source.index);
        const targetIsOuter = outerNodeIds.includes(d.target.index);
        return (sourceIsOuter && targetIsOuter) ? 0 : 1;
    });

    node.style("opacity", 1);

    pinInnerNodes(true);
    pinOuterNodesAtCurrentPosition(false);
}

// -- Step 2 --

function enterScroll2(goingForward) {
    retractDirection = goingForward ? 1 : -1;
    animateLinkRetract(goingForward ? 1 : 0);

    if (goingForward) {
        // No stroke-dash for forward, just opacity = 1
        polygonLinksSelection
            .interrupt()
            .style("opacity", 1)
            .attr("stroke-dasharray", null)
            .attr("stroke-dashoffset", null);
    } else {
        // Reverse animate polygonLinksSelection
        polygonLinksSelection
            .interrupt()
            .style("opacity", 1)
            .attr("stroke-dasharray", d => {
            const length = computeLineLength(d);
            return `${length} ${length}`;
        })
        .attr("stroke-dashoffset", 0) // start fully visible
        .transition()
        .duration(1000)
        .attr("stroke-dashoffset", d => length); // animate to hidden
    }

    crossLinksSelection.style("opacity", 0);

    link.style("opacity", d => {
        const sourceIsOuter = outerNodeIds.includes(d.source.index);
        const targetIsOuter = outerNodeIds.includes(d.target.index);
        if (sourceIsOuter && targetIsOuter) return 0;
        return 1;
    });

    node.style("opacity", 1);

    pinInnerNodes(true);
    pinOuterNodesAtCurrentPosition(true);
}

// -- Step 3 --

function enterScroll3() {
    animateLinkRetract(0);

    if (goingForward) {
        polygonLinksSelection
            .interrupt()
            .attr("stroke-dasharray", d => computeLineLength(d))
            .attr("stroke-dashoffset", d => computeLineLength(d))
            .style("opacity", 1)
            .transition()
            .duration(1000)
            .attr("stroke-dashoffset", 0);
        
        crossLinksSelection.style("opacity", 0);
    } else if (!goingForward) {
        crossLinksSelection
            .interrupt()
            .style("opacity", 1)
            .attr("stroke-dasharray", d => {
                const length = computeLineLength(d);
                return `${length} ${length}`;
            })
            .attr("stroke-dashoffset", d => 2 * computeLineLength(d))
            .transition()
            .duration(1000)
            .attr("stroke-dashoffset", d => computeLineLength(d));
    }

    link
        .transition()
        .duration(goingForward ? 0: 1000)
        .style("opacity", d => {
            const sourceIsOuter = outerNodeIds.includes(d.source.index);
            const targetIsOuter = outerNodeIds.includes(d.target.index);
            if (sourceIsOuter && targetIsOuter) return 0;
            if (sourceIsOuter || targetIsOuter) return 0;
            return 1;
        });

    node
        .transition()
        .duration(goingForward ? 0: 1000)
        .style("opacity", 1);

    pinInnerNodes(true);
    pinOuterNodesAtCurrentPosition(true);
}

// -- Step 4 --

function enterScroll4() {
    const crossLinksData = computeOuterCrossLinks(outerNodeIds);

    crossLinksSelection = d3.select('.cross-links')
        .selectAll('line')
        .data(crossLinksData)
        .join('line')
        .attr('class', 'link extra')
        .interrupt()
        .style('opacity', 1)
        .attr("stroke-dasharray", d => {
            const length = computeLineLength(d);
            return `${length} ${length}`;
        })
        .attr("stroke-dashoffset", d => computeLineLength(d));
    
    crossLinksSelection
        .transition()
        .duration(1000)
        .delay(1000)
        .attr("stroke-dashoffset", 0);

    link
        .transition()
        .duration(1000)
        .style("opacity", d => {
            const sourceIsOuter = outerNodeIds.includes(d.source.index);
            const targetIsOuter = outerNodeIds.includes(d.target.index);
            if (sourceIsOuter && targetIsOuter) return 0;
            if (sourceIsOuter || targetIsOuter) return 0;
            return 0; // fade out inner-inner
        });

    node
        .transition()
        .duration(1000)
        .style("opacity", d => {
            const isOuter = outerNodeIds.includes(d.index);
            return isOuter ? 1 : 0;
        });

    pinInnerNodes(true);
    pinOuterNodesAtCurrentPosition(true);
}

// -- Step 5 --

function enterScroll5() {
    // Fade out all nodes except outer nodes 0 and 5
    const specialNodeIds = [outerNodeIds[0], outerNodeIds[5]];

    node
        .transition()
        .duration(1000)
        .style("opacity", d => {
            const isSpecial = specialNodeIds.includes(d.index);
            return isSpecial ? 1 : 0;
        })
        .transition()
        .duration(1000)
        .delay(500)
        .attr("cy", d => {
            const isSpecial = specialNodeIds.includes(d.index);
            return isSpecial ? height-50 : d.y;
        })

    // Fade out polygonLinks except those connecting 0 and 5
    polygonLinksSelection
        .transition()
        .duration(1000)
        .style("opacity", 0);

    // Cross links: fade out all
    crossLinksSelection
        .transition()
        .duration(1000)
        .style("opacity", d => {
            const srcIdx = outerNodeIds.indexOf(d.source.index);
            const tgtIdx = outerNodeIds.indexOf(d.target.index);

            const matchesSpecialLink =
                (srcIdx === 0 && tgtIdx === 5) ||
                (srcIdx === 5 && tgtIdx === 0);

            return matchesSpecialLink ? 1 : 0;
        })
        .transition()
        .duration(1000)
        .delay(500)
        .attr('y1', height-50)
        .attr('y2', height-50);

    // Pin everything in place
    pinInnerNodes(true);
    pinOuterNodesAtCurrentPosition(true);
}

// ---- Effect ----

$effect(() => {
    if (scrollIndex !== previousScrollIndex) {
        updateScroll(scrollIndex, previousScrollIndex);
        previousScrollIndex = scrollIndex;
    }

    console.log(scrollIndex)
});
</script>



<div id="network" bind:clientWidth={width} bind:clientHeight={height}>
    <figure>
        <svg bind:this={svgEl} {width} {height}></svg>
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