<script>
    import { onMount } from 'svelte';
    import * as d3 from 'd3';
    import { nodes, links } from '$utils/networkData.js';

    console.log(nodes, links)

    let svgEl = $state();
    let width = $state();
    let height = $state();

    onMount(() => {
        const simulation = d3.forceSimulation(nodes)
            .force('link', d3.forceLink(links).id(d => d.index).distance(100))
            .force('charge', d3.forceManyBody().strength(-100))
            .force('center', d3.forceCenter(width / 2, height / 2));

        const svg = d3.select(svgEl);

        const link = svg.append('g')
            .selectAll('line')
            .data(links)
            .join('line')
            .attr('class', 'link');

        const node = svg.append('g')
            .selectAll('circle')
            .data(nodes)
            .join('circle')
            .attr('r', 7)
            .attr('class', 'circle');

        simulation.on('tick', () => {
            link
                .attr('x1', d => d.source.x)
                .attr('y1', d => d.source.y)
                .attr('x2', d => d.target.x)
                .attr('y2', d => d.target.y);

            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            });
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

    :global(.circle) {
        fill: var(--color-fg);
    }
</style>