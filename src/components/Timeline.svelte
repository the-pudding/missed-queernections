<script>
    import * as d3 from 'd3';
    import janData from "$data/jan.csv";
    import ashleeData from "$data/ashlee.csv";

    let svgHeight = $state(0);
    let svgWidth = $state(0);

    const themes = ["lust", "representation", "beHer", "genderConstruct", "girlPower", "gaySeeGay", "publicOpinion", "trueSelves"];
    const colors = ["#FF69B4", "#FF0000", "#FF8E00", "#FFCC00", "#008E00", "#00C0C0", "#400098", "#8E008E"];
    const strokeWidth = 3;
    const padding = 10;
    const spacing = 8;
    const startX = 10;
    const bulgeAmount = $derived(svgWidth/5);
    const monthPadding = 50;

    // Call the function for both datasets
   const allTimelineData = $derived(generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX, bulgeAmount));

    // Function to process data and generate path points
function generateTimelineData(janData, ashleeData, themes, svgWidth, spacing, startX, bulgeAmount) {
    if (!janData || !ashleeData) return { jan: { paths: [], dots: [] }, ashlee: { paths: [], dots: [] } };

    // Find the overall min/max dates across both datasets
    const allDates = janData.concat(ashleeData).map(d => new Date(d.date));
    const minDate = d3.min(allDates);
    const maxDate = d3.max(allDates);

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

    const yScale = d3.scaleTime()
        .domain([minDate, maxDate])
        .range([padding, svgHeight - padding]);

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
                theme: theme,
                bulge: bulge
            };
        }));

    return {
        yScale,
        jan: { paths: janPaths, dots: janDots },
        ashlee: { paths: ashleePaths, dots: ashleeDots }
    };
}

    // Define the line generator once
    const lineGenerator = d3.line()
        .x(d => d[0])
        .y(d => d[1])
        .curve(d3.curveMonotoneY);

    // Use d3.max to find the overall max date for SVG height calculation
    const overallMaxDate = d3.max([d3.max(janData, d => new Date(d.date)), d3.max(ashleeData, d => new Date(d.date))]);
    const overallMinDate = d3.min([d3.min(janData, d => new Date(d.date)), d3.min(ashleeData, d => new Date(d.date))]);
    const overallTotalMonths = d3.timeMonth.count(overallMinDate, overallMaxDate);
</script>

<section id="timeline">
    <figure>
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
                    />
                {/each}

                {#each allTimelineData.ashlee.dots as dot}
                    <circle
                        cx={svgWidth - startX - themes.indexOf(dot.theme) * spacing - dot.bulge}
                        cy={allTimelineData.yScale(dot.date)}
                        r="5"
                        fill={colors[themes.indexOf(dot.theme)]}
                    />
                {/each}
            {/if}
        </svg>
    </figure>
</section>

<style>
    #timeline {
        width: 100%;
    }

    figure {
        width: 100%;
    }
</style>