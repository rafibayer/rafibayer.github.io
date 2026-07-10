---
layout: post
title: "Secret Countdown"
hidden: true
---

## Secret Countdown For Lilly's eyes only ;)

<style>
  .secret-countdown {
    display: grid;
    gap: 1.5rem;
    margin: 3rem auto;
    max-width: 56rem;
    text-align: center;
  }

  .secret-countdown__label {
    color: #9fb0b7;
    font-size: 1rem;
    line-height: 1.4;
    margin: 0;
  }

  .secret-countdown__time {
    cursor: pointer;
    display: grid;
    gap: 0.75rem;
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .secret-countdown__time.is-spinning {
    animation: countdown-spin 1.4s linear 3;
  }

  .secret-countdown__time.is-spinning .secret-countdown__unit,
  .secret-countdown__time.is-spinning .secret-countdown__value {
    animation: countdown-rainbow 2.8s linear infinite;
  }

  .secret-countdown__unit {
    border: 1px solid rgba(147, 161, 161, 0.35);
    border-radius: 8px;
    padding: 1.25rem 0.75rem;
  }

  .secret-countdown__value {
    color: #fdf6e3;
    display: block;
    font-size: clamp(2.5rem, 9vw, 6rem);
    font-variant-numeric: tabular-nums;
    font-weight: 700;
    line-height: 1;
  }

  .secret-countdown__name {
    color: #93a1a1;
    display: block;
    font-size: 0.8rem;
    letter-spacing: 0.08em;
    margin-top: 0.75rem;
    text-transform: uppercase;
  }

  .secret-countdown__complete {
    color: #fdf6e3;
    display: none;
    font-size: clamp(2rem, 7vw, 4rem);
    font-weight: 700;
    line-height: 1.05;
    margin: 0;
  }

  .magic-trick {
    display: grid;
    gap: 1rem;
    justify-items: center;
    margin: 4rem auto 2rem;
    max-width: 36rem;
    text-align: center;
  }

  .magic-trick__title {
    color: #fdf6e3;
    font-size: clamp(1.5rem, 5vw, 2.25rem);
    margin: 0;
  }

  .magic-trick__stage {
    height: 24rem;
    max-width: 100%;
    position: relative;
    perspective: 800px;
    width: 24rem;
  }

  .magic-trick__deck,
  .magic-trick__search {
    height: 9.5rem;
    left: 50%;
    position: absolute;
    top: 0.5rem;
    transform: translateX(-50%);
    width: 6.75rem;
  }

  .magic-trick__card,
  .magic-trick__deck-card,
  .magic-trick__search-card {
    border: 2px solid #fdf6e3;
    border-radius: 10px;
    box-shadow: 0 0.35rem 0.8rem rgba(0, 0, 0, 0.35);
    height: 9.5rem;
    width: 6.75rem;
  }

  .magic-trick__deck-card,
  .magic-trick__search-card,
  .magic-trick__card-back {
    background-color: #174c72;
    background-image:
      linear-gradient(45deg, rgba(255, 255, 255, 0.14) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(255, 255, 255, 0.14) 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.14) 75%),
      linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.14) 75%);
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    background-size: 16px 16px;
  }

  .magic-trick__deck-card,
  .magic-trick__search-card {
    left: 0;
    position: absolute;
    top: 0;
  }

  .magic-trick__deck-card:nth-child(1) {
    transform: translate(-8px, 6px) rotate(-3deg);
  }

  .magic-trick__deck-card:nth-child(2) {
    transform: translate(7px, 5px) rotate(2deg);
  }

  .magic-trick__deck-card:nth-child(3) {
    transform: translate(-3px, 2px) rotate(-1deg);
  }

  .magic-trick__card {
    left: 50%;
    opacity: 0;
    position: absolute;
    top: 0.5rem;
    transform: translateX(-50%);
    transform-style: preserve-3d;
    transition: opacity 0.25s ease, transform 0.6s ease;
    z-index: 5;
  }

  .magic-trick__card-face,
  .magic-trick__card-back {
    backface-visibility: hidden;
    border-radius: 8px;
    box-sizing: border-box;
    height: 100%;
    left: 0;
    position: absolute;
    top: 0;
    width: 100%;
  }

  .magic-trick__card-face {
    align-items: center;
    background: #fffdf7;
    color: #171717;
    display: flex;
    flex-direction: column;
    font-family: Georgia, serif;
    font-size: 3rem;
    justify-content: center;
    line-height: 0.9;
    transform: rotateY(180deg);
  }

  .magic-trick__card-face.is-red {
    color: #c62828;
  }

  .magic-trick__rank {
    font-size: 2.4rem;
    font-weight: 700;
  }

  .magic-trick__suit {
    font-size: 3.25rem;
  }

  .magic-trick__corner {
    font-size: 1rem;
    font-weight: 700;
    left: 0.55rem;
    line-height: 1;
    position: absolute;
    text-align: center;
    top: 0.55rem;
  }

  .magic-trick__corner--bottom {
    bottom: 0.55rem;
    left: auto;
    right: 0.55rem;
    top: auto;
    transform: rotate(180deg);
  }

  .magic-trick.is-drawing .magic-trick__card {
    opacity: 1;
    transform: translate(-50%, 10rem) rotate(-4deg);
  }

  .magic-trick.is-revealed .magic-trick__card,
  .magic-trick.is-found .magic-trick__card,
  .magic-trick.is-awaiting-answer .magic-trick__card {
    opacity: 1;
    transform: translate(-50%, 10rem) rotate(-2deg) rotateY(180deg);
  }

  .magic-trick.is-celebrating .magic-trick__card {
    animation: magic-card-spin 1.25s ease-in-out forwards;
    opacity: 1;
  }

  .magic-trick.is-exploding .magic-trick__card,
  .magic-trick.is-exploding .magic-trick__deck {
    opacity: 0;
  }

  .magic-trick.is-returning .magic-trick__card {
    opacity: 0;
    transform: translateX(-50%) rotateY(0);
  }

  .magic-trick.is-shuffling .magic-trick__deck-card:nth-child(1) {
    animation: magic-shuffle-left 0.45s ease-in-out 2;
  }

  .magic-trick.is-shuffling .magic-trick__deck-card:nth-child(2) {
    animation: magic-shuffle-right 0.45s ease-in-out 2;
  }

  .magic-trick.is-shuffling .magic-trick__deck-card:nth-child(3) {
    animation: magic-shuffle-top 0.45s ease-in-out 2;
  }

  .magic-trick__search-card {
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.65s ease;
    z-index: 4;
  }

  .magic-trick.is-searching .magic-trick__search-card {
    opacity: 1;
  }

  .magic-trick.is-searching .magic-trick__search-card:nth-child(1) {
    transform: translate(-8rem, 5rem) rotate(-18deg);
  }

  .magic-trick.is-searching .magic-trick__search-card:nth-child(2) {
    transform: translate(8rem, 5rem) rotate(16deg);
  }

  .magic-trick.is-searching .magic-trick__search-card:nth-child(3) {
    transform: translate(-6rem, 11rem) rotate(-10deg);
  }

  .magic-trick__button {
    background: #268bd2;
    border: 0;
    border-radius: 999px;
    color: #fdf6e3;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    padding: 0.75rem 1.5rem;
  }

  .magic-trick__button:hover:not(:disabled),
  .magic-trick__button:focus-visible {
    background: #2aa198;
  }

  .magic-trick__button:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .magic-trick.is-awaiting-answer .magic-trick__button,
  .magic-trick.is-celebrating .magic-trick__button,
  .magic-trick.is-exploding .magic-trick__button {
    display: none;
  }

  .magic-trick__answers {
    display: none;
    gap: 0.75rem;
  }

  .magic-trick.is-awaiting-answer .magic-trick__answers {
    display: flex;
  }

  .magic-trick__answer {
    border: 0;
    border-radius: 999px;
    color: #fff;
    cursor: pointer;
    font: inherit;
    font-weight: 700;
    min-width: 5rem;
    padding: 0.65rem 1.25rem;
  }

  .magic-trick__answer--yes {
    background: #2e7d32;
  }

  .magic-trick__answer--no {
    background: #c62828;
  }

  .magic-trick__answer:hover,
  .magic-trick__answer:focus-visible {
    filter: brightness(1.2);
  }

  .magic-trick__answer:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .magic-trick__status {
    color: #9fb0b7;
    line-height: 1.4;
    margin: 0;
    min-height: 1.4em;
  }

  .magic-trick__explosion {
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    position: fixed;
    z-index: 999;
  }

  .magic-trick__explosion-card {
    animation: magic-card-explode 1.5s ease-out forwards;
    background-color: #174c72;
    background-image:
      linear-gradient(45deg, rgba(255, 255, 255, 0.14) 25%, transparent 25%),
      linear-gradient(-45deg, rgba(255, 255, 255, 0.14) 25%, transparent 25%);
    background-size: 12px 12px;
    border: 2px solid #fdf6e3;
    border-radius: 7px;
    height: 6rem;
    left: calc(50% - 2.15rem);
    position: absolute;
    top: calc(50% - 3rem);
    width: 4.3rem;
  }

  .daily-photo {
    display: grid;
    gap: 0.8rem;
    justify-items: center;
    margin: 4rem auto 2rem;
    max-width: 44rem;
    text-align: center;
  }

  .daily-photo[hidden] {
    display: none;
  }

  .daily-photo__title {
    color: #fdf6e3;
    font-size: clamp(1.5rem, 5vw, 2.25rem);
    margin: 0;
  }

  .daily-photo__frame {
    align-items: center;
    background: linear-gradient(145deg, rgba(253, 246, 227, 0.14), rgba(38, 139, 210, 0.08));
    border: 1px solid rgba(253, 246, 227, 0.28);
    border-radius: 22px;
    box-shadow: 0 1rem 2.5rem rgba(0, 0, 0, 0.32);
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    overflow: hidden;
    padding: 0.55rem;
    width: 100%;
  }

  .daily-photo__image {
    border-radius: 15px;
    display: block;
    height: auto;
    max-height: min(70vh, 38rem);
    max-width: 100%;
    width: auto;
  }

  .daily-photo__caption {
    color: #9fb0b7;
    font-size: 0.9rem;
    line-height: 1.4;
    margin: 0;
  }

  @keyframes countdown-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes magic-shuffle-left {
    50% {
      transform: translate(-5rem, -1rem) rotate(-15deg);
    }
  }

  @keyframes magic-shuffle-right {
    50% {
      transform: translate(5rem, -1rem) rotate(15deg);
    }
  }

  @keyframes magic-shuffle-top {
    50% {
      transform: translate(0, -3rem) rotate(5deg);
    }
  }

  @keyframes magic-card-spin {
    from {
      transform: translate(-50%, 10rem) rotate(-2deg) rotateY(180deg);
    }
    to {
      transform: translate(-50%, 10rem) rotate(-2deg) rotateY(1980deg);
    }
  }

  @keyframes magic-card-explode {
    from {
      opacity: 1;
      transform: translate(0, 0) rotate(0);
    }
    to {
      opacity: 0;
      transform: translate(var(--explode-x), var(--explode-y)) rotate(var(--explode-rotation));
    }
  }

  @keyframes countdown-rainbow {
    0% {
      border-color: #ff3b30;
      color: #ff3b30;
    }
    16% {
      border-color: #ff9500;
      color: #ff9500;
    }
    32% {
      border-color: #ffcc00;
      color: #ffcc00;
    }
    48% {
      border-color: #34c759;
      color: #34c759;
    }
    64% {
      border-color: #007aff;
      color: #007aff;
    }
    80% {
      border-color: #5856d6;
      color: #5856d6;
    }
    100% {
      border-color: #ff2d55;
      color: #ff2d55;
    }
  }

  @media (max-width: 640px) {
    .secret-countdown__time {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .secret-countdown__unit {
      padding: 1rem 0.5rem;
    }

    .magic-trick__stage {
      transform: scale(0.9);
      transform-origin: center bottom;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .magic-trick__card,
    .magic-trick__search-card {
      transition-duration: 0.01ms;
    }

    .magic-trick.is-shuffling .magic-trick__deck-card {
      animation-duration: 0.01ms;
      animation-iteration-count: 1;
    }

    .magic-trick.is-celebrating .magic-trick__card,
    .magic-trick__explosion-card {
      animation-duration: 0.01ms;
    }
  }
</style>

<section class="secret-countdown" aria-labelledby="secret-countdown-title">
  <p id="secret-countdown-title" class="secret-countdown__label">
    Time remaining until July 25, 2026 at 12:10 AM Eastern time
  </p>

  <div class="secret-countdown__time" aria-live="polite" role="button" tabindex="0">
    <div class="secret-countdown__unit">
      <span id="countdown-days" class="secret-countdown__value">--</span>
      <span class="secret-countdown__name">Days</span>
    </div>
    <div class="secret-countdown__unit">
      <span id="countdown-hours" class="secret-countdown__value">--</span>
      <span class="secret-countdown__name">Hours</span>
    </div>
    <div class="secret-countdown__unit">
      <span id="countdown-minutes" class="secret-countdown__value">--</span>
      <span class="secret-countdown__name">Minutes</span>
    </div>
    <div class="secret-countdown__unit">
      <span id="countdown-seconds" class="secret-countdown__value">--</span>
      <span class="secret-countdown__name">Seconds</span>
    </div>
  </div>

  <p id="countdown-complete" class="secret-countdown__complete">Time is up.</p>
</section>

<section class="magic-trick" aria-labelledby="magic-trick-title">
  <h2 id="magic-trick-title" class="magic-trick__title">A Tiny Magic Trick</h2>

  <div class="magic-trick__stage" aria-hidden="true">
    <div class="magic-trick__deck">
      <div class="magic-trick__deck-card"></div>
      <div class="magic-trick__deck-card"></div>
      <div class="magic-trick__deck-card"></div>
    </div>

    <div class="magic-trick__search">
      <div class="magic-trick__search-card"></div>
      <div class="magic-trick__search-card"></div>
      <div class="magic-trick__search-card"></div>
    </div>

    <div class="magic-trick__card">
      <div class="magic-trick__card-back"></div>
      <div class="magic-trick__card-face">
        <span class="magic-trick__corner"></span>
        <span class="magic-trick__rank"></span>
        <span class="magic-trick__suit"></span>
        <span class="magic-trick__corner magic-trick__corner--bottom"></span>
      </div>
    </div>
  </div>

  <button class="magic-trick__button" type="button">pick a card</button>
  <p class="magic-trick__status" aria-live="polite"></p>
  <div class="magic-trick__answers">
    <button class="magic-trick__answer magic-trick__answer--yes" type="button">Yes</button>
    <button class="magic-trick__answer magic-trick__answer--no" type="button">No</button>
  </div>
  <div class="magic-trick__explosion" aria-hidden="true"></div>
</section>

<section class="daily-photo" aria-labelledby="daily-photo-title" hidden>
  <h2 id="daily-photo-title" class="daily-photo__title">Photo Of The Day</h2>
  <div class="daily-photo__frame">
    <img class="daily-photo__image" alt="Today's countdown photo">
  </div>
  <p class="daily-photo__caption" aria-live="polite"></p>
</section>

<script src="{{ site.baseurl }}/assets/javascript/gallery.js">
</script>

<script>
  (function () {
    var targetTime = new Date("2026-07-25T00:10:00-04:00").getTime();
    var galleryStartingDay = 14;
    var dayMs = 24 * 60 * 60 * 1000;
    var hourMs = 60 * 60 * 1000;
    var minuteMs = 60 * 1000;
    var secondMs = 1000;
    var audioClips = [
      "{{ site.baseurl }}/assets/audio/pitbull/dale.mp3",
      "{{ site.baseurl }}/assets/audio/pitbull/fireball.mp3",
      "{{ site.baseurl }}/assets/audio/pitbull/worldwide.mp3"
    ];
    var audioPlayer = new Audio();

    var daysEl = document.getElementById("countdown-days");
    var hoursEl = document.getElementById("countdown-hours");
    var minutesEl = document.getElementById("countdown-minutes");
    var secondsEl = document.getElementById("countdown-seconds");
    var timeEl = document.querySelector(".secret-countdown__time");
    var completeEl = document.getElementById("countdown-complete");
    var dailyPhotoEl = document.querySelector(".daily-photo");
    var dailyPhotoImageEl = dailyPhotoEl.querySelector(".daily-photo__image");
    var dailyPhotoCaptionEl = dailyPhotoEl.querySelector(".daily-photo__caption");
    var displayedIndex = null;

    function pad(value) {
      return String(value).padStart(2, "0");
    }

    function updateDailyPhoto() {
      photoDay = photoIndex()
      if (displayedIndex === photoDay) {
        return;
      }

      dailyPhotoImageEl.loading = "lazy";

      displayedIndex = photoDay;
      var photoNumber = galleryStartingDay - photoDay + 1;
      const src = "{{ site.baseurl }}/images/countdown/" + pad(photoDay) + ".enc"
      console.log()

      // const blob = dec(src);

      // dailyPhotoImageEl.src = URL.createObjectURL(blob);

    }

    dailyPhotoImageEl.addEventListener("load", function () {
      dailyPhotoEl.hidden = false;
    });

    dailyPhotoImageEl.addEventListener("error", function () {
      dailyPhotoEl.hidden = true;
    });

    function updateCountdown() {
      var remaining = targetTime - Date.now();

      if (remaining <= 0) {
        timeEl.style.display = "none";
        completeEl.style.display = "block";
        updateDailyPhoto(0);
        return false;
      }

      var days = Math.floor(remaining / dayMs);
      remaining -= days * dayMs;

      var hours = Math.floor(remaining / hourMs);
      remaining -= hours * hourMs;

      var minutes = Math.floor(remaining / minuteMs);
      remaining -= minutes * minuteMs;

      var seconds = Math.floor(remaining / secondMs);

      daysEl.textContent = String(days);
      hoursEl.textContent = pad(hours);
      minutesEl.textContent = pad(minutes);
      secondsEl.textContent = pad(seconds);
      updateDailyPhoto(days);
      return true;
    }

    if (updateCountdown()) {
      window.setInterval(updateCountdown, 1000);
    }

    function spinCountdown() {
      timeEl.classList.remove("is-spinning");
      void timeEl.offsetWidth;
      timeEl.classList.add("is-spinning");

      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      audioPlayer.src = audioClips[Math.floor(Math.random() * audioClips.length)];
      audioPlayer.play().catch(function () {});
    }

    timeEl.addEventListener("click", spinCountdown);
    timeEl.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        spinCountdown();
      }
    });

  })();
