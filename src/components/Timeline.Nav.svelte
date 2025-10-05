<script>
    import keyData from "$data/categories.csv";
    import * as d3 from 'd3';
    import { instructionStep, colors } from "$runes/misc.svelte.js";

    let { yScale, axisData, instructionsVisible } = $props();
    let userHoveredIndex = $state(null); 
    let animatedVisibleIndex = $state(null);
    let year = $state("1989");

    const formatYear = d3.timeFormat("%Y");
    const parseMonthYear = d3.timeParse("%B %Y");

    const uniqueYears = $derived(() => {
        if (!axisData || axisData.length === 0) {
            return [];
        }
        const allYearStrings = axisData.map(date => formatYear(date));
        
        return Array.from(new Set(allYearStrings));
    });

    function yearChange() {
        let targetDateString = "January " + year;
        const targetDateObject = parseMonthYear(targetDateString);

        if (targetDateString && yScale) {
            const targetY = yScale(targetDateObject);
        
            window.scrollTo({
                top: targetY,
                behavior: 'smooth'
            });
        }
    }

    $effect(() => {
        let intervalId = null;

        // When the instruction step is 2, start the animation
        if ($instructionStep === 2) {
            let currentIndex = 0;
            
            // Start by showing the first item immediately
            animatedVisibleIndex = 0;

            // Set an interval to advance to the next item every second
            intervalId = setInterval(() => {
                currentIndex++;
                
                // If we've shown all items, reset and stop
                if (currentIndex >= keyData.length) {
                    animatedVisibleIndex = null; // Hide all
                    clearInterval(intervalId);
                } else {
                    animatedVisibleIndex = currentIndex;
                }
            }, 1000); // 1000ms = 1 second
        }

        // Cleanup function: This is crucial!
        // It runs when the component is unmounted or when the dependency changes.
        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
            animatedVisibleIndex = null; // Reset animation state
        };
    });
</script>

<svg style="display:none">
  <defs>
    <filter id="gooey">
      <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
      <feColorMatrix in="blur" mode="matrix"
        values="1 0 0 0 0  
                0 1 0 0 0  
                0 0 1 0 0  
                0 0 0 30 -15" result="goo" />
      <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
    </filter>
  </defs>
</svg>

<div class="timeline-nav">
    <p class="name">Jan</p>
    <div class="middle-wrapper">
        <div class="select-wrapper">
			<!-- <label for="year-select">Jump to a year</label> -->
			<select bind:value={year} id="year-select" onchange={yearChange} disabled={instructionsVisible}>
				{#each uniqueYears() as option}
					<option
						value={option}
                        selected={option === year}
						onclick={() => (year = option)}>{option}</option
					>
				{/each}
			</select>
		</div>
        <div id="key">
            {#each keyData as category, i}
                <div class="category category-{category.categoryShort}">
                    <div class="goo-wrapper" style="filter:url(#gooey)">
                        <div 
                            class="dot"
                            role="tooltip"
                            style="background-color: {colors[i]}"
                            onmouseenter={() => userHoveredIndex = i}
                            onmouseleave={() => userHoveredIndex = null}
                        >
                        </div>
                        <div 
                            class="desc"
                            style="background-color: {colors[i]}"
                            class:visible={i === userHoveredIndex || i === animatedVisibleIndex}
                        >   
                            <p><span>{category.categoryLong}</span></p>
                            <p>{category.definition}</p>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    </div>
    <p class="name">Ashleé</p>
</div>

<style>
    .timeline-nav {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
    }

    .middle-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        padding-top: 1rem;
    }

    select {
        background-color: var(--color-bg);
    }
    
    .name {
        font-family: var(--sans);
        font-weight: 700;
        font-size: var(--18px);
        width: 120px;
        height: 2.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-bg);
        border-radius: 1.25rem;
        border: 2px solid var(--color-fg);
        box-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    }

    #key {
        width: 100%;
        display: flex;
        flex-direction: row;
        margin: 0 auto;
        max-width: 400px;
    }

    .category {
        width: 12.5%;
        font-size: var(--12px);
        font-family: var(--sans);
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
    }

    .dot {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        cursor: pointer;
        transform: scale(1);
        transition: all 0.25s linear;
    }

    .dot:hover {
        transform: scale(1.1);
    }

    .desc {
        position: absolute;
        top: 2rem; /* pushed a little below the dot */
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        border-radius: 1rem;
        padding: 1rem;
        z-index: 1000;

        /* make it wider than the dot */
        width: 200px;

        /* blob reveal */
        clip-path: circle(0% at 50% 0%);
        opacity: 0;
        transition: clip-path 0.45s ease, opacity 0.25s ease;
    }

    .desc.visible {
        clip-path: circle(150% at 50% 0%);
        opacity: 1;
    }

    .desc p {
        padding: 0;
        margin: 0;
    }

    .desc p:first-of-type {
        font-weight: 700;
    }
</style>