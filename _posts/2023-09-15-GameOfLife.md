---
layout: post
title: "Demo: Game Of Life"
tags: WebAssembly Rust Games
---

Play Conway's Game of Life in your browser! Rust compiled to WASM, using the macroquad crate.

<style>
    canvas {
            margin: auto;
            padding: 0px;
            width: 50vw;
            height: 50vw;
            z-index: 0;
    }
</style>

<button onclick="wasm_exports.toggle_paused()">Play/Pause</button>
<button onclick="wasm_exports.step()">Step</button>
<button onclick="wasm_exports.toggle_click_mode()">Toggle Click Mode</button>
<canvas id="glcanvas" tabindex='1'></canvas>
<script src="https://not-fl3.github.io/miniquad-samples/mq_js_bundle.js"></script>
<script>load("{{ site.baseurl}}/assets/wasm/wasm-gol.wasm");</script>


# About
[Conway's Game of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) is a classic cellular automaton. This implementation is written in Rust, rendered using [Macroquad](https://github.com/not-fl3/macroquad), and made available in the browser via [WebAssembly](https://webassembly.org/). 

# See the Code
[github.com/rafibayer/wasm-gol](https://github.com/rafibayer/wasm-gol)