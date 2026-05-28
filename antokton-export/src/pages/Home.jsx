import React from "react";
import CategoryCards from "../components/home/CategoryCards";
import EventNotifications from "../components/EventNotifications";
import { base44 } from "@/api/antoktonClient";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import JobCard from "../components/feed/JobCard";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "../utils";
import { ArrowRight, UserPlus, Search, Users, X, Sparkles, Edit3, Image as ImageIcon, Save, Upload, Type, SlidersHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { t, getLanguage } from "../lib/translations";
import toast from "react-hot-toast";

// ============================================================
// POZICIONIMI MANUAL - ndrysho këto vlera për të rregulluar
// ============================================================
const IMAGE_OFFSET_PX = -20;      // foto lart(-)/poshtë(+) nga fundi i njoftimeve
const BUTTONS_TOP_PERCENT = 38;   // butonat: % nga maja e imazhit (0=lart, 100=poshtë)
// ============================================================

const HOME_EDIT_DEFAULTS = {
  home_hero_dark_desktop_url: '/local-assets/b2ee5a682_01b.png',
  home_hero_dark_mobile_url: '/local-assets/d83d5accb_Antoktonteme9-17.png',
  home_hero_light_desktop_url: '/local-assets/adac4aab2_01lightb.png',
  home_hero_light_mobile_url: '/local-assets/d206a2800_Antoktonteme9-17lightt.png',
  home_logo_dark_url: '/local-assets/0115b6553_Antoktontextiparemetexture.png',
  home_logo_light_url: '/local-assets/7d831e8a1_Antoktontextiparemetextureperlightteme.png',
  home_btn_pune_img: '/local-assets/41f133055_ButonPuneneeurope.png',
  home_btn_komunitet_img: '/local-assets/6b6380869_ButonKomunitet.png',
  home_btn_edukim_img: '/local-assets/e3425bed5_ButonEdukim.png',
  home_hero_text_line1: 'EKOSISTEMI I SHQIPTARËVE',
  home_hero_text_line2: 'KOMUNITETI DHE MUNDËSITË NË EUROPË',
  home_logo_top_desktop: '2',
  home_logo_width_desktop: '46',
  home_text_top_desktop: '48',
  home_buttons_bottom_desktop: '12',
  home_buttons_banner_bottom_desktop: '17',
  home_logo_top_mobile: '4',
  home_buttons_bottom_mobile: '25',
  home_buttons_banner_bottom_mobile: '2',
};

const HOME_EDIT_LABELS = {
  home_hero_dark_desktop_url: 'Harta desktop, tema e errët',
  home_hero_dark_mobile_url: 'Harta mobile, tema e errët',
  home_hero_light_desktop_url: 'Harta desktop, tema e çelët',
  home_hero_light_mobile_url: 'Harta mobile, tema e çelët',
  home_logo_dark_url: 'Logo, tema e errët',
  home_logo_light_url: 'Logo, tema e çelët',
  home_btn_pune_img: 'Butoni Punë në Europë',
  home_btn_komunitet_img: 'Butoni Komunitet',
  home_btn_edukim_img: 'Butoni Edukim & Media',
  home_hero_text_line1: 'Teksti hero, rreshti 1',
  home_hero_text_line2: 'Teksti hero, rreshti 2',
  home_logo_top_desktop: 'Pozicioni i logos nga lart, desktop (%)',
  home_logo_width_desktop: 'Gjerësia e logos, desktop (%)',
  home_text_top_desktop: 'Pozicioni i tekstit nga lart, desktop (%)',
  home_buttons_bottom_desktop: 'Pozicioni i butonave nga poshtë, desktop (%)',
  home_buttons_banner_bottom_desktop: 'Pozicioni i butonave me banner, desktop (%)',
  home_logo_top_mobile: 'Pozicioni i logos nga lart, mobile (px)',
  home_buttons_bottom_mobile: 'Pozicioni i butonave nga poshtë, mobile (%)',
  home_buttons_banner_bottom_mobile: 'Pozicioni i butonave me banner, mobile (%)',
};

const HOME_EDIT_GROUP_FIELDS = {
  background: [
    'home_hero_dark_desktop_url',
    'home_hero_dark_mobile_url',
    'home_hero_light_desktop_url',
    'home_hero_light_mobile_url',
  ],
  logo: [
    'home_logo_dark_url',
    'home_logo_light_url',
    'home_logo_top_desktop',
    'home_logo_width_desktop',
    'home_logo_top_mobile',
  ],
  text: [
    'home_hero_text_line1',
    'home_hero_text_line2',
    'home_text_top_desktop',
  ],
  buttons: [
    'home_btn_pune_img',
    'home_btn_komunitet_img',
    'home_btn_edukim_img',
    'home_buttons_bottom_desktop',
    'home_buttons_banner_bottom_desktop',
    'home_buttons_bottom_mobile',
    'home_buttons_banner_bottom_mobile',
  ],
};

const HOME_EDIT_GROUP_TITLES = {
  background: 'Imazhi i hartës',
  logo: 'Logo',
  text: 'Teksti mbi hartë',
  buttons: 'Butonat e kryefaqes',
};

function siteConfigToMap(configs = []) {
  return configs.reduce((map, item) => {
    if (item?.key) map[item.key] = item.value;
    return map;
  }, {});
}

function getHomeConfig(configMap, key) {
  const value = configMap?.[key];
  return value === undefined || value === null || value === '' ? HOME_EDIT_DEFAULTS[key] : value;
}

function getHomeConfigNumber(configMap, key) {
  const value = Number(getHomeConfig(configMap, key));
  const fallback = Number(HOME_EDIT_DEFAULTS[key]);
  return Number.isFinite(value) ? value : fallback;
}

function canEditHomepage(user) {
  const role = String(user?.role || '').toLowerCase();
  return role === 'admin' || role === 'moderator';
}

function AdminEditField({ fieldKey, value, onChange, onUpload, uploadingKey }) {
  const isImageField = fieldKey.endsWith('_url') || fieldKey.endsWith('_img');
  const isNumberField = !isImageField && fieldKey !== 'home_hero_text_line1' && fieldKey !== 'home_hero_text_line2';

  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-white/55">
        {HOME_EDIT_LABELS[fieldKey] || fieldKey}
      </label>
      <div className="flex gap-2">
        <input
          type={isNumberField ? 'number' : 'text'}
          value={value || ''}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-[#8ab4ff]/70"
          placeholder={HOME_EDIT_DEFAULTS[fieldKey] || ''}
        />
        {isImageField && (
          <label
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-white/15 bg-white/10 text-white/75 transition hover:bg-white/15"
            title="Ngarko imazh"
          >
            {uploadingKey === fieldKey ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(fieldKey, file);
                event.target.value = '';
              }}
            />
          </label>
        )}
      </div>
    </div>
  );
}

