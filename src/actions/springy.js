export function springy(node, stores) {
    const unsubscribers = [];
    for (const attribute in stores) {
        const store = stores[attribute];
        unsubscribers.push(
            store.subscribe(value => {
                node.setAttribute(attribute, value);
            })
        );
    }
    return {
        destroy() {
            unsubscribers.forEach(unsub => unsub());
        }
    };
}