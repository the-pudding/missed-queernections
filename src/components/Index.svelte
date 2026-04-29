<script>
	import { getContext } from "svelte";
	import Footer from "$components/Footer.svelte";
	import Intro from "$components/Intro.svelte";
	import Timeline from "$components/NEWTimeline.svelte";

	import * as db from "$utils/database.js";	

	let introHeight = $state(0);
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
	<!-- <button onclick={db.insert}>Insert Data</button> -->
	<div bind:clientHeight={introHeight}>
		<Intro />
	</div>
	<Timeline {introHeight} />

	<!-- <Footer recirc={true} /> -->
</svelte:boundary>

<style>
	
</style>
