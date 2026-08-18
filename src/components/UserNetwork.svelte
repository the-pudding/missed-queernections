<script>
	import * as d3 from "d3";
	import { spring } from "svelte/motion";
	import { springy } from "$actions/springy.js";
	import { addedEvents, userId, visitors, colors } from "$runes/misc.svelte.js";
	import { getRecentVisitors } from "$utils/database.js";
	import janData from "$data/jan.csv";
	import ashleeData from "$data/ashlee.csv";

	const janEvents = janData
		.filter((r) => Number(r.total) > 0)
		.map((r) => r.event);
	const ashleeEvents = ashleeData
		.filter((r) => Number(r.total) > 0)
		.map((r) => r.event);

	// Fetch the 99 most recent visitors once on mount, excluding the current user.
	$effect(() => {
		getRecentVisitors({ excludeUserId: $userId || null }).then((rows) => {
			$visitors = rows;
		});
	});

	let width = $state(0);
	let height = $state(0);
	let canvas = $state(null);

	let hoveredVisitor = $state(null); // node index 1–99, 100=Jan, 101=Ashleé
	let hoveredIsUser = $state(false);
	let mouseX = $state(0);
	let mouseY = $state(0);

	// Named node IDs
	const JAN_ID = 100;
	const ASHLEE_ID = 101;

	// Like springy, but always uses setAttribute — needed for SVG <text> x/y
	// which are presentation attributes, not CSS properties.
	function springyAttr(node, springs) {
		let unsubs = [];
		const setup = (s) => {
			unsubs.forEach((u) => u());
			unsubs = Object.entries(s).map(([key, store]) =>
				store.subscribe((val) => node.setAttribute(key, val))
			);
		};
		setup(springs);
		return { update: setup, destroy: () => unsubs.forEach((u) => u()) };
	}

	// --- SPRINGS (102 nodes: 0=you, 1–99=visitors, 100=Jan, 101=Ashleé) ---
	const nodeSprings = new Map(
		Array.from({ length: 102 }, (_, i) => [
			i,
			{
				x: spring(0, { stiffness: 0.08, damping: 0.75 }),
				y: spring(0, { stiffness: 0.08, damping: 0.75 })
			}
		])
	);

	const nodeTargets = new Map(
		Array.from({ length: 102 }, (_, i) => [
			i,
			{ x: 0, y: 0, initialized: false }
		])
	);

	const drawPos = Array.from({ length: 102 }, () => ({ x: 0, y: 0 }));

	const driftPhases = new Map(
		Array.from({ length: 102 }, (_, i) => [
			i,
			{
				phaseX: Math.random() * Math.PI * 2,
				phaseY: Math.random() * Math.PI * 2,
				freqX: 0.6 + Math.random() * 0.8,
				freqY: 0.6 + Math.random() * 0.8
			}
		])
	);

	// Reactive display positions for Jan and Ashleé (updated each RAF frame)
	let janX = $state(0),
		janY = $state(0);
	let ashleeX = $state(0),
		ashleeY = $state(0);

	// --- REACTIVE DATA ---

	// Normalise curly/smart quotes to straight so CSV-sourced event names
	// match whatever encoding ended up in the database.
	const norm = (s) =>
		String(s)
			.replace(/[‘’ʼ]/g, "'")
			.replace(/[“”]/g, '"');

	const normAddedEvents = $derived(new Set($addedEvents.map(norm)));
	const hasEvent = (e) => normAddedEvents.has(norm(e));

	const sharedCounts = $derived(
		$visitors.map((v) => (v.events ?? []).filter(hasEvent).length)
	);

	const janSharedCount = $derived(janEvents.filter(hasEvent).length);

	const ashleeSharedCount = $derived(ashleeEvents.filter(hasEvent).length);

	const maxCount = $derived(
		Math.max(1, ...sharedCounts, janSharedCount, ashleeSharedCount)
	);

	const renderedUserLinks = $derived([
		...sharedCounts
			.map((count, i) => ({ to: i + 1, weight: count }))
			.filter((l) => l.weight > 0),
		...(janSharedCount > 0 ? [{ to: JAN_ID, weight: janSharedCount }] : []),
		...(ashleeSharedCount > 0
			? [{ to: ASHLEE_ID, weight: ashleeSharedCount }]
			: [])
	]);

	const hoveredEvents = $derived(
		hoveredVisitor === null
			? []
			: hoveredVisitor === JAN_ID
				? janEvents.filter(hasEvent)
				: hoveredVisitor === ASHLEE_ID
					? ashleeEvents.filter(hasEvent)
					: ($visitors[hoveredVisitor - 1]?.events ?? []).filter(hasEvent)
	);

	const hoveredName = $derived(
		hoveredVisitor === JAN_ID
			? "Jan"
			: hoveredVisitor === ASHLEE_ID
				? "Ashleé"
				: null
	);

	const janR = $derived(
		janSharedCount === 0 ? 3.5 : 4 + (janSharedCount / maxCount) * 4
	);

	const ashleeR = $derived(
		ashleeSharedCount === 0 ? 3.5 : 4 + (ashleeSharedCount / maxCount) * 4
	);

	const tooltipX = $derived(Math.max(8, Math.min(mouseX + 14, width - 170)));
	const tooltipY = $derived(Math.max(8, Math.min(mouseY - 12, height - 228)));

	let userLinksSnap = [];
	$effect(() => {
		userLinksSnap = renderedUserLinks;
	});

	// --- FORCE SIMULATION ---
	let prevW = 0,
		prevH = 0;

	$effect(() => {
		if (width === 0 || height === 0) return;

		const counts = sharedCounts;
		const janCount = janSharedCount;
		const ashleeCount = ashleeSharedCount;
		const cx = width / 2;
		const cy = height / 2;
		const r = Math.min(width, height) * 0.38;

		const isFirstRun = !nodeTargets.get(1).initialized;
		const isDimChange = prevW !== width || prevH !== height;
		prevW = width;
		prevH = height;

		const alpha = isFirstRun ? 0.6 : isDimChange ? 0.35 : 0.14;

		const nodes = Array.from({ length: 102 }, (_, i) => {
			const t = nodeTargets.get(i);
			return {
				id: i,
				x: t.initialized ? t.x : cx + (Math.random() - 0.5) * r,
				y: t.initialized ? t.y : cy + (Math.random() - 0.5) * r
			};
		});
		nodes[0].fx = cx;
		nodes[0].fy = cy;

		const clearRadius = r * 0.22;
		const innerR = r * 1;
		const outerR = r * 2;
		const localMaxCount = Math.max(1, ...counts, janCount, ashleeCount);

		const getCount = (id) => {
			if (id === JAN_ID) return janCount;
			if (id === ASHLEE_ID) return ashleeCount;
			return counts[id - 1] ?? 0;
		};

		const getNodeR = (id) => {
			if (id === 0) return clearRadius;
			const c = getCount(id);
			return c === 0 ? 3.5 : 4 + (c / localMaxCount) * 4;
		};

		// Link force only for connected nodes (keeps them tethered to "you")
		const visitorLinks_connected = counts
			.map((count, i) => ({ source: 0, target: i + 1, count }))
			.filter((l) => l.count > 0)
			.map((l) => ({
				source: l.source,
				target: l.target,
				distance: Math.max(clearRadius + 20, innerR - l.count * 10),
				strength: 0.3
			}));

		const namedLinks = [
			...(janCount > 0
				? [
						{
							source: 0,
							target: JAN_ID,
							distance: Math.max(clearRadius + 20, innerR - janCount * 10),
							strength: 0.3
						}
					]
				: []),
			...(ashleeCount > 0
				? [
						{
							source: 0,
							target: ASHLEE_ID,
							distance: Math.max(clearRadius + 20, innerR - ashleeCount * 10),
							strength: 0.3
						}
					]
				: [])
		];

		// Compute visitor-visitor shared-event links from live data
		const vs = $visitors;
		const vSets = vs.map((v) => new Set((v.events ?? []).map(norm)));
		const vvLinks = [];
		for (let i = 0; i < vs.length; i++) {
			for (let j = i + 1; j < vs.length; j++) {
				const weight = (vs[i].events ?? []).filter((e) =>
					vSets[j].has(norm(e))
				).length;
				if (weight > 0) {
					vvLinks.push({
						source: i + 1,
						target: j + 1,
						distance: Math.max(15, 55 - weight * 7),
						strength: 0.07
					});
				}
			}
		}

		// Radial force pins each node to its ring — strong enough to override vv links
		const radial = d3
			.forceRadial(
				(d) => {
					if (d.id === 0) return 0;
					return getCount(d.id) > 0 ? innerR : outerR;
				},
				cx,
				cy
			)
			.strength((d) => {
				if (d.id === 0) return 0;
				return getCount(d.id) > 0 ? 0.5 : 0.9;
			});

		const sim = d3
			.forceSimulation(nodes)
			.force(
				"link",
				d3
					.forceLink([...visitorLinks_connected, ...namedLinks, ...vvLinks])
					.id((d) => d.id)
					.distance((d) => d.distance)
					.strength((d) => d.strength)
			)
			.force("radial", radial)
			.force("charge", d3.forceManyBody().strength(-16))
			.force(
				"collision",
				d3
					.forceCollide()
					.radius((d) => getNodeR(d.id))
					.strength(0.85)
			)
			.force("center", d3.forceCenter(cx, cy))
			.alpha(alpha)
			.alphaDecay(0.025);

		sim.on("tick", () => {
			nodes.forEach((node) => {
				const t = nodeTargets.get(node.id);
				if (t) {
					t.x = node.x;
					t.y = node.y;
					t.initialized = true;
				}
				if (node.id === 0) {
					nodeSprings.get(0).x.set(node.x);
					nodeSprings.get(0).y.set(node.y);
					drawPos[0] = { x: node.x, y: node.y };
				}
			});
		});

		return () => sim.stop();
	});

	// --- CANVAS EDGE DRAWING ---
	function drawEdges() {
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const dpr = window.devicePixelRatio || 1;
		ctx.save();
		ctx.scale(dpr, dpr);

		const fg =
			getComputedStyle(document.documentElement)
				.getPropertyValue("--color-fg")
				.trim() || "#191919";

		ctx.strokeStyle = fg;
		ctx.lineWidth = 1.5;
		const hovered = hoveredVisitor;
		for (const link of userLinksSnap) {
			if (hovered !== null && link.to === hovered) continue;
			const a = drawPos[0];
			const b = drawPos[link.to];
			ctx.globalAlpha = hovered !== null ? 0.12 : 0.35;
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
			ctx.stroke();
		}
		if (hovered !== null) {
			const hoveredLink = userLinksSnap.find((l) => l.to === hovered);
			if (hoveredLink) {
				const a = drawPos[0];
				const b = drawPos[hoveredLink.to];
				ctx.globalAlpha = 0.35;
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.stroke();
			}
		}

		ctx.globalAlpha = 1;
		ctx.restore();
	}

	// --- AMBIENT DRIFT + RAF ---
	const DRIFT_AMOUNT = 8;
	const DRIFT_SPEED = 0.0008;

	$effect(() => {
		let rafId;

		function tick(t) {
			nodeSprings.forEach((s, i) => {
				if (i === 0) return;
				const target = nodeTargets.get(i);
				const phase = driftPhases.get(i);
				if (!target?.initialized || !phase) return;

				const x =
					target.x +
					Math.sin(t * DRIFT_SPEED * phase.freqX + phase.phaseX) * DRIFT_AMOUNT;
				const y =
					target.y +
					Math.sin(t * DRIFT_SPEED * phase.freqY + phase.phaseY) * DRIFT_AMOUNT;

				s.x.set(x);
				s.y.set(y);
				drawPos[i] = { x, y };
			});

			// Keep reactive positions in sync for named node labels
			if (nodeTargets.get(JAN_ID)?.initialized) {
				janX = drawPos[JAN_ID].x;
				janY = drawPos[JAN_ID].y;
			}
			if (nodeTargets.get(ASHLEE_ID)?.initialized) {
				ashleeX = drawPos[ASHLEE_ID].x;
				ashleeY = drawPos[ASHLEE_ID].y;
			}

			drawEdges();
			rafId = requestAnimationFrame(tick);
		}

		rafId = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(rafId);
	});

	$effect(() => {
		if (!canvas || width === 0 || height === 0) return;
		const dpr = window.devicePixelRatio || 1;
		canvas.width = width * dpr;
		canvas.height = height * dpr;
		canvas.style.width = width + "px";
		canvas.style.height = height + "px";
	});

	function onMouseMove(e) {
		const rect = e.currentTarget.getBoundingClientRect();
		mouseX = e.clientX - rect.left;
		mouseY = e.clientY - rect.top;

		if (hoveredIsUser) {
			hoveredVisitor = null;
			return;
		}

		let hit = null;
		for (const link of userLinksSnap) {
			const pos = drawPos[link.to];
			const dx = mouseX - pos.x;
			const dy = mouseY - pos.y;
			const count =
				link.to === JAN_ID
					? janSharedCount
					: link.to === ASHLEE_ID
						? ashleeSharedCount
						: sharedCounts[link.to - 1];
			const vr = 4 + (count / maxCount) * 4;
			const hitR = vr + 5;
			if (dx * dx + dy * dy <= hitR * hitR) {
				hit = link.to;
				break;
			}
		}
		hoveredVisitor = hit;
	}

	function onMouseLeave() {
		hoveredVisitor = null;
		hoveredIsUser = false;
	}
