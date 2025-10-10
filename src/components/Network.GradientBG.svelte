<script>
    import { onDestroy } from 'svelte';
    import { spring } from 'svelte/motion';
    import { colors, activeSection } from "$runes/misc.svelte.js";

    let { mousePos } = $props();

    // const backgroundOpacity = $derived(() => {
    //     if (scrollIndex <= 0 || scrollIndex == undefined) return 0.4;
    //     if (scrollIndex == "exit") return 0.3;

    //     const progress = Math.min(scrollIndex / maxSteps, 1);
        
    //     return progress * 0.3;
    // });

    let containerWidth = $state(0);
    let containerHeight = $state(0);
    let hasInitialized = $state(false);
    let positions = $state(colors.map(() => ({ x: 0, y: 0 })));
    let randomDestinations = $state(colors.map(() => ({ x: 0, y: 0 })));

    let springs = [];
    const intervals = [];
    const unsubscribers = [];

    function setNewDestination(i) {
        if (!containerWidth || !containerHeight) return;
        // This now updates the "random" destination, not the spring directly
        randomDestinations[i] = {
            x: Math.random() * containerWidth,
            y: Math.random() * containerHeight
        };
    }

    $effect(() => {
        if (!hasInitialized) return;

        positions.forEach((pos, i) => {
            let finalDest = randomDestinations[i];

            if (mousePos) {
                const dx = pos.x - mousePos.x;
                const dy = pos.y - mousePos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const repulsionRadius = 200; // How close the mouse needs to be
                const repulsionStrength = 350; // How far the blobs jump

                if (distance < repulsionRadius) {
                    const angle = Math.atan2(dy, dx);
                    const force = (repulsionRadius - distance) / repulsionRadius;
                    
                    finalDest = {
                        x: pos.x + Math.cos(angle) * force * repulsionStrength,
                        y: pos.y + Math.sin(angle) * force * repulsionStrength
                    };
                }
            }

            // Tell the spring to move to the final calculated destination
            const s = springs[i];
            if (s) s.set(finalDest);
        });
    });

    $effect(() => {
        if (containerWidth > 0 && !hasInitialized) {
            const initialX = containerWidth / 2;
            const initialY = containerHeight / 2;

            colors.forEach((color, i) => {
                const posSpring = spring({ x: initialX, y: initialY }, {
                    stiffness: 0.01, // A little softer for a more fluid feel
                    damping: 0.3
                });
                springs[i] = posSpring; // Use direct assignment

                const unsubscribe = posSpring.subscribe(newPos => {
                    positions[i] = newPos;
                });
                unsubscribers.push(unsubscribe);
                
                setNewDestination(i);
                
                const randomInterval = 5000 + Math.random() * 5000;
                const intervalId = setInterval(() => setNewDestination(i), randomInterval);
                intervals.push(intervalId);
            });

            hasInitialized = true;
        }
    });

    onDestroy(() => {
        intervals.forEach(clearInterval);
        unsubscribers.forEach(unsub => unsub());
    });
</script>

<div 
    class="aurora-container" 
    style="opacity: {$activeSection == "timeline" ? "0.2" : "0.4"}"
    bind:clientWidth={containerWidth}
    bind:clientHeight={containerHeight}
>
   {#each colors as color, i}
        <div 
            class="aurora-blob" 
            style="
                background: radial-gradient(circle, {color} 0%, transparent 70%);
                left: {positions[i].x}px;
                top: {positions[i].y}px;
            "
        >
        </div>
    {/each}
</div>

<style>
    .aurora-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        overflow: hidden;
        z-index: -1;
        transition: opacity 1.5s ease-in-out;
        filter: blur(40px);
    }

    .aurora-blob {
        position: absolute;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        mix-blend-mode: screen;
        animation: pulseAndMorph 15s ease-in-out infinite alternate;
    }

    @keyframes pulseAndMorph {
        0% {
            transform: translate(-50%, -50%) scale(0.8) rotate(0deg);
            border-radius: 73% 27% 56% 44% / 54% 30% 70% 46%;
        }
        100% {
            transform: translate(-50%, -50%) scale(1.3) rotate(360deg);
            border-radius: 28% 72% 38% 62% / 65% 66% 34% 35%;
        }
    }
    
    .aurora-blob:nth-child(1) { width: 60vmin; height: 60vmin; animation-duration: 12s; }
    .aurora-blob:nth-child(2) { width: 55vmin; height: 55vmin; animation-duration: 10s; }
    .aurora-blob:nth-child(3) { width: 70vmin; height: 70vmin; animation-duration: 14s; }
    .aurora-blob:nth-child(4) { width: 65vmin; height: 65vmin; animation-duration: 11s; }
    .aurora-blob:child(5) { width: 60vmin; height: 60vmin; animation-duration: 13s; }
    .aurora-blob:nth-child(6) { width: 50vmin; height: 50vmin; animation-duration: 9s;  }
</style>