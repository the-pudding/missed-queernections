<script>
    import * as d3 from 'd3';

    let {tooltipVisible, tooltipX, tooltipY, tooltipData} = $props();

    $effect(() => {
        console.log(tooltipData)
    });
    const dateFormat = d3.timeFormat("%b %Y");
</script>

{#if tooltipData}
    <div id="tooltip" class:visible={tooltipVisible} style="left: {tooltipX}px; top: {tooltipY}px">
        <p><strong>{dateFormat(tooltipData[0].date)}</strong></p>
        {#if tooltipData[1]}
            <p>
                {#each tooltipData[1] as t}
                    <span class="theme-span theme-{t}">{t}</span>{" "}
                {/each}
            </p>
        {/if}
        <p>{tooltipData[0].event}</p>
        <p>{tooltipData[0].eventSecondary}</p>
    </div>
{/if}

<style>
    #tooltip {
        position: fixed;
        opacity: 0;
        background: var(--color-bg);
        width: 200px;
        border-radius: 8px;
        padding: 1rem;
        z-index: 1000;
        font-family: var(--sans);
        font-size: var(--12px);
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
        transition: opacity 100ms linear;
        pointer-events: none;
    }

    #tooltip.visible {
        opacity: 1;
    }

    #tooltip p {
        margin: 0;
    }

        .theme-span {
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
    }

    .theme-lust {
        background: #FF69B4;
    }

    .theme-representation {
        background: #FF0000;
    }

    .theme-beHer {
        background: #FF8E00;
    }

    .theme-genderConstruct {
        background: #FFCC00;
    }

    .theme-girlPower {
        background: #008E00;
    }

    .theme-gaySeeGay {
        background: #00C0C0;
    }

    .theme-publicOpinion {
        background: #400098;
    }

    .theme-trueSelves {
        background: #8E008E;
    }
</style>