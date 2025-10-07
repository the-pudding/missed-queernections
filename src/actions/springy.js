export function springy(node, params) {
    let unsubscribers = [];

    function setup(currentParams) {
        unsubscribers.forEach(unsub => unsub());
        unsubscribers = [];

        for (const key in currentParams) {
            const store = currentParams[key];

            if (store && typeof store.subscribe === 'function') {
                const unsub = store.subscribe(value => {
                    // 👇 THIS IS THE CORRECTED, MORE ROBUST CHECK 👇
                    if (typeof node.style[key] === 'string') {
                        // If it's a style, set it with 'px'
                        node.style[key] = `${value}px`;
                    } else {
                        // Otherwise, set it as an attribute (for SVG cx, cy, etc.)
                        node.setAttribute(key, value);
                    }
                });
                unsubscribers.push(unsub);
            }
        }
    }

    setup(params);

    return {
        update(newParams) {
            setup(newParams);
        },
        destroy() {
            unsubscribers.forEach(unsub => unsub());
        }
    };
}