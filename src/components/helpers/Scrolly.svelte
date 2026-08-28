<script>
    /**
     * Managed scroll index container based on maximum visible pixel height in viewport.
     */
    let {
        root = null,
        top = 0,
        bottom = 0,
        increments = 100,
        value = $bindable(undefined),
        children
    } = $props();

    let steps = [];
    let threshold = [];
    let nodes = [];
    let intersectionObservers = [];
    let container = undefined;

    function mostInView() {
        let maxPixels = 0;
        let maxIndex = 0;

        for (let i = 0; i < steps.length; i++) {
            if (steps[i] > maxPixels) {
                maxPixels = steps[i];
                maxIndex = i;
            }
        }

        if (maxPixels > 0) {
            value = maxIndex;
        } else {
            // If nothing is in view, check if the last active item was the final one.
            if (value === nodes.length - 1) {
                value = "exit";
            } else {
                value = undefined;
            }
        }
    }

    function createObserver(node, index) {
        const handleIntersect = (e) => {
            const entry = e[0];
            // 🚀 Measure visible screen pixel height instead of percentage ratio
            steps[index] = entry.isIntersecting ? entry.intersectionRect.height : 0;
            mostInView();
        };

        const marginTop = top ? top * -1 : 0;
        const marginBottom = bottom ? bottom * -1 : 0;
        const rootMargin = `${marginTop}px 0px ${marginBottom}px 0px`;
        const options = { root, rootMargin, threshold };

        if (intersectionObservers[index]) intersectionObservers[index].disconnect();

        const io = new IntersectionObserver(handleIntersect, options);
        io.observe(node);
        intersectionObservers[index] = io;
    }

    function update() {
        if (!nodes.length) return;
        nodes.forEach(createObserver);
    }

    $effect(() => {
        threshold = [];
        for (let i = 0; i <= increments; i++) {
            threshold.push(i / increments);
        }
        nodes = container.querySelectorAll(":scope > *:not(iframe)");
        update();
    });

    $effect(() => {
        top;
        bottom;
        update();
    });
</script>

<div bind:this={container}>
    {@render children?.()}
</div>