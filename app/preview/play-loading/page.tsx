import type { Metadata } from "next";
import PlayfulShell from "@/components/PlayfulShell";

export const metadata: Metadata = {
  title: "Loading your bingo card",
};

export default function PreviewPlay_loadingPage() {
  return (
    <PlayfulShell>
      <div dangerouslySetInnerHTML={{
        __html: `
      <div class="prototype-bar">
        <span class="prototype-long">Local redesign · 98 source routes + 8 system previews · production connections blocked</span>
        <span class="prototype-short">Local · 106 base routes · production blocked</span>
        <button type="button" data-action="open-routes">Browse all screens</button>
      </div>
    
        <div class="game-shell">
          <header class="game-topbar"><a class="brand" href="/" data-route><span translate="no">My<span>Bingo</span>Card</span></a><span class="pill pill-local">Loading · local</span></header>
          <main class="game-main" id="main"><div class="game-grid"><section class="stack"><span class="eyebrow">Player card</span><h1 tabindex="-1">Loading your bingo card</h1><span class="skeleton-line title"></span><span class="skeleton-line"></span><span class="skeleton-line short"></span></section><section class="card skeleton-card"><span class="skeleton-board"></span></section></div></main>
        </div>
      
      <dialog class="route-drawer" id="route-drawer" aria-labelledby="route-drawer-title">
        <div class="route-drawer-head">
          <div class="stack-tight">
            <span class="eyebrow">Complete source inventory</span>
            <h2 id="route-drawer-title">Browse all 106 base routes</h2>
          </div>
          <button class="button button-icon" type="button" data-action="close-routes" aria-label="Close screen browser"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
        </div>
        <label class="field">
          <span class="field-label">Find a screen</span>
          <span class="search-field">
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
            <input class="text-input" id="route-search" type="search" autocomplete="off" placeholder="Dashboard, login, classroom…" value="">
          </span>
        </label>
        <div class="route-list" id="route-list">
        <section class="route-group" data-route-group>
          <h3>Public marketing · 4</h3>
          
              <div class="route-entry">
                <a href="/" data-route data-route-search="bingo card maker / public marketing ">
                  <span>Bingo card maker</span>
                  <span class="route-path">/</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/about" data-route data-route-search="about mybingocard /about public marketing ">
                  <span>About MyBingoCard</span>
                  <span class="route-path">/about</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/features" data-route data-route-search="features /features public marketing ">
                  <span>Features</span>
                  <span class="route-path">/features</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/pricing" data-route data-route-search="pricing /pricing public marketing plan comparison free, premium, lifetime, and one-time batch choices. current free plan the signed-in free-plan view with included tools. checkout success a completed premium activation with the next action. checkout canceled a safe return from checkout with no plan change.">
                  <span>Pricing</span>
                  <span class="route-path">/pricing · 4 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/pricing?state=compare" data-route class="">Plan comparison</a><a href="/pricing?state=current-free" data-route class="">Current free plan</a><a href="/pricing?state=success" data-route class="">Checkout success</a><a href="/pricing?state=canceled" data-route class="">Checkout canceled</a></div></details>
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>Templates &amp; discovery · 2</h3>
          
              <div class="route-entry">
                <a href="/templates" data-route data-route-search="bingo card templates /templates templates &amp; discovery ">
                  <span>Bingo card templates</span>
                  <span class="route-path">/templates</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/bingo-games" data-route data-route-search="bingo games /bingo-games templates &amp; discovery ">
                  <span>Bingo games</span>
                  <span class="route-path">/bingo-games</span>
                </a>
                
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>SEO landing pages · 47</h3>
          
              <div class="route-entry">
                <a href="/ai-bingo-card-generator" data-route data-route-search="ai bingo card generator /ai-bingo-card-generator seo landing pages ">
                  <span>AI bingo card generator</span>
                  <span class="route-path">/ai-bingo-card-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/baby-prediction-bingo" data-route data-route-search="baby prediction bingo /baby-prediction-bingo seo landing pages ">
                  <span>Baby prediction bingo</span>
                  <span class="route-path">/baby-prediction-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/baby-shower-bingo" data-route data-route-search="baby shower bingo /baby-shower-bingo seo landing pages ">
                  <span>Baby shower bingo</span>
                  <span class="route-path">/baby-shower-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/baby-shower-gift-bingo" data-route data-route-search="baby shower gift bingo /baby-shower-gift-bingo seo landing pages ">
                  <span>Baby shower gift bingo</span>
                  <span class="route-path">/baby-shower-gift-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/back-to-school-bingo" data-route data-route-search="back-to-school bingo /back-to-school-bingo seo landing pages ">
                  <span>Back-to-school bingo</span>
                  <span class="route-path">/back-to-school-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/bingo-board-generator" data-route data-route-search="bingo board generator /bingo-board-generator seo landing pages ">
                  <span>Bingo board generator</span>
                  <span class="route-path">/bingo-board-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/birthday-bingo" data-route data-route-search="birthday bingo /birthday-bingo seo landing pages ">
                  <span>Birthday bingo</span>
                  <span class="route-path">/birthday-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/bridal-shower-bingo" data-route data-route-search="bridal shower bingo /bridal-shower-bingo seo landing pages ">
                  <span>Bridal shower bingo</span>
                  <span class="route-path">/bridal-shower-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/bridal-shower-gift-bingo" data-route data-route-search="bridal shower gift bingo /bridal-shower-gift-bingo seo landing pages ">
                  <span>Bridal shower gift bingo</span>
                  <span class="route-path">/bridal-shower-gift-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/christmas-party-bingo" data-route data-route-search="christmas party bingo /christmas-party-bingo seo landing pages ">
                  <span>Christmas party bingo</span>
                  <span class="route-path">/christmas-party-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/church-bingo" data-route data-route-search="church bingo /church-bingo seo landing pages ">
                  <span>Church bingo</span>
                  <span class="route-path">/church-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/classroom-bingo" data-route data-route-search="classroom bingo /classroom-bingo seo landing pages ">
                  <span>Classroom bingo</span>
                  <span class="route-path">/classroom-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/conference-bingo" data-route data-route-search="conference bingo /conference-bingo seo landing pages ">
                  <span>Conference bingo</span>
                  <span class="route-path">/conference-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/custom-bingo-card-maker" data-route data-route-search="custom bingo card maker /custom-bingo-card-maker seo landing pages ">
                  <span>Custom bingo card maker</span>
                  <span class="route-path">/custom-bingo-card-maker</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/end-of-year-bingo" data-route data-route-search="end-of-year bingo /end-of-year-bingo seo landing pages ">
                  <span>End-of-year bingo</span>
                  <span class="route-path">/end-of-year-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/esl-bingo-generator" data-route data-route-search="esl bingo generator /esl-bingo-generator seo landing pages ">
                  <span>ESL bingo generator</span>
                  <span class="route-path">/esl-bingo-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/family-reunion-bingo" data-route data-route-search="family reunion bingo /family-reunion-bingo seo landing pages ">
                  <span>Family reunion bingo</span>
                  <span class="route-path">/family-reunion-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/fundraiser-bingo" data-route data-route-search="fundraiser bingo /fundraiser-bingo seo landing pages ">
                  <span>Fundraiser bingo</span>
                  <span class="route-path">/fundraiser-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/graduation-bingo" data-route data-route-search="graduation bingo /graduation-bingo seo landing pages ">
                  <span>Graduation bingo</span>
                  <span class="route-path">/graduation-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/halloween-bingo" data-route data-route-search="halloween bingo /halloween-bingo seo landing pages ">
                  <span>Halloween bingo</span>
                  <span class="route-path">/halloween-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/holiday-bingo" data-route data-route-search="holiday bingo /holiday-bingo seo landing pages ">
                  <span>Holiday bingo</span>
                  <span class="route-path">/holiday-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/icebreaker-bingo" data-route data-route-search="icebreaker bingo /icebreaker-bingo seo landing pages ">
                  <span>Icebreaker bingo</span>
                  <span class="route-path">/icebreaker-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/image-bingo-card-generator" data-route data-route-search="image bingo card generator /image-bingo-card-generator seo landing pages ">
                  <span>Image bingo card generator</span>
                  <span class="route-path">/image-bingo-card-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/math-bingo-generator" data-route data-route-search="math bingo generator /math-bingo-generator seo landing pages ">
                  <span>Math bingo generator</span>
                  <span class="route-path">/math-bingo-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/movie-bingo" data-route data-route-search="movie bingo /movie-bingo seo landing pages ">
                  <span>Movie bingo</span>
                  <span class="route-path">/movie-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/multiplication-bingo-cards" data-route data-route-search="multiplication bingo cards /multiplication-bingo-cards seo landing pages ">
                  <span>Multiplication bingo cards</span>
                  <span class="route-path">/multiplication-bingo-cards</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/music-bingo" data-route data-route-search="music bingo /music-bingo seo landing pages ">
                  <span>Music bingo</span>
                  <span class="route-path">/music-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/number-bingo-card-generator" data-route data-route-search="number bingo card generator /number-bingo-card-generator seo landing pages ">
                  <span>Number bingo card generator</span>
                  <span class="route-path">/number-bingo-card-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/office-meeting-bingo" data-route data-route-search="office meeting bingo /office-meeting-bingo seo landing pages ">
                  <span>Office meeting bingo</span>
                  <span class="route-path">/office-meeting-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/office-party-bingo" data-route data-route-search="office party bingo /office-party-bingo seo landing pages ">
                  <span>Office party bingo</span>
                  <span class="route-path">/office-party-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/onboarding-bingo" data-route data-route-search="onboarding bingo /onboarding-bingo seo landing pages ">
                  <span>Onboarding bingo</span>
                  <span class="route-path">/onboarding-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/online-bingo-card-generator" data-route data-route-search="online bingo card generator /online-bingo-card-generator seo landing pages ">
                  <span>Online bingo card generator</span>
                  <span class="route-path">/online-bingo-card-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/party-bingo" data-route data-route-search="party bingo /party-bingo seo landing pages ">
                  <span>Party bingo</span>
                  <span class="route-path">/party-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/periodic-table-bingo" data-route data-route-search="periodic table bingo /periodic-table-bingo seo landing pages ">
                  <span>Periodic table bingo</span>
                  <span class="route-path">/periodic-table-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/printable-bingo-cards" data-route data-route-search="printable bingo cards /printable-bingo-cards seo landing pages ">
                  <span>Printable bingo cards</span>
                  <span class="route-path">/printable-bingo-cards</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/remote-meeting-bingo" data-route data-route-search="remote meeting bingo /remote-meeting-bingo seo landing pages ">
                  <span>Remote meeting bingo</span>
                  <span class="route-path">/remote-meeting-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/sight-word-bingo-generator" data-route data-route-search="sight-word bingo generator /sight-word-bingo-generator seo landing pages ">
                  <span>Sight-word bingo generator</span>
                  <span class="route-path">/sight-word-bingo-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/state-capitals-bingo" data-route data-route-search="state capitals bingo /state-capitals-bingo seo landing pages ">
                  <span>State capitals bingo</span>
                  <span class="route-path">/state-capitals-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/super-bowl-bingo" data-route data-route-search="super bowl bingo /super-bowl-bingo seo landing pages ">
                  <span>Super Bowl bingo</span>
                  <span class="route-path">/super-bowl-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/team-building-bingo" data-route data-route-search="team-building bingo /team-building-bingo seo landing pages ">
                  <span>Team-building bingo</span>
                  <span class="route-path">/team-building-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/thanksgiving-bingo" data-route data-route-search="thanksgiving bingo /thanksgiving-bingo seo landing pages ">
                  <span>Thanksgiving bingo</span>
                  <span class="route-path">/thanksgiving-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/training-bingo" data-route data-route-search="training bingo /training-bingo seo landing pages ">
                  <span>Training bingo</span>
                  <span class="route-path">/training-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/trivia-bingo" data-route data-route-search="trivia bingo /trivia-bingo seo landing pages ">
                  <span>Trivia bingo</span>
                  <span class="route-path">/trivia-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/vocabulary-bingo-generator" data-route data-route-search="vocabulary bingo generator /vocabulary-bingo-generator seo landing pages ">
                  <span>Vocabulary bingo generator</span>
                  <span class="route-path">/vocabulary-bingo-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/wedding-bingo" data-route data-route-search="wedding bingo /wedding-bingo seo landing pages ">
                  <span>Wedding bingo</span>
                  <span class="route-path">/wedding-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/wedding-reception-bingo" data-route data-route-search="wedding reception bingo /wedding-reception-bingo seo landing pages ">
                  <span>Wedding reception bingo</span>
                  <span class="route-path">/wedding-reception-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/word-bingo-generator" data-route data-route-search="word bingo generator /word-bingo-generator seo landing pages ">
                  <span>Word bingo generator</span>
                  <span class="route-path">/word-bingo-generator</span>
                </a>
                
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>Blog · 8</h3>
          
              <div class="route-entry">
                <a href="/blog" data-route data-route-search="bingo ideas, tips &amp; guides /blog blog ">
                  <span>Bingo ideas, tips &amp; guides</span>
                  <span class="route-path">/blog</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/blog/best-bingo-card-generator" data-route data-route-search="how to choose the best bingo card generator /blog/best-bingo-card-generator blog ">
                  <span>How to choose the best bingo card generator</span>
                  <span class="route-path">/blog/best-bingo-card-generator</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/blog/best-bingo-games-baby-showers" data-route data-route-search="the 7 best bingo games for baby showers /blog/best-bingo-games-baby-showers blog ">
                  <span>The 7 best bingo games for baby showers</span>
                  <span class="route-path">/blog/best-bingo-games-baby-showers</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/blog/fun-classroom-bingo-ideas" data-route data-route-search="15 fun classroom bingo ideas /blog/fun-classroom-bingo-ideas blog ">
                  <span>15 fun classroom bingo ideas</span>
                  <span class="route-path">/blog/fun-classroom-bingo-ideas</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/blog/holiday-bingo-ideas" data-route data-route-search="20+ holiday bingo ideas /blog/holiday-bingo-ideas blog ">
                  <span>20+ holiday bingo ideas</span>
                  <span class="route-path">/blog/holiday-bingo-ideas</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/blog/how-to-make-custom-bingo-cards" data-route data-route-search="how to make custom bingo cards /blog/how-to-make-custom-bingo-cards blog ">
                  <span>How to make custom bingo cards</span>
                  <span class="route-path">/blog/how-to-make-custom-bingo-cards</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/blog/party-bingo-tips" data-route data-route-search="how to run the perfect party bingo game /blog/party-bingo-tips blog ">
                  <span>How to run the perfect party bingo game</span>
                  <span class="route-path">/blog/party-bingo-tips</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/blog/wedding-bingo-guide" data-route data-route-search="the ultimate wedding bingo guide /blog/wedding-bingo-guide blog ">
                  <span>The ultimate wedding bingo guide</span>
                  <span class="route-path">/blog/wedding-bingo-guide</span>
                </a>
                
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>Auth &amp; account entry · 9</h3>
          
              <div class="route-entry">
                <a href="/activate" data-route data-route-search="activate account /activate auth &amp; account entry choose a plan activation choices after completing account setup. plan activated successful activation with a dashboard handoff. activation canceled a safe return path after leaving checkout.">
                  <span>Activate account</span>
                  <span class="route-path">/activate · 3 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/activate?state=choice" data-route class="">Choose a plan</a><a href="/activate?state=success" data-route class="">Plan activated</a><a href="/activate?state=canceled" data-route class="">Activation canceled</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/auth-error" data-route data-route-search="sign-in help /auth-error auth &amp; account entry unknown sign-in error the fallback sign-in error with a safe return. verification link used a magic-link verification error with a fresh-link recovery. account not linked an existing account that requires its original sign-in method. configuration error a temporary sign-in configuration failure. google sign-in failed a provider connection failure with a sign-in retry.">
                  <span>Sign-in help</span>
                  <span class="route-path">/auth-error · 5 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/auth-error?state=default" data-route class="">Unknown sign-in error</a><a href="/auth-error?state=verification" data-route class="">Verification link used</a><a href="/auth-error?state=account-not-linked" data-route class="">Account not linked</a><a href="/auth-error?state=configuration" data-route class="">Configuration error</a><a href="/auth-error?state=oauth-signin" data-route class="">Google sign-in failed</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/forgot-password" data-route data-route-search="forgot password /forgot-password auth &amp; account entry reset request the email form for requesting a password reset. sending request the disabled submitting state while the request is processed. reset email requested privacy-preserving confirmation after a reset request. request rejected a server response that could not start the reset email. network unavailable a connection failure with a retry path.">
                  <span>Forgot password</span>
                  <span class="route-path">/forgot-password · 5 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/forgot-password?state=form" data-route class="">Reset request</a><a href="/forgot-password?state=submitting" data-route class="">Sending request</a><a href="/forgot-password?state=success" data-route class="">Reset email requested</a><a href="/forgot-password?state=server-error" data-route class="">Request rejected</a><a href="/forgot-password?state=network-error" data-route class="">Network unavailable</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/login" data-route data-route-search="sign in /login auth &amp; account entry password sign in the standard email-and-password form. magic link a passwordless email-link request form. magic link sent confirmation and resend guidance after requesting a link. email verified a successful verification message before sign in. invalid credentials an inline credential error that preserves the entered email. email unverified a sign-in block with a verification resend action.">
                  <span>Sign in</span>
                  <span class="route-path">/login · 6 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/login?state=password" data-route class="">Password sign in</a><a href="/login?state=magic" data-route class="">Magic link</a><a href="/login?state=magic-sent" data-route class="">Magic link sent</a><a href="/login?state=verified" data-route class="">Email verified</a><a href="/login?state=invalid" data-route class="">Invalid credentials</a><a href="/login?state=unverified" data-route class="">Email unverified</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/magic-link" data-route data-route-search="check your email /magic-link auth &amp; account entry signing in the progress state while a magic link is checked. invalid link an expired or already-used magic-link recovery screen.">
                  <span>Check your email</span>
                  <span class="route-path">/magic-link · 2 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/magic-link?state=loading" data-route class="">Signing in</a><a href="/magic-link?state=invalid" data-route class="">Invalid link</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/reset-password" data-route data-route-search="reset password /reset-password auth &amp; account entry choose password a valid reset form with password requirements. password updated completion with a return-to-sign-in action. invalid link an expired reset-link recovery screen.">
                  <span>Reset password</span>
                  <span class="route-path">/reset-password · 3 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/reset-password?state=form" data-route class="">Choose password</a><a href="/reset-password?state=success" data-route class="">Password updated</a><a href="/reset-password?state=invalid" data-route class="">Invalid link</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/signup" data-route data-route-search="create an account /signup auth &amp; account entry create account the standard account-registration form. account created confirmation with the next email-verification step.">
                  <span>Create an account</span>
                  <span class="route-path">/signup · 2 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/signup?state=form" data-route class="">Create account</a><a href="/signup?state=created" data-route class="">Account created</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/verify-email" data-route data-route-search="verify email /verify-email auth &amp; account entry check your inbox verification instructions and resend guidance. verification resent confirmation that a fresh verification email was requested. invalid token a used or invalid verification link. expired token an expired verification link with resend guidance. server error a verification service failure with a signup recovery. resend failed a failed resend request with another local attempt.">
                  <span>Verify email</span>
                  <span class="route-path">/verify-email · 6 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/verify-email?state=waiting" data-route class="">Check your inbox</a><a href="/verify-email?state=resent" data-route class="">Verification resent</a><a href="/verify-email?state=invalid-token" data-route class="">Invalid token</a><a href="/verify-email?state=expired-token" data-route class="">Expired token</a><a href="/verify-email?state=server-error" data-route class="">Server error</a><a href="/verify-email?state=resend-error" data-route class="">Resend failed</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/welcome" data-route data-route-search="welcome to mybingocard /welcome auth &amp; account entry create your first card a first-run welcome screen focused on making a card.">
                  <span>Welcome to MyBingoCard</span>
                  <span class="route-path">/welcome</span>
                </a>
                
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>Authenticated SaaS · 7</h3>
          
              <div class="route-entry">
                <a href="/cards/demo-card" data-route data-route-search="card workspace /cards/demo-card authenticated saas card workspace the saved-card workspace with play, share, and export tabs. select a batch batch-size and variation choices before purchase. batch checkout a local checkout preview with the selected batch summary. batch ready completed batch files with download and print actions. invite players sharing controls for sending a playable card link. loading card the saved-card loading state. card load failed a saved-card fetch failure with a return to the library. autosave failed an edit-save failure that preserves the visible card. checkout canceled a safe return from batch checkout with no charge. checkout unavailable a recoverable batch-checkout start failure. export failed a pdf or png generation failure with another format available. player link failed a player-link creation failure with sharing guidance.">
                  <span>Card workspace</span>
                  <span class="route-path">/cards/[id] · 12 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/cards/demo-card?state=play" data-route class="">Card workspace</a><a href="/cards/demo-card?state=batch-select" data-route class="">Select a batch</a><a href="/cards/demo-card?state=checkout" data-route class="">Batch checkout</a><a href="/cards/demo-card?state=batch-result" data-route class="">Batch ready</a><a href="/cards/demo-card?state=invite" data-route class="">Invite players</a><a href="/cards/demo-card?state=loading" data-route class="">Loading card</a><a href="/cards/demo-card?state=load-error" data-route class="">Card load failed</a><a href="/cards/demo-card?state=autosave-error" data-route class="">Autosave failed</a><a href="/cards/demo-card?state=checkout-canceled" data-route class="">Checkout canceled</a><a href="/cards/demo-card?state=checkout-error" data-route class="">Checkout unavailable</a><a href="/cards/demo-card?state=export-error" data-route class="">Export failed</a><a href="/cards/demo-card?state=link-error" data-route class="">Player link failed</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/create" data-route data-route-search="create a bingo card /create authenticated saas standard words a default word-based 5 by 5 card. 75-ball numbers a classic b-i-n-g-o card using numbers 1 through 75. 90-ball numbers a 90-ball ticket layout with number ranges. ai ideas prompt-based square suggestions before applying them to the card. image squares an image-first card with upload and alt-text controls. style editor colors, type, borders, and background customization. guest save the sign-in handoff shown when a guest saves a card. free limit the free-plan limit message with clear upgrade choices. batch setup controls for producing multiple randomized card versions. batch result a completed batch with download and sharing actions. saved card load failed a saved-card load failure with a safe return to a blank creator. autosave failed a draft-preserving autosave failure with retry guidance.">
                  <span>Create a bingo card</span>
                  <span class="route-path">/create · 12 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/create?state=standard" data-route class="">Standard words</a><a href="/create?state=numbers75" data-route class="">75-ball numbers</a><a href="/create?state=numbers90" data-route class="">90-ball numbers</a><a href="/create?state=ai" data-route class="">AI ideas</a><a href="/create?state=images" data-route class="">Image squares</a><a href="/create?state=style" data-route class="">Style editor</a><a href="/create?state=guest-save" data-route class="">Guest save</a><a href="/create?state=limit" data-route class="">Free limit</a><a href="/create?state=batch" data-route class="">Batch setup</a><a href="/create?state=batch-result" data-route class="">Batch result</a><a href="/create?state=load-error" data-route class="">Saved card load failed</a><a href="/create?state=autosave-error" data-route class="">Autosave failed</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/dashboard" data-route data-route-search="dashboard /dashboard authenticated saas returning creator recent cards, activity, and quick actions. first dashboard a guided empty dashboard for a new account.">
                  <span>Dashboard</span>
                  <span class="route-path">/dashboard · 2 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/dashboard?state=populated" data-route class="">Returning creator</a><a href="/dashboard?state=first-user" data-route class="">First dashboard</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/dashboard/cards" data-route data-route-search="my cards /dashboard/cards authenticated saas saved cards a searchable list of saved cards. no saved cards an empty state leading directly to the creator. batch mode multi-select controls for card organization. cards selected bulk actions for the current card selection. confirm deletion a destructive-action confirmation for selected cards.">
                  <span>My cards</span>
                  <span class="route-path">/dashboard/cards · 5 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/dashboard/cards?state=populated" data-route class="">Saved cards</a><a href="/dashboard/cards?state=empty" data-route class="">No saved cards</a><a href="/dashboard/cards?state=batch" data-route class="">Batch mode</a><a href="/dashboard/cards?state=selected" data-route class="">Cards selected</a><a href="/dashboard/cards?state=delete" data-route class="">Confirm deletion</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/dashboard/referrals" data-route data-route-search="referrals /dashboard/referrals authenticated saas referral history a referral link, summary metrics, and referral-status history. loading referrals the referral dashboard while account data is loading. no referrals a ready referral link with no referral history yet. could not load referrals a recoverable referral-dashboard error.">
                  <span>Referrals</span>
                  <span class="route-path">/dashboard/referrals · 4 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/dashboard/referrals?state=populated" data-route class="">Referral history</a><a href="/dashboard/referrals?state=loading" data-route class="">Loading referrals</a><a href="/dashboard/referrals?state=empty" data-route class="">No referrals</a><a href="/dashboard/referrals?state=error" data-route class="">Could not load referrals</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/dashboard/share-links" data-route data-route-search="share links /dashboard/share-links authenticated saas active links a list of created share links and recent activity. link history claimed, pending, expired, and refunded player-link records. no links yet an empty state that explains how to create the first link.">
                  <span>Share links</span>
                  <span class="route-path">/dashboard/share-links · 3 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/dashboard/share-links?state=populated" data-route class="">Active links</a><a href="/dashboard/share-links?state=history" data-route class="">Link history</a><a href="/dashboard/share-links?state=empty" data-route class="">No links yet</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/settings" data-route data-route-search="account settings /settings authenticated saas free account profile, security, and upgrade controls for a free plan. premium account active premium-plan details and billing controls. cancellation pending the plan end date and option to keep premium. change password the authenticated password-update workflow. delete account a high-friction account-deletion confirmation.">
                  <span>Account settings</span>
                  <span class="route-path">/settings · 5 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/settings?state=free" data-route class="">Free account</a><a href="/settings?state=premium" data-route class="">Premium account</a><a href="/settings?state=canceling" data-route class="">Cancellation pending</a><a href="/settings?state=password" data-route class="">Change password</a><a href="/settings?state=delete" data-route class="">Delete account</a></div></details>
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>Play, share &amp; game · 7</h3>
          
              <div class="route-entry">
                <a href="/game" data-route data-route-search="live bingo /game play, share &amp; game ">
                  <span>Live bingo</span>
                  <span class="route-path">/game</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/game/host/DEMO42" data-route data-route-search="host live bingo /game/host/demo42 play, share &amp; game waiting room host controls and the player list before starting. game in progress live call controls, player status, and recent events. game finished winner details and options to play again or close.">
                  <span>Host live bingo</span>
                  <span class="route-path">/game/host/[roomCode] · 3 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/game/host/DEMO42?state=waiting" data-route class="">Waiting room</a><a href="/game/host/DEMO42?state=active" data-route class="">Game in progress</a><a href="/game/host/DEMO42?state=finished" data-route class="">Game finished</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/game/join" data-route data-route-search="join a live game /game/join play, share &amp; game join a game the game-code and player-name entry form. room found a valid room preview before joining. joining room the disabled submitting state while joining. game ended a clear response when the entered game is already finished. session expired an expired player session that must join again. storage blocked a browser-storage failure that prevents temporary game access. network error a failed join request with a retry path.">
                  <span>Join a live game</span>
                  <span class="route-path">/game/join · 7 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/game/join?state=form" data-route class="">Join a game</a><a href="/game/join?state=room-found" data-route class="">Room found</a><a href="/game/join?state=joining" data-route class="">Joining room</a><a href="/game/join?state=ended" data-route class="">Game ended</a><a href="/game/join?state=session-expired" data-route class="">Session expired</a><a href="/game/join?state=storage-blocked" data-route class="">Storage blocked</a><a href="/game/join?state=network-error" data-route class="">Network error</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/game/join-sheet/DEMO42" data-route data-route-search="print the join sheet /game/join-sheet/demo42 play, share &amp; game ">
                  <span>Print the join sheet</span>
                  <span class="route-path">/game/join-sheet/[roomCode]</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/game/play/DEMO42" data-route data-route-search="play live bingo /game/play/demo42 play, share &amp; game waiting for host the joined-player state before the host starts. playing an active player card with live game status. you called bingo the player&#039;s pending or confirmed bingo claim. another player won the finished state when someone else wins. game unavailable an ended, invalid, or expired game-code screen.">
                  <span>Play live bingo</span>
                  <span class="route-path">/game/play/[roomCode] · 5 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/game/play/DEMO42?state=waiting" data-route class="">Waiting for host</a><a href="/game/play/DEMO42?state=active" data-route class="">Playing</a><a href="/game/play/DEMO42?state=bingo" data-route class="">You called bingo</a><a href="/game/play/DEMO42?state=other-winner" data-route class="">Another player won</a><a href="/game/play/DEMO42?state=expired" data-route class="">Game unavailable</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/play/demo-link" data-route data-route-search="play shared bingo /play/demo-link play, share &amp; game loading player card the player link while its status and card are checked. claim a card a player-name prompt before receiving a card. claiming card a card claim in progress. claim failed a failed guest or signed-in claim with another attempt. owner view the card owner&#039;s management view of the shared link. already claimed a claimed or exhausted player link that cannot be reused. link expired an expired player link. link revoked a player link disabled by its owner. playable card an active shared card ready for marking squares. bingo claimed the winning state after a player calls bingo.">
                  <span>Play shared bingo</span>
                  <span class="route-path">/play/[linkId] · 10 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/play/demo-link?state=loading" data-route class="">Loading player card</a><a href="/play/demo-link?state=unclaimed" data-route class="">Claim a card</a><a href="/play/demo-link?state=claiming" data-route class="">Claiming card</a><a href="/play/demo-link?state=claim-error" data-route class="">Claim failed</a><a href="/play/demo-link?state=owner" data-route class="">Owner view</a><a href="/play/demo-link?state=claimed-unavailable" data-route class="">Already claimed</a><a href="/play/demo-link?state=expired" data-route class="">Link expired</a><a href="/play/demo-link?state=revoked" data-route class="">Link revoked</a><a href="/play/demo-link?state=playable" data-route class="">Playable card</a><a href="/play/demo-link?state=bingo" data-route class="">Bingo claimed</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/share/demo-share" data-route data-route-search="shared bingo card /share/demo-share play, share &amp; game loading shared card the share link while its card is checked. password required a protected share link requesting its password. incorrect password an inline password error with another attempt. link expired an expired-share explanation and owner contact guidance. card not found a missing or no-longer-shared card. playable card an unlocked shared card ready for play. bingo claimed the winning state for an unlocked shared card.">
                  <span>Shared bingo card</span>
                  <span class="route-path">/share/[shareLink] · 7 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/share/demo-share?state=loading" data-route class="">Loading shared card</a><a href="/share/demo-share?state=password" data-route class="">Password required</a><a href="/share/demo-share?state=incorrect" data-route class="">Incorrect password</a><a href="/share/demo-share?state=expired" data-route class="">Link expired</a><a href="/share/demo-share?state=not-found" data-route class="">Card not found</a><a href="/share/demo-share?state=playable" data-route class="">Playable card</a><a href="/share/demo-share?state=bingo" data-route class="">Bingo claimed</a></div></details>
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>Legal &amp; support · 6</h3>
          
              <div class="route-entry">
                <a href="/contact" data-route data-route-search="contact support /contact legal &amp; support ">
                  <span>Contact support</span>
                  <span class="route-path">/contact</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/how-to-play-bingo" data-route data-route-search="how to play bingo /how-to-play-bingo legal &amp; support ">
                  <span>How to play bingo</span>
                  <span class="route-path">/how-to-play-bingo</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/privacy" data-route data-route-search="privacy policy /privacy legal &amp; support ">
                  <span>Privacy policy</span>
                  <span class="route-path">/privacy</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/supplies" data-route data-route-search="bingo supplies /supplies legal &amp; support ">
                  <span>Bingo supplies</span>
                  <span class="route-path">/supplies</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/terms" data-route data-route-search="terms of service /terms legal &amp; support ">
                  <span>Terms of service</span>
                  <span class="route-path">/terms</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/unsubscribe" data-route data-route-search="email preferences /unsubscribe legal &amp; support email preferences the unsubscribe and email-preference form. preferences saved confirmation that the email preference was updated. could not update a recoverable error with retry and support guidance.">
                  <span>Email preferences</span>
                  <span class="route-path">/unsubscribe · 3 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/unsubscribe?state=form" data-route class="">Email preferences</a><a href="/unsubscribe?state=success" data-route class="">Preferences saved</a><a href="/unsubscribe?state=error" data-route class="">Could not update</a></div></details>
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>Admin · 8</h3>
          
              <div class="route-entry">
                <a href="/admin" data-route data-route-search="admin overview /admin admin operations overview current service, customer, commerce, and support summaries. needs attention an operations overview emphasizing unresolved work.">
                  <span>Admin overview</span>
                  <span class="route-path">/admin · 2 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/admin?state=overview" data-route class="">Operations overview</a><a href="/admin?state=attention" data-route class="">Needs attention</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/admin/cards" data-route data-route-search="admin cards /admin/cards admin card index searchable card records with owner and status context. filtered cards a public-or-private filtered view of matching cards. card preview a selected card with content, owner, and sharing context. delete confirmation a high-friction destructive confirmation for a selected card. no matches a zero-result state that preserves the active filters.">
                  <span>Admin cards</span>
                  <span class="route-path">/admin/cards · 5 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/admin/cards?state=populated" data-route class="">Card index</a><a href="/admin/cards?state=filtered" data-route class="">Filtered cards</a><a href="/admin/cards?state=preview" data-route class="">Card preview</a><a href="/admin/cards?state=delete" data-route class="">Delete confirmation</a><a href="/admin/cards?state=empty" data-route class="">No matches</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/admin/coupons" data-route data-route-search="admin coupons /admin/coupons admin coupon index active and historical coupons with redemption counts. create coupon the internal coupon-definition workflow. disabled coupons a filtered view of coupon codes that are not active. no coupons a zero-result coupon view with a direct create action.">
                  <span>Admin coupons</span>
                  <span class="route-path">/admin/coupons · 4 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/admin/coupons?state=populated" data-route class="">Coupon index</a><a href="/admin/coupons?state=create" data-route class="">Create coupon</a><a href="/admin/coupons?state=disabled" data-route class="">Disabled coupons</a><a href="/admin/coupons?state=empty" data-route class="">No coupons</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/admin/errors" data-route data-route-search="admin errors /admin/errors admin unresolved errors open and watching error groups ordered by impact and recency. watching error groups being monitored for new events. selected error a selected error group with technical, visitor, and release context. fixed errors error groups marked fixed after a verified repair. ignored errors error groups intentionally excluded from active triage. no errors a healthy zero-result state for the selected filters.">
                  <span>Admin errors</span>
                  <span class="route-path">/admin/errors · 6 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/admin/errors?state=unresolved" data-route class="">Unresolved errors</a><a href="/admin/errors?state=watching" data-route class="">Watching</a><a href="/admin/errors?state=selected" data-route class="">Selected error</a><a href="/admin/errors?state=fixed" data-route class="">Fixed errors</a><a href="/admin/errors?state=ignored" data-route class="">Ignored errors</a><a href="/admin/errors?state=empty" data-route class="">No errors</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/admin/support" data-route data-route-search="admin support /admin/support admin support queue open customer conversations ordered by urgency. conversation detail a selected support thread with account context. resolved requests recently completed support conversations. queue clear a zero-open-request support state.">
                  <span>Admin support</span>
                  <span class="route-path">/admin/support · 4 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/admin/support?state=queue" data-route class="">Support queue</a><a href="/admin/support?state=conversation" data-route class="">Conversation detail</a><a href="/admin/support?state=resolved" data-route class="">Resolved requests</a><a href="/admin/support?state=empty" data-route class="">Queue clear</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/admin/users" data-route data-route-search="admin users /admin/users admin user index searchable customer records with plan and activity context. filtered users a narrowed customer segment with active filters. no matches a zero-result state that preserves the search query.">
                  <span>Admin users</span>
                  <span class="route-path">/admin/users · 3 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/admin/users?state=populated" data-route class="">User index</a><a href="/admin/users?state=filtered" data-route class="">Filtered users</a><a href="/admin/users?state=empty" data-route class="">No matches</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/admin/users/demo-user" data-route data-route-search="admin user detail /admin/users/demo-user admin account overview identity, plan, activity, and account-health summary. customer cards the customer&#039;s saved-card history and current status. customer activity recent account and product activity. email customer an internal customer-email composer with account context. view as user a read-only preview of the administrator impersonation confirmation. cancel subscription a preview of canceling the subscription at period end.">
                  <span>Admin user detail</span>
                  <span class="route-path">/admin/users/[id] · 6 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/admin/users/demo-user?state=overview" data-route class="">Account overview</a><a href="/admin/users/demo-user?state=cards" data-route class="">Customer cards</a><a href="/admin/users/demo-user?state=activity" data-route class="">Customer activity</a><a href="/admin/users/demo-user?state=email" data-route class="">Email customer</a><a href="/admin/users/demo-user?state=impersonate" data-route class="">View as user</a><a href="/admin/users/demo-user?state=cancel-subscription" data-route class="">Cancel subscription</a></div></details>
              </div>
            
              <div class="route-entry">
                <a href="/admin/visitors" data-route data-route-search="admin visitors /admin/visitors admin visitor overview acquisition and activity summaries with source context. identity filtered one visitor identity isolated across sessions and recent events. no live visitors an empty active-now section with recent visitor history preserved. no visitor history an empty 24-hour history with the live visitor section preserved. refresh failed a recoverable refresh error with the last successful snapshot still visible.">
                  <span>Admin visitors</span>
                  <span class="route-path">/admin/visitors · 5 states</span>
                </a>
                <details class="route-state-list"><summary>Open a workflow state</summary><div><a href="/admin/visitors?state=overview" data-route class="">Visitor overview</a><a href="/admin/visitors?state=identity-filtered" data-route class="">Identity filtered</a><a href="/admin/visitors?state=live-empty" data-route class="">No live visitors</a><a href="/admin/visitors?state=history-empty" data-route class="">No visitor history</a><a href="/admin/visitors?state=refresh-error" data-route class="">Refresh failed</a></div></details>
              </div>
            
        </section>
      
        <section class="route-group" data-route-group>
          <h3>System states · 8</h3>
          
              <div class="route-entry">
                <a href="/preview/not-found" data-route data-route-search="page not found /preview/not-found system states ">
                  <span>Page not found</span>
                  <span class="route-path">not-found.tsx</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/preview/error" data-route data-route-search="something went wrong /preview/error system states ">
                  <span>Something went wrong</span>
                  <span class="route-path">error.tsx</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/unsupported-browser" data-route data-route-search="browser not supported /unsupported-browser system states ">
                  <span>Browser not supported</span>
                  <span class="route-path">unsupported-browser.html</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/preview/create-loading" data-route data-route-search="loading the card creator /preview/create-loading system states ">
                  <span>Loading the card creator</span>
                  <span class="route-path">/create/loading.tsx</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/preview/play-loading" data-route data-route-search="loading your bingo card /preview/play-loading system states " aria-current="page">
                  <span>Loading your bingo card</span>
                  <span class="route-path">/play/[linkId]/loading.tsx</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/b/DEMO" data-route data-route-search="short card link /b/demo system states ">
                  <span>Short card link</span>
                  <span class="route-path">/b/[code]</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/r/FRIEND" data-route data-route-search="referral link /r/friend system states ">
                  <span>Referral link</span>
                  <span class="route-path">/r/[code]</span>
                </a>
                
              </div>
            
              <div class="route-entry">
                <a href="/auth-new-user" data-route data-route-search="new-user handoff /auth-new-user system states ">
                  <span>New-user handoff</span>
                  <span class="route-path">/auth-new-user</span>
                </a>
                
              </div>
            
        </section>
      </div>
      </dialog>
    
      <dialog class="modal" id="checkout-dialog" aria-labelledby="checkout-title">
        <form method="dialog" class="modal-card">
          <div class="modal-head">
            <div class="stack-tight">
              <span class="pill pill-local">Local checkout preview</span>
              <h2 id="checkout-title">Choose how you want to keep playing</h2>
            </div>
            <button class="button button-icon" value="cancel" aria-label="Close checkout preview"><svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
          </div>
          <div class="pricing-grid">
            
      <article class="card pricing-card">
        
        <h3>Free</h3>
        <p class="price">\$0</p>
        <p class="muted">Make and print individual cards</p>
        <ul class="check-list"><li>Unlimited local drafts</li><li>PDF and PNG preview</li><li>Solo play</li></ul>
        <button class="button " value="cancel">Close Free preview</button>
      </article>
    
            
      <article class="card pricing-card is-featured">
        <span class="pill pill-purple">Most flexible</span>
        <h3>Premium</h3>
        <p class="price">\$7.99<small> / month</small></p>
        <p class="muted">For regular events and sharing</p>
        <ul class="check-list"><li>Saved library</li><li>Hosted online games</li><li>Premium themes</li></ul>
        <button class="button button-primary" value="cancel">Close Premium preview</button>
      </article>
    
            
      <article class="card pricing-card">
        
        <h3>Lifetime</h3>
        <p class="price">\$29.99</p>
        <p class="muted">One payment for permanent access</p>
        <ul class="check-list"><li>Everything in Premium</li><li>No monthly renewal</li><li>Future feature access</li></ul>
        <button class="button " value="cancel">Close Lifetime preview</button>
      </article>
    
          </div>
          <div class="notice">
            <span class="notice-icon" aria-hidden="true">🔒</span>
            <div>
              <strong>No payment can be made here.</strong>
              <p class="caption">This is a visual design state. Stripe and all production app connections are blocked.</p>
            </div>
          </div>
          <div class="button-row">
            <button class="button button-primary" value="cancel">Return to prototype</button>
          </div>
        </form>
      </dialog>
    `
      }} />
    </PlayfulShell>
  );
}
