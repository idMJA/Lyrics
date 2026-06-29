import { lyricsClient } from "./src/index.js";

console.log("--- Testing client.getSynced(...) with ISRC ---");
const result1 = await lyricsClient.getSynced("JPU902501968");
console.log(result1.lyrics?.split("\n").slice(0, 3).join("\n"));

console.log("\n--- Testing client.searchSynced(...) with Query ---");
const result2 = await lyricsClient.searchSynced("Snow Drop Conton Candy");
console.log(result2.lyrics?.split("\n").slice(0, 3).join("\n"));
