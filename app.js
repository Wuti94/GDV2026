(() => {
  const byId = (id) => document.getElementById(id);

  const secureBadge = byId("secure");
  const nfcBadge = byId("nfc");
  const logEl = byId("log");

  const btnScan = byId("btnScan");
  const btnStop = byId("btnStop");
  const btnClear = byId("btnClear");
  const lastTextEl = byId("lastText");

  let reader = null;
  let abortController = null;

  function setBadge(el, state, text) {
    el.textContent = text;
    el.className = "badge " + (state === "ok" ? "ok" : state === "warn" ? "warn" : "bad");
  }

  function log(...args) {
    const line = args.map(a => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === "string") return a;
      try { return JSON.stringify(a, null, 2); } catch { return String(a); }
    }).join(" ");
    logEl.textContent += line + "\n";
    logEl.scrollTop = logEl.scrollHeight;
  }

  function setLastText(t) {
    lastTextEl.value = t || "";
    try { localStorage.setItem("lastNfcText", t || ""); } catch {}
  }

  // Init UI state
  setBadge(secureBadge, window.isSecureContext ? "ok" : "bad", window.isSecureContext ? "JA" : "NEIN");

  const hasNFC = ("NDEFReader" in window);
  setBadge(nfcBadge, hasNFC ? "ok" : "bad", hasNFC ? "JA" : "NEIN");

  // Restore last text
  try {
    const t = localStorage.getItem("lastNfcText") || "";
    if (t) lastTextEl.value = t;
  } catch {}

  btnClear.addEventListener("click", () => {
    logEl.textContent = "";
  });

  btnScan.disabled = !(window.isSecureContext && hasNFC);

  if (!window.isSecureContext) log("❌ Kein secure context. Muss über HTTPS laufen.");
  if (!hasNFC) log("❌ WebNFC (NDEFReader) nicht verfügbar: Browser/OS/Policy.");

  async function startScan() {
    btnScan.disabled = true;
    btnStop.disabled = false;

    try {
      reader = new NDEFReader();
      abortController = new AbortController();

      reader.addEventListener("readingerror", () => {
        log("⚠️ readingerror: Tag erkannt, aber Inhalt konnte nicht gelesen werden.");
      });

      reader.addEventListener("reading", (event) => {
        log("✅ Tag gelesen");
        log("serialNumber:", event.serialNumber);

        const records = event.message?.records || [];
        log("records:", records.length);

        for (const [i, rec] of records.entries()) {
          log(`--- Record #${i} ---`);
          log("recordType:", rec.recordType);
          log("mediaType:", rec.mediaType);
          log("id:", rec.id);

          if (rec.recordType === "text") {
            const text = new TextDecoder(rec.encoding || "utf-8").decode(rec.data);
            log("text:", text);
            setLastText(text);
          } else if (rec.recordType === "url") {
            const url = new TextDecoder("utf-8").decode(rec.data);
            log("url:", url);
            setLastText(url);
          } else {
            log("data: (nicht automatisch dekodiert)");
          }
        }
      });

      log("Starte NFC Scan… halte ein NFC-Tag ans Gerät.");
      await reader.scan({ signal: abortController.signal });
      log("Scan aktiv.");
    } catch (err) {
      log("❌ Fehler beim Starten des Scans:", err);

      // Typische Ursachen
      if (err?.name === "NotAllowedError") {
        log("Hinweis: NotAllowedError. Oft durch fehlende Nutzeraktion, Policy/MDM oder weil nicht top-level.");
      } else if (err?.name === "NotSupportedError") {
        log("Hinweis: NotSupportedError. WebNFC wird nicht unterstützt.");
      } else if (String(err?.message || "").includes("top-level")) {
        log("Hinweis: Muss in einem top-level Tab laufen (nicht eingebettet/iframe).");
      }

      btnScan.disabled = !(window.isSecureContext && hasNFC);
      btnStop.disabled = true;
      reader = null;
      abortController = null;
    }
  }

  function stopScan() {
    try { abortController?.abort(); } catch {}
    abortController = null;
    reader = null;
    btnScan.disabled = !(window.isSecureContext && hasNFC);
    btnStop.disabled = true;
    log("Scan gestoppt.");
  }

  btnScan.addEventListener("click", startScan);
  btnStop.addEventListener("click", stopScan);
})();
