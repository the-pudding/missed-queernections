<script>
    import * as d3 from 'd3';
    import { longThemes } from "$runes/misc.svelte.js";

    let {tooltipVisible, tooltipX, tooltipY, tooltipData} = $props();

    const dateFormat = d3.timeFormat("%b %Y");
    function getLongTheme(theme) {
        const foundTheme = longThemes.find(item => item.theme === theme);
        
        return foundTheme ? foundTheme.longTheme : null;
    }
</script>

{#if tooltipData}
    <div id="tooltip" class:visible={tooltipVisible} style="left: {tooltipX}px; top: {tooltipY}px">
        <p><strong>{dateFormat(tooltipData[0].date)}</strong></p>
        <p>{tooltipData[0].event}
            {#if tooltipData[0].eventSecondary}
                , {tooltipData[0].eventSecondary}
            {/if}
        </p>
        {#if tooltipData[1]}
            <div class="tags">
                {#each tooltipData[1] as t}
                    <p class="theme-p theme-{t}">{getLongTheme(t)}</p>
                {/each}
            </div>
        {/if}
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

    .theme-p {
        padding: 0.125rem 0.25rem;
        border-radius: 4px;
        display: inline-block;
    }

    .theme-lust {
        background: var(--mq-pink);
    }

    .theme-representation {
        background: var(--mq-red);
    }

    .theme-beHer {
        background: var(--mq-orange);
    }

    .theme-genderConstruct {
        background: var(--mq-yellow);
    }

    .theme-girlPower {
        background: var(--mq-green);
        color: var(--color-bg);
    }

    .theme-gaySeeGay {
        background: var(--mq-teal);
    }

    .theme-publicOpinion {
        background: var(--mq-indigo);
        color: var(--color-bg);
    }

    .theme-trueSelves {
        background: var(--mq-purple);
        color: var(--color-bg);
    }
</style>