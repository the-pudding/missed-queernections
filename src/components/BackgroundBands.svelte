<div class="bands">
    <div class="outer"></div>
    <div class="inner"></div>
    <div class="middle"></div>
    <div class="inner"></div>
    <div class="outer"></div>
</div>

<style>
    .bands {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        display: flex;
        flex-direction: row;
    }

    .bands div {
        width: 25%;
        height: 100%;
    }

    .outer {
        background: var(--color-gray-50);
    }

    .inner {
        background: var(--color-gray-100);
    }

    .middle {
        background: var(--color-gray-200);
    }
</style>