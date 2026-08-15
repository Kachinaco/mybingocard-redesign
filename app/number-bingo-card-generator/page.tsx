import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Number Bingo 1-75 — MyBingoCard",
};

export default function Page() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `



<header class="page-head">
  <span class="k">🔢 Classic</span>
  <h1>Number Bingo 1-75</h1>
  <p>The classic B-I-N-G-O column format with a built-in caller. Free for up to 30 cards, ready in about a minute.</p>
  <div class="mt-24">
    <a class="btn" href="05-playful-confetti-create.html?starter=numbers">Make number 1-75 cards</a>
    <a class="btn btn-white" href="05-playful-confetti-play.html?game=numbers" style="margin-left:8px;">Preview a card</a>
  </div>
</header>

<div class="section section-tight">
  <div class="split">
    <div class="card center">
      <div class="mini mini-words" style="max-width:280px; margin:0 auto;"><i>4</i><i>18</i><i>33</i><i>54</i><i>73</i><i>7</i><i>21</i><i>44</i><i>59</i><i>66</i><i>2</i><i>29</i><i>43</i><i>58</i><i>61</i><i>5</i><i>27</i><i>45</i><i>55</i><i>69</i><i>14</i><i>25</i><i>40</i><i>57</i><i>62</i></div>
      <p class="mt-16"><strong style="color:var(--ink);">Number Bingo 1-75</strong> · confetti pop theme · 5×5</p>
    </div>
    <div>
      <h2 style="font-size:clamp(22px,4vw,28px); margin-bottom:12px;">How it plays</h2>
      <ul class="check-list">
        <li>Print one card per player, or share a link to everyone’s phone</li>
        <li>Call numbers from the built-in caller — it tracks what’s been called</li>
        <li>Players mark B-I-N-G-O column squares as numbers come up</li>
        <li>First to five in a row wins — check the card and go again</li>
      </ul>
      <p class="mt-16" style="font-weight:600; color:var(--mut); font-size:14px;">The built-in list has 75 classic numbers baked in, so every card is unique.</p>
    </div>
  </div>
</div>

<div class="section section-tight">
  <div class="sec-head">
    <span class="k">Word ideas</span>
    <h2>A sample of the built-in list</h2>
    <p>Open the generator and the full list loads automatically — edit freely.</p>
  </div>
  <div class="chip-row">
    <span class="pill pill-pink">B-1</span>
    <span class="pill pill-teal">I-16</span>
    <span class="pill pill-yellow">N-31</span>
    <span class="pill pill-purple">G-46</span>
    <span class="pill pill-pink">O-61</span>
    <span class="pill pill-teal">B-15</span>
    <span class="pill pill-yellow">I-30</span>
    <span class="pill pill-purple">N-45</span>
    <span class="pill pill-pink">G-60</span>
    <span class="pill pill-teal">O-75</span>
    <span class="pill pill-yellow">B-7</span>
    <span class="pill pill-purple">I-22</span>
    <span class="pill pill-pink">N-38</span>
    <span class="pill pill-teal">G-52</span>
    <span class="pill pill-yellow">O-68</span>
    <span class="pill pill-purple">+ more</span>
  </div>
</div>



<div class="cta-band">
  <h2>Game coming up?</h2>
  <p>Free for up to 30 cards — no account needed to print.</p>
  <a class="btn btn-yellow" href="05-playful-confetti-create.html?starter=numbers">Make number 1-75 cards</a>
</div>



`,
      }} />
    </PlayfulShell>
  );
}
