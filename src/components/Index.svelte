<script>
	import { getContext } from "svelte";
	import Footer from "$components/Footer.svelte";
	import Intro from "$components/Intro.svelte";
	import Timeline from "$components/Timeline.svelte";

</script>

<svelte:boundary onerror={(e) => console.error(e)}>
	<Intro />
	<Timeline />

	<!-- <Footer recirc={true} /> -->
</svelte:boundary>

<style>
	
</style>
