(() => {
  "use strict";

  const PLACEHOLDER = "./assets/images/placeholder.svg";
  const countryFlags = { NL: "🇳🇱", BE: "🇧🇪", EN: "🏴", SC: "🏴", GB: "🇬🇧" };
  const dateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric" });
  const shortDateFormatter = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" });
  const state = { stays: [], filtered: [], activeStay: null, lastFocused: null, observer: null, hashTimer: null };
  const elements = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    ["statistics", "yearNavigation", "filterForm", "searchFilter", "yearFilter", "countryFilter", "typeFilter", "tagFilter", "clearFilters", "resultsStatus", "loadingState", "errorState", "retryButton", "timeline", "emptyState", "backToTop", "scrollProgress", "modalBackdrop", "stayModal", "modalClose", "modalContent"].forEach((id) => { elements[id] = document.getElementById(id); });
    elements.filterForm.addEventListener("input", applyFilters);
    elements.filterForm.addEventListener("change", applyFilters);
    elements.clearFilters.addEventListener("click", clearFilters);
    elements.retryButton.addEventListener("click", loadCampingData);
    elements.timeline.addEventListener("click", handleTimelineClick);
    elements.yearNavigation.addEventListener("click", handleYearNavigation);
    elements.modalClose.addEventListener("click", () => closeStayModal());
    elements.modalBackdrop.addEventListener("click", (event) => { if (event.target === elements.modalBackdrop) closeStayModal(); });
    elements.modalContent.addEventListener("click", handleModalClick);
    elements.backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" }));
    document.addEventListener("keydown", handleModalKeydown);
    window.addEventListener("scroll", updateScrollUi, { passive: true });
    window.addEventListener("hashchange", () => handleHashChange(true));
    loadCampingData();
  }

  async function loadCampingData() {
    setLoading(true);
    try {
      const [response, imagesResponse] = await Promise.all([
        fetch("./data/campings.json", { cache: "no-store" }),
        fetch("./data/images.json", { cache: "no-store" })
      ]);
      if (!response.ok || !imagesResponse.ok) throw new Error(`HTTP ${response.status}/${imagesResponse.status}`);
      const data = await response.json();
      const images = await imagesResponse.json();
      if (!Array.isArray(data)) throw new TypeError("De gegevens moeten een array zijn.");
      state.stays = data.map((stay) => normalizeStay({ ...stay, ...(images[stay.id] || images[stay.campingId] || {}) })).sort(compareNewest);
      renderStatistics();
      populateFilters();
      renderYearNavigation();
      applyFilters();
      setLoading(false);
      handleHashChange(false);
    } catch (error) {
      console.error("Campinggegevens laden mislukt:", error);
      setLoading(false, true);
    }
  }

  function normalizeStay(raw) {
    const stay = {
      ...raw,
      id: String(raw.id || ""), campingId: String(raw.campingId || raw.id || ""),
      name: raw.name || "Naam nog aanvullen", location: raw.location || "", region: raw.region || "",
      country: raw.country || "Land nog aanvullen", countryCode: raw.countryCode || "",
      arrivalDate: raw.arrivalDate || null, departureDate: raw.departureDate || null,
      year: Number(raw.year || (raw.arrivalDate ? raw.arrivalDate.slice(0, 4) : 0)),
      type: raw.type || "Type nog aanvullen", trip: raw.trip || "", description: raw.description || "",
      longDescription: raw.longDescription || "", highlights: Array.isArray(raw.highlights) ? raw.highlights : [],
      tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [], image: raw.image || PLACEHOLDER,
      imageAlt: raw.imageAlt || "Geen foto beschikbaar van dit verblijf", googleMapsUrl: safeExternalUrl(raw.googleMapsUrl),
      imageCredit: raw.imageCredit || "", imageSourceUrl: safeExternalUrl(raw.imageSourceUrl),
      imageLicense: raw.imageLicense || "", imageLicenseUrl: safeExternalUrl(raw.imageLicenseUrl),
      polarstepsUrl: safeExternalUrl(raw.polarstepsUrl), coordinates: raw.coordinates || {},
      confirmed: raw.confirmed !== false, needsCompletion: Boolean(raw.needsCompletion), source: raw.source || "Niet vermeld"
    };
    stay.nights = Number.isFinite(raw.nights) ? raw.nights : calculateNights(stay.arrivalDate, stay.departureDate);
    return stay;
  }

  function safeExternalUrl(value) {
    if (!value) return "";
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
  }

  function parseLocalDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return null;
    const [year, month, day] = value.split("-").map(Number);
    const result = new Date(year, month - 1, day);
    return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day ? result : null;
  }

  function calculateNights(arrival, departure) {
    const start = parseLocalDate(arrival); const end = parseLocalDate(departure);
    if (!start || !end) return null;
    const nights = Math.round((end.getTime() - start.getTime()) / 86400000);
    return nights >= 0 ? nights : null;
  }

  function compareNewest(a, b) {
    if (b.year !== a.year) return b.year - a.year;
    return String(b.arrivalDate || `${b.year}-00-00`).localeCompare(String(a.arrivalDate || `${a.year}-00-00`));
  }

  function renderStatistics() {
    const stays = state.stays;
    const campingCounts = stays.reduce((counts, stay) => counts.set(stay.campingId, (counts.get(stay.campingId) || 0) + 1), new Map());
    const mostVisitedEntry = [...campingCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const mostVisitedStay = mostVisitedEntry ? stays.find((stay) => stay.campingId === mostVisitedEntry[0]) : null;
    const stats = [
      [stays.length, "verblijven"],
      [new Set(stays.map((stay) => stay.campingId)).size, "unieke plekken"],
      [new Set(stays.map((stay) => stay.country).filter(Boolean)).size, "landen"],
      [stays.reduce((sum, stay) => sum + (stay.nights ?? 0), 0), "overnachtingen"],
      [mostVisitedStay ? mostVisitedStay.name : "–", "meest bezocht"]
    ];
    elements.statistics.innerHTML = stats.map(([value, label]) => `<div class="stat"><strong class="stat__value">${escapeHtml(value)}</strong><span class="stat__label">${escapeHtml(label)}</span></div>`).join("");
  }

  function populateFilters() {
    fillSelect(elements.yearFilter, uniqueSorted(state.stays.map((stay) => stay.year), true));
    fillSelect(elements.countryFilter, uniqueSorted(state.stays.map((stay) => stay.country)));
    fillSelect(elements.typeFilter, uniqueSorted(state.stays.map((stay) => stay.type)));
    fillSelect(elements.tagFilter, uniqueSorted(state.stays.flatMap((stay) => stay.tags)));
  }

  function uniqueSorted(values, numericDescending = false) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => numericDescending ? b - a : String(a).localeCompare(String(b), "nl", { sensitivity: "base" }));
  }

  function fillSelect(select, values) {
    const first = select.options[0];
    select.replaceChildren(first, ...values.map((value) => new Option(String(value), String(value))));
  }

  function renderYearNavigation() {
    elements.yearNavigation.innerHTML = uniqueSorted(state.stays.map((stay) => stay.year), true).map((year) => `<button type="button" data-year-jump="${year}">${year}</button>`).join("");
  }

  function applyFilters() {
    const filters = {
      search: elements.searchFilter.value.trim().toLocaleLowerCase("nl"), year: elements.yearFilter.value,
      country: elements.countryFilter.value, type: elements.typeFilter.value, tag: elements.tagFilter.value
    };
    state.filtered = state.stays.filter((stay) => (!filters.year || String(stay.year) === filters.year)
      && (!filters.country || stay.country === filters.country) && (!filters.type || stay.type === filters.type)
      && (!filters.tag || stay.tags.includes(filters.tag)) && matchesSearch(stay, filters.search));
    renderTimeline();
    const count = state.filtered.length;
    elements.resultsStatus.textContent = `${count} ${count === 1 ? "verblijf" : "verblijven"} getoond`;
    elements.emptyState.hidden = count > 0;
  }

  function matchesSearch(stay, term) {
    if (!term) return true;
    return [stay.name, stay.location, stay.region, stay.country, stay.type, stay.trip, stay.description, ...stay.tags].filter(Boolean).join(" ").toLocaleLowerCase("nl").includes(term);
  }

  function clearFilters() {
    elements.filterForm.reset();
    applyFilters();
    elements.searchFilter.focus();
  }

  function renderTimeline() {
    if (state.observer) state.observer.disconnect();
    const years = uniqueSorted(state.filtered.map((stay) => stay.year), true);
    elements.timeline.innerHTML = years.map((year) => renderYearSection(year, state.filtered.filter((stay) => stay.year === year))).join("");
    addImageFallbacks(elements.timeline);
    setupRevealObserver();
  }

  function renderYearSection(year, stays) {
    return `<section class="year-section" id="year-${year}" aria-labelledby="year-title-${year}"><h2 class="year-heading" id="year-title-${year}">${year}</h2>${stays.map((stay) => `<div class="timeline-item">${renderStayCard(stay)}</div>`).join("")}</section>`;
  }

  function renderStayCard(stay) {
    const visits = getVisits(stay.campingId).length;
    return `<article class="stay-card" id="${escapeAttribute(stay.id)}" data-stay-id="${escapeAttribute(stay.id)}">
      <div class="stay-card__image-wrap"><img class="stay-card__image" src="${escapeAttribute(stay.image)}" alt="${escapeAttribute(stay.imageAlt)}" loading="lazy"></div>
      <div class="stay-card__body">
        <div class="stay-card__meta"><time datetime="${escapeAttribute(stay.arrivalDate || String(stay.year))}">${escapeHtml(formatDateRange(stay))}</time><span>${escapeHtml(formatNights(stay.nights))} · ${escapeHtml(stay.type)}</span></div>
        <h3>${escapeHtml(stay.name)}</h3><p class="location">${escapeHtml(countryFlags[stay.countryCode] || "📍")} ${escapeHtml(formatLocation(stay))}</p>
        <div class="status-row">${stay.needsCompletion ? '<span class="badge badge--incomplete">Nog aanvullen</span>' : ""}${!stay.confirmed ? '<span class="badge badge--unknown">Exacte plek onbekend</span>' : ""}${visits > 1 ? `<span class="badge badge--repeat">${visits} keer bezocht</span>` : ""}</div>
        <p class="description">${escapeHtml(stay.description || "Beschrijving nog aanvullen.")}</p>
        <div class="tags" aria-label="Tags">${stay.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="card-actions"><button class="button" type="button" data-open-stay="${escapeAttribute(stay.id)}">Bekijk details</button>${externalLink(stay.googleMapsUrl, "Google Maps")}${externalLink(stay.polarstepsUrl, "Polarsteps")}</div>
      </div></article>`;
  }

  function setupRevealObserver() {
    const cards = elements.timeline.querySelectorAll(".stay-card");
    if (reducedMotion() || !("IntersectionObserver" in window)) { cards.forEach((card) => card.classList.add("is-visible")); return; }
    state.observer = new IntersectionObserver((entries, observer) => entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("is-visible"); observer.unobserve(entry.target); } }), { threshold: .12 });
    cards.forEach((card) => state.observer.observe(card));
  }

  function handleTimelineClick(event) {
    const button = event.target.closest("[data-open-stay]");
    const interactive = event.target.closest("a, button");
    const card = event.target.closest("[data-stay-id]");
    if (!button && (interactive || !card)) return;
    const stayId = button?.dataset.openStay || card.dataset.stayId;
    const stay = state.stays.find((item) => item.id === stayId);
    if (stay) openStayModal(stay, button || card.querySelector("[data-open-stay]"), true);
  }

  function openStayModal(stay, trigger = document.activeElement, updateHash = true) {
    state.activeStay = stay; state.lastFocused = trigger;
    const otherVisits = getVisits(stay.campingId).filter((visit) => visit.id !== stay.id);
    elements.modalContent.innerHTML = `<img class="modal__image" src="${escapeAttribute(stay.image)}" alt="${escapeAttribute(stay.imageAlt)}">
      <div class="modal__body"><p class="eyebrow">${escapeHtml(stay.trip || stay.type)}</p><h2 id="modalTitle">${escapeHtml(stay.name)}</h2><p class="location">${escapeHtml(countryFlags[stay.countryCode] || "📍")} ${escapeHtml(formatLocation(stay))}</p>
      <div class="status-row">${stay.needsCompletion ? '<span class="badge badge--incomplete">Nog aanvullen</span>' : ""}${!stay.confirmed ? '<span class="badge badge--unknown">Exacte plek onbekend</span>' : ""}</div>
      <dl class="modal__facts"><div class="modal__fact"><dt>Datum</dt><dd>${escapeHtml(formatFullDateRange(stay))}</dd></div><div class="modal__fact"><dt>Overnachtingen</dt><dd>${escapeHtml(formatNights(stay.nights))}</dd></div><div class="modal__fact"><dt>Type</dt><dd>${escapeHtml(stay.type)}</dd></div><div class="modal__fact"><dt>Gelegenheid / reis</dt><dd>${escapeHtml(stay.trip || "Niet vermeld")}</dd></div></dl>
      <p>${escapeHtml(stay.description || "Beschrijving nog aanvullen.")}</p>${stay.longDescription ? `<p>${escapeHtml(stay.longDescription)}</p>` : ""}
      ${stay.highlights.length ? `<section class="modal__section"><h3>Bijzonderheden</h3><ul>${stay.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>` : ""}
      <div class="tags" aria-label="Tags">${stay.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="card-actions">${externalLink(stay.googleMapsUrl, "Bekijk op Google Maps", true)}${externalLink(stay.polarstepsUrl, "Bekijk Polarsteps", true)}</div>
      <section class="modal__section"><h3>Eerdere en latere bezoeken</h3><p>Je bezocht deze camping ${getVisits(stay.campingId).length} ${getVisits(stay.campingId).length === 1 ? "keer" : "keer"}.</p>${otherVisits.length ? `<p>Andere bezoeken:</p><ul class="other-visits">${otherVisits.map((visit) => `<li><button type="button" data-modal-visit="${escapeAttribute(visit.id)}">${escapeHtml(formatFullDateRange(visit))}</button></li>`).join("")}</ul>` : ""}</section>
      <section class="modal__section"><h3>Praktische informatie</h3><p><strong>Bron verblijf:</strong> ${escapeHtml(stay.source)}</p><p><strong>Coördinaten:</strong> ${escapeHtml(formatCoordinates(stay.coordinates))}</p>${renderImageCredit(stay)}</section></div>`;
    addImageFallbacks(elements.modalContent);
    elements.modalBackdrop.hidden = false; document.body.classList.add("modal-open"); elements.stayModal.focus();
    if (updateHash && window.location.hash !== `#${stay.id}`) history.pushState(null, "", `#${stay.id}`);
  }

  function closeStayModal({ updateHash = true, restoreFocus = true } = {}) {
    if (elements.modalBackdrop.hidden) return;
    elements.modalBackdrop.hidden = true; document.body.classList.remove("modal-open"); state.activeStay = null;
    if (updateHash && window.location.hash) history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    if (restoreFocus && state.lastFocused instanceof HTMLElement) state.lastFocused.focus();
  }

  function handleModalClick(event) {
    const button = event.target.closest("[data-modal-visit]");
    if (!button) return;
    const stay = state.stays.find((item) => item.id === button.dataset.modalVisit);
    if (stay) openStayModal(stay, elements.modalClose, true);
  }

  function handleModalKeydown(event) {
    if (elements.modalBackdrop.hidden) return;
    if (event.key === "Escape") { event.preventDefault(); closeStayModal(); return; }
    if (event.key !== "Tab") return;
    const focusable = [...elements.stayModal.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((item) => !item.disabled && item.offsetParent !== null);
    if (!focusable.length) { event.preventDefault(); elements.stayModal.focus(); return; }
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  function handleHashChange(openModal = true) {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) { if (state.activeStay) closeStayModal({ updateHash: false }); return; }
    const stay = state.stays.find((item) => item.id === id);
    if (!stay) return;
    if (!state.filtered.some((item) => item.id === id)) { elements.filterForm.reset(); applyFilters(); }
    window.clearTimeout(state.hashTimer);
    state.hashTimer = window.setTimeout(() => {
      const card = document.getElementById(id);
      if (card) { card.classList.add("is-visible", "is-highlighted"); card.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "center" }); window.setTimeout(() => card.classList.remove("is-highlighted"), 1900); }
      if (openModal) openStayModal(stay, card?.querySelector("[data-open-stay]") || document.body, false);
    }, 60);
  }

  function handleYearNavigation(event) {
    const button = event.target.closest("[data-year-jump]"); if (!button) return;
    const year = button.dataset.yearJump; const section = document.getElementById(`year-${year}`);
    if (section) section.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    else { elements.yearFilter.value = year; applyFilters(); document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth" }); }
  }

  function updateScrollUi() {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    elements.scrollProgress.style.width = `${scrollable > 0 ? Math.min(100, Math.max(0, window.scrollY / scrollable * 100)) : 0}%`;
    elements.backToTop.classList.toggle("is-visible", window.scrollY > 650);
  }

  function setLoading(isLoading, hasError = false) {
    elements.loadingState.hidden = !isLoading; elements.errorState.hidden = !hasError;
    if (isLoading || hasError) elements.timeline.replaceChildren();
  }

  function getVisits(campingId) { return state.stays.filter((stay) => stay.campingId === campingId).sort(compareNewest); }
  function formatLocation(stay) { return [stay.location || "Plaats nog aanvullen", stay.region, stay.country].filter(Boolean).join(", "); }
  function formatNights(nights) { return nights == null ? "Aantal nachten onbekend" : `${nights} ${nights === 1 ? "nacht" : "nachten"}`; }
  function formatDateRange(stay) {
    if (stay.dateLabel && (!stay.arrivalDate || !stay.departureDate)) return stay.dateLabel;
    const arrival = parseLocalDate(stay.arrivalDate); const departure = parseLocalDate(stay.departureDate);
    if (!arrival) return "Datum nog aanvullen";
    if (!departure) return dateFormatter.format(arrival);
    if (arrival.getFullYear() === departure.getFullYear() && arrival.getMonth() === departure.getMonth()) return `${arrival.getDate()}–${shortDateFormatter.format(departure)}`;
    return `${shortDateFormatter.format(arrival)} – ${dateFormatter.format(departure)}`;
  }
  function formatFullDateRange(stay) {
    const arrival = parseLocalDate(stay.arrivalDate); const departure = parseLocalDate(stay.departureDate);
    if (!arrival) return stay.dateLabel || "Datum nog aanvullen";
    return departure ? `${dateFormatter.format(arrival)} – ${dateFormatter.format(departure)}` : `${dateFormatter.format(arrival)} · vertrekdatum nog aanvullen`;
  }
  function formatCoordinates(coordinates) { return Number.isFinite(coordinates?.latitude) && Number.isFinite(coordinates?.longitude) ? `${coordinates.latitude}, ${coordinates.longitude}` : "Niet beschikbaar"; }
  function externalLink(url, label, asButton = false) { return url ? `<a${asButton ? ' class="button button--quiet"' : ""} href="${escapeAttribute(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)} ↗</a>` : ""; }
  function renderImageCredit(stay) {
    if (!stay.imageCredit) return "";
    const creator = stay.imageSourceUrl ? `<a href="${escapeAttribute(stay.imageSourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(stay.imageCredit)}</a>` : escapeHtml(stay.imageCredit);
    const license = stay.imageLicenseUrl ? `<a href="${escapeAttribute(stay.imageLicenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(stay.imageLicense)}</a>` : escapeHtml(stay.imageLicense);
    return `<p class="image-credit"><strong>Foto:</strong> ${creator}${license ? ` · ${license}` : ""}</p>`;
  }
  function addImageFallbacks(container) { container.querySelectorAll("img").forEach((image) => image.addEventListener("error", () => { if (!image.src.endsWith("placeholder.svg")) { image.src = PLACEHOLDER; image.alt = "Geen foto beschikbaar van dit verblijf"; } }, { once: true })); }
  function reducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
  function escapeAttribute(value) { return escapeHtml(value); }

})();
