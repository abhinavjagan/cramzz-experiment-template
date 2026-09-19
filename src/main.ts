import manifestJson from "../experiment.json";
import { track, useDomEventSink } from "./analytics";
import { parseManifest } from "./manifest";
import "./style.css";

const manifest = parseManifest(manifestJson);
useDomEventSink();

const root = document.querySelector<HTMLElement>("#experiment");
if (!root) throw new Error("Experiment root is missing");

root.innerHTML = `
  <article class="experiment-shell" aria-labelledby="experiment-title">
    <p class="eyebrow">Cramzz Lab · ${manifest.status}</p>
    <h1 id="experiment-title">${manifest.title}</h1>
    <p class="lede">Replace this starter with one focused interaction that takes under a minute.</p>
    <button class="primary" type="button" data-start>Start the experiment</button>
    <output class="result" aria-live="polite" hidden></output>
    <footer>
      <a href="https://cramzz.space/privacy">Privacy</a>
      <span aria-hidden="true">·</span>
      <a href="https://cramzz.space/sponsor-policy">Sponsor policy</a>
    </footer>
  </article>
`;

track("experiment_view", { experiment_id: manifest.analyticsIdentifier });

const startButton = root.querySelector<HTMLButtonElement>("[data-start]");
const output = root.querySelector<HTMLOutputElement>(".result");

startButton?.addEventListener("click", () => {
  track("game_start", { experiment_id: manifest.analyticsIdentifier });
  if (output) {
    output.hidden = false;
    output.textContent = "Starter interaction complete. Now make it memorable.";
    output.focus();
  }
});

