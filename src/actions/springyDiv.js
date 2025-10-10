export function springy(node, springs) {
	let unsubX;
	let unsubY;

	function setup(currentSprings) {
		// Clean up any old subscriptions before creating new ones
		if (unsubX) unsubX();
		if (unsubY) unsubY();

		if (currentSprings && currentSprings.x && currentSprings.y) {
			unsubX = currentSprings.x.subscribe((x_val) => {
				node.style.left = `${x_val}px`;
			});

			unsubY = currentSprings.y.subscribe((y_val) => {
				node.style.top = `${y_val}px`;
			});
		}
	}

	// Run the setup for the initial parameters
	setup(springs);

	return {
		// This function runs when the `use:springy={...}` parameter changes
		update(newSprings) {
			setup(newSprings);
		},
		// This function runs when the element is removed from the DOM
		destroy() {
			if (unsubX) unsubX();
			if (unsubY) unsubY();
		}
	};
}