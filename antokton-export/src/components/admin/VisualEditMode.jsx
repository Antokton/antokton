import React from "react";
import { useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Image as ImageIcon, MousePointer2, Save, Trash2, Upload, X } from "lucide-react";
import toast from "react-hot-toast";
import { base44 } from "@/api/antoktonClient";
import { useAuth } from "@/lib/AuthContext";

const OVERRIDES_KEY = "visual_editor_overrides";
const VISUAL_EDITOR_STORAGE_KEY = "antokton.visualEditor.enabled";
const VISUAL_EDITOR_TOGGLE_EVENT = "antokton:visual-editor-toggle";
const EDITABLE_TAGS = new Set([
  "A",
  "ARTICLE",
  "ASIDE",
  "BUTTON",
  "DIV",
  "FIGURE",
  "FOOTER",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "HEADER",
  "IMG",
  "INPUT",
  "LABEL",
  "LI",
  "MAIN",
  "NAV",
  "PICTURE",
  "P",
  "SECTION",
  "SMALL",
  "STRONG",
  "SPAN",
  "SVG",
  "TEXTAREA",
  "VIDEO",
]);

function canUseVisualEditor(user) {
  const role = String(user?.role || user?.member_category || "").toLowerCase();
  return role === "admin" || role === "moderator";
}

function parseOverrides(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getConfigValue(configs, key) {
  return configs.find((config) => config.key === key)?.value || "";
}

function isEditorElement(element) {
  return Boolean(element?.closest?.("[data-visual-editor-ui='true']"));
}

function isSelectableElement(element) {
  if (!element || element.nodeType !== 1) return false;
  if (isEditorElement(element)) return false;
  if (["HTML", "BODY"].includes(element.tagName)) return false;
  if (element.id === "root") return false;
  return EDITABLE_TAGS.has(element.tagName);
}

function getSelectableStackFromPoint(x, y, pathname) {
  const elementsAtPoint = document.elementsFromPoint(x, y);
  if (elementsAtPoint.some((element) => isEditorElement(element))) return [];

  const seen = new Set();
  return elementsAtPoint
    .flatMap((element) => {
      const candidates = [];
      let current = element;
      while (current && current.nodeType === 1 && current !== document.body) {
        if (isSelectableElement(current) && !seen.has(current)) {
          seen.add(current);
          candidates.push(current);
        }
        current = current.parentElement;
      }
      return candidates;
    })
    .map((element) => getElementInfo(element, pathname));
}

function cssEscape(value) {
  if (window.CSS?.escape) return window.CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function classSelector(element) {
  return Array.from(element.classList || [])
    .filter((className) => /^[a-zA-Z0-9_-]+$/.test(className))
    .slice(0, 2)
    .map((className) => `.${cssEscape(className)}`)
    .join("");
}

function selectorForElement(element) {
  if (element.id) return `#${cssEscape(element.id)}`;

  const parts = [];
  let current = element;

  while (current && current.nodeType === 1 && current !== document.body && parts.length < 7) {
    let part = current.tagName.toLowerCase();
    const testId = current.getAttribute("data-testid");
    const ariaLabel = current.getAttribute("aria-label");
    const alt = current.tagName === "IMG" ? current.getAttribute("alt") : "";

    if (testId) {
      part += `[data-testid="${testId.replaceAll('"', '\\"')}"]`;
    } else if (ariaLabel) {
      part += `[aria-label="${ariaLabel.replaceAll('"', '\\"')}"]`;
    } else if (alt) {
      part += `[alt="${alt.replaceAll('"', '\\"')}"]`;
    } else {
      part += classSelector(current);
    }

    const parent = current.parentElement;
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
      if (sameTagSiblings.length > 1) {
        part += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`;
      }
    }

    parts.unshift(part);
    const selector = parts.join(" > ");
    try {
      if (document.querySelectorAll(selector).length === 1) return selector;
    } catch {
      // Keep walking up if an unusual class produced an invalid selector.
    }
    current = parent;
  }

  return parts.join(" > ");
}

function getElementInfo(element, pathname) {
  const rect = element.getBoundingClientRect();
  const computed = window.getComputedStyle(element);
  const text = element.children.length === 0 ? element.textContent?.trim() || "" : "";
  const src = element.currentSrc || element.getAttribute("src") || "";
  const anchor = element.closest("a");
  const previewText = text || element.getAttribute("aria-label") || element.getAttribute("alt") || element.getAttribute("title") || "";

  return {
    page: pathname,
    selector: selectorForElement(element),
    tagName: element.tagName.toLowerCase(),
    rect: {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    },
    text,
    src,
    href: anchor?.getAttribute("href") || "",
    alt: element.getAttribute("alt") || "",
    title: element.getAttribute("title") || "",
    preview: previewText.slice(0, 44),
    styles: {
      color: computed.color || "",
      backgroundColor: computed.backgroundColor === "rgba(0, 0, 0, 0)" ? "" : computed.backgroundColor || "",
      fontSize: computed.fontSize || "",
      borderRadius: computed.borderRadius || "",
    },
  };
}

function makeDraft(info, existingOverride) {
  return {
    applyToAllPages: existingOverride?.page === "*",
    text: existingOverride?.text ?? info.text ?? "",
    src: existingOverride?.src ?? info.src ?? "",
    href: existingOverride?.href ?? info.href ?? "",
    alt: existingOverride?.alt ?? info.alt ?? "",
    title: existingOverride?.title ?? info.title ?? "",
    hidden: Boolean(existingOverride?.hidden),
    styles: {
      color: existingOverride?.styles?.color ?? "",
      backgroundColor: existingOverride?.styles?.backgroundColor ?? "",
      fontSize: existingOverride?.styles?.fontSize ?? "",
      borderRadius: existingOverride?.styles?.borderRadius ?? "",
    },
  };
}

function restoreVisualOverrides() {
  document.querySelectorAll("[data-antokton-visual-override='true']").forEach((element) => {
    const raw = element.getAttribute("data-antokton-visual-original");
    if (raw) {
      try {
        const original = JSON.parse(raw);
        if (original.text !== undefined) element.textContent = original.text;
        if (original.src !== undefined && "src" in element) element.setAttribute("src", original.src);
        if (original.href !== undefined && element.tagName === "A") element.setAttribute("href", original.href);
        if (original.alt !== undefined) element.setAttribute("alt", original.alt);
        if (original.title !== undefined) element.setAttribute("title", original.title);
        if (original.style !== undefined) element.setAttribute("style", original.style);
      } catch {
        // Leave the element as-is if the stored snapshot is malformed.
      }
    }
    element.removeAttribute("data-antokton-visual-original");
    element.removeAttribute("data-antokton-visual-override");
  });
}

function captureOriginal(element) {
  if (element.getAttribute("data-antokton-visual-override") === "true") return;
  const original = {
    text: element.children.length === 0 ? element.textContent : undefined,
    src: "src" in element ? element.getAttribute("src") : undefined,
    href: element.tagName === "A" ? element.getAttribute("href") : undefined,
    alt: element.getAttribute("alt") ?? undefined,
    title: element.getAttribute("title") ?? undefined,
    style: element.getAttribute("style") ?? "",
  };
  element.setAttribute("data-antokton-visual-original", JSON.stringify(original));
  element.setAttribute("data-antokton-visual-override", "true");
}

function applyOverrideToElement(element, override) {
  captureOriginal(element);

  if (override.hidden) {
    element.style.display = "none";
    return;
  }

  if (override.text !== undefined && override.text !== "" && element.children.length === 0) {
    element.textContent = override.text;
  }

  if (override.src) {
    if ("src" in element) {
      element.setAttribute("src", override.src);
    } else {
      element.style.backgroundImage = `url("${override.src}")`;
      element.style.backgroundSize = element.style.backgroundSize || "cover";
      element.style.backgroundPosition = element.style.backgroundPosition || "center";
    }
  }

  if (override.href) {
    const anchor = element.tagName === "A" ? element : element.closest("a");
    if (anchor) anchor.setAttribute("href", override.href);
  }

  if (override.alt) element.setAttribute("alt", override.alt);
  if (override.title) element.setAttribute("title", override.title);

  const styles = override.styles || {};
  Object.entries(styles).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      element.style[key] = value;
    }
  });
}

function applyVisualOverrides(overrides, pathname) {
  restoreVisualOverrides();
  overrides
    .filter((override) => override.page === "*" || override.page === pathname)
    .forEach((override) => {
      try {
        const element = document.querySelector(override.selector);
        if (element && !isEditorElement(element)) applyOverrideToElement(element, override);
      } catch {
        // Ignore stale selectors. They can be removed from the editor panel later.
      }
    });
}

function VisualEditMode() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [fallbackUser, setFallbackUser] = React.useState(null);
  const effectiveUser = canUseVisualEditor(user) ? user : fallbackUser;
  const canEdit = canUseVisualEditor(effectiveUser);

  const [enabled, setEnabled] = React.useState(() => {
    const params = new URLSearchParams(window.location.search);
    const explicitEditMode = params.get("visual_edit") === "1";
    const storedEditMode = localStorage.getItem(VISUAL_EDITOR_STORAGE_KEY) === "true";
    const mobileViewport = window.matchMedia?.("(max-width: 767px)").matches ?? false;
    return explicitEditMode || (storedEditMode && !mobileViewport);
  });
  const [hovered, setHovered] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [selectionStack, setSelectionStack] = React.useState([]);
  const [draft, setDraft] = React.useState(null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [isMobileViewport, setIsMobileViewport] = React.useState(() =>
    window.matchMedia?.("(max-width: 767px)").matches ?? false
  );

  const { data: configs = [] } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
    staleTime: 60 * 1000,
  });

  const configRecord = configs.find((config) => config.key === OVERRIDES_KEY);
  const overrides = React.useMemo(() => parseOverrides(getConfigValue(configs, OVERRIDES_KEY)), [configs]);

  const setEditorEnabled = React.useCallback((nextEnabled) => {
    setEnabled(nextEnabled);
    localStorage.setItem(VISUAL_EDITOR_STORAGE_KEY, nextEnabled ? "true" : "false");
    if (!nextEnabled) {
      setHovered(null);
      setSelected(null);
      setSelectionStack([]);
      setDraft(null);
    }
  }, []);

  React.useEffect(() => {
    if (canUseVisualEditor(user)) return undefined;
    let cancelled = false;
    base44.auth.isAuthenticated()
      .then((authenticated) => authenticated ? base44.auth.me() : null)
      .then((currentUser) => {
        if (!cancelled && currentUser) setFallbackUser(currentUser);
      })
      .catch(() => {
        if (!cancelled) setFallbackUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia?.("(max-width: 767px)");
    if (!mediaQuery) return undefined;
    const handleViewportChange = () => setIsMobileViewport(mediaQuery.matches);
    handleViewportChange();
    mediaQuery.addEventListener?.("change", handleViewportChange);
    return () => mediaQuery.removeEventListener?.("change", handleViewportChange);
  }, []);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("visual_edit") === "1") setEditorEnabled(true);
  }, [location.search, setEditorEnabled]);

  React.useEffect(() => {
    const handleToggle = (event) => {
      setEditorEnabled(Boolean(event.detail?.enabled));
    };
    window.addEventListener(VISUAL_EDITOR_TOGGLE_EVENT, handleToggle);
    return () => window.removeEventListener(VISUAL_EDITOR_TOGGLE_EVENT, handleToggle);
  }, [setEditorEnabled]);

  React.useEffect(() => {
    const timers = [0, 150, 600, 1400].map((delay) =>
      window.setTimeout(() => applyVisualOverrides(overrides, location.pathname), delay)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [overrides, location.pathname]);

  React.useEffect(() => {
    const root = document.getElementById("root");
    if (!root) return undefined;

    let timer = null;
    const observer = new MutationObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => applyVisualOverrides(overrides, location.pathname), 120);
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [overrides, location.pathname]);

  React.useEffect(() => {
    setSelected(null);
    setSelectionStack([]);
    setDraft(null);
  }, [location.pathname]);

  React.useEffect(() => {
    if (!enabled || !canEdit) {
      setHovered(null);
      return undefined;
    }

    const handleMouseMove = (event) => {
      const stack = getSelectableStackFromPoint(event.clientX, event.clientY, location.pathname);
      if (stack.length === 0) {
        setHovered(null);
        return;
      }
      setHovered(stack[0]);
    };

    const handleClick = (event) => {
      const stack = getSelectableStackFromPoint(event.clientX, event.clientY, location.pathname);
      if (stack.length === 0) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      const info = stack[0];
      const existing = overrides.find(
        (override) =>
          override.selector === info.selector &&
          (override.page === location.pathname || override.page === "*")
      );
      setSelected(info);
      setSelectionStack(stack);
      setDraft(makeDraft(info, existing));
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelected(null);
        setSelectionStack([]);
        setDraft(null);
      }
    };

    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove, true);
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [enabled, canEdit, location.pathname, overrides]);

  const upsertOverrides = async (nextOverrides) => {
    const value = JSON.stringify(nextOverrides, null, 2);
    if (configRecord) {
      await base44.entities.SiteConfig.update(configRecord.id, { value });
    } else {
      await base44.entities.SiteConfig.create({
        key: OVERRIDES_KEY,
        value,
        label: "Visual editor overrides",
        group: "visual_editor",
      });
    }
    await queryClient.invalidateQueries({ queryKey: ["siteConfig"] });
  };

  const saveSelected = async () => {
    if (!selected || !draft) return;
    setSaving(true);
    try {
      const page = draft.applyToAllPages ? "*" : location.pathname;
      const id = selected.id || `${page}:${selected.selector}`;
      const override = {
        id,
        page,
        selector: selected.selector,
        tagName: selected.tagName,
        text: draft.text,
        src: draft.src,
        href: draft.href,
        alt: draft.alt,
        title: draft.title,
        hidden: draft.hidden,
        styles: draft.styles,
        updated_at: new Date().toISOString(),
      };
      const nextOverrides = overrides
        .filter((item) => !(item.selector === selected.selector && item.page === page))
        .concat(override);
      await upsertOverrides(nextOverrides);
      toast.success("Ndryshimi u ruajt");
      setSelected(null);
      setSelectionStack([]);
      setDraft(null);
    } catch (error) {
      console.error("Visual editor save failed", error);
      toast.error("Nuk u ruajt ndryshimi");
    } finally {
      setSaving(false);
    }
  };

  const removeSelectedOverride = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const nextOverrides = overrides.filter(
        (item) =>
          !(
            item.selector === selected.selector &&
            (item.page === location.pathname || item.page === "*")
          )
      );
      await upsertOverrides(nextOverrides);
      restoreVisualOverrides();
      window.setTimeout(() => applyVisualOverrides(nextOverrides, location.pathname), 0);
      toast.success("Ndryshimi u hoq");
      setSelected(null);
      setSelectionStack([]);
      setDraft(null);
    } catch (error) {
      console.error("Visual editor remove failed", error);
      toast.error("Nuk u hoq ndryshimi");
    } finally {
      setSaving(false);
    }
  };

  const uploadImage = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = result?.file_url || result?.url;
      if (!fileUrl) throw new Error("UploadFile did not return file_url");
      setDraft((current) => ({ ...current, src: fileUrl }));
      toast.success("Imazhi u ngarkua");
    } catch (error) {
      console.error("Visual editor upload failed", error);
      toast.error("Nuk u ngarkua imazhi");
    } finally {
      setUploading(false);
    }
  };

  const chooseFromStack = (info) => {
    const existing = overrides.find(
      (override) =>
        override.selector === info.selector &&
        (override.page === location.pathname || override.page === "*")
    );
    setSelected(info);
    setDraft(makeDraft(info, existing));
  };

  if (!canEdit) return null;
  if (isMobileViewport && !enabled) return null;

  const activeRect = selected?.rect || hovered?.rect;
  const activeLabel = selected?.tagName || hovered?.tagName;

  return (
    <div data-visual-editor-ui="true">
      {activeRect && enabled && (
        <div
          className="pointer-events-none fixed z-[9997] rounded-md border-2 border-[#9bffd6] shadow-[0_0_28px_rgba(155,255,214,0.35)]"
          style={{
            left: activeRect.x,
            top: activeRect.y,
            width: activeRect.width,
            height: activeRect.height,
          }}
        >
          <div className="absolute -top-6 left-0 rounded-md bg-[#07111f] px-2 py-1 text-[11px] font-bold text-[#9bffd6] shadow-lg">
            {activeLabel}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setEditorEnabled(!enabled)}
        className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-3 z-[9998] inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold shadow-2xl backdrop-blur-md transition sm:bottom-24 sm:right-4 ${
          enabled
            ? "border-[#9bffd6]/70 bg-[#9bffd6]/20 text-white"
            : "border-white/15 bg-[#07111f]/90 text-white/80 hover:bg-[#07111f]"
        }`}
        title="Edito elementet vizualisht"
      >
        <MousePointer2 className="h-4 w-4" />
        {enabled ? "Mbyll editimin" : "Edit Mode"}
      </button>

      {enabled && !selected && (
        <div className="fixed bottom-[calc(124px+env(safe-area-inset-bottom))] right-3 z-[9998] max-w-[min(280px,calc(100vw-24px))] rounded-xl border border-white/15 bg-[#07111f]/92 px-3 py-2 text-xs text-white/75 shadow-2xl backdrop-blur-md sm:bottom-36 sm:right-4">
          Kliko çdo element të dukshëm për tekst, imazh, link ose stil bazë.
        </div>
      )}

      {enabled && selected && draft && (
        <div className="fixed inset-x-2 top-16 z-[9999] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border border-white/15 bg-[#07111f]/96 text-white shadow-2xl backdrop-blur-xl sm:inset-x-auto sm:right-4 sm:top-20 sm:w-[min(390px,calc(100vw-32px))]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-sm font-bold">Edito elementin</p>
              <p className="text-[11px] text-white/45">
                {selected.tagName} në {location.pathname}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setSelectionStack([]);
                setDraft(null);
              }}
              className="rounded-full p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
              title="Mbyll"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(100dvh-14rem)] space-y-3 overflow-y-auto overscroll-contain p-4 sm:max-h-[68vh]">
            {selectionStack.length > 1 && (
              <div className="rounded-lg border border-[#9bffd6]/20 bg-[#9bffd6]/10 p-2">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#9bffd6]">
                  Nivelet në këtë pikë
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectionStack.map((item, index) => (
                    <button
                      type="button"
                      key={`${item.selector}-${index}`}
                      onClick={() => chooseFromStack(item)}
                      className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition ${
                        selected.selector === item.selector
                          ? "border-[#9bffd6]/70 bg-[#9bffd6]/20 text-white"
                          : "border-white/10 bg-white/5 text-white/65 hover:bg-white/10 hover:text-white"
                      }`}
                      title={item.selector}
                    >
                      {item.tagName}
                      {item.preview ? `: ${item.preview}` : ""}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-[11px] text-white/45">
              <div className="mb-1 font-semibold text-white/65">Selector</div>
              <code className="break-all">{selected.selector}</code>
            </div>

            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <span>Apliko në të gjitha faqet</span>
              <input
                type="checkbox"
                checked={draft.applyToAllPages}
                onChange={(event) => setDraft((current) => ({ ...current, applyToAllPages: event.target.checked }))}
              />
            </label>

            <Field label="Teksti">
              <textarea
                value={draft.text}
                onChange={(event) => setDraft((current) => ({ ...current, text: event.target.value }))}
                className="min-h-[74px] w-full resize-y rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#8ab4ff]/70"
                placeholder="Tekst i ri për elemente pa fëmijë të brendshëm"
              />
            </Field>

            <Field label="Imazh / background URL">
              <div className="flex gap-2">
                <input
                  value={draft.src}
                  onChange={(event) => setDraft((current) => ({ ...current, src: event.target.value }))}
                  className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#8ab4ff]/70"
                  placeholder="/uploads/... ose https://..."
                />
                <label className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/75 transition hover:bg-white/15" title="Ngarko imazh">
                  {uploading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Upload className="h-4 w-4" />}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      uploadImage(event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </Field>

            <Field label="Link">
              <input
                value={draft.href}
                onChange={(event) => setDraft((current) => ({ ...current, href: event.target.value }))}
                className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#8ab4ff]/70"
                placeholder="/Statuset ose https://..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <StyleField label="Ngjyra e tekstit" value={draft.styles.color} onChange={(value) => setDraft((current) => ({ ...current, styles: { ...current.styles, color: value } }))} />
              <StyleField label="Sfondi" value={draft.styles.backgroundColor} onChange={(value) => setDraft((current) => ({ ...current, styles: { ...current.styles, backgroundColor: value } }))} />
              <StyleField label="Madhësia e fontit" value={draft.styles.fontSize} onChange={(value) => setDraft((current) => ({ ...current, styles: { ...current.styles, fontSize: value } }))} placeholder="16px" />
              <StyleField label="Rrumbullakimi" value={draft.styles.borderRadius} onChange={(value) => setDraft((current) => ({ ...current, styles: { ...current.styles, borderRadius: value } }))} placeholder="12px" />
            </div>

            <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs">
              <span className="inline-flex items-center gap-2">
                {draft.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                Fshihe elementin
              </span>
              <input
                type="checkbox"
                checked={draft.hidden}
                onChange={(event) => setDraft((current) => ({ ...current, hidden: event.target.checked }))}
              />
            </label>

            <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-2 text-[11px] leading-relaxed text-yellow-100/75">
              Për ndryshime të mëdha layout-i përdorim kod të pastër. Ky editor ruan rregullime të shpejta vizuale në databazë.
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
            <button
              type="button"
              onClick={removeSelectedOverride}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-red-400/25 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hiq
            </button>
            <button
              type="button"
              onClick={saveSelected}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-3 py-2 text-xs font-bold text-[#07111f] transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#07111f]/25 border-t-[#07111f]" /> : <Save className="h-3.5 w-3.5" />}
              Ruaj
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-white/55">{label}</label>
      {children}
    </div>
  );
}

function StyleField({ label, value, onChange, placeholder = "p.sh. #ffffff" }) {
  return (
    <Field label={label}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#8ab4ff]/70"
        placeholder={placeholder}
      />
    </Field>
  );
}

export default VisualEditMode;
