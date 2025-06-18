<script>
    import { tick } from 'svelte';
    import { writable, derived } from 'svelte/store';
    import * as d3 from 'd3';
    import { nodes, links } from '$utils/networkData.js'; // Rename to avoid conflict
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';

    // ANIMATION
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

    // OUTERS
    const outerNodeIds = nodes.slice(0, 10).map(d => d.index);
    let outerPositions = $state([]);
    let outerRingLinks = $state([]);
    let outerCrossLinks = $state([]);

    function isNotInnerToInner(link) {
        return (
            outerNodeIds.includes(link.source.index) ||
            outerNodeIds.includes(link.target.index)
        );
    }

    // SIMULATION
    let simulation;
    const processedData = writable([]);
    const processedLinks = writable([]);

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

    function computeOuterPositions(centerX, centerY, radius = width / 2.5) {
        outerPositions = outerNodeIds.map((id, i) => {
            const angle = (2 * Math.PI * i) / outerNodeIds.length;
            return {
            id,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
            };
        });

        // Build ring links (0→1, 1→2, ..., 9→0)
        outerRingLinks = outerPositions.map((pos, i, arr) => {
            const next = arr[(i + 1) % arr.length];
            return {
            source: pos,
            target: next
            };
        });

        // Cross links: connect every pair (i ≠ j)
        outerCrossLinks = [];
        for (let i = 0; i < outerPositions.length; i++) {
            for (let j = 0; j < outerPositions.length; j++) {
                if (i !== j) {
                    outerCrossLinks.push({
                        source: outerPositions[i],
                        target: outerPositions[j]
                    });
                }
            }
        }
    }

    function updateNodeTweens(scrollIndex) {
        if (scrollIndex == 0 || scrollIndex == undefined) {
            for (const node of nodes) {
                const tween = nodeTweens.get(node.index);
                if (tween) {
                    tween.x.set(node.x);
                    tween.y.set(node.y);
                }
            }
        } else if (scrollIndex >= 1) {
            for (const pos of outerPositions) {
                const tween = nodeTweens.get(pos.id);
                if (tween) {
                    tween.x.set(pos.x);
                    tween.y.set(pos.y);
                }
            }
            if (scrollIndex == 2) {
                drawLinks('.outerLink', { direction: 'erase', delay: 0 });
            }
            if (scrollIndex == 3) {
                drawLinks('.circleLink', { direction: 'draw', delay: 0 });
            }
            if (scrollIndex == 4) {
                drawLinks('.crossLink', { direction: 'draw', duration: 2000, delay: 800 });
            }
        }
    }

    function drawLinks(selector, { direction = 'erase', duration = 800, delay = 0 } = {}) {
        const lines = d3.selectAll(selector);
        lines.each(function () {
            const line = this;
            const x1 = +line.getAttribute('x1');
            const y1 = +line.getAttribute('y1');
            const x2 = +line.getAttribute('x2');
            const y2 = +line.getAttribute('y2');
            const length = Math.hypot(x2 - x1, y2 - y1);

            line.style.strokeDasharray = length;
            line.style.strokeDashoffset = direction === 'erase' ? 0 : length;

            function animate() {
                const start = performance.now();

                function tick(now) {
                    const t = Math.min((now - start) / duration, 1);
                    const eased = d3.easeCubicInOut(t);
                    const progress = direction === 'erase'
                    ? length * eased
                    : length * (1 - eased);

                    line.style.strokeDashoffset = progress;

                    if (t < 1) requestAnimationFrame(tick);
                }

                requestAnimationFrame(tick);
            }

            if (delay > 0) {
                setTimeout(animate, delay);
            } else {
                animate();
            }
        });
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
    <figure style="transform: {scrollIndex >= 6 ? "translate(0%, 40%)" : "translate(0%, 0%)"};">

        {#if width && height}
        <svg bind:this={svgEl} {width} {height} class="network-svg">
            <g class="links">
                {#each $processedLinks as link (link.index)}
                    {#if $tweenedPositions[link.source.index] && $tweenedPositions[link.target.index]}
                        <line
                            class="link"
                            class:outerLink={isNotInnerToInner(link)}
                            x1={$tweenedPositions[link.source.index]?.x ?? link.source.x}
                            y1={$tweenedPositions[link.source.index]?.y ?? link.source.y}
                            x2={$tweenedPositions[link.target.index]?.x ?? link.target.x}
                            y2={$tweenedPositions[link.target.index]?.y ?? link.target.y}
                            opacity={scrollIndex >= 4 && !isNotInnerToInner(link) ? 0 : 1}
                        />
                    {/if}
                {/each}
            </g>

            {#if scrollIndex >= 3 && outerRingLinks.length > 0}
                <g class="circleLinks">
                    {#each outerRingLinks as link, i (i)}
                        <line
                            class="link circleLink"
                            x1={link.source.x}
                            y1={link.source.y}
                            x2={link.target.x}
                            y2={link.target.y}
                            opacity={scrollIndex >= 5 ? 0 : 1}
                        />
                    {/each}
                </g>
            {/if}

            {#if scrollIndex >= 4 && outerRingLinks.length > 0}
                <g class="crossLinks">
                    {#each outerCrossLinks as link, i (i)}
                        <line
                            class="link crossLink"
                            x1={link.source.x}
                            y1={link.source.y}
                            x2={link.target.x}
                            y2={link.target.y}
                            opacity={
                                scrollIndex >= 5 &&
                                !((link.source.id === 0 && link.target.id === 45) ||
                                (link.source.id === 0 && link.target.id === 5))
                                ? 0
                                : 1
                            }
                        />
                    {/each}
                </g>
            {/if}

            <g class="nodes">
                {#each $processedData as node (node.index)}
                    {#if $tweenedPositions[node.index]}
                        <circle
                            r={5}
                            cx={$tweenedPositions[node.index]?.x ?? node.x}
                            cy={$tweenedPositions[node.index]?.y ?? node.y}
                            opacity={scrollIndex >= 4 && node.index > 9 ? 0 : 
                                scrollIndex >= 5 && node.index !== 0 && node.index !== 5 ? 0 : 1}
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
        width: 100%;
        height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background-color: #f0f0f0;
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
    :global(.link) {
        stroke: var(--color-fg, black);
        stroke-width: 1px;
        transition: opacity 0.5s ease;
    }
    :global(.link.extra) {
        stroke: var(--color-fg, black);
        stroke-width: 1px;
        transition: opacity 0.5s ease, stroke-dashoffset 1s ease;
    }
    :global(.circle) {
        fill: var(--color-fg, black);
        transition: opacity 0.5s ease, cy 1s ease, cx 1s ease;
    }

    :global(.outerLink, .circleLink) {
        stroke-dasharray: none;
        stroke-dashoffset: 0;
        transition: stroke-dashoffset 0.5s ease;
    }
</style>