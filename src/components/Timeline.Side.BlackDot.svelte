<script>
    import * as d3 from 'd3';
    import { themes, colors } from "$runes/misc.svelte.js";

    let {svgWidth, dot, addedEvents, scrolling, tooltipVisible, tooltipX, tooltipY} = $props();
    let dotDate = $state();
    let dotEvent = $state();
    let dotTheme = $state();

    // HELPER FUNCTIONS
    function normalizeEventKey(str) {
        return String(str || '')
            .toLowerCase()              // optional: lowercase everything
            .replace(/\s+/g, '')        // remove all whitespace
            .replace(/[^a-z0-9\-]/g, ''); // remove all non-alphanumeric characters (keep dash if needed)
    }

    // EVENT HANDLERS
    function circleMouseEnter(e, dot, dotType) {
        console.log("enter")
        if (scrolling) return;

        const eventKey = normalizeEventKey(dot.event);
        if (!eventKey) return;

        // Scales all related dots
        const matchingDots = d3.selectAll(`.circle-group[data-id='${eventKey}']`);

        matchingDots.attr("transform", function() {
            const x = this.dataset.x;
            const y = this.dataset.y;
            return `translate(${x}, ${y}) scale(1.2)`;
        });

        // Sets tooltip info
        tooltipX = e.x > svgWidth/2 ? e.x - 210 : e.x + 10;
        tooltipY = e.y+10;;
        tooltipVisible = true;
        const themesLocal = [];
        matchingDots.each(function(d) {
            if (this.dataset.theme) {
                themesLocal.push(this.dataset.theme);
            }
        });

        dotTheme = Array.from(new Set(themesLocal));
        dotDate = formatMonthYear(dot.date);
        dotEvent = dot.event;

        // Path lightness
        // Resets
        d3.selectAll("path").each(function() {
            const pathId = this.getAttribute("id") || "";
            const parts = pathId.split("-"); // ["theme", "index", "path"]
            const themeIndex = parseInt(parts[1]);
            if (!isNaN(themeIndex)) {
                d3.select(this).attr("stroke", colors[themeIndex]);
            }
        });

        // Lighten non-matching paths
        const trimmedDotTheme = dotTheme.map(t => t.trim());

        d3.selectAll("path").each(function() {
            const pathId = this.getAttribute("id") || "";
            const theme = pathId.split("-")[0]; // get the theme from the id

            if (!trimmedDotTheme.includes(theme)) {
                const pathColor = d3.color(this.getAttribute("stroke"));
                if (pathColor) {
                    pathColor.opacity = 0.2; // lighten by reducing opacity
                    d3.select(this).attr("stroke", pathColor.formatRgb());
                }
            }
        });

        // Lighten non-matching circles
        d3.selectAll(".circle-group circle").each(function() {
            const parent = this.parentNode;
            const eventId = parent.dataset.id; // normalized event key
            const theme = parent.dataset.theme;
            if (!theme) return;
            const themeIndex = themes.indexOf(theme);

            if (eventId !== eventKey && themeIndex !== -1) {
                const originalColor = colors[themeIndex];
                const color = d3.color(originalColor);
                if (color) {
                    color.opacity = 0.2; // lighten
                    d3.select(this).attr("fill", color.formatRgb());
                }
            } else if (eventId === eventKey && themeIndex !== -1) {
                // restore original color if this is the hovered event
                d3.select(this).attr("fill", colors[themeIndex]);
            }
        });
    
        // Find the closest axis tick to the dot's date and highlight it
        const dotDateValue = parseMonthYear(dot.date);
            const dotMonthStr = d3.timeFormat("%B %Y")(parseMonthYear(dot.date));
            let closestIndex = -1;

            axisData.forEach((tickValue, i) => {
                const tickStr = d3.timeFormat("%B %Y")(tickValue);
                if (tickStr === dotMonthStr) {
                    closestIndex = i;
                }
            });
        
        highlightedTickIndex = closestIndex;
    }

    function circleMouseExit(e, dot, dotType) {
        const eventKey = normalizeEventKey(dot.event);
        
        // Reset dot scale
        d3.selectAll(`.circle-group[data-id='${eventKey}']`)
            .attr("transform", function() {
                const x = this.dataset.x;
                const y = this.dataset.y;
                return `translate(${x}, ${y}) scale(1)`;
            });

        // Reset path lightness
        d3.selectAll("path").each(function() {
            const pathId = this.getAttribute("id") || "";
            const parts = pathId.split("-"); // ["theme", "index", "path"]
            const themeIndex = parseInt(parts[1]);
            if (!isNaN(themeIndex)) {
                d3.select(this).attr("stroke", colors[themeIndex]);
            }
        });

        // Reset circle lightness
        d3.selectAll(".circle-group circle").each(function() {
            const parent = this.parentNode;
            const theme = parent.dataset.theme; // may be undefined for emptyDots
            if (!theme) return; // skip emptyDots
            const themeIndex = themes.indexOf(theme);
            if (themeIndex === -1) return;

            // Restore original color
            d3.select(this).attr("fill", colors[themeIndex]);
        });

        // Tooltip info
        tooltipVisible = false;
    }

    function circleClickAdd(e, dot) {
        const eventKey = String(dot.event ?? '').trim();
        if (!eventKey) return;

        // TO-DO push this to database
        if (addedEvents.includes(eventKey)) {
            addedEvents = addedEvents.filter(ev => ev !== eventKey);
        } else {
            addedEvents = [...addedEvents, eventKey];
        }
    }
</script>

<g 
    class="empty-dot-group"
    tabindex="0" 
    role="button"  
    data-id={normalizeEventKey(dot.event)}
    data-x={dot.x}
    data-y={dot.y}
    data-basex={dot.baseX}
    data-month={dot.monthStr}
    transform={`translate(${dot.baseX}, ${dot.y}) scale(1)`}
    onmouseenter={(e) => circleMouseEnter(e, dot, "theme")}
    onmouseleave={(e) => circleMouseExit(e, dot, "theme")}
    onclick={(e) => circleClickAdd(e, dot)}
    onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            circleClickAdd(e, dot);
            e.preventDefault();
        }
    }}
>
    <circle r={6} fill="black" />
    <g class="icon" class:rotated={addedEvents.includes(dot.event)}>
        <line x1="0" y1="-3" x2="0" y2="3" stroke="white" stroke-width="2" pointer-events="none" />
        <line x1="-3" y1="0" x2="3" y2="0" stroke="white" stroke-width="2" pointer-events="none" />
    </g>
</g>

<style>

</style>