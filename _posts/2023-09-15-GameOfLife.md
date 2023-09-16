---
layout: post
title: "Demo: Game Of Life"
tags: WebAssembly Rust Games
---

<style>
    canvas {
            margin: auto;
            padding: 0px;
            width: 50vw;
            height: 50vw;
            z-index: 0;
    }
</style>

<canvas id="glcanvas" tabindex='1'></canvas>
<script src="https://not-fl3.github.io/miniquad-samples/mq_js_bundle.js"></script>
<button onclick="wasm_exports.toggle_paused()">Play/Pause</button>
<button onclick="wasm_exports.step()">Step</button>
<button onclick="wasm_exports.toggle_click_mode()">Toggle Click Mode</button>