</script>

<div class="user-network" bind:clientWidth={width} bind:clientHeight={height}>
	{#if width > 0 && height > 0}
		<canvas bind:this={canvas}></canvas>

		<svg
			{width}
			{height}
			role="img"
			onmousemove={onMouseMove}
			onmouseleave={onMouseLeave}
			style:cursor={hoveredVisitor !== null ? "pointer" : "default"}
		>
			<!-- Visitor circles — dim others when one is hovered -->
			<g class="visitor-nodes" class:has-hover={hoveredVisitor !== null}>
				{#each Array.from({ length: $visitors.length }, (_, i) => i + 1) as i}
					{@const s = nodeSprings.get(i)}
					{@const count = sharedCounts[i - 1] ?? 0}
					{@const vr = count === 0 ? 3.5 : 4 + (count / maxCount) * 4}
					{@const famous = $visitors[i - 1]?.famous ?? null}
					{#if s}
						<circle
							r={vr}
							class="visitor"
							class:connected={count > 0}
							class:hovered={hoveredVisitor === i}
							use:springy={{ cx: s.x, cy: s.y }}
							style:pointer-events="none"
						/>
						{#if famous}
							<text
								dy="-{vr + 4}"
								class="node-label label-famous"
								class:label-connected={count > 0}
								class:label-hovered={hoveredVisitor === i}
								use:springyAttr={{ x: s.x, y: s.y }}>{famous}</text
							>
						{/if}
					{/if}
				{/each}

				<!-- Jan -->
				<circle
					r={janR}
					cx={janX}
					cy={janY}
					class="visitor"
					class:connected={janSharedCount > 0}
					class:hovered={hoveredVisitor === JAN_ID}
					style:pointer-events="none"
				/>
				<text
					x={janX}
					y={janY - janR - 4}
					class="node-label"
					class:label-connected={janSharedCount > 0}
					class:label-hovered={hoveredVisitor === JAN_ID}>Jan</text
				>

				<!-- Ashleé -->
				<circle
					r={ashleeR}
					cx={ashleeX}
					cy={ashleeY}
					class="visitor"
					class:connected={ashleeSharedCount > 0}
					class:hovered={hoveredVisitor === ASHLEE_ID}
					style:pointer-events="none"
				/>
				<text
					x={ashleeX}
					y={ashleeY - ashleeR - 4}
					class="node-label"
					class:label-connected={ashleeSharedCount > 0}
					class:label-hovered={hoveredVisitor === ASHLEE_ID}>Ashleé</text
				>
			</g>

			<!-- User node -->
			<circle
				r="14"
				role="button"
				tabindex="0"
				aria-label="You"
				class="you"
				class:hovered={hoveredIsUser}
				use:springy={{ cx: nodeSprings.get(0).x, cy: nodeSprings.get(0).y }}
				onmouseenter={() => {
					hoveredIsUser = true;
				}}
				onmouseleave={() => {
					hoveredIsUser = false;
				}}
			/>
		</svg>

		<!-- Tooltips -->
		{#if hoveredIsUser}
			<div class="tooltip" style:left="{tooltipX}px" style:top="{tooltipY}px">
				<p class="tooltip-title">You</p>
				{#if $addedEvents.length > 0}
					<p class="tooltip-sub">
						{$addedEvents.length} selected {$addedEvents.length === 1
							? "event"
							: "events"}
					</p>
				{/if}
			</div>
		{:else if hoveredVisitor !== null && hoveredEvents.length > 0}
			<div class="tooltip" style:left="{tooltipX}px" style:top="{tooltipY}px">
				<p class="tooltip-title">
					{hoveredEvents.length}
					shared {hoveredEvents.length === 1 ? "event" : "events"}
				</p>
				<ul class="tooltip-events">
					{#each hoveredEvents.slice(0, 5) as event}
						<li class="tooltip-event">{event}</li>
					{/each}
					{#if hoveredEvents.length > 5}
						<li class="tooltip-more">+{hoveredEvents.length - 5} more</li>
					{/if}
				</ul>
			</div>
		{/if}
	{/if}
</div>

<style>
	.user-network {
		width: 100%;
		height: 100%;
		position: relative;
		overflow: hidden;
	}

	canvas {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	svg {
		position: absolute;
		top: 0;
		left: 0;
		display: block;
	}

	/* Visitor nodes */
	.visitor {
		fill: var(--color-fg);
		opacity: 0.3;
		transition: opacity 0.25s ease;
	}

	.visitor.connected {
		opacity: 0.85;
	}

	/* When any visitor is hovered, dim all other connected nodes */
	.has-hover .visitor.connected:not(.hovered) {
		opacity: 0.35;
	}

	.visitor.connected.hovered {
		opacity: 1;
	}

	/* Named node labels */
	.node-label {
		font-family: var(--sans);
		font-size: 9px;
		font-weight: 700;
		text-anchor: middle;
		fill: var(--color-bg);
		opacity: 1;
		pointer-events: none;
		transition: opacity 0.25s ease;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.node-label.label-famous {
		opacity: 1;
	}

	.node-label.label-connected {
		opacity: 1;
	}

	.has-hover .node-label.label-connected:not(.label-hovered) {
		opacity: 0.3;
	}

	.node-label.label-hovered {
		opacity: 1;
	}

	/* User node */
	.you {
		fill: var(--color-fg);
		cursor: pointer;
		transition:
			stroke-width 0.2s ease,
			stroke-opacity 0.2s ease;
		stroke: var(--color-fg);
		stroke-width: 0;
		stroke-opacity: 0;
	}

	.you.hovered {
		stroke-width: 6;
		stroke-opacity: 0.4;
	}

	/* Tooltip */
	.tooltip {
		position: absolute;
		background: var(--color-fg);
		border: 1.5px solid var(--color-fg);
		border-radius: 4px;
		padding: 0.5rem 0.65rem;
		pointer-events: none;
		max-width: 155px;
		max-height: 220px;
		overflow-y: auto;
		z-index: 10;
	}

	.tooltip-title {
		font-family: var(--sans);
		font-size: var(--12px);
		font-weight: 700;
		text-transform: uppercase;
		margin: 0 0 0.2rem;
	}

	.tooltip-sub {
		font-family: var(--sans);
		font-size: var(--12px);
		margin: 0.15rem 0 0;
	}

	.tooltip-events {
		margin: 0.2rem 0 0;
		padding-left: 1.1em;
	}

	.tooltip-event,
	.tooltip-more {
		font-family: var(--sans);
		font-size: var(--12px);
		margin: 0.1rem 0 0;
	}

	.tooltip-more {
		opacity: 0.55;
		list-style: none;
		margin-left: -1.1em;
	}
</style>
