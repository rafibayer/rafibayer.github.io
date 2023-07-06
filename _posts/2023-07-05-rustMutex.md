---
layout: post
title: "Byte by Byte: Rust has better Mutexes"
tags: Rust Programming-Languages Concurrency
---

For someone who has never used Rust, it can be hard to understand what all the fuss is about. Let's take a brief look at how Rust lives up to one of its staple promises, namely "fearless concurrency" with a few examples on about a fundamental component: the mutex.

## Aside: Ownership
Without delving too deep, we first need to understand just a bit about the [ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html) system in Rust. The Rust book has a great summary of the ownership [rules](https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html#ownership-rules) that I'll quote here:

> - Each value in Rust has an owner.
> - There can only be one owner at a time.
> - When the owner goes out of scope, the value will be dropped.

Unlike other languages, in Rust, we cannot have multiple variables that refer directly to the same value. When we assign a new variable to equal an existing value, we give ownership to the new variable, and the old owner ceases to exist. 

```rust
let a = String::from("hello world!");
let b = a;

// no good, the value pointed to by a was moved to be, a no longer exists
println!("{}", a);
```

The compiler even gives us a helpful error message showing exactly where our mistake is:

```
|     println!("{}", a);
|                    ^ value borrowed here after move
```

One way we can get around this rule is by "borrowing" values instead of "moving" them. When we borrow a value, we get a reference type instead of ownership, which allows us to share our value while still imposing some safety restrictions.

```rust
let a = String::from("hello world!");
let b = &a;
let c = &a; // we can make as many immutable borrows as we'd like

// all good! a still exists because it still has ownership over the string,
// b and c are just borrowing it.
println!("{}", a);
println!("{}", b);
println!("{}", c);
```

Unlike immutable borrows, we can only ever have 
a single mutable reference to a value at a time.

```rust
let mut buffer = String::new();
let shared_1 = &mut buffer;
let shared_2 = &mut buffer; // no good! there is already a mutable borrow of the value
do_something(shared_1); // shared_1 still exists at the point shared_2 is created :(
```

Our helpful error:
```
|     let shared_1 = &mut buffer;
|                    ----------- first mutable borrow occurs here
|     let shared_2 = &mut buffer;
|                    ^^^^^^^^^^^ second mutable borrow occurs here
|     do_something(shared_1);
|                  -------- first borrow later used here
```

Ownership works because the compiler guarantees that a reference cannot outlive its owner, references to values cannot escape the scope of the owning variable. In Go you could write something like this:

```go
var s *string

{
    hello := "hello world"
    s = &hello
}

fmt.Println(*s)
```

This works because Go has a garbage collector, there is still a reference to the string despite the original variable going out of scope. In a language like C  without a garbage collector, this can create a [dangling pointer](https://en.wikipedia.org/wiki/Dangling_pointer) which can segfault your program at best or create a security vulnerability at worst.

But it we can't share our references to other scopes, how can we share data in Rust? Especially when we start working with multiple threads, we certainly lose any ability to guarantee our reference doesn't outlive its owner.


## The Mutex
In other languages, using a mutex looks something like this:

```go
// golang:
// acquire a lock on the mutex, blocks until it's our turn
mu.Lock()

// enter the critical section, mutate the shared value
sharedValue.DoSomething()

// release the lock, we're done
mu.Unlock()
```

Go even provides us the helpful `defer` keyword which we could use instead to automatically release the lock at the end of the surrounding scope (`mu.Lock()` followed immediately by `defer mu.Unlock()`). 

This all seems pretty intuitive, but there are a couple of foot-guns lurking here:
- What if we forget to acquire the lock? 
    - Nothing prevents us from mutating our shared value without it.
- What if we forget to release the lock? 
    - An exception or crash could cause us to exit early, before our unlock.
    - Our abandoned mutex could deadlock our program.
- What if we share data outside of our critical section? 
    - This could lead to another part of our program mutating it without realizing it should have first taken a lock because the value is shared between threads.

## Mutexes Own Their Values
In Rust, A mutex owns the data it protects. We can only ever acquire a reference to the data owned by the mutex by locking it. Since the compiler guarantees a reference cannot outlive its owner, we also cannot accidentally allow the value protected by the mutex to outlive the lock. Our go example from above might look something like this.

```rust
// locking the mutex gives us access to our shared value
let mut shared_value = mutex.lock().unwrap();
shared_value.do_something();

// no need to unlock, when shared_value leaves scope, the lock is released
```

So far we've been a bit hand-wavy with the setup, so let's set up a full demo, we'll use the classic concurrency demo of incrementing a shared counter.

```rust
use std::{
    sync::{Arc, Mutex},
    thread,
};

fn main() {
    const THREADS: usize = 10;
    const INCREMENTS: usize = 1000;

    // Arc = Atomically Reference Counted,
    // allows us to share the mutex itself (immutable)
    let counter = Arc::new(Mutex::new(0));

    // our thread handles
    let mut handles = Vec::new();

    // spawn multiple threads, share a copy of the mutex to each
    for i in 0..THREADS {
        let counter_copy = counter.clone();
        handles.push(thread::spawn(move || {
            let mut locked = counter_copy.lock().unwrap();
            println!("{i} grabbed the lock");

            for _ in 0..INCREMENTS {
                *locked += 1;
            }

            println!("{i} all done!");
        }));
    }

    for handle in handles {
        handle.join();
    }

    let result = counter.lock().unwrap();
    println!("after: {result}");
    assert_eq!(10000, *result);
}
```

Our output looks about as expected, the threads obtain the lock in pseudo-random order and perform their work before releasing. Our final counter value is as expected, no updates were lost.

```
0 grabbed the lock
0 all done!
3 grabbed the lock
3 all done!
1 grabbed the lock
1 all done!
2 grabbed the lock
2 all done!
4 grabbed the lock
4 all done!
6 grabbed the lock
6 all done!
7 grabbed the lock
7 all done!
8 grabbed the lock
8 all done!
9 grabbed the lock
9 all done!
5 grabbed the lock
5 all done!
after: 10000
```

Ultimately, this all probably looks familiar if you've written any concurrency-related code in a language like Java or Go. That's a good thing! Rust can already be difficult to learn, but here you get to apply a fairly ubiquitous pattern of concurrency and locking, just without all the risks you normally undertake when working with multiple threads.

## Composability
The last aspect of Rust mutexes I want to touch on is composability. Because a Rust mutex give you a reference to the owned data, I find it easier to compose functions that use it. Let's write some pseudo-code demonstrating typical mutex usage in another language:

```
struct Balances {
    mu sync.Mutex
    accounts map[string]int
}

func Deposit(account, amt) error {
    mu.Lock()
    defer mu.Unlock()
    
    // ... do some validation
    accounts[account] += amt
    return nil
}

func Withdraw(account, amt) error {
    mu.Lock()
    defer mu.Unlock()

    // ... do some validation
    accounts[account] -= amt
    return nil
}
```

We have a structure that contains both the mutex as well as the data it protects. We have some functions that acquire the lock, and perform some work on the data. The problem arises when we want to start composing these functions together, say we want to implement a transfer function, we'll write out some psuedo-code with potential implementations:

```
func Transfer(from, to, amt) {
    Withdraw(from, amt)
    Deposit(to, amt)
}
```

This is no good! `Withdraw` and `Deposit` acquire the lock independently, meaning we have to acquire it twice to process and `Transfer`, and another concurrent caller could acquire the lock between our 2 functions moving our data into an invalid state after we've already performed half the transaction. Acquiring the lock in `Transfer` instead would cause a deadlock, since we also need to acquire the lock for `Withdraw` and `Deposit`. 

We could refactor our code to take the lock outside of all of these functions, and assume we're already holding it during the actual mutation, but doing so in a language like go makes it easy for us to introduce some of the bugs we talked about earlier.

```
func Transfer(from, to, amt) {
    mu.Lock()
    defer mu.Unlock()

    // these "internal" functions must assume they already have the lock,
    // but nothing actually enforces that!
    withdrawInternal(from, amt)
    depositInternal(to, amt)
}
```

Now we've introduced a lot of complexity over whos job it is to acquire and release the lock, and where it's safe to assume the lock is held. Enforcing that usages of these functions actually acquire the lock to protect their data is entirely the responsibility of the programmer, there isn't any real relationship between the mutex and data other than the fact that they are in the same struct. Even with proper acquisition, it's easy to make mistakes like passing the map to another thread that might outlive the scope in which we have the lock. 

Rust protects us from all these mistakes, we can apply the same pattern, locking our Mutex outside of our business logic, and assuming we have it inside. The difference is that Rust will never allow us to access the data without first acquiring the lock, and since the lock is held for the lifetime of the reference, the data can never escape the scope of the lock.


```rust
struct Balances {
    accounts: Arc<Mutex<HashMap<String, i32>>>,
}

impl Balances {
    pub fn deposit(&self, account: &str, amt: i32) {
        let mut accounts = self.accounts.lock().unwrap();
        Balances::deposit_internal(&mut accounts, account, amt)
    }

    pub fn withdraw(&self, account: &str, amt: i32) {
        let mut accounts = self.accounts.lock().unwrap();
        Balances::withdraw_internal(&mut accounts, account, amt)
    }

    pub fn transfer(&self, from: &str, to: &str, amt: i32) {
        let mut accounts = self.accounts.lock().unwrap();
        Balances::withdraw_internal(&mut accounts, from, amt);
        Balances::deposit_internal(&mut accounts, to, amt)
    }

    fn deposit_internal(accounts: &mut HashMap<String, i32>, account: &str, amt: i32) {
        // we have a mutable reference to accounts, therefore it must
        // be an exclusive reference due to Rusts ownership rules!
        *accounts.get_mut(account).unwrap() += amt;
    }

    fn withdraw_internal(accounts: &mut HashMap<String, i32>, account: &str, amt: i32) {
        // same assumtpion as deposit_internal
        *accounts.get_mut(account).unwrap() -= amt;
    }
}
```

Because of Rusts compile-time enforcement of ownership and borrowing rules, we know that our "internal" functions must have exclusive access to the hashmap, and therefore are always safe to mutate it. Rust mutexes make it much easier to write composable code without introducing nasty concurrency bugs that are possible in other languages.

If you've made it this far, I hope I've convinced you to give Rust a try!

## References and Further Reading
- [Rust](https://www.rust-lang.org/)
- [Rust Book](https://doc.rust-lang.org/book/)
    - [Concurrency Chapter](https://doc.rust-lang.org/book/ch16-00-concurrency.html)
- [std::sync::Mutex](https://doc.rust-lang.org/std/sync/struct.Mutex.html)