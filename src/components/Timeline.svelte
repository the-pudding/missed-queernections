<script>
    import * as d3 from 'd3';
    import janData from "$data/jan.csv";
    import ashleeData from "$data/ashlee.csv";

    // DIMENSIONS
    let svgHeight = $state(0);
    let svgWidth = $state(0);

    // STYLES
    const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];
    const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];
    const strokeWidth = 3;
    const padding = 20; // Increased padding for axis
    const spacing = 20;
    const startX = 20; // Increased startX to give left right padding
    const bulgeAmount = $derived(svgWidth/8);

    function makePathsAndDots({ side, data, svgWidth, spacing, startX, bulgeAmount, yScale }) {
        const reverse = side === "ashlee";

        const paths = themes.map((theme, i) => {
            const baseX = reverse
                ? svgWidth - startX - i * spacing
                : startX + i * spacing;

            const points = data.map(d => {
                const hasSelf = d[`${side}Themes`][theme] === '1';
                const hasOther = d[`${side === "jan" ? "ashlee" : "jan"}Themes`][theme] === '1';

                let xOffset = 0;
                if (hasSelf && hasOther) xOffset = 2 * bulgeAmount;
                else if (hasSelf) xOffset = bulgeAmount;

                return [
                    reverse ? baseX - xOffset : baseX + xOffset,
                    yScale(d.date)
                ];
            });

            return { theme, points };
        });

        const dots = data
            .filter(d => themes.some(theme => d[`${side}Themes`][theme] === '1'))
            .flatMap(d =>
                themes.filter(theme => d[`${side}Themes`][theme] === '1').map(theme => {
                    const hasSelf = d[`${side}Themes`][theme] === '1';
                    const hasOther = d[`${side === "jan" ? "ashlee" : "jan"}Themes`][theme] === '1';

                    let xOffset = hasSelf ? bulgeAmount : 0;
                    if (hasSelf && hasOther) xOffset = 2 * bulgeAmount;

                    const baseX = reverse
                        ? svgWidth - startX - themes.indexOf(theme) * spacing
                        : startX + themes.indexOf(theme) * spacing;

                    return {
                        date: d.date,
                        event: d[`${side}Themes`].event,
                        theme,
                        bulge: hasOther ? 2 * bulgeAmount : bulgeAmount,
                        x: reverse ? baseX - xOffset : baseX + xOffset,
                        y: yScale(d.date)
                    };
                })
            );

        return { paths, dots };
    }

    // Function to process data and generate path points
    function generateTimelineData(janData, ashleeData) {
        if (!janData || !ashleeData) return { jan: { paths: [], dots: [] }, ashlee: { paths: [], dots: [] } };

        const monthlyData = d3.timeMonth.range(d3.timeMonth.floor(minDate), d3.timeMonth.ceil(maxDate)).map(d => {
            const janEvent = janData.find(event => d3.timeMonth.floor(new Date(event.date)).getTime() === d.getTime());
            const ashleeEvent = ashleeData.find(event => d3.timeMonth.floor(new Date(event.date)).getTime() === d.getTime());
            return {
                date: d,
                janThemes: janEvent || {},
                ashleeThemes: ashleeEvent || {}
            };
        });

        return {
            yScale,
            monthlyData,
            jan: makePathsAndDots({ side: "jan", data: monthlyData, svgWidth, spacing, startX, bulgeAmount, yScale }),
            ashlee: makePathsAndDots({ side: "ashlee", data: monthlyData, svgWidth, spacing, startX, bulgeAmount, yScale })
        };
    }

    // Call the function for both datasets
    const allDates = janData.concat(ashleeData).map(d => new Date(d.date));
        const minDate = d3.min(allDates);
        const maxDate = d3.max(allDates);

        const yScale = $derived(d3.scaleTime()
            .domain([minDate, maxDate])
            .range([padding, svgHeight - padding]));
    const allTimelineData = $derived(generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX, bulgeAmount));
    let axisData = $derived(allTimelineData.yScale.ticks(d3.timeYear.every(1)));
    const formatAxisYear = d3.timeFormat("%Y");

    // Define the line generator once
    const lineGenerator = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveBasis);

    // TOOLTIP
    let tooltipVisible = $state(false);
    let tooltipX = $state();
    let tooltipY = $state();
    let dotDate = $state();
    let dotEvent = $state();
    let dotTheme = $state();
    const formatMonthYear = d3.timeFormat("%B %Y");
    const formatYear = d3.timeFormat("%Y");

    // EVENT HANDLERS
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
    <div class="bg">
        <div class="bg-img"></div>
        <div class="bg-overlay"></div>
    </div>
    <div id="tooltip" class:visible={tooltipVisible} style="left: {tooltipX}px; top: {tooltipY}px">
        <p class="theme theme-{dotTheme}">{dotTheme}</p>
        <p>{dotEvent}</p>
        <p>{dotDate}</p>
    </div>
    <figure>
        <div class="axis-container" style="height: {svgHeight}px;">
            {#each axisData as tickValue}
                <div class="axis-tick" style="top: {allTimelineData.yScale(tickValue)}px;">
                    <p>{formatAxisYear(tickValue)}</p>
                </div>
            {/each}
        </div>
        <svg width={svgWidth} height={40000} bind:clientHeight={svgHeight} bind:clientWidth={svgWidth}>
            {#if svgHeight > 0}
                <defs>
                    {#each themes as theme, i}
                        <linearGradient id={"gradient-" + i} x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={"stop-color: " + d3.color(colors[i]).darker(1)} />
                            <stop offset="50%" style={"stop-color: " + colors[i]} />
                            <stop offset="100%" style={"stop-color: " + d3.color(colors[i]).darker(1)} />
                        </linearGradient>

                        <radialGradient id={"radial-gradient-" + i} cx="30%" cy="30%" r="50%" fx="30%" fy="30%">
                            <stop offset="0%" style={"stop-color: " + d3.color(colors[i]).brighter(1)} />
                            <stop offset="80%" style={"stop-color: " + colors[i]} />
                            <stop offset="100%" style={"stop-color: " + d3.color(colors[i]).darker(0.5)} />
                        </radialGradient>
                    {/each}
                </defs>
                
                {#each ["jan", "ashlee"] as side}
                    {#each allTimelineData[side].paths as themePath, i}
                        <path d={lineGenerator(themePath.points)} stroke={colors[i]} fill="none" stroke-width={6} />
                        <!-- <path d={lineGenerator(themePath.points)} stroke={d3.color(colors[i]).brighter(0.25)} fill="none" stroke-width={2} /> -->
                    {/each}

                    {#each allTimelineData[side].dots as dot}
                        <circle
                            cx={dot.x}
                            cy={dot.y}
                            r={8}
                            fill={"url(#radial-gradient-" + themes.indexOf(dot.theme) + ")"}
                            role="tooltip"
                            onmouseenter={(e) => circleMouseEnter(e, dot)}
                            onmouseleave={(e) => circleMouseExit(e, dot)}
                        />
                    {/each}
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

    #timeline {
        width: 100%;
        position: relative;
    }

    .bg {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100svh;
    }

    .bg-img {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url("assets/imgs/kelly-kapowski.jpg");
        background-size: 25%;
        filter: grayscale(1) blur(2px);
        opacity: 0.15;
    }

    .bg-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: var(--mq-pink);
        mix-blend-mode: overlay;
        opacity: 0.5;
    }

    figure {
        width: 100%;
        position: relative;
    }

    svg, .axis-container {
        position: absolute;
        width: 100%;
        top: 0;
        left: 0;
    }

    .axis-tick {
        position: absolute;
        left: 50%;
        transform: translate(-50%, 0);
    }

    .axis-tick p {
        font-family: var(--sans);
        font-weight: 700;
    }

    :global(#timeline svg circle) {
        cursor: pointer;
        /* transition: all 0.3s linear; */
    }
</style>