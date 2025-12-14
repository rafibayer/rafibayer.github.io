---
layout: page
title: Cool Stuff
permalink: /stuff/
---

## Spotlighted Projects

### [Web Assembly Ant Pheromone Simulation](https://github.com/rafibayer/ants-again)
[Try it in the browser!]({% post_url 2025-12-13-Ants %})

![Ants]({{ site.baseurl }}/images/stuff/ants.png){: width="60%"}

### [Web Assembly Game Of Life](https://github.com/rafibayer/wasm-gol)
[Try it in the browser!]({% post_url 2023-09-15-GameOfLife %})

![Game of Life]({{ site.baseurl }}/images/stuff/gol.png){: width="60%"}

### [Compile Brainfuck to Rust with Macros](https://github.com/rafibayer/macrofrick)
[Read about it!]({% post_url 2023-02-26-macrofrick %})
```rust
macro_rules! frick {
    ( $( $code:tt )* ) => {
        let mut mem: [u8; 30_000] = [0; 30_000];
        let mut ptr = 0;
        $(
            instr!(mem ptr $code);
        )*
    };
```

### [Puffin: an interpreted language written in Rust](https://github.com/rafibayer/puffin)
[Read about it!]({% post_url 2021-07-11-Puffin %})
```rust
// recursively computes factorial of n
fact = fn(n) {
    if (n < 2) {
        return 1;
    }

    return n * fact(n - 1);
};

// Take a number from stdin, and compute the factorial
print(fact(input_num("Factorial: ")));
```