function LandingBanner({ theme: themeProp, notifHeight, showBanner, onDismissBanner, siteConfigs = [], siteConfigMap = {}, canEdit = false }) {
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = React.useState(window.innerWidth >= 768 && window.innerWidth < 1280);
  const [realNotifHeight, setRealNotifHeight] = React.useState(0);
  const [editMode, setEditMode] = React.useState(false);
  const [editingGroup, setEditingGroup] = React.useState(null);
  const [draft, setDraft] = React.useState({});
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [uploadingKey, setUploadingKey] = React.useState(null);

  React.useEffect(() => {
    if (!(isMobile || isTablet)) return;
    const measure = () => {
      const el = document.querySelector('[data-event-notifications]');
      if (el) {
        setRealNotifHeight(el.getBoundingClientRect().height);
      } else {
        setRealNotifHeight(0);
      }
    };

    const scheduleMeasure = () => window.requestAnimationFrame(measure);
    measure();
    const t1 = setTimeout(measure, 300);
    const t2 = setTimeout(measure, 800);
    const t3 = setTimeout(measure, 1600);
    const observer = new MutationObserver(scheduleMeasure);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', measure);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [isMobile, isTablet, notifHeight]);
  const theme = themeProp || (document.body.className.includes('theme-light') ? 'light' : 'dark');

  const IMG_DARK_DESKTOP = getHomeConfig(siteConfigMap, 'home_hero_dark_desktop_url');
  const IMG_DARK_MOBILE = getHomeConfig(siteConfigMap, 'home_hero_dark_mobile_url');
  const IMG_LIGHT_DESKTOP = getHomeConfig(siteConfigMap, 'home_hero_light_desktop_url');
  const IMG_LIGHT_MOBILE = getHomeConfig(siteConfigMap, 'home_hero_light_mobile_url');

  const MASTER_IMG_URL = theme === 'light'
    ? (isMobile || isTablet ? IMG_LIGHT_MOBILE : IMG_LIGHT_DESKTOP)
    : (isMobile || isTablet ? IMG_DARK_MOBILE : IMG_DARK_DESKTOP);

  const LOGO_DARK = getHomeConfig(siteConfigMap, 'home_logo_dark_url');
  const LOGO_LIGHT = getHomeConfig(siteConfigMap, 'home_logo_light_url');

  const BTN_PUNE_IMG = getHomeConfig(siteConfigMap, 'home_btn_pune_img');
  const BTN_KOMUNITET_IMG = getHomeConfig(siteConfigMap, 'home_btn_komunitet_img');
  const BTN_EDUKIM_IMG = getHomeConfig(siteConfigMap, 'home_btn_edukim_img');
  const HERO_LINE_1 = getHomeConfig(siteConfigMap, 'home_hero_text_line1');
  const HERO_LINE_2 = getHomeConfig(siteConfigMap, 'home_hero_text_line2');
  const MOBILE_HERO_LINE_1 = 'PLATFORMA E SHQIPTARËVE';
  const MOBILE_HERO_LINE_2 = 'KOMUNITETI DHE MUNDËSITË NË EUROPË';
  const logoTopDesktop = getHomeConfigNumber(siteConfigMap, 'home_logo_top_desktop');
  const logoWidthDesktop = getHomeConfigNumber(siteConfigMap, 'home_logo_width_desktop');
  const textTopDesktop = getHomeConfigNumber(siteConfigMap, 'home_text_top_desktop');
  const buttonsBottomDesktop = getHomeConfigNumber(siteConfigMap, showBanner ? 'home_buttons_banner_bottom_desktop' : 'home_buttons_bottom_desktop');
  const mobileLogoOffset = getHomeConfigNumber(siteConfigMap, 'home_logo_top_mobile');
  const mobileButtonsBottom = getHomeConfigNumber(siteConfigMap, showBanner ? 'home_buttons_banner_bottom_mobile' : 'home_buttons_bottom_mobile');

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1280);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const hoverIn = (e) => e.currentTarget.style.opacity = '0.8';
  const hoverOut = (e) => e.currentTarget.style.opacity = '1';

  const startEditing = (group) => {
    const nextDraft = {};
    HOME_EDIT_GROUP_FIELDS[group].forEach((fieldKey) => {
      nextDraft[fieldKey] = getHomeConfig(siteConfigMap, fieldKey);
    });
    setDraft(nextDraft);
    setEditingGroup(group);
    setEditMode(true);
  };

  const updateDraft = (fieldKey, value) => {
    setDraft((current) => ({ ...current, [fieldKey]: value }));
  };

  const uploadDraftImage = async (fieldKey, file) => {
    setUploadingKey(fieldKey);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = result?.file_url || result?.url;
      if (!fileUrl) throw new Error('UploadFile did not return file_url');
      setDraft((current) => ({ ...current, [fieldKey]: fileUrl }));
      toast.success('Imazhi u ngarkua');
    } catch (error) {
      console.error('Homepage image upload failed', error);
      toast.error('Nuk u ngarkua imazhi');
    } finally {
      setUploadingKey(null);
    }
  };

  const saveEditingGroup = async () => {
    if (!editingGroup) return;
    setSavingEdit(true);
    try {
      for (const fieldKey of HOME_EDIT_GROUP_FIELDS[editingGroup]) {
        const value = draft[fieldKey] ?? '';
        const existing = siteConfigs.find((config) => config.key === fieldKey);
        if (existing) {
          await base44.entities.SiteConfig.update(existing.id, { value });
        } else {
          await base44.entities.SiteConfig.create({
            key: fieldKey,
            value,
            label: HOME_EDIT_LABELS[fieldKey] || fieldKey,
            group: 'home_visual_editor',
          });
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['siteConfig'] });
      toast.success('Ndryshimet u ruajtën');
      setEditingGroup(null);
    } catch (error) {
      console.error('Homepage edit save failed', error);
      toast.error('Nuk u ruajtën ndryshimet');
    } finally {
      setSavingEdit(false);
    }
  };

  const editableClass = editMode ? ' antokton-admin-edit-target' : '';
  const stopEditNavigation = (event, group) => {
    if (!editMode) return;
    event.preventDefault();
    event.stopPropagation();
    startEditing(group);
  };

  const DESKTOP_HERO_IMG = '/local-assets/122fac317_Antoktonfrontpage.jpg';
  const adminEditToggle = canEdit && (
    <button
      type="button"
      onClick={() => {
        setEditMode((current) => !current);
        setEditingGroup(null);
      }}
      className={`absolute right-4 top-4 z-40 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-2xl backdrop-blur-md transition ${
        editMode
          ? 'border-[#9bffd6]/60 bg-[#9bffd6]/20 text-white'
          : 'border-white/15 bg-black/55 text-white/85 hover:bg-black/70'
      }`}
      title="Aktivizo ose mbyll editimin vizual"
    >
      <Edit3 className="h-4 w-4" />
      {editMode ? 'Mbyll editimin' : 'Edito faqen'}
    </button>
  );

  const adminEditPanel = canEdit && editMode && editingGroup && (
    <div className="absolute right-4 top-16 z-40 w-[min(380px,calc(100%-32px))] overflow-hidden rounded-2xl border border-white/15 bg-[#07111f]/95 text-white shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2">
          {editingGroup === 'text' ? <Type className="h-4 w-4 text-[#9bffd6]" /> : editingGroup === 'background' ? <ImageIcon className="h-4 w-4 text-[#9bffd6]" /> : <SlidersHorizontal className="h-4 w-4 text-[#9bffd6]" />}
          <div>
            <p className="text-sm font-bold">{HOME_EDIT_GROUP_TITLES[editingGroup]}</p>
            <p className="text-[11px] text-white/45">Ndryshimet ruhen në SiteConfig lokale</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setEditingGroup(null)}
          className="rounded-full p-1 text-white/55 transition hover:bg-white/10 hover:text-white"
          title="Mbyll panelin"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[62vh] space-y-3 overflow-y-auto p-4">
        {HOME_EDIT_GROUP_FIELDS[editingGroup].map((fieldKey) => (
          <AdminEditField
            key={fieldKey}
            fieldKey={fieldKey}
            value={draft[fieldKey]}
            onChange={updateDraft}
            onUpload={uploadDraftImage}
            uploadingKey={uploadingKey}
          />
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
        <button
          type="button"
          onClick={() => setEditingGroup(null)}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 transition hover:bg-white/10 hover:text-white"
        >
          Anulo
        </button>
        <button
          type="button"
          onClick={saveEditingGroup}
          disabled={savingEdit}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-[#8ab4ff] to-[#9bffd6] px-3 py-2 text-xs font-bold text-[#07111f] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingEdit ? (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#07111f]/25 border-t-[#07111f]" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Ruaj
        </button>
      </div>
    </div>
  );

  const editHint = canEdit && editMode && (
    <div className="absolute left-4 top-4 z-40 rounded-full border border-white/15 bg-black/55 px-3 py-2 text-[11px] font-semibold text-white/75 backdrop-blur-md">
      Kliko elementin që do të ndryshosh
    </div>
  );

  const heroSloganStyles = (
    <style>{`
      .antokton-hero-light-text {
        display: block;
        color: transparent;
        -webkit-text-fill-color: transparent;
        font-weight: 900;
        font-size: 38px;
        line-height: 1.14;
        letter-spacing: 0;
        text-align: center;
        background-image: linear-gradient(
          100deg,
          transparent 0%,
          transparent 42%,
          rgba(255,255,255,0.96) 50%,
          transparent 58%,
          transparent 100%
        );
        background-size: 220% 140%;
        background-position: 240% 50%;
        -webkit-background-clip: text;
        background-clip: text;
        filter: none;
        animation: antoktonHeroLightSweep 15s linear infinite;
        transition: color 0.2s ease, filter 0.2s ease, text-shadow 0.2s ease;
      }

      .antokton-hero-light-title:hover .antokton-hero-light-text,
      .antokton-mobile-hero-slogan:hover .antokton-hero-light-text {
        animation-play-state: paused;
        background-image: none;
        color: rgba(255,255,255,0.96);
        -webkit-text-fill-color: rgba(255,255,255,0.96);
        text-shadow:
          0 4px 18px rgba(0,0,0,0.9),
          0 0 12px rgba(255,255,255,0.22);
        filter: none;
      }

      .antokton-mobile-hero-slogan {
        position: absolute;
        top: clamp(238px, 43%, 380px);
        left: 7%;
        right: 7%;
        z-index: 2;
        transform: translateY(-50%);
        text-align: center;
        pointer-events: none;
      }

      .antokton-mobile-hero-slogan .antokton-hero-light-title {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: clamp(5px, 1vh, 8px);
        margin: 0;
        text-transform: uppercase;
        pointer-events: auto;
        text-shadow: none;
      }

      .antokton-mobile-hero-line {
        max-width: 100%;
        white-space: nowrap;
        font-size: clamp(18px, 5.9vw, 29px);
        line-height: 1.02;
        letter-spacing: 0;
      }

      .antokton-mobile-hero-line-secondary {
        font-size: clamp(12px, 3.9vw, 19px);
        line-height: 1.12;
      }

      @keyframes antoktonHeroLightSweep {
        0% {
          background-position: 240% 50%;
        }
        6% {
          background-position: 240% 50%;
        }
        72% {
          background-position: -240% 50%;
        }
        100% {
          background-position: -240% 50%;
        }
      }

      @media (max-width: 380px) {
        .antokton-mobile-hero-slogan {
          left: 5%;
          right: 5%;
          top: clamp(228px, 42%, 350px);
        }

        .antokton-mobile-hero-line {
          font-size: clamp(17px, 5.9vw, 23px);
        }

        .antokton-mobile-hero-line-secondary {
          font-size: clamp(11px, 3.7vw, 15px);
        }
      }

      @media (max-height: 700px) {
        .antokton-mobile-hero-slogan {
          top: 41%;
        }
      }

      @media (max-width: 1100px) and (min-width: 768px) {
        .antokton-hero-light-text {
          font-size: 32px;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .antokton-hero-light-text {
          animation-duration: 22s;
        }
      }
    `}</style>
  );

  const adminEditStyles = canEdit && (
    <style>{`
      .antokton-admin-edit-target {
        position: relative;
        outline: 2px solid rgba(155, 255, 214, 0.9);
        outline-offset: 5px;
        border-radius: 12px;
        cursor: pointer !important;
        pointer-events: auto !important;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.02), 0 0 22px rgba(155, 255, 214, 0.22);
      }
      .antokton-admin-edit-target::after {
        content: attr(data-edit-label);
        position: absolute;
        left: 8px;
        top: 8px;
        z-index: 5;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.18);
        background: rgba(7,17,31,0.82);
        color: rgba(255,255,255,0.9);
        padding: 4px 8px;
        font-size: 11px;
        font-weight: 700;
        line-height: 1;
        backdrop-filter: blur(8px);
      }
    `}</style>
  );

  // ---- TABLET + MOBILE: gjithçka fit në ekran pa scroll ----
  if (isTablet || isMobile) {
    const noticeBottom = realNotifHeight > 0 ? realNotifHeight : 86;
    const topOffset = noticeBottom + mobileLogoOffset + 12;
    return (
      <div style={{ width: '100%', height: 'calc(100vh - 64px)', background: '#000', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {adminEditStyles}
        {heroSloganStyles}
        {adminEditToggle}
        {adminEditPanel}
        {editHint}

        {/* Harta mban edhe logon siper, pa shirit sfondi */}
        <div
          className={editMode ? 'antokton-admin-edit-target' : ''}
          data-edit-label="Harta"
          onClick={editMode ? () => startEditing('background') : undefined}
          style={{ position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden' }}
        >
          <img
            src={MASTER_IMG_URL}
            alt=""
            style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none', objectFit: 'cover', objectPosition: 'center 30%' }}
          />
          <div
            className={editableClass}
            data-edit-label="Logo"
            onClick={editMode ? (event) => { event.stopPropagation(); startEditing('logo'); } : undefined}
            style={{ position: 'absolute', top: `${topOffset}px`, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: editMode ? 'auto' : 'none', zIndex: 2 }}
          >
            <img
              src={theme === 'light' ? LOGO_LIGHT : LOGO_DARK}
              alt="AnTOKëtonë"
              style={{ width: '80%', maxWidth: 420, height: 'auto', display: 'block', filter: 'drop-shadow(0 6px 18px rgba(0,0,0,0.55)) drop-shadow(0 6px 18px rgba(255,80,40,0.25))' }}
            />
          </div>
          <div
            className={`antokton-mobile-hero-slogan${editMode ? ' antokton-admin-edit-target' : ''}`}
            data-edit-label="Teksti"
            onClick={editMode ? (event) => { event.stopPropagation(); startEditing('text'); } : undefined}
          >
            <h1 className="antokton-hero-light-title" aria-label={`${MOBILE_HERO_LINE_1}. ${MOBILE_HERO_LINE_2}`}>
              <div className="antokton-hero-light-text antokton-mobile-hero-line" data-text={MOBILE_HERO_LINE_1}>{MOBILE_HERO_LINE_1}</div>
              <div className="antokton-hero-light-text antokton-mobile-hero-line antokton-mobile-hero-line-secondary" data-text={MOBILE_HERO_LINE_2}>{MOBILE_HERO_LINE_2}</div>
            </h1>
          </div>
          {/* Butonat + Banner absolute brenda hartës */}
          <div
            className={editableClass}
            data-edit-label="Butonat"
            onClick={editMode ? (event) => { event.stopPropagation(); startEditing('buttons'); } : undefined}
            style={{ position: 'absolute', bottom: `${mobileButtonsBottom}%`, left: '2%', right: '2%', display: 'flex', flexDirection: 'column', gap: '6px', transition: 'bottom 0.3s ease' }}
          >
            {/* Butonat */}
            <div style={{ display: 'flex', gap: '1.5%' }}>
              <Link to={createPageUrl('Feed') + `?category=${encodeURIComponent('pune')}`}
                style={{ flex: 1, cursor: 'pointer', transition: 'opacity 0.3s', display: 'inline-block', lineHeight: 0 }}
                onClick={(event) => stopEditNavigation(event, 'buttons')}
                onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                <img src={BTN_PUNE_IMG} alt="Punë në Europë" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </Link>

              <Link to={createPageUrl('Statuset')}
                style={{ flex: 1, cursor: 'pointer', transition: 'opacity 0.3s', display: 'inline-block', lineHeight: 0 }}
                onClick={(event) => stopEditNavigation(event, 'buttons')}
                onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                <img src={BTN_KOMUNITET_IMG} alt="Komunitet" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </Link>
              <Link to={createPageUrl('About')}
                style={{ flex: 1, cursor: 'pointer', transition: 'opacity 0.3s', display: 'inline-block', lineHeight: 0 }}
                onClick={(event) => stopEditNavigation(event, 'buttons')}
                onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
                <img src={BTN_EDUKIM_IMG} alt="Edukim & Media" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </Link>
            </div>
            {/* Banner direkt poshtë butonave */}
            {showBanner && (
              <div style={{ position: 'relative' }}
                className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-3">
                <button onClick={onDismissBanner} className="absolute top-2 right-2 text-yellow-200/60 hover:text-yellow-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-start gap-2 mb-2 pr-5">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  </div>
                  <div>
                    <div className="text-white font-bold text-sm mb-0.5">Platforma jonë po rritet!</div>
                    <div className="text-yellow-100/80 text-xs">Abonohu si i pari dhe merrni <span className="font-bold text-yellow-300">30% ulje</span> në planin Premium. Mos humbisni këtë mundësi ekskluzive!</div>
                  </div>
                </div>
                <Link to={createPageUrl("Subscriptions")}
                  className="block w-full text-center py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold text-sm hover:opacity-90 transition-opacity">
                  Abonohu Tani
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- DESKTOP: harta + logo transparente sipër, pa shirit të zi ----
  if (!isMobile) {
    return (
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '38px' }}>
        <div style={{ position: 'relative', width: '100%', aspectRatio: '1024 / 649', minHeight: 520, maxHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>
          {adminEditStyles}
          {heroSloganStyles}
          {adminEditToggle}
          {adminEditPanel}
          {editHint}
          <img
            src={MASTER_IMG_URL}
            alt=""
            style={{ position: 'absolute', inset: 0, top: '-5%', width: '100%', height: '110%', objectFit: 'cover', objectPosition: 'center center', display: 'block', pointerEvents: 'none' }}
          />
          {editMode && (
            <button
              type="button"
              className="antokton-admin-edit-target"
              data-edit-label="Harta"
              onClick={() => startEditing('background')}
              style={{ position: 'absolute', inset: 0, zIndex: 1, border: 0, background: 'transparent' }}
              title="Ndrysho imazhin e hartës"
            />
          )}

          <div
            className={editableClass}
            data-edit-label="Logo"
            onClick={editMode ? (event) => { event.stopPropagation(); startEditing('logo'); } : undefined}
            style={{ position: 'absolute', top: `${logoTopDesktop}%`, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: editMode ? 'auto' : 'none', zIndex: 3 }}
          >
            <img
              src={theme === 'light' ? LOGO_LIGHT : LOGO_DARK}
              alt="Antokton"
              style={{ width: `${logoWidthDesktop}%`, maxWidth: 560, minWidth: 320, height: 'auto', display: 'block', filter: 'drop-shadow(0 10px 24px rgba(0,0,0,0.6)) drop-shadow(0 4px 16px rgba(255,80,40,0.25))' }}
            />
          </div>

          <div
            className={editableClass}
            data-edit-label="Teksti"
            onClick={editMode ? (event) => { event.stopPropagation(); startEditing('text'); } : undefined}
            style={{
            position: 'absolute',
            top: `${textTopDesktop}%`,
            left: '8%',
            right: '8%',
            transform: 'translateY(-50%)',
            textAlign: 'center',
            color: '#fff',
            pointerEvents: 'auto',
            zIndex: 3
          }}>
            <h1 className="antokton-hero-light-title" title="Mbaje mouse-in sipër për ta shfaqur tekstin komplet" style={{ margin: 0 }}>
              <div className="antokton-hero-light-text">{HERO_LINE_1}</div>
              <div className="antokton-hero-light-text">{HERO_LINE_2}</div>
            </h1>
          </div>

          <div
            className={editableClass}
            data-edit-label="Butonat"
            onClick={editMode ? (event) => { event.stopPropagation(); startEditing('buttons'); } : undefined}
            style={{ position: 'absolute', left: '10%', right: '10%', bottom: `${buttonsBottomDesktop}%`, display: 'flex', gap: '2%', transition: 'bottom 0.3s ease', zIndex: 3 }}
          >
            <Link to={createPageUrl('Feed') + `?category=${encodeURIComponent('pune')}`}
              style={{ flex: 1, cursor: 'pointer', transition: 'opacity 0.3s', display: 'inline-block', lineHeight: 0 }}
              onClick={(event) => stopEditNavigation(event, 'buttons')}
              onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <img src={BTN_PUNE_IMG} alt="Punë në Europë" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </Link>

            <Link to={createPageUrl('Statuset')}
              style={{ flex: 1, cursor: 'pointer', transition: 'opacity 0.3s', display: 'inline-block', lineHeight: 0 }}
              onClick={(event) => stopEditNavigation(event, 'buttons')}
              onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <img src={BTN_KOMUNITET_IMG} alt="Komunitet" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </Link>

            <Link to={createPageUrl('About')}
              style={{ flex: 1, cursor: 'pointer', transition: 'opacity 0.3s', display: 'inline-block', lineHeight: 0 }}
              onClick={(event) => stopEditNavigation(event, 'buttons')}
              onMouseEnter={hoverIn} onMouseLeave={hoverOut}>
              <img src={BTN_EDUKIM_IMG} alt="Edukim & Media" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </Link>
          </div>

          {/* Promo banner — brenda imazhit, nën butonat */}
          {showBanner && (
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 16px', background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)', paddingTop: '32px' }}>
              <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}
                className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-xl p-2.5">
                <div className="flex items-center gap-2 pr-6">
                  <div className="w-6 h-6 rounded-full bg-yellow-500/30 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-white font-bold text-xs">Platforma jonë po rritet! </span>
                    <span className="text-yellow-100/80 text-xs">Abonohu si i pari dhe merr <span className="font-bold text-yellow-300">30% ulje</span> në Premium.</span>
                  </div>
                  <Link to={createPageUrl("Subscriptions")}
                    className="flex-shrink-0 text-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-semibold text-xs hover:opacity-90 transition-opacity">
                    Abonohu Tani
                  </Link>
                </div>
                <button onClick={onDismissBanner} className="absolute top-2 right-2 text-yellow-200/60 hover:text-yellow-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // fallback (nuk duhet arritur)
  return null;
}



export default function Home() {
  const [isAuth, setIsAuth] = React.useState(false);
  const [showBanner, setShowBanner] = React.useState(true);
  const [theme, setTheme] = React.useState(() => document.body.className.includes('theme-light') ? 'light' : 'dark');
  const [language, setLanguage] = React.useState(getLanguage());
  const [notifHeight, setNotifHeight] = React.useState(0);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleLanguageChange = (e) => setLanguage(e.detail.lang);
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  React.useEffect(() => {
    const measure = () => {
      // Gjej kontejnerin e njoftimeve (fixed, top-20)
      const notifContainer = document.querySelector('.fixed.top-20, .fixed[class*="top-"]');
      if (notifContainer) {
        const rect = notifContainer.getBoundingClientRect();
        // lartësia e njoftimeve nga fundi i navbar-it (64px)
        setNotifHeight(Math.max(0, rect.bottom - 64));
      } else {
        setNotifHeight(0);
      }
    };
    const t1 = setTimeout(measure, 200);
    const t2 = setTimeout(measure, 800);
    const t3 = setTimeout(measure, 1500);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); window.removeEventListener('resize', measure); };
  }, []);

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setTheme(document.body.className.includes('theme-light') ? 'light' : 'dark');
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await base44.auth.isAuthenticated();
      setIsAuth(authenticated);
      if (authenticated) {
        // Loguari nuk e sheh bannerin kurrë
        setShowBanner(false);
        return;
      }
      // Vizitor: kontrollo nëse ka përfituar nga ndonjë ofertë
      const me = authenticated ? await base44.auth.me() : null;
      const hasBenefit = me && (
        me.subscription_type && me.subscription_type !== "none" ||
        me.posts_remaining > 0 ||
        me.invited_by
      );
      if (hasBenefit) setShowBanner(false);
    };
    checkAuth();
  }, []);

  const dismissBanner = () => {
    // Mbyll vetëm për këtë sesion — do rishfaqet pas refresh nëse nuk është loguar
    setShowBanner(false);
  };

  const shouldShowBanner = showBanner && !isAuth;

  React.useEffect(() => {
    document.title = 'Antokton | Platforma e Shqiptarëve në Europë';
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Antokton është platformë shqiptare për komunitet, punë, treg, edukim dhe mundësi në Europë.');
    } else {
      const meta = document.createElement('meta');
      meta.name = 'description';
      meta.content = 'Antokton është platformë shqiptare për komunitet, punë, treg, edukim dhe mundësi në Europë.';
      document.head.appendChild(meta);
    }
  }, []);

  const { data: siteConfigs = [] } = useQuery({
    queryKey: ["siteConfig"],
    queryFn: () => base44.entities.SiteConfig.list(),
    staleTime: 60 * 1000,
  });

  const siteConfigMap = React.useMemo(() => siteConfigToMap(siteConfigs), [siteConfigs]);

  const { data: latestJobs = [] } = useQuery({
    queryKey: ["latestJobs"],
    queryFn: () => base44.entities.Job.filter({ status: "approved" }, "-created_date", 10),
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const { data: featuredJobs = [] } = useQuery({
    queryKey: ["homepageFeatured"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const featured = await base44.entities.FeaturedJob.filter({ is_active: true });
      // Filtro ato që nuk kanë skaduar
      return featured.filter(f => f.end_date > now);
    },
    staleTime: 5 * 60 * 1000,
  });

  const displayJobs = React.useMemo(() => {
    if (featuredJobs.length === 0) return latestJobs.slice(0, 10);

    // Merr job_id-të e featured
    const featuredJobIds = new Set(featuredJobs.map(f => f.job_id));

    // Filtro njoftimet premium nga lista e fundit (max 8)
    const premiumJobs = latestJobs.filter(j => featuredJobIds.has(j.id)).slice(0, 8);
    const premiumIds = new Set(premiumJobs.map(j => j.id));

    // Plotëso me normale deri në 10
    const normalJobs = latestJobs.filter(j => !premiumIds.has(j.id)).slice(0, 10 - premiumJobs.length);

    return [...premiumJobs, ...normalJobs];
  }, [latestJobs, featuredJobs]);

  return (
    <div style={{
      background: 'linear-gradient(to bottom, #000 0%, #0f172a 400px, #0f172a 100%)',
      minHeight: '100vh',
      overflowX: 'hidden',
    }}>
      <EventNotifications />
      <LandingBanner
        theme={theme}
        notifHeight={notifHeight}
        showBanner={shouldShowBanner}
        onDismissBanner={dismissBanner}
        siteConfigs={siteConfigs}
        siteConfigMap={siteConfigMap}
        canEdit={false}
      />

      <CategoryCards />

      {/* Si Punon Antokton */}
      <section className="py-8 sm:py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-7 sm:mb-10">
            <h2 className="text-lg sm:text-3xl font-black text-white tracking-wide uppercase mb-2">
              {t('si_punon_antokton', language)}
            </h2>
            <p className="text-white/70 text-xs sm:text-sm">{t('tre_hapa_thjeshte', language)}</p>
          </div>
          
          <div className="grid grid-cols-3 md:grid-cols-3 gap-4 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20 flex items-center justify-center mx-auto mb-3 sm:mb-5 border border-white/10">
                <UserPlus className="w-6 h-6 sm:w-10 sm:h-10 text-[#8ab4ff]" />
              </div>
              <div className="text-lg sm:text-3xl font-black text-white/90 mb-1 sm:mb-3">01</div>
              <h3 className="text-sm sm:text-xl font-bold text-white mb-1 sm:mb-2 leading-tight">{t('regjistrohu', language)}</h3>
              <p className="text-white/65 text-[11px] sm:text-sm leading-relaxed hidden sm:block">
                {t('krijo_llogarine', language)}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20 flex items-center justify-center mx-auto mb-3 sm:mb-5 border border-white/10">
                <Search className="w-6 h-6 sm:w-10 sm:h-10 text-[#9bffd6]" />
              </div>
              <div className="text-lg sm:text-3xl font-black text-white/90 mb-1 sm:mb-3">02</div>
              <h3 className="text-sm sm:text-xl font-bold text-white mb-1 sm:mb-2 leading-tight">{t('posto_ose_kerko', language)}</h3>
              <p className="text-white/65 text-[11px] sm:text-sm leading-relaxed hidden sm:block">
                {t('posto_njoftime_pune', language)}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="w-12 h-12 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#8ab4ff]/20 to-[#9bffd6]/20 flex items-center justify-center mx-auto mb-3 sm:mb-5 border border-white/10">
                <Users className="w-6 h-6 sm:w-10 sm:h-10 text-[#8ab4ff]" />
              </div>
              <div className="text-lg sm:text-3xl font-black text-white/90 mb-1 sm:mb-3">03</div>
              <h3 className="text-sm sm:text-xl font-bold text-white mb-1 sm:mb-2 leading-tight">{t('lidhu', language)}</h3>
              <p className="text-white/65 text-[11px] sm:text-sm leading-relaxed hidden sm:block">
                {t('ndervepro', language)}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Latest Posts */}
      {displayJobs.length > 0 && (
        <section className="py-6 sm:py-10 px-4 sm:px-6 bg-transparent">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div>
                <h2 className="text-base sm:text-2xl font-black text-white tracking-wide uppercase">
                  {t('njoftimet_e_fundit', language)}
                </h2>
                <p className="text-white/65 text-xs sm:text-sm mt-0.5">{t('postimet_me_te_reja', language)}</p>
              </div>
              <Link
                to={createPageUrl("Feed")}
                className="group flex items-center gap-1.5 text-sm font-medium text-white/80 hover:text-white transition-colors"
              >
                {t('shiko_te_gjitha', language)}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
              {displayJobs.map((job, i) => {
                const isFeatured = featuredJobs.some(f => f.job_id === job.id);
                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className={isFeatured ? "relative" : ""}
                  >
                    {isFeatured && (
                      <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                        ★ Premium
                      </div>
                    )}
                    <JobCard job={job} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
