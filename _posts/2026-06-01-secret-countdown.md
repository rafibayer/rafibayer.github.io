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

  @keyframes countdown-spin {
    to {
      transform: rotate(360deg);
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
  }
</style>

<section class="secret-countdown" aria-labelledby="secret-countdown-title">
  <p id="secret-countdown-title" class="secret-countdown__label">
    Time remaining until June 25, 2026 at 9:26 AM Pacific time
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

<script>
  (function () {
    var targetTime = new Date("2026-06-25T09:26:00-07:00").getTime();
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

    function pad(value) {
      return String(value).padStart(2, "0");
    }

    function updateCountdown() {
      var remaining = targetTime - Date.now();

      if (remaining <= 0) {
        timeEl.style.display = "none";
        completeEl.style.display = "block";
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
