<script>
	import { getContext } from "svelte";
	import Footer from "$components/Footer.svelte";
	import Intro from "$components/Intro.svelte";
	import Timeline from "$components/NEWTimeline.svelte";

	let introHeight = $state(0);
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
	<!-- <div bind:clientHeight={introHeight}>
		<Intro />
	</div> -->
	<Timeline />

	<!-- <!-- <Footer recirc={true} /> -->
</svelte:boundary>

<style>
	
</style>
