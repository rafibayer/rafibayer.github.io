---
layout: post
title: "Deep Dive: Macrofrick - Metaprogramming for Fun and for Speed"
tags: Rust Metaprogramming Brainfuck Compilers
---

[Macrofrick](https://github.com/rafibayer/macrofrick) is a Brainfuck compiler that leverages Rust's declarative macros and efficient compiler to produce blazingly fast binaries with minimal effort.

## Background

[Previously]({% post_url 2022-11-02-brainfrick %}), we produced a Brainfuck compiler called [Brainfrick-rs](https://github.com/rafibayer/brainfrick-rs) that worked much like a traditional compiler, creating a pipeline that parsed, optimized, and executed code on a virtual machine. Here is a rough diagram of the process that we used to execute brainfuck from our source file.

<div  class="mermaid">
sequenceDiagram
    participant src as Source File (.bf)
    participant main as Main
    participant compiler as Compiler
    participant vm as Virtual Machine
    participant io as IO
    src->>main:Open brainfuck source file
    main->>compiler:Brainfuck src as &str
    compiler->>compiler: Parse source to instructions
    loop Optimizations
        compiler->>compiler: Apply optimization
    end
    compiler->>compiler: pre-match loop braces
    compiler->>main: Produce Compiled Program
    main->>vm: Create and run VM for Program
    vm->>io: Utilize configured IO
</div>
<script async src="https://unpkg.com/mermaid@8.2.3/dist/mermaid.min.js"></script>

We spent a whole lot of time analyzing common patterns of brainfuck code to find opportunities to optimize. By applying all these neat little tricks, we were able to drive down the runtime of our sample programs more and more.

Just for reference, our most intensive brainfuck program was `mandelbrot.bf`, a nearly **12,000** instruction long program that produced a mandelbrot fractal using ASCII characters. By applying our optimizer pipeline to our brainfuck instructions, our compiler was able to speed up the runtime of the program from about **13.2** to **4.3** seconds on my machine with the most recent version. All told, brainfrick-rs is a fairly modest ~750 lines of code. While we could certainly keep squeezing performance out of it with new clever optimizers and careful profiling, we are already reaching the limits of what I could squeeze out of our VM implementation. 

Instead, we will take a different approach: leveraging one of the most powerful compilers in the world to execute `mandelbrot.bf` in **less than 1 second** with about 100 lines of code.

## An Introduction to Metaprogramming: Macros
[Metaprogramming](https://en.wikipedia.org/wiki/Metaprogramming) is a programming strategy that allows one program to read, modify, or generate another. There are many fantastic examples of metaprogramming that you have likely heard of or maybe even used, code generation being of the the most prevalent. [DSLs](https://en.wikipedia.org/wiki/Domain-specific_language) like lex and yacc utilize code generation to create complex programs like parsers from simpler representations, and Google's [Protobuf](https://github.com/protocolbuffers/protobuf) IDL can generate clients and servers in many different languages to facilitate interoperability between services.

While metaprogramming exists in many different forms, one of the first that programmers are often exposed to is the [Macro](https://en.wikipedia.org/wiki/Macro_(computer_science)){:target="_blank"}. Macros allow the programmer to specify a pattern of characters or tokens that should be replaced by another. These macros are often processed or "expanded" during the pre-processor phase of the compiler, making them different than something like a function call. In the final program, there is no macro, just the expanded code. 

For example, here is a simple C program that defines a macro to add two numbers. 

##### `main.c`
```c
#include <stdio.h>

#define ADD(X, Y) ((X) + (Y))

int main() {
    int x = 5;
    int y = 10;
    int result = ADD(x, y);

    printf("%d + %d = %d\n", x, y, result);

    return 0;
}
```

To make the difference between this macro and a function more apparent, we can take a look at the expanded C code using the [Godbolt Compiler Explorer](https://godbolt.org/) and adding the `-E` flag to gcc. 

##### `expanded main.c`
```c 
// ... trimmed ...

int main() {
    int x = 5;
    int y = 10;
    int result = ((x) + (y));

    printf("%d + %d = %d\n", x, y, result);

    return 0;
}
```

When the macro was expanded, the resulting code was placed directly in the code where the macro was used. Unlike a function we are not "calling" the macro or passing `x` and `y` to a new stack frame, we replace the macro with the resulting code.

## Declarative Macros in Rust
When programming in Rust, macros are introduced very early. When creating a new Rust project with `cargo new`, the default `main.rs` file looks like this:

##### `main.rs`
```rust
fn main() {
    println!("Hello, world!");
}
```

Here's our first macro: `println!`.

Rust does not support variadic functions, that is, functions that take a variable number of arguments like `Varargs` in Java or `params` in C#. Rust could've instead defined `println` as a function that takes in a slice of `&str`, something like `fn println(args: &[&str])`, but what if we want to print non-string arguments? Things would get cumbersome fast, probably not a great impression for a hello world program. 

Instead Rust's `println` is a [declarative macro](https://doc.rust-lang.org/book/ch19-06-macros.html) that operates on a series of `TokenTree`, nodes directly from Rust's [AST](https://en.wikipedia.org/wiki/Abstract_syntax_tree). The macro hides the ugly details of formatting our arguments and outputting the result to stdout, while also giving us a convenient API. 

Some other Rust macros you're likely to come up against are `vec!`, `assert!`, `panic!`, and `cfg!`. While we won't cover them in this article, Rust also supports [Prodedural Macros](https://doc.rust-lang.org/reference/procedural-macros.html) which allow you to write more complex, imperative code that also operates on Rust AST nodes. You've probably seen the `#[Derive(...)]` attribute which allows you to automatically implement traits like `Clone`, `Debug`, `Copy`, and more for structs automatically. This works by generating the associated trait implementation in a procedural macro. 

Much like our C example, we can write a simple Rust macro to add two numbers. 

```rust
macro_rules! add {
    ($lhs:expr, $rhs:expr) => {
        $lhs + $rhs
    };
}

fn main() {
    let x = 5;
    let y = 10;
    let result = add!(x, y);
}
```

`macro_rules!` is used to start the definition of a macro, like `#define` in C. Rust macros work by defining a set of rules to match the program AST, and the corresponding output. Here we define a single rule, `($lhs:expr, $rhs:expr)`. This rule matches a node of type `expr`, and binds it to the *metavariable* `$lhs`, which we can use later to refer to it. Likewise, it matches a second `expr` that we bind to `$rhs`. Now we define to body of the rule, which specifies how to expand the macro if we've found a match. Here, `$lhs + $rhs` expands the macro by placing a `+` between our 2 matched expressions. Jumping back to godbolt, we can view the expanded Rust program to see our macro in action.

```rust
// expanded
fn main() { 
    let x = 5;
    let y = 10;
    let result = x + y; 
}
```

Notice, our macro rule specified `expr` as the AST node to match, this means we could pass any valid Rust expression to our macro, and the rule would match. Rust macros can go beyond matching a simple expression, there are a whole set of [fragment-specifiers](https://doc.rust-lang.org/reference/macros-by-example.html#metavariables) we can use to match Rust code. Macrofrick, our new brainfuck compiler, will leverage the `tt` fragment to match Rust code at the token level.

The last bit of Rust Macro basics we need to cover before moving onto macrofrick is repetition. One of the first justifications we gave for using macros over functions in Rust is the ability to use macros as variadic functions. A naive approach would be to just add rules to our macro to support more and more arguments, for example, our `add` macro could become 

```rust
macro_rules! add {
    ($e1:expr, $e2:expr) => {
        $e1 + $e2
    },
    ($e1:expr, $e2:expr, $e3:expr) => {
        $e1 + $e2 + $e3
    },
    ($e1:expr, $e2:expr, $e3:expr, $e4:expr) => {
        $e1 + $e2 + $e3 + $e4
    },
    // and on and on and on...
}
```

But this is pretty repetitive and unmaintainable. It also means that our macro would only support as many arguments as we write rules for. 

Instead, we can use a repetition that matches multiple repeated fragments of code. We can define a group of tokens, and optional separator, and a repetition type (`+`, `*`, or `?`).

Repetition types probably look familiar if you've written and Regex before, and they carry much the same meaning
- **`*`**: 0 or more times
- **`+`**: 1 or more times
- **`?`**: 0 or 1 times

We can then refer to the metavariables in our expansion to repeatedly expand based on how many times we matched.

Now we can rewrite our `add` macro to be truly variadic and concise.

```rust
macro_rules! add {

    // an expression, followed by a comma,
    // followed by 1 or more expressions,
    // separated by commas
    ($first:expr, $( $rest:expr ),+ ) => {

        // expand into the first expression, 
        // followed by a plus and the next expression,
        // as many times as we matched
        $first $( + $rest )+
    }
}

fn main() {
    let x = 5;
    let y = 10;
    let z = 123;

    let result = add!(x, y, z, 3 + 8, -1);
}
```

Which expands into:

```rust
// expanded
fn main() {
    let x = 5;
    let y = 10;
    let z = 123;

    let result = x + y + z + (3 + 8) + -1;
}
```

If you want to learn more about Rust macros, [Macrokata](https://github.com/tfpk/macrokata) is a fantastic set of tutorials and exercises. I was able to write macrofrick before I even finished them all. 

## Brainfuck: Back to Basics
In our original [Brainfuck]({% post_url 2022-11-02-brainfrick %}#brainfuck-basics) article, we discussed the equivalencies between brainfuck instructions, and lines of C code. The table in that article gives a possible C implementation for all 8 of brainfucks instructions.

We are going to expand (pun *intended*) upon that idea by using Rust macros to translate brainfuck instructions directly into Rust a valid Rust program. 

Lets start with matching. Like we mentioned above, we will use the `tt` fragment to match individual Rust tokens. Fortunately, all 8 brainfuck instructions are also valid Rust tokens. A valid Brainfuck program is made up of 0 or more instructions, so lets write a macro rule that matches exactly that.

##### `main.rs`
```rust
macro_rules! frick {
    ( $( $code:tt )* ) => {
        // todo: expand our tokens
    };
}
```

We used the `*` repetition type, which means we will match 0 or more `tt`. Before we start expanding our tokens, we need to set up the pointer and memory used by the brainfuck program. We can simply do this at the start of our expansion, by just including the following 2 lines.

##### `main.rs`
```rust
macro_rules! frick {
    ( $( $code:tt )* ) => {
        let mut mem: [u8; 30_000] = [0; 30_000];
        let mut ptr = 0;

        // todo: expand our tokens
    };
}
```

Like brainfrick-rs, we use a default of 30,000 cells of type u8, a single byte.

### Aside: Macro Hygiene

A quick note about [macro hygiene](https://en.wikipedia.org/wiki/Hygienic_macro). Because macros can expand to arbitrary code, it's theoretically possible for the developer of a macro to accidentally shadow or capture a variable used elsewhere in the program. 

Imagine we wrote a macro like this:
```rust
macro_rules! count_to_5 {
    () => {
        let mut i = 1;
        while i <= 5 {
            println!("{}", i);
            i += 1;
        }
    };
}
```

Here we declare and modify a variable, `i` in our macro, but what if `i` was already defined in the surrounding scope. Depending on `i`'s type, we could cause a variety of problems. If `i` was perhaps a string, our program would likely just fail to compile, since after the macro was executed, `i` would now refer to a numeric type, where we were expecting a string. Even worse, if `i` was already a number, we now just unpredictably changed the value of `i` which would be incredibly hard to debug because it depends on how the macro developer decided to name their variables. 

Lets try running some code and see if Rust suffers from this problem

```rust
let i = "I love macro hygiene";
count_to_5!();

println!("{}", i);
```

`$ cargo run main.rs`
```
1
2
3
4
5
I love macro hygiene
```

Woah! Rust saved us here. Rust uses hygienic macros which means macros cannot refer to variables from other scopes. The `i` inside the macro expansion is different than the one we defined in `main`. 

While is is awesome in the general case, it also means that we'll have to do some extra work to refer to `mem` and `ptr` in our next macro, `instr!`

## Brainfuck: Expanding Instructions
Now that we have our brainfuck tape set up, and a way to match our instructions, we need to start expanding them into equivalent Rust code. To do this we'll create another macro called `instr!` that matches a single `tt` and expands into Rust. Because of the macro hygiene rules we discussed above, we cannot refer to `mem` and `ptr` directly in `instr!`, since they are defined in `frick!`'s scope. 

To get around this, we can add metavariables for them in `instr!`'s rules, so that we can essentially pass them into our expansion. 

Each rule for `instr!` will look something like this

```rust
($mem:ident $ptr:ident /* THE TOKEN WE WANT TO MATCH */ ) => {
    // ... expansion ...
}
```

The `ident` fragment specifier means the rule wants to match an identifier, like a variable name. We can write our `instr!` macro, and call it from `frick!` with `mem` and `ptr` used to match the first 2 metavariables.

##### `main.rs`
```rust
macro_rules! instr {
    ($mem:ident $ptr:ident /* THE TOKEN WE WANT TO MATCH */) => {
       // ... expansion ...
    },
    ($mem:ident $ptr:ident /* THE TOKEN WE WANT TO MATCH */) => {
       // ... expansion ...
    },
    ($mem:ident $ptr:ident /* THE TOKEN WE WANT TO MATCH */) => {
       // ... expansion ...
    },
    // and on and on for each different brainfuck instruction token
}
```

`frick!` now becomes:
##### `main.rs`
```rust
macro_rules! frick {
    ( $( $code:tt )* ) => {
        let mut mem: [u8; 30_000] = [0; 30_000];
        let mut ptr = 0;

        // invoke instr! for each repetition of $code
        $(
            instr!(mem ptr $code);
        )*
    };
}
```

Now for the easy part, we can just fill in the expansion for each token and rule in accordance with our table from the last article.


##### `main.rs`
```rust
macro_rules! instr {
    ($mem:ident $ptr:ident >) => {
        // >
        $ptr += 1;
    };
    ($mem:ident $ptr:ident <) => {
        // <
        $ptr -= 1;
    };
    ($mem:ident $ptr:ident +) => {
        // +
        $mem[$ptr] = $mem[$ptr].wrapping_add(1);
    };
    ($mem:ident $ptr:ident -) => {
        // -
        $mem[$ptr] = $mem[$ptr].wrapping_sub(1);
    };
    ($mem:ident $ptr:ident .) => {
        // .
        print!("{}", $mem[$ptr] as char);
    };
    ($mem:ident $ptr:ident ,) => {
        // ,
        $mem[$ptr] = std::io::stdin()
        .bytes().next().unwrap().unwrap();
    };
    ($mem:ident $ptr:ident [ $( $body:tt )* ]) => {
        // [ CODE ]
        while $mem[$ptr] > 0 {
            $(
                instr!($mem $ptr $body);
            )*
        }
    };
}
```

All of these are quite obvious except for the last rule. The Rust tokenizer recognizes anything between `()`s, `[]`s, and `{}` as a single `tt`. This means we need to match this `tt` explicitly, which means we can't just have a rule for `[` that expands to `while $mem[$ptr] > 0 {` and trust that the following instructions will close our brace at some point. Instead we match `[`, followed by any number of tokens inside the braces `$( $body:tt )*`, followed by a closing `]` as a single `tt`. Then we just expand the entire loop at once, recursively calling our `instr!` macro on the tokens in our loop. This also has a side effect of validating that our braces match for us, if they don't, the code will fail to compile, because there will be no matching rule for a lonely `[` or `]`.

## Finishing touches and the first flight
So far we've written a macro to match brainfuck instructions, set up memory and a pointer for our program, and written rules to expand instructions into valid Rust. We need to add a couple last little tricks before we're ready to break any speed records. 

Much like we saw with our loop rule, the Rust language's Tokenizer recognizes a handful of other common Brainfuck instruction combinations as a single token. Namely `>>`, `<<`, `..`, `...`, `->`, and `<-`. This means that if we call our macro with something like this: `frick!(>>)`, we'll get a compiler error because Rust looks for a rule matching the single token `>>` instead of `>` twice. We can get around this limitation quite easily by just adding additional rules for each of these multi-character tokens to decompose them into their individual instructions. 

Here are a few of them
##### `main.rs`
```rust
// ...
($mem:ident $ptr:ident >>) => {
    $ptr += 2;
};
($mem:ident $ptr:ident ..) => {
    let c = $mem[$ptr] as char;
    print!("{}{}", c, c);
};
($mem:ident $ptr:ident ->) => {
    instr!($mem $ptr -);
    instr!($mem $ptr >);
};
```

As you can see, we have the option of just implementing the expansion as a single statement (as we did with `>>`), or just deferring to `instr!` for each instruction (like `->`). 

Almost time to knock your socks off, just 2 more rules, I promise.

One common brainfuck pattern that we saw in brainfrick-rs was the *clear loop*: `[-]`. The clear loop is a set of 3 brainfuck instructions that repeatedly decrements the current cell until it reaches 0. We optimized this pattern in brainfrick-rs by replacing these 3 instructions with a special case `Clear` instruction to immediately set the current cell to 0 without looping. We can do the same in macrofrick by adding a special rule for it.

##### `main.rs`
```rust
($mem:ident $ptr:ident [-]) => {
    // [-]
    $mem[$ptr] = 0;
};
```

Nice.

Lastly, the brainfuck specification dictates that non-brainfuck instruction characters should be ignored and treated as comments. We can include a final rule at the bottom of `instr!` to match anything else and expand to nothing.

##### `main.rs`
```rust
($mem:ident $ptr:ident $other:tt) => {
    // * poof! *        
};
```

Lets test everything out with our classic brainfuck "Hello World!", we'll include a few brainfuck comments in our code to be sure we ellide them correctly. 

##### `main.rs`
```rust
// macros defined above!

fn main() {
    frick!([ignore me please ]++++++++[>++++[>++>+++>middle of the loop+++>+<<<<-]>+>+>->>+[<]<-]>>.>---.+++++++..+++.>>.<-.<.+++.------.--------.>>+.>++.);
} 
```

`$ cargo run`
```
Hello World!
```

Nice 😎


## Mandelbrot
At first glance, it might seem like this implementation should be slower than brainfrick-rs, after all, we've only implemented one of the many optimizations that our first compiler had. On the surface, this would be right, however, we now have a different optimizer coming into play: 

**The Rust Compiler Itself.**

Since our macro expands into valid Rust code, we're just compiling and running Rust in the end, here is a truncated expansion of our "Hello World!".

##### `expanded main.rs`
```rust

fn main() {
        let mut mem: [TCell; 30_000] = [0; 30_000];
        let mut ptr = 0;
        while mem[ptr] > 0 { }; // our first comment, empty loop
        mem[ptr] = mem[ptr].wrapping_add(1);
        mem[ptr] = mem[ptr].wrapping_add(1);
        mem[ptr] = mem[ptr].wrapping_add(1);
        mem[ptr] = mem[ptr].wrapping_add(1);
        mem[ptr] = mem[ptr].wrapping_add(1);
        mem[ptr] = mem[ptr].wrapping_add(1);
        mem[ptr] = mem[ptr].wrapping_add(1);
        mem[ptr] = mem[ptr].wrapping_add(1);
        while mem[ptr] > 0 {
            ptr += 1;
            mem[ptr] = mem[ptr].wrapping_add(1);
            mem[ptr] = mem[ptr].wrapping_add(1);
            mem[ptr] = mem[ptr].wrapping_add(1);
            mem[ptr] = mem[ptr].wrapping_add(1);
            while mem[ptr] > 0 {
                ptr += 1;
    // ... and on and on ... 
```

This means that by compiling in release mode, we'll get the benefits from any optimizations Rust performs itself.

One great way this comes into play is compile-time evaluation of constant expressions. The Rust compiler is smart enough to combine repetitive code into single instructions. For example, this code increments the current cell 7 times, 7 brainfuck instructions, 7 lines of Rust.

```rust
frick!(+++++++);
```

```rust
// expanded
let mut mem: [TCell; 30_000] = [0; 30_000];
let mut ptr = 0;
mem[ptr] = mem[ptr].wrapping_add(1);
mem[ptr] = mem[ptr].wrapping_add(1);
mem[ptr] = mem[ptr].wrapping_add(1);
mem[ptr] = mem[ptr].wrapping_add(1);
mem[ptr] = mem[ptr].wrapping_add(1);
mem[ptr] = mem[ptr].wrapping_add(1);
mem[ptr] = mem[ptr].wrapping_add(1);
```

But when we look at the corresponding asm in Godbolt for these instructions:

```nasm
mov     byte ptr [rsp], 7
```

We see that we stored 7 in the cell with a single instruction. In brainfrick-rs, we performed such optimizations by hand, but here we get optimization for free alongside any others that the compiler pipeline performs on Rust code.

So without further ado, let's compile the entire Mandelbrot program in release mode and see how we do:

##### `main.rs`
```rust
// macros defined above!

fn main() {
    frick!(+++++++++++++[->++>>>+++++>++>+<<< /* ... snip ... */ );
} 
```

`$ cargo build --release`

`$ time cargo run --release`

```
real    0m1.166s
user    0m0.000s
sys     0m0.000s
```

🚀

## But wait, there's more!
Not bad, but I know what you must be thinking, I promised you we'd get to under a second, and don't you worry, because that's where we're headed.

While Rust is heralded for it's performance and safety, we can squeeze even more juice out of our compiler by forgoing the safety aspect. Like other memory-safe languages, Rust provides automatic bounds checking on arrays. Unlike C, if you try to reach beyond the bounds of an array in Rust, you'll get a runtime panic, because the Rust compiler inserts instructions to ensure you're always indexing within the bounds of your array. Modern compilers and CPUs can make the impact of these checks nearly negligible, but if speed is the name of the game, we can forgo them all together. Maybe don't write any banking software with my brainfuck compiler.

We'll add 2 more macros just to make our code prettier, they make use of the `unsafe` array methods `get_unchecked` and `get_unchecked_mut`.

##### `branch:unsafe main.rs`
```rust
macro_rules! get {
    ($mem:ident $ident:ident) => {
        $mem.get_unchecked($ident)
    };
}

macro_rules! set {
    ($mem:ident $ident:ident $value:expr) => {
        *$mem.get_unchecked_mut($ident) = $value
    };
}
```

Now we amend our rules to make use of these anywhere we index into `mem`.

##### `branch:unsafe main.rs`
```rust
// ... snip ...
unsafe {
    $(
        instr!(mem ptr $code);
    )*
}

// ... snip ...
($mem:ident $ptr:ident +) => {
    // +
    set!($mem $ptr get!($mem $ptr).wrapping_add(1))
};
($mem:ident $ptr:ident -) => {
    // -
    set!($mem $ptr get!($mem $ptr).wrapping_sub(1))
};
($mem:ident $ptr:ident .) => {
    // .
    print!("{}", *get!($mem $ptr) as char);
};
($mem:ident $ptr:ident ,) => {
    // ,
    let c = std::io::stdin()
    .bytes().next().unwrap().unwrap();
    set!($mem $ptr c);
};
($mem:ident $ptr:ident [ $( $body:tt )* ]) => {
    // [ CODE ]
    while *get!($mem $ptr) > 0 {
        $(
            instr!($mem $ptr $body);
        )*
    }
};
// ... snip ...
```

`$ cargo build --release`

`$ time cargo run --release`

```
real    0m0.818s
user    0m0.000s
sys     0m0.000s
```

**🚀⚡⏩** 

...and whatever other emojis you associate with speed
