<script>
    import * as d3 from 'd3';
    import janData from "$data/jan.csv";
    import ashleeData from "$data/ashlee.csv";

    let svgHeight = $state(0);
    let svgWidth = $state(0);

    const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];
    const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];
    const strokeWidth = 3;
    const padding = 20; // Increased padding for axis
    const spacing = 8;
    const startX = 60; // Increased startX to make room for axis
    const bulgeAmount = $derived(svgWidth/5);

    // Function to process data and generate path points
    function generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX, bulgeAmount) {
        if (!janData || !ashleeData) return { jan: { paths: [], dots: [] }, ashlee: { paths: [], dots: [] } };

        // Find the overall min/max dates across both datasets
        const allDates = janData.concat(ashleeData).map(d => new Date(d.date));
        const minDate = d3.min(allDates);
        const maxDate = d3.max(allDates);

        const yScale = d3.scaleTime()
            .domain([minDate, maxDate])
            .range([padding, svgHeight - padding]);

        // Create a comprehensive monthly dataset by combining both
        const monthlyData = d3.timeMonth.range(d3.timeMonth.floor(minDate), d3.timeMonth.ceil(maxDate)).map(d => {
            const janEvent = janData.find(event => d3.timeMonth.floor(new Date(event.date)).getTime() === d.getTime());
            const ashleeEvent = ashleeData.find(event => d3.timeMonth.floor(new Date(event.date)).getTime() === d.getTime());
            return {
                date: d,
                janThemes: janEvent || {},
                ashleeThemes: ashleeEvent || {}
            };
        });

        // Generate paths and dots data for Jan
        const janPaths = themes.map((theme, i) => {
            const baseX = startX + i * spacing;
            const points = monthlyData.map(d => {
                const janValue = d.janThemes[theme] === '1';
                const ashleeValue = d.ashleeThemes[theme] === '1';
                let xOffset = 0;
                if (janValue && ashleeValue) {
                    xOffset = 2 * bulgeAmount; // Double bulge
                } else if (janValue) {
                    xOffset = bulgeAmount; // Single bulge
                }
                return [baseX + xOffset, yScale(d.date)];
            });
            return { theme, points };
        });

        const janDots = monthlyData.filter(d => themes.some(theme => d.janThemes[theme] === '1'))
            .flatMap(d => themes.filter(theme => d.janThemes[theme] === '1').map(theme => {
                const ashleeValue = d.ashleeThemes[theme] === '1';
                const bulge = ashleeValue ? 2 * bulgeAmount : bulgeAmount;
                return {
                    date: d.date,
                    event: d.janThemes.event,
                    theme: theme,
                    bulge: bulge
                };
            }));

        // Generate paths and dots data for Ashlee (reversed)
        const ashleePaths = themes.map((theme, i) => {
            const baseX = svgWidth - startX - i * spacing;
            const points = monthlyData.map(d => {
                const janValue = d.janThemes[theme] === '1';
                const ashleeValue = d.ashleeThemes[theme] === '1';
                let xOffset = 0;
                if (janValue && ashleeValue) {
                    xOffset = 2 * bulgeAmount; // Double bulge
                } else if (ashleeValue) {
                    xOffset = bulgeAmount; // Single bulge
                }
                return [baseX - xOffset, yScale(d.date)];
            });
            return { theme, points };
        });

        const ashleeDots = monthlyData.filter(d => themes.some(theme => d.ashleeThemes[theme] === '1'))
            .flatMap(d => themes.filter(theme => d.ashleeThemes[theme] === '1').map(theme => {
                const janValue = d.janThemes[theme] === '1';
                const bulge = janValue ? 2 * bulgeAmount : bulgeAmount;
                return {
                    date: d.date,
                    event: d.ashleeThemes.event,
                    theme: theme,
                    bulge: bulge
                };
            }));

        return {
            yScale,
            monthlyData,
            jan: { paths: janPaths, dots: janDots },
            ashlee: { paths: ashleePaths, dots: ashleeDots }
        };
    }

    // Call the function for both datasets
    const allTimelineData = $derived(generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX, bulgeAmount));

    // Define the line generator once
    const lineGenerator = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveMonotoneY);

    let tooltipVisible = $state(false);
    let tooltipX = $state();
    let tooltipY = $state();
    let dotDate = $state();
    let dotEvent = $state();
    let dotTheme = $state();
    const formatMonthYear = d3.timeFormat("%B %Y");
    const formatYear = d3.timeFormat("%Y");

    function circleMouseEnter(e, dot) {
        let circle = d3.select(e.currentTarget);
        circle.attr("r", 10);
        dotTheme = dot.theme;
        dotDate = formatMonthYear(dot.date);
        dotEvent = dot.event;
        tooltipX = e.x+10;
        tooltipY = e.y+10;
        tooltipVisible = true;
    }

    function circleMouseExit(e, dot) {
        let circle = d3.select(e.currentTarget);
        circle.attr("r", 5);
        tooltipVisible = false;
    }