</script>

<script>
  (function () {
    var trickEl = document.querySelector(".magic-trick");
    var buttonEl = trickEl.querySelector(".magic-trick__button");
    var statusEl = trickEl.querySelector(".magic-trick__status");
    var faceEl = trickEl.querySelector(".magic-trick__card-face");
    var rankEl = trickEl.querySelector(".magic-trick__rank");
    var suitEl = trickEl.querySelector(".magic-trick__suit");
    var cornerEls = trickEl.querySelectorAll(".magic-trick__corner");
    var yesButtonEl = trickEl.querySelector(".magic-trick__answer--yes");
    var noButtonEl = trickEl.querySelector(".magic-trick__answer--no");
    var explosionEl = trickEl.querySelector(".magic-trick__explosion");
    var successAudio = new Audio("{{ site.baseurl }}/assets/audio/verynice.mp3");
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
    var suits = [
      { symbol: "\u2660", name: "spades", red: false },
      { symbol: "\u2665", name: "hearts", red: true },
      { symbol: "\u2666", name: "diamonds", red: true },
      { symbol: "\u2663", name: "clubs", red: false }
    ];
    var activeClasses = [
      "is-drawing",
      "is-revealed",
      "is-returning",
      "is-shuffling",
      "is-searching",
      "is-found",
      "is-awaiting-answer",
      "is-celebrating",
      "is-exploding"
    ];

    function wait(duration) {
      return new Promise(function (resolve) {
        window.setTimeout(resolve, reducedMotion ? Math.min(duration, 250) : duration);
      });
    }

    function setState(state) {
      activeClasses.forEach(function (className) {
        trickEl.classList.remove(className);
      });

      if (state) {
        trickEl.classList.add(state);
      }
    }

    function chooseCard() {
      return {
        rank: ranks[Math.floor(Math.random() * ranks.length)],
        suit: suits[Math.floor(Math.random() * suits.length)]
      };
    }

    function showCard(card) {
      rankEl.textContent = card.rank;
      suitEl.textContent = card.suit.symbol;
      cornerEls.forEach(function (cornerEl) {
        cornerEl.textContent = card.rank + card.suit.symbol;
      });
      faceEl.classList.toggle("is-red", card.suit.red);
    }

    function resetTrick() {
      setState("");
      explosionEl.replaceChildren();
      statusEl.textContent = "";
      buttonEl.disabled = false;
      yesButtonEl.disabled = false;
      noButtonEl.disabled = false;
      buttonEl.focus();
    }

    function createExplosion() {
      for (var index = 0; index < 36; index += 1) {
        var cardEl = document.createElement("div");
        var angle = Math.random() * Math.PI * 2;
        var distance = Math.max(window.innerWidth, window.innerHeight) * (0.55 + Math.random() * 0.45);

        cardEl.className = "magic-trick__explosion-card";
        cardEl.style.setProperty("--explode-x", Math.cos(angle) * distance + "px");
        cardEl.style.setProperty("--explode-y", Math.sin(angle) * distance + "px");
        cardEl.style.setProperty("--explode-rotation", (Math.random() * 1080 - 540) + "deg");
        cardEl.style.animationDelay = Math.random() * 0.2 + "s";
        explosionEl.appendChild(cardEl);
      }
    }

    async function acceptCard() {
      yesButtonEl.disabled = true;
      noButtonEl.disabled = true;
      statusEl.textContent = "Very nice!";
      setState("is-celebrating");

      successAudio.currentTime = 0.9;
      successAudio.play().catch(function () {});

      await wait(1600);
      resetTrick();
    }

    async function rejectCard() {
      yesButtonEl.disabled = true;
      noButtonEl.disabled = true;
      statusEl.textContent = "Oh no!";
      createExplosion();
      setState("is-exploding");

      await wait(1800);
      resetTrick();
    }

    async function performTrick() {
      var card = chooseCard();
      var cardName = card.rank + " of " + card.suit.name;

      buttonEl.disabled = true;
      showCard(card);

      statusEl.textContent = "Choosing a card...";
      setState("is-drawing");
      await wait(650);

      statusEl.textContent = "Remember your card: " + cardName + ".";
      setState("is-revealed");
      await wait(1800);

      statusEl.textContent = "Returning it to the deck...";
      setState("is-returning");
      await wait(750);

      statusEl.textContent = "Shuffling the deck...";
      setState("is-shuffling");
      await wait(1200);

      statusEl.textContent = "Searching for your card...";
      setState("is-searching");
      await wait(1400);

      statusEl.textContent = "Found it!";
      setState("is-found");
      await wait(1200);

      statusEl.textContent = "Is this your card?";
      setState("is-awaiting-answer");
      yesButtonEl.focus();
    }

    buttonEl.addEventListener("click", performTrick);
    yesButtonEl.addEventListener("click", acceptCard);
    noButtonEl.addEventListener("click", rejectCard);
  })();
</script>