</script>

<section id="timeline">
    <div id="tooltip" class:visible={tooltipVisible} style="left: {tooltipX}px; top: {tooltipY}px">
        <p class="theme theme-{dotTheme}">{dotTheme}</p>
        <p>{dotEvent}</p>
        <p>{dotDate}</p>
    </div>
    <figure>
        <div class="date-labels" style="width: 100%">
            {#each allTimelineData.monthlyData as month, i}
                <p style="position: absolute; 
                    left: 50%; 
                    top: {20000/allTimelineData.monthlyData.length*i}px; 
                    transform: translate(-50%,0)"
                >
                    {formatYear(month.date)}
                </p>
            {/each}
        </div>
        <svg width={svgWidth} height={20000} bind:clientHeight={svgHeight} bind:clientWidth={svgWidth}>
            {#if svgHeight > 0}
                {#each allTimelineData.jan.paths as themePath, i}
                    <path d={lineGenerator(themePath.points)} stroke={colors[i]} fill="none" stroke-width={strokeWidth} />
                {/each}
                {#each allTimelineData.ashlee.paths as themePath, i}
                    <path d={lineGenerator(themePath.points)} stroke={colors[i]} fill="none" stroke-width={strokeWidth} />
                {/each}

                {#each allTimelineData.jan.dots as dot}
                    <circle
                        cx={startX + themes.indexOf(dot.theme) * spacing + dot.bulge}
                        cy={allTimelineData.yScale(dot.date)}
                        r="5"
                        fill={colors[themes.indexOf(dot.theme)]}
                        role="tooltip"
                        onmouseenter={(e) => circleMouseEnter(e, dot)}
                        onmouseleave={(e) => circleMouseExit(e, dot)}
                    />
                {/each}

                {#each allTimelineData.ashlee.dots as dot}
                    <circle
                        cx={svgWidth - startX - themes.indexOf(dot.theme) * spacing - dot.bulge}
                        cy={allTimelineData.yScale(dot.date)}
                        r="5"
                        fill={colors[themes.indexOf(dot.theme)]}
                        role="tooltip"
                        onmouseenter={(e) => circleMouseEnter(e, dot)}
                        onmouseleave={(e) => circleMouseExit(e, dot)}
                    />
                {/each}
            {/if}
        </svg>
    </figure>
</section>

<style>
    #tooltip {
        position: fixed;
        opacity: 0;
        background: var(--color-bg);
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

    #timeline {
        width: 100%;
    }

    figure {
        width: 100%;
        position: relative;
    }

    svg, .date-labels {
        position: absolute;
        top: 0;
        left: 0;
    }

    .date-labels p {
        font-family: var(--sans);
        font-weight: 700;
        opacity: 0
    }

    .date-labels p:nth-of-type(12n + 1) {
        opacity: 1;
    }

    :global(#timeline svg circle) {
        cursor: pointer;
        transition: all 0.3s linear
    }
</style>