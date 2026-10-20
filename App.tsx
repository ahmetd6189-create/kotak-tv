import {resolvePlayback,loadChannelGuide,requestGuideText,accountFor} from "./src/native/provider";
import {assistantIntent,assistantChannels,assistantAnswer} from "./src/native/assistant";
import {EpisodePanel} from "./src/ui/EpisodePanel";
import {DirectPlay} from "./src/ui/DirectPlay";
import {CatalogView,PosterRail} from "./src/ui/CatalogView";
import {CategoriesPage} from "./src/ui/CategoriesPage";
import {quickCatalog,mergeCatalog,restoreAddress} from "./src/native/loading";
import {FollowPanel,type FollowDraft} from "./src/ui/FollowPanel";
import {savedFollows,saveFollows,seedFollows,followPermission,observeFollowCatalog,syncTeamReminders,cancelFollowNotifications,type FollowRule} from "./src/native/follows";
import {SharePanel} from "./src/ui/SharePanel";
import {expiryMessage,type Entitlement} from "./src/native/entitlement";
import {ReminderPicker} from "./src/ui/ReminderPicker";
import {MediaDetails} from "./src/ui/MediaDetails";
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  AppState,
  Alert,
  BackHandler,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import {AudioDiagnostics} from "./src/ui/AudioDiagnostics";
import {HomeActions,CategoryPicker} from "./src/ui/HomeControls";
import {VoiceSearch} from "./src/ui/VoiceSearch";
import {ImdbPanel} from "./src/ui/ImdbPanel";
import {EpgSettings} from "./src/ui/EpgSettings";
import {mediaTitle,rankedMedia,displayRanked,scheduleFor,buildVoiceIndex} from "./src/native/catalog-tools";
import {metadataKey,type ImdbInfo} from "./src/native/imdb";
import {scheduledReminders,toggleReminder} from "./src/native/reminders";
import * as SecureStore from "expo-secure-store";
import { cacheCatalog, cachedCatalog, cacheGuide, cachedGuide, removeCache } from "./src/native/cache";
import { childEntries } from "./src/native/offline";
import { ParentPanel, PROTECTION_KEY, type Protection } from "./src/ui/ParentPanel";
import { FeaturesPanel, ProPanel, AboutPanel, FEATURE_NAMES } from "./src/ui/KotakFeatures";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import {
  Check,
  ChevronRight,
  Film,
  FolderOpen,
  Grid2X2,
  Layers,
  ListVideo,
  Maximize2,
  Mic,
  Play,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Tv,
  Users,
  WifiOff,
  X,
} from "lucide-react-native";
import { CustomBottomNav } from "./src/components/CustomBottomNav";
import { TopBar } from "./src/components/TopBar";
import { CategoriesList } from "./src/components/CategoriesList";
import { NoPlaylistsView } from "./src/components/NoPlaylistsView";
import { PlaylistForm } from "./src/native/PlaylistForm";
import { PlaybackPanel } from "./src/native/Player";
import {
  ChannelCard,
  EpgScreen,
  IconButton,
  LibraryScreen,
  MediaRail,
  MoreScreen,
  PageHeader,
  Pill,
  ProgramBar,
  RecentCard,
  SearchPanel,
  Sheet,
  clock,
  d,
} from "./src/ui/Design";
import { SettingsView, type Preferences } from "./src/ui/SettingsView";
import {
  loadEpisodes,
  loadMediaInfo,
  type ProviderInfo,
  parseGuideAsync,
  inferredEpgUrl,
  requestText,
  type Entry,
  type Guide,
  type PlaylistConfig,
  type Program,
} from "./src/native/iptv";
import {
  deletePlaylist,
  savedPlaylists,
  savePlaylist,
} from "./src/native/storage";
import { colors } from "./src/theme";
import type { BottomNavTab, MainTab } from "./src/types/iptv";
export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <KotakApp />
    </SafeAreaProvider>
  );
}
function KotakApp() {
  const insets = useSafeAreaInsets();
  const [configs, setConfigs] = useState<PlaylistConfig[]>([]);
  const [catalogs, setCatalogs] = useState<Record<string, Entry[]>>({});
  const [guides, setGuides] = useState<Guide>({});
  const guidesRef=useRef<Guide>({});const guidePublishTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const catalogsRef=useRef(catalogs);catalogsRef.current=catalogs;
  const [guideFocus,setGuideFocus]=useState<{channelId:string;programStart:number}|null>(null);
  const channelFlights=useRef(new Map<string,{signal:AbortSignal;promise:Promise<Guide>}>());const epgJobs=useRef(new Set<AbortController>());const epgCacheTimer=useRef<ReturnType<typeof setTimeout>|null>(null);const epgAddresses=useRef(new Map<string,string>());
  const playJob=useRef<AbortController|null>(null);const [preparing,setPreparing]=useState<string|null>(null);
  const vodTask=useRef<Promise<void>|null>(null);
  const [guideNotice, setGuideNotice] = useState(
    "EPG bağlantısı bulunamadı. Liste ayarlarından XMLTV adresi ekleyebilirsiniz.",
  );
  const [top, setTop] = useState<MainTab>("ANASAYFA");
  const [tab, setTab] = useState<BottomNavTab>("ANASAYFA");
  const [filter, setFilter] = useState("Tümü");
  const [query, setQuery] = useState("");
  const [add, setAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [boot, setBoot] = useState(true);
  const [loadingVod,setLoadingVod]=useState(false);
  const vodJob=useRef<AbortController|null>(null);
  const guideJob=useRef<AbortController|null>(null);
  const vodReady=useRef(new Set<string>());
  const liveFresh=useRef(new Set<string>());
  const [loadingLists, setLoadingLists] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [playing, setPlaying] = useState<Entry[]>([]);
  const playingRef=useRef(playing);playingRef.current=playing;
  const [mini, setMini] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const positions=useRef<Record<string,{position:number;duration:number}>>({});
  const progressSavedAt=useRef(0);
  const recordProgress=useCallback((id:string,position:number,duration:number)=>{if(!Number.isFinite(position)||position<0)return;positions.current[id]={position:duration>0&&duration-position<30?0:position,duration:Number.isFinite(duration)?duration:0};if(Date.now()-progressSavedAt.current<10000)return;progressSavedAt.current=Date.now();const recentPositions=Object.fromEntries(Object.entries(positions.current).slice(-50));void AsyncStorage.setItem("kotak.positions",JSON.stringify(recentPositions)).catch(()=>{});},[]);
  const [recent, setRecent] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [episodes, setEpisodes] = useState<Entry[] | null>(null);
  const [episodeBusy, setEpisodeBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [screen, setScreen] = useState<null | "library" | "settings">(null);
  const [info, setInfo] = useState<string | null>(null);
  const [followOpen,setFollowOpen]=useState(false);
  const [followDraft,setFollowDraft]=useState<FollowDraft|undefined>();
  const [followRules,setFollowRules]=useState<FollowRule[]>([]);
  const [shareOpen,setShareOpen]=useState(false);
  const [entitlement,setEntitlement]=useState<Entitlement|null>(null);
  const [pendingReminder,setPendingReminder]=useState<{item:Entry;program:Program}|null>(null);
  const [catalogPage,setCatalogPage]=useState<null|"trend-movies"|"trend-series"|"new-movies"|"updated-series">(null);
  const [directPlay,setDirectPlay]=useState(false);
  const [categoryBrowse,setCategoryBrowse]=useState(false);
  const [providerDetails,setProviderDetails]=useState<Record<string,ProviderInfo>>({});
  const [detailsBusy,setDetailsBusy]=useState(false);
  const [mediaDetails,setMediaDetails]=useState<Entry|null>(null);
  const [details, setDetails] = useState<Entry | null>(null);
  const [settings, setSettings] = useState<Preferences>({
    layout: "Klasik",
    saveHistory: true,
  });
  const [protection, setProtection] = useState<Protection | null>(null);
  const [child, setChild] = useState(false);
  const childRef=useRef(child);childRef.current=child;
  const [securityReady, setSecurityReady] = useState(false);
  const [securityError, setSecurityError] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [cacheTime, setCacheTime] = useState<number | null>(null);
  const [audioTestOpen,setAudioTestOpen]=useState(false);
  const [voiceOpen,setVoiceOpen]=useState(false);
  const [categoryOpen,setCategoryOpen]=useState(false);
  const [homeCategories,setHomeCategories]=useState<string[]|null>(null);
  const [imdbOpen,setImdbOpen]=useState(false);
  const [imdb,setImdb]=useState<Record<string,ImdbInfo>>({});
  const [epgSettingsOpen,setEpgSettingsOpen]=useState(false);
  const [reminders,setReminders]=useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const job = useRef<AbortController | null>(null);
  const episodeJob = useRef<AbortController | null>(null);
  const guideFlights=useRef(new Map<string,{signal:AbortSignal;promise:Promise<Guide>}>());
  const guideCache=useRef(new Map<string,{url:string;at:number;data:Guide}>());
  const rawEntries = useMemo(() => Object.values(catalogs).flat(), [catalogs]);
  const allEntries=useMemo(()=>Object.keys(imdb).length?rawEntries.map(item=>{if(item.kind==="live")return item;const data=imdb[metadataKey(item)];return data?{...item,imdbRating:data.rating,imdbId:data.id,released:data.released||data.year||item.released,genre:data.genre||item.genre,logo:data.poster||item.logo}:item}):rawEntries,[rawEntries,imdb]);
  const entries = useMemo(() => childEntries(allEntries, child, protection?.groups || []), [allEntries, child, protection]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const live = useMemo(
    () => entries.filter((e) => e.kind === "live"),
    [entries],
  );
  const movies = useMemo(
    () => entries.filter((e) => e.kind === "movie"),
    [entries],
  );
  const series = useMemo(
    () => entries.filter((e) => e.kind === "series" || e.kind === "episode"),
    [entries],
  );
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    live.forEach((e) => counts.set(e.group, (counts.get(e.group) || 0) + 1));
    return [...counts].map(([name, channelCount]) => ({
      id: name,
      name,
      channelCount,
    }));
  }, [live]);

  const epgChannels=useMemo(()=>homeCategories===null?live:live.filter(e=>homeCategories.includes(e.group)),[live,homeCategories]);
  const homeGroups=useMemo(()=>{const index=new Map(groups.map(g=>[g.name,g]));return homeCategories===null?groups:homeCategories.map(name=>index.get(name)).filter((g):g is typeof groups[number]=>!!g)},[groups,homeCategories]);
  const topMovies=useMemo(()=>displayRanked(movies.map(e=>({...e,rating:providerDetails[e.id]?.rating??e.rating})),"movie"),[movies,providerDetails]);
  const topSeries=useMemo(()=>displayRanked(series.map(e=>({...e,rating:providerDetails[e.id]?.rating??e.rating})),"series"),[series,providerDetails]);
  const newMovies=useMemo(()=>[...movies].sort((a,b)=>(b.added||0)-(a.added||0)).slice(0,50),[movies]);
  const updatedSeries=useMemo(()=>[...series].sort((a,b)=>(b.added||0)-(a.added||0)).slice(0,60),[series]);
  const continueWatching=useMemo(()=>recent.map(id=>byId.get(id)).filter((e):e is Entry=>!!e&&e.kind!=="live").slice(0,10),[recent,byId]);
  useEffect(()=>{setDetailsBusy(false);if(!mediaDetails)return;const config=configs.find(c=>c.id===mediaDetails.playlistId);if(!config||providerDetails[mediaDetails.id])return;const controller=new AbortController();setDetailsBusy(true);void loadMediaInfo(config,mediaDetails,controller.signal).then(value=>{if(value&&!controller.signal.aborted)setProviderDetails(prev=>({...prev,[mediaDetails.id]:value}));}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setDetailsBusy(false);});return()=>controller.abort();},[mediaDetails?.id]);

  function mergeGuide(value:Guide){
    // Keep assistant lookups current immediately; publish one immutable UI snapshot per burst.
    Object.assign(guidesRef.current,value);
    if(!guidePublishTimer.current)guidePublishTimer.current=setTimeout(()=>{guidePublishTimer.current=null;setGuides({...guidesRef.current});},120);
    return guidesRef.current;
  }
  function publishCatalog(config:PlaylistConfig,incoming:Entry[],kinds:import("./src/native/iptv").Kind[]){const next={...catalogsRef.current,[config.id]:mergeCatalog(catalogsRef.current[config.id]||[],incoming,kinds)};catalogsRef.current=next;setCatalogs(next);}
  function rememberEpg(config:PlaylistConfig,url?:string){if(!url||config.epgUrl||epgAddresses.current.has(config.id))return;epgAddresses.current.set(config.id,url);const updated={...config,epgUrl:url};setConfigs(prev=>prev.map(c=>c.id===config.id?updated:c));void savePlaylist(updated).catch(()=>{});}
  async function ensureChannelEpg(items:Entry[],parent?:AbortSignal):Promise<Guide>{
    if(AppState.currentState==="background"||AppState.currentState==="inactive"||parent?.aborted)return {};
    const missing=items.filter(e=>e.kind==="live"&&!scheduleFor(e,guidesRef.current).some(p=>p.end>Date.now()));if(!missing.length)return {};setGuideNotice("Görünür kanalların programları kontrol ediliyor…");
    const controller=new AbortController();epgJobs.current.add(controller);const abort=()=>controller.abort();parent?.addEventListener("abort",abort);if(parent?.aborted)abort();const timer=setTimeout(abort,18000);let index=0;const collected:Guide={};
    try{await Promise.all(Array.from({length:Math.min(3,missing.length)},async()=>{while(index<missing.length&&!controller.signal.aborted){const item=missing[index++],config=configs.find(c=>c.id===item.playlistId);if(!config||!accountFor(config))continue;const key=item.id;let flight=channelFlights.current.get(key);if(!flight||flight.signal.aborted){const promise=loadChannelGuide(config,item,controller.signal);flight={signal:controller.signal,promise};channelFlights.current.set(key,flight);void promise.finally(()=>{if(channelFlights.current.get(key)?.promise===promise)channelFlights.current.delete(key)}).catch(()=>{});}try{const data=await flight.promise;if(!controller.signal.aborted&&Object.keys(data).length){Object.assign(collected,data);mergeGuide(data);}}catch{}}}));
    if(Object.keys(collected).length){setGuideNotice("Kanal sunucusundan program akışı alındı.");if(epgCacheTimer.current)clearTimeout(epgCacheTimer.current);epgCacheTimer.current=setTimeout(()=>{for(const config of configs){const data=Object.fromEntries(Object.entries(guidesRef.current).filter(([key])=>key.startsWith(config.id+":")));void cacheGuide(config.id,data).catch(()=>{});}},3000);}
    if(!Object.keys(collected).length&&!controller.signal.aborted)setGuideNotice("Sağlayıcı bu kanallar için program göndermedi. Diğer kanallara bakabilir veya EPG kaynağını değiştirebilirsin.");return collected;}finally{clearTimeout(timer);parent?.removeEventListener("abort",abort);epgJobs.current.delete(controller);}
  }
  async function readGuide(config:PlaylistConfig,url:string|undefined,signal:AbortSignal,cacheEntries:Entry[]=[]):Promise<Guide>{
    if(AppState.currentState==="background"||AppState.currentState==="inactive"||signal.aborted)return {};
    url=url||epgAddresses.current.get(config.id)||inferredEpgUrl(config);const current=guideCache.current.get(config.id);
    if(url&&current?.url===url&&Date.now()-current.at<120000){mergeGuide(current.data);return current.data;}
    try{
      if(!url)throw new Error("EPG adresi yok");const address=url,key=config.id+":"+address;let flight=guideFlights.current.get(key);
      if(!flight||flight.signal.aborted){setGuideNotice("Program akışı alınıyor…");const promise=(async()=>{const text=await requestGuideText(address,signal);const parsed=await parseGuideAsync(text,Date.now(),signal);const data:Guide={};for(const [name,programs] of Object.entries(parsed))data[`${config.id}:${name}`]=programs;if(!Object.values(data).some(v=>v.length))throw new Error("EPG boş");if(!signal.aborted){guideCache.current.set(config.id,{url:address,at:Date.now(),data});mergeGuide(data);void cacheGuide(config.id,data).catch(()=>{});}return data;})();flight={signal,promise};guideFlights.current.set(key,flight);void promise.finally(()=>{if(guideFlights.current.get(key)?.promise===promise)guideFlights.current.delete(key)}).catch(()=>{});}
      const value=await flight.promise;if(!signal.aborted)setGuideNotice("Sağlayıcının mevcut yayın akışı alındı.");return value;
    }catch{if(signal.aborted){setGuideNotice("EPG yüklemesi durduruldu. Yenile ile tekrar deneyebilirsin.");return {};}setGuideNotice("XMLTV alınamadı; kanalların kendi EPG verisi kontrol ediliyor…");const candidates=cacheEntries.length?cacheEntries:(catalogsRef.current[config.id]||[]).filter(e=>e.kind==="live").slice(0,10);const fallback=await ensureChannelEpg(candidates,signal);if(!signal.aborted&&!Object.keys(fallback).length)setGuideNotice("Sağlayıcı bu kanallar için EPG göndermedi. EPG Kaynağı ayarını kontrol edebilirsin.");return fallback;}
  }
  useEffect(() => {
    const controller = new AbortController();
    job.current = controller;
    void (async () => {
      try {
        // Fail closed if protected profile storage cannot be read.
        try {
          const stored = await SecureStore.getItemAsync(PROTECTION_KEY);
          if (stored) {
            const value = JSON.parse(stored) as Protection;
            if (!/^\d{4,6}$/.test(value.pin) || !Array.isArray(value.groups)) throw new Error("Invalid profile");
            setProtection(value); setChild(true);
          }
          setSecurityReady(true);
        } catch { setSecurityError(true); return; }
        const [saved, fav, history] = await Promise.all([
          savedPlaylists(),
          AsyncStorage.getItem("kotak.favorites"),
          AsyncStorage.getItem("kotak.recent"),
        ]);
        if (controller.signal.aborted) return;
        const preferences = await AsyncStorage.getItem("kotak.preferences");
        if (preferences && !controller.signal.aborted)
          setSettings((prev) => ({ ...prev, ...JSON.parse(preferences) }));
        const [homeRaw,imdbRaw]=await Promise.all([AsyncStorage.getItem("kotak.homeCategories"),AsyncStorage.getItem("kotak.imdb")]);
        try{if(homeRaw){const data=JSON.parse(homeRaw);if(Array.isArray(data))setHomeCategories(data.filter((v):v is string=>typeof v==="string"));}}catch{}
        try{if(imdbRaw)setImdb(JSON.parse(imdbRaw));}catch{}
        void scheduledReminders().then(setReminders).catch(()=>{});
        try{const stored=JSON.parse(await AsyncStorage.getItem("kotak.positions")||"{}");positions.current=Object.fromEntries(Object.entries(stored).filter(([_,v])=>v&&typeof v==="object"&&Number.isFinite((v as any).position)&&(v as any).position>=0)) as typeof positions.current;}catch{}
        setFollowRules(await savedFollows());
        setConfigs(saved);
        setFavorites(JSON.parse(fav || "[]"));
        setRecent(JSON.parse(history || "[]"));
        setBoot(false);
        setLoadingLists(saved.length > 0);
        void (async()=>{for(const config of saved){const cache=await cachedCatalog(config.id).catch(()=>null);if(controller.signal.aborted)return;if(cache&&!liveFresh.current.has(config.id)){setCatalogs(prev=>({...prev,[config.id]:cache.entries.map(e=>restoreAddress(e,config))}));setCacheTime(cache.savedAt);}const storedGuide=await cachedGuide(config.id).catch(()=>null);if(storedGuide&&!controller.signal.aborted){mergeGuide(storedGuide.guide);setGuideNotice("Kayıtlı program rehberi gösteriliyor.");}}})().catch(()=>{});
        for (const config of saved) {
          try {
            const catalog = await quickCatalog(config,controller.signal,partial=>{if(!controller.signal.aborted){liveFresh.current.add(config.id);setLoadingLists(false);setCatalogs(prev=>({...prev,[config.id]:mergeCatalog(prev[config.id]||[],partial.entries,["live"])}));}});
            if (controller.signal.aborted) return;
            void observeNewContent(config,catalog.entries,controller.signal);
      liveFresh.current.add(config.id);
            if(catalog.entries.some(e=>e.kind!=="live"))vodReady.current.add(config.id);
            publishCatalog(config,catalog.entries,["live"]);rememberEpg(config,catalog.epgUrl);
            if (catalog.warnings.length) setMessage(catalog.warnings.join(" "));
            void cacheCatalog(config.id, catalog.entries).then(() => setCacheTime(Date.now())).catch(() => setMessage("Kanal önbelleği kaydedilemedi."));
          } catch (e) {
            if (!controller.signal.aborted) setMessage((e as Error).message);
          }
        }
      } catch {
        if (!controller.signal.aborted)
          setMessage(
            "Kayıtlı listeler okunamadı. Listeyi yeniden ekleyebilirsiniz.",
          );
      } finally {
        if (!controller.signal.aborted) { setBoot(false); setLoadingLists(false); }
      }
    })();
    return () => {
      controller.abort();
      if(guidePublishTimer.current)clearTimeout(guidePublishTimer.current);if(epgCacheTimer.current)clearTimeout(epgCacheTimer.current);episodeJob.current?.abort();vodJob.current?.abort();guideJob.current?.abort();playJob.current?.abort();for(const pending of epgJobs.current)pending.abort();
    };
  }, []);
  useEffect(() => {
    if (!protection || child) return;
    const listener = AppState.addEventListener("change", state => {
      if (state === "background") {
        episodeJob.current?.abort();
        setChild(true); setPlaying([]); setScreen(null); setEpisodes(null);
        setDetails(null); setSearchOpen(false); setInfo(null); setOptionsOpen(false); setAdd(false);setFollowOpen(false);setShareOpen(false);setPendingReminder(null);setMediaDetails(null);setVoiceOpen(false);setImdbOpen(false);setCategoryOpen(false);setEpgSettingsOpen(false);
      }
    });
    return () => listener.remove();
  }, [protection, child]);
  useEffect(() => {
    const timer = setInterval(() => {if(AppState.currentState==="active")setNow(Date.now());}, 30000);
    const listener=AppState.addEventListener("change",state=>{
      if(state==="active"){setNow(Date.now());return;}
      vodJob.current?.abort();guideJob.current?.abort();for(const request of epgJobs.current)request.abort();
    });
    return () => {clearInterval(timer);listener.remove();};
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (playing.length && !mini) {
        setMini(true);
        return true;
      }
      if(catalogPage||categoryBrowse){setCatalogPage(null);setCategoryBrowse(false);return true;}
      if (screen) {
        setScreen(null);
        return true;
      }
      if (tab !== "ANASAYFA") {
        setTab("ANASAYFA");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [playing.length, mini, tab, screen,catalogPage,categoryBrowse]);

  async function importList(config: PlaylistConfig, refreshing = false) {
    if (busy || boot) return;
    job.current?.abort();
    const controller = new AbortController();
    job.current = controller;
    setBusy(true); setLoadingLists(true); setFormError(""); setMessage("");
    let published = false;
    const publish = async (catalog: {entries: Entry[];epgUrl?:string}) => {
      if (controller.signal.aborted) return;
      if (!published) {
        const persisted={...config,epgUrl:config.epgUrl||catalog.epgUrl};await savePlaylist(persisted);
        if (controller.signal.aborted) return;
        published = true;
        setConfigs(prev => [...prev.filter(p => p.id !== config.id), {...config,epgUrl:config.epgUrl||catalog.epgUrl}]);
        setAdd(false); setBusy(false); setFilter("Tümü"); setQuery("");
        if (!refreshing) {setTab("ANASAYFA"); setTop("ANASAYFA");}
      }
      liveFresh.current.add(config.id);setLoadingLists(false);
      if(catalog.entries.some(e=>e.kind!=="live"))vodReady.current.add(config.id);
      publishCatalog(config,catalog.entries,["live"]);rememberEpg(config,catalog.epgUrl);
    };
    try {
      const catalog = await quickCatalog(config,controller.signal,publish);
      if (controller.signal.aborted) return;
      await publish(catalog);
      void observeNewContent(config,catalog.entries,controller.signal);
      setMessage(`${catalog.entries.length} içerik alındı.${catalog.warnings.length ? ` ${catalog.warnings.join(" ")}` : ""}`);
      // Persistence and EPG are independent background work, never an import gate.
      void cacheCatalog(config.id, catalog.entries).then(() => setCacheTime(Date.now())).catch(() => setMessage("Kanal önbelleği kaydedilemedi. Yayın izlemeye devam edebilirsiniz."));
    } catch (e) {
      if (!controller.signal.aborted) {
        const error = (e as Error).message;
        if (refreshing || published) setMessage(error); else setFormError(error);
      }
    } finally {
      if (!controller.signal.aborted) {setBusy(false); setLoadingLists(false);}
    }
  }
  async function refreshAll(){
    if(!configs.length){addList();return;}
    job.current?.abort();const controller=new AbortController();job.current=controller;setBusy(false);setBoot(false);setLoadingLists(true);setMessage("");
    try{for(const config of configs){
      if(controller.signal.aborted)return;
      try{const result=await quickCatalog(config,controller.signal,partial=>{if(!controller.signal.aborted){liveFresh.current.add(config.id);setLoadingLists(false);setCatalogs(prev=>({...prev,[config.id]:mergeCatalog(prev[config.id]||[],partial.entries,["live"])}));}});
       if(controller.signal.aborted)return;void observeNewContent(config,result.entries,controller.signal);publishCatalog(config,result.entries,["live"]);rememberEpg(config,result.epgUrl);
       void cacheCatalog(config.id,result.entries).catch(()=>{});
      }catch(e){if(!controller.signal.aborted)setMessage((e as Error).message);}
    }}finally{if(!controller.signal.aborted)setLoadingLists(false);}
  }
  function ensureVod():Promise<void>{
    if(child||loadingLists||AppState.currentState==="background"||AppState.currentState==="inactive")return Promise.resolve();if(vodTask.current)return vodTask.current;
    const pending=configs.filter(c=>!vodReady.current.has(c.id));if(!pending.length)return Promise.resolve();
    const controller=new AbortController();vodJob.current=controller;setLoadingVod(true);
    const task=(async()=>{try{for(const config of pending){try{
      const result=await quickCatalog(config,controller.signal,partial=>{if(!controller.signal.aborted)publishCatalog(config,partial.entries,["movie","series","episode"]);},["movie","series"],25000);if(controller.signal.aborted)return;
      publishCatalog(config,result.entries,["movie","series","episode"]);vodReady.current.add(config.id);void observeNewContent(config,result.entries,controller.signal);
    }catch(e){if(controller.signal.aborted)return;setMessage((e as Error).message);}}}finally{if(vodJob.current===controller){vodJob.current=null;vodTask.current=null;setLoadingVod(false);}}})();vodTask.current=task;return task;
  }
  async function resolveAssistant(spoken:string,signal:AbortSignal){
    const intent=assistantIntent(spoken);
    const dataset=()=>childEntries(Object.values(catalogsRef.current).flat().map(e=>{const value=e.kind!=="live"?imdb[metadataKey(e)]:undefined;return value?{...e,imdbRating:value.rating,genre:value.genre||e.genre}:e;}),childRef.current,protection?.groups||[]);
    let items=dataset();const local=assistantAnswer(buildVoiceIndex(items),spoken,guidesRef.current,imdb);
    const ready=intent==="match"||intent==="schedule"?local.schedule?.some(row=>row.programs.length):local.entries.length>0;
    if(!ready){let timer:ReturnType<typeof setTimeout>|undefined;const deadline=new Promise<void>(resolve=>{timer=setTimeout(resolve,8000);});
      try{if(intent==="match"||intent==="schedule"){vodJob.current?.abort();await Promise.race([ensureChannelEpg(assistantChannels(items,spoken).slice(0,12),signal),deadline]);}else await Promise.race([ensureVod(),deadline]);}finally{clearTimeout(timer);}items=dataset();}
    if(signal.aborted)throw new Error("İşlem iptal edildi.");return {entries:items,guide:guidesRef.current,metadata:imdb};
  }
  useEffect(()=>{if(top==="FILM"||top==="DIZI"||imdbOpen||catalogPage)void ensureVod();},[top,imdbOpen,catalogPage,configs,loadingLists,child]);
  // Let the first live screen paint before fetching the two VOD catalogs. Playback cancels this work.
  useEffect(()=>{if(boot||loadingLists||playing.length||voiceOpen||child||!configs.length||tab!=="ANASAYFA")return;const timer=setTimeout(()=>void ensureVod(),1200);return()=>clearTimeout(timer);},[boot,loadingLists,configs,child,playing.length,tab,voiceOpen]);
  useEffect(()=>{if(!configs.length||loadingLists||!(tab==="EPG"||details))return;const controller=new AbortController();guideJob.current=controller;for(const config of configs){if(accountFor(config))void ensureChannelEpg(epgChannels.filter(e=>e.playlistId===config.id).slice(0,8),controller.signal);else void readGuide(config,inferredEpgUrl(config),controller.signal);}return()=>controller.abort();},[tab,details,configs,loadingLists]);
  async function observeNewContent(config:PlaylistConfig,items:Entry[],signal:AbortSignal){
    try{const rules=await savedFollows();if(!rules.some(r=>r.kind!=="team"))return;let snapshot=items;for(const rule of rules.filter(r=>r.kind==="series"&&r.playlistId===config.id&&r.seriesId)){
      if(signal.aborted)return;const series=items.find(e=>e.kind==="series"&&e.seriesId===rule.seriesId);if(series){const episodes=await loadEpisodes(config,series,signal);snapshot=[...snapshot,...episodes];}
    }
    if(!items.some(e=>e.kind!=="live"))return;
    if(!signal.aborted)await observeFollowCatalog(config.id,snapshot,rules,()=>!childRef.current&&!signal.aborted);
    }catch{ /* A failing tracked series does not block the catalog/player. */ }
  }
  async function addFollow(draft:FollowDraft,minutes:number){
    if(busy||loadingLists)throw new Error("Liste güncelleniyor. Tamamlanınca takibi kaydedebilirsin.");
    await followPermission();const rules=await savedFollows();
    if(rules.length>=50)throw new Error("En fazla 50 takip eklenebilir.");
    let baseline=entries;
    if(draft.kind==="series"&&draft.seriesId){const series=entries.find(e=>e.seriesId===draft.seriesId&&e.playlistId===draft.playlistId);const config=configs.find(c=>c.id===draft.playlistId);if(series&&config)baseline=[...entries,...await loadEpisodes(config,series)];}
    await seedFollows(baseline);
    const existing=rules.find(r=>r.kind===draft.kind&&r.label===draft.label&&r.playlistId===draft.playlistId);
    const next=[...rules.filter(r=>r.id!==existing?.id),{...draft,id:existing?.id||`f${Date.now().toString(36)}`,createdAt:existing?.createdAt||Date.now(),leadMinutes:minutes}];
    await saveFollows(next);setFollowRules(next);await syncTeamReminders(entries,guides,next,()=>!childRef.current);
  }
  useEffect(()=>{if(!securityReady)return;if(child){void cancelFollowNotifications();setFollowOpen(false);return;}const controller={active:true};void syncTeamReminders(entries,guides,followRules,()=>controller.active&&!childRef.current).catch(()=>{});return()=>{controller.active=false};},[entries,guides,followRules,child,securityReady]);
  const followCheckedAt=useRef(Date.now());
  useEffect(()=>{const check=()=>{if(child||!followRules.length||!configs.length||busy||loadingLists||boot||playing.length||AppState.currentState!=="active"||Date.now()-followCheckedAt.current<5*60000)return;followCheckedAt.current=Date.now();void refreshAll().then(()=>{if(playingRef.current.length||childRef.current)return;if(followRules.some(r=>r.kind!=="team")){vodReady.current.clear();void ensureVod();}if(followRules.some(r=>r.kind==="team")){const controller=new AbortController();guideJob.current=controller;for(const config of configs)void readGuide(config,inferredEpgUrl(config),controller.signal);}});};const sub=AppState.addEventListener("change",state=>{if(state==="active")check();});const timer=setInterval(check,5*60000);return()=>{sub.remove();clearInterval(timer)};},[child,followRules.length,configs.length,busy,loadingLists,boot,playing.length]);
  async function reminder(item:Entry,p:Program){
    if(!reminders.includes(`kotak-${item.id}-${p.start}`)){setPendingReminder({item,program:p});return;}
    try{await toggleReminder(item,p);setReminders(await scheduledReminders());}catch(e){Alert.alert("Hatırlatıcı",(e as Error).message);}
  }
  const latestEntries=useRef(entries);latestEntries.current=entries;
  const latestPlay=useRef(play);latestPlay.current=play;
  const handledNotification=useRef("");
  useEffect(()=>{
    const handle=(response:Notifications.NotificationResponse|null)=>{
      if(!response || handledNotification.current===response.notification.request.identifier)return;
      if(response.notification.request.content.data.screen==="subscription"){setInfo("Kotak TV PRO");return;}
      const data=response.notification.request.content.data;
      if(data.followKind){handledNotification.current=response.notification.request.identifier;void Notifications.clearLastNotificationResponseAsync().catch(()=>{});const found=latestEntries.current.find(e=>e.id===data.mediaId)||latestEntries.current.find(e=>e.kind==="series"&&e.seriesId===data.seriesId&&e.playlistId===data.playlistId);if(found){handledNotification.current=response.notification.request.identifier;latestPlay.current(found);}else {setTab("ANASAYFA");setTop("FILM");}return;}
      const id=data.channelId;
      const entry=latestEntries.current.find(e=>e.id===id);
      if(entry){handledNotification.current=response.notification.request.identifier;void Notifications.clearLastNotificationResponseAsync().catch(()=>{});latestPlay.current(entry);}
    };
    const sub=Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then(handle).catch(()=>{});
    return()=>sub.remove();
  },[entries]);
  function closeForm() {
    job.current?.abort();
    setBusy(false);
    setLoadingLists(false);
    setAdd(false);
    setFormError("");
  }
  async function play(item: Entry) {
    playJob.current?.abort();for(const controller of epgJobs.current)controller.abort();
    const playController=new AbortController();playJob.current=playController;
    vodJob.current?.abort();
    const configForAddress=configs.find(c=>c.id===item.playlistId);if(configForAddress)item=restoreAddress(item,configForAddress);
    if (item.kind === "series") {
      const config = configs.find((c) => c.id === item.playlistId);
      if (!config) return;
      episodeJob.current?.abort();
      const controller = new AbortController();
      episodeJob.current = controller;
      setEpisodes([]);
      setEpisodeBusy(true);
      void loadEpisodes(config, item, controller.signal)
        .then((data) => {
          if (!controller.signal.aborted) setEpisodes(data);
        })
        .catch((e) => {
          if (!controller.signal.aborted) {
            setEpisodes(null);
            Alert.alert("Bölümler", (e as Error).message);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setEpisodeBusy(false);
        });
      return;
    }
    if(item.kind==="movie"&&configForAddress){setPreparing(item.name);try{item=await resolvePlayback(item,configForAddress,playController.signal);}catch{if(playController.signal.aborted)return;setMessage("Film detayı alınamadı; listedeki yayın adresi deneniyor.");}finally{if(playJob.current===playController)setPreparing(null);}if(playController.signal.aborted)return;}
    if (!item.uri) {
      Alert.alert("Yayın bağlantısı", "Kayıtlı kanal bilgisi gösteriliyor. İnternet bağlantısını kontrol edip Kütüphaneniz ekranından listeyi yenileyin.");
      return;
    }
    setPlaying([item]);
    setMini(false);
    setEpisodes(null);
    if (settings.saveHistory)
      setRecent((prev) => {
        const next = [item.id, ...prev.filter((id) => id !== item.id)].slice(
          0,
          20,
        );
        void AsyncStorage.setItem("kotak.recent", JSON.stringify(next)).catch(
          () => setMessage("İzleme geçmişi kaydedilemedi."),
        );
        return next;
      });
  }
  function changeTab(value: BottomNavTab) {
    setCatalogPage(null);setCategoryBrowse(false);setDirectPlay(value==="TV KANALI");
    if(value==="EPG")vodJob.current?.abort();
    if (playing.length) setMini(true);
    setScreen(null);
    setTab(value);
    setQuery("");
    setFilter("Tümü");
    setOnlyFavorites(false);
  }
  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      void AsyncStorage.setItem("kotak.favorites", JSON.stringify(next)).catch(
        () => setMessage("Favoriler kaydedilemedi."),
      );
      return next;
    });
  }
  function select(item: Entry) {
    setSelected((prev) => {
      if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
      if (prev.length === 4) {
        Alert.alert("Çoklu ekran", "En fazla dört kanal seçebilirsiniz.");
        return prev;
      }
      return [...prev, item.id];
    });
  }
  function program(item: Entry): Program | undefined {
    return scheduleFor(item,guides).find(
      (p) => p.start <= now && p.end > now,
    );
  }
  const listing = useMemo(() => {
    const source = onlyFavorites
      ? entries
      : tab === "EPG" || tab === "TV KANALI" || top === "CANLI"
        ? live
        : top === "FILM"
          ? movies
          : top === "DIZI" ? series : entries;
    const q = query.trim().toLocaleLowerCase("tr-TR");
    return source.filter(
      (e) =>
        (filter === "Tümü" || e.group === filter) &&
        (!q || e.name.toLocaleLowerCase("tr-TR").includes(q)) &&
        (!onlyFavorites || favoritesSet.has(e.id)),
    );
  }, [
    entries,
    live,
    movies,
    series,
    query,
    filter,
    onlyFavorites,
    favoritesSet,
    tab,
    top,
  ]);
  function addList() {
    setOptionsOpen(false);
    if (child) { setParentOpen(true); return; }
    setFormError("");
    setAdd(true);
  }
  function removeList(config: PlaylistConfig) {
    if (child) { setParentOpen(true); return; }
    Alert.alert("Listeyi kaldır", `${config.name} kaldırılsın mı?`, [
      { text: "Vazgeç" },
      {
        text: "Kaldır",
        style: "destructive",
        onPress: () => {
          job.current?.abort(); setBusy(false); setLoadingLists(false);
          void deletePlaylist(config.id)
            .then(() => {
              void removeCache(config.id).catch(() => {});
              setConfigs((prev) => prev.filter((c) => c.id !== config.id));
              setCatalogs((prev) => {
                const next = { ...prev };
                delete next[config.id];
                return next;
              });
              setPlaying((prev) =>
                prev.filter((e) => e.playlistId !== config.id),
              );
            })
            .catch(() => setMessage("Liste kaldırılamadı."));
        },
      },
    ]);
  }
  function open(name: string) {
    setOptionsOpen(false);
    if (playing.length) setMini(true);
    if(name==="Ekran Paylaşımı"){if(!playing.length){Alert.alert("TV’ye aktar","Önce izlemek istediğin yayını aç. Oynatıcıdaki TV simgesinden aynı Wi-Fi ağındaki TV’yi seç.");return;}setMini(false);return;}
    if(name==="Takiplerim"){if(child){setParentOpen(true);return;}setFollowDraft(undefined);setFollowOpen(true);return;}
    if(name==="Ses Testi"){setPlaying([]);setAudioTestOpen(true);return;}
    if(name==="Yapay Zeka Sesli Komut"){setInfo(null);setPlaying([]);setVoiceOpen(true);return;}
    if(name==="Yayını paylaş"||name==="Birlikte İzle (SharePlay)"){if(child){setParentOpen(true);return;}setShareOpen(true);return;}
    if(name==="IMDb Sıralaması"){setImdbOpen(true);return;}
    if(name==="EPG Kaynağı"){if(child){setParentOpen(true);return;}setEpgSettingsOpen(true);return;}
    if (name === "Profil Seçin" || name === "Güvenli Çocuk Profili" || (child && name === "Kütüphaneniz")) { setParentOpen(true); return; }
    if (name === "Çoklu Ekran & PiP") { changeTab("TV KANALI");setDirectPlay(false); setSelecting(true); setSelected([]); return; }
    if (name === "Kütüphaneniz") {
      setScreen("library");
      return;
    }
    if (name === "Ayarlar") {
      setScreen("settings");
      return;
    }
    if (name === "Kaydedilmiş videolar") {
      setInfo("Kaydedilmiş videolar");
      return;
    }
    if (name === "Bizimle iletişime geçin") {
      void Linking.openURL("mailto:kotaktv@gmail.com").catch(() =>
        setInfo("İletişim"),
      );
      return;
    }
    if (name === "Arkadaşınıza önerin") {
      void Share.share({
        title: "Kotak TV",
        message:
          "Kotak TV — Kendi IPTV listenizle canlı TV, film ve dizi deneyimi.",
      }).catch(() => {});
      return;
    }
    setInfo(name);
  }
  function changeSettings(value: Preferences) {
    setSettings(value);
    void AsyncStorage.setItem("kotak.preferences", JSON.stringify(value)).catch(
      () => setMessage("Ayarlar kaydedilemedi."),
    );
  }
  const recentEntry =
    recent
      .map((id) => byId.get(id))
      .find((e): e is Entry => !!e && e.kind === "live") || live[0];
  const recentProgram = details ? program(details) : undefined;
  const showHome =
    !screen && tab === "ANASAYFA" && top === "ANASAYFA" && !onlyFavorites;
  const videoCatalog = (top === "FILM"||top==="DIZI") && tab === "ANASAYFA" && !onlyFavorites;
  const channelView =
    !showHome &&
    !videoCatalog &&
    tab !== "EPG" &&
    tab !== "DAHA FAZLA" &&
    !screen;
  function channelRow(item: Entry) {
    return (
      <ChannelCard
        item={item}
        guide={guides}
        now={now}
        favorite={favoritesSet.has(item.id)}
        selecting={selecting}
        selected={selectedSet.has(item.id)}
        onFavorite={() => toggleFavorite(item.id)}
        onGuide={item.kind==="live"?()=>setDetails(item):undefined}
        onPlay={() =>
          selecting && item.kind === "live" ? select(item) : play(item)
        }
      />
    );
  }
  if (!securityReady) return <View style={[s.root, {alignItems:"center",justifyContent:"center",padding:24}]}>{securityError ? <Text style={d.secondary}>Koruma bilgileri okunamadı. Güvenliğiniz için içerik gizlendi. Uygulamayı yeniden açın.</Text> : <ActivityIndicator color={colors.blue}/>}</View>;
  return (
    <View style={s.root}>
      <View style={s.canvas}>
        {configs.length === 0 && !boot && tab === "ANASAYFA" && !screen ? (
          <NoPlaylistsView
            onAddPlaylistClick={addList}
            onAiVoiceClick={()=>open("Yapay Zeka Sesli Komut")}
            onOptionsClick={() => setOptionsOpen(true)}
            bottomTab={tab}
            onBottomTabChange={changeTab}
          />
        ) : (
          <>
            {screen || catalogPage || categoryBrowse || tab==="EPG" || (tab==="TV KANALI"&&directPlay) ? (
              <View style={{ height: insets.top }} />
            ) : (
              tab !== "DAHA FAZLA" && !catalogPage && !categoryBrowse && (
                <TopBar
                  currentTab={top}
                  onTabChange={(value) => {
                    changeTab("ANASAYFA");
                    setTop(value);
                  }}
                  onSearchClick={() => setSearchOpen(true)}
                  onOptionsClick={() => setOptionsOpen(true)}
                  onAiVoiceClick={() => open("Yapay Zeka Sesli Komut")}
                  onOpenScreenCast={() => open("Ekran Paylaşımı")}
                  onBackClick={() => changeTab("ANASAYFA")}
                />
              )
            )}
            {child && <Pressable onPress={() => setParentOpen(true)} style={s.notice}><Shield size={17} color={colors.blue}/><Text style={d.secondary}>Çocuk Profili · Ebeveyn PIN’i ile aç</Text></Pressable>}
            {!!message && (
              <Pressable onPress={() => setMessage("")} style={s.notice}>
                <Text style={d.secondary}>{message}</Text>
                <X size={13} color={colors.zinc500} />
              </Pressable>
            )}
            {(boot || busy || loadingLists) && !live.some(e=>!!e.uri) && (
              <View style={s.loading}>
                <ActivityIndicator color={colors.blue} />
                <Text style={d.secondary}>
                  {boot ? "Kayıtlı bilgiler açılıyor…" : "Canlı kanal listesi alınıyor…"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              {tab==="TV KANALI"&&directPlay ? <DirectPlay recent={recent.map(id=>byId.get(id)).filter((e):e is Entry=>!!e)} onPlay={play} onAddList={addList}/> : categoryBrowse ? <CategoriesPage groups={groups} onClose={()=>setCategoryBrowse(false)} onEdit={()=>setCategoryOpen(true)} onSelect={category=>{setCategoryBrowse(false);setDirectPlay(false);setFilter(category.name);setTab("TV KANALI");setTop("CANLI");}}/> : catalogPage ? <CatalogView title={catalogPage==="trend-movies"?"Trend Filmler":catalogPage==="trend-series"?"Trend Diziler":catalogPage==="new-movies"?"Yeni Eklenen Filmler":"Son Güncellenen Diziler"} ranked={catalogPage.startsWith("trend")} items={catalogPage==="trend-movies"?topMovies:catalogPage==="trend-series"?topSeries:catalogPage==="new-movies"?newMovies:updatedSeries} onBack={()=>setCatalogPage(null)} onSelect={setMediaDetails}/> : screen === "library" ? (
                <LibraryScreen
                  configs={configs}
                  counts={Object.fromEntries(
                    Object.entries(catalogs).map(([key, value]) => [
                      key,
                      value.length,
                    ]),
                  )}
                  busy={busy || boot}
                  onAdd={addList}
                  onRefresh={(config) => void importList(config, true)}
                  onRemove={removeList}
                  onBack={() => setScreen(null)}
                />
              ) : screen === "settings" ? (
                <SettingsView
                  settings={settings}
                  onChange={changeSettings}
                  onBack={() => setScreen(null)}
                  onInfo={open}
                  onClearHistory={() => {
                    setRecent([]);positions.current={};
                    void AsyncStorage.removeItem("kotak.recent");void AsyncStorage.removeItem("kotak.positions");
                  }}
                />
              ) : tab === "DAHA FAZLA" ? (
                <View style={{ flex: 1, paddingTop: insets.top }}>
                  <MoreScreen
                    streamCount={entries.length}
                    playlistCount={configs.length}
                    onOpen={open}
                  />
                </View>
              ) : tab === "EPG" ? (
                <EpgScreen
                  focus={guideFocus}
                  onVisibleChannels={items=>void ensureChannelEpg(items)}
                  title={configs.length===1?configs[0].name:"Yayın Akışı"}
                  onBack={()=>changeTab("ANASAYFA")}
                  channels={epgChannels}
                  guide={guides}
                  now={now}
                  notice={guideNotice}
                  onPlay={play}
                  reminders={reminders}
                  onReminder={(item,p)=>void reminder(item,p)}
                  onRefresh={()=>{const controller=new AbortController();for(const config of configs)void readGuide(config,inferredEpgUrl(config),controller.signal);}}
                  onEpgSettings={()=>open("EPG Kaynağı")}
                />
              ) : showHome ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 160 }}
                  refreshControl={<RefreshControl refreshing={loadingLists} onRefresh={()=>void refreshAll()} tintColor={colors.blue}/>}
                >
                  {entitlement&&!!expiryMessage(entitlement,now)&&<View style={{padding:16}}><Text style={[d.secondary,{color:colors.blue}]}>{expiryMessage(entitlement,now)}</Text></View>}
                  <HomeActions onFollows={()=>open("Takiplerim")} onVoice={()=>open("Yapay Zeka Sesli Komut")} onRefresh={()=>void refreshAll()} loading={loadingLists}/>

                  <MediaRail
                    title="Trend Filmler"
                    items={topMovies}
                    onPlay={setMediaDetails}
                    onMore={() => setCatalogPage("trend-movies")}
                  />
                  <MediaRail
                    title="Trend Diziler"
                    items={topSeries}
                    onPlay={setMediaDetails}
                    onMore={() => setCatalogPage("trend-series")}
                  />
                  {!!continueWatching.length&&<PosterRail title="İzlemeye devam et" items={continueWatching} onSelect={play} onMore={()=>setTop("FILM")}/>}
                  <PosterRail title="Yeni Eklenen Filmler" items={newMovies} onSelect={setMediaDetails} onMore={()=>setCatalogPage("new-movies")}/>
                  <PosterRail title="Son Güncellenen Diziler" items={updatedSeries} onSelect={setMediaDetails} onMore={()=>setCatalogPage("updated-series")}/>
                  {loadingVod&&<Text style={[d.micro,{paddingHorizontal:16,paddingVertical:8}]}>Film ve dizi kataloğu alınıyor. Canlı kanallar hazır.</Text>}
                  {!loadingVod&&!movies.length&&!series.length&&configs.length>0&&<View style={{padding:16}}><Pill label="Film ve dizileri yükle" onPress={()=>{vodReady.current.clear();void ensureVod();}}/></View>}
                  {recentEntry && !newMovies.length && !updatedSeries.length && (
                    <RecentCard
                      item={recentEntry}
                      guide={guides}
                      now={now}
                      onPlay={() => play(recentEntry)}
                      onDetails={() => setDetails(recentEntry)}
                    />
                  )}
                  <CategoriesList
                    categories={homeGroups}
                    totalCategoriesCount={homeGroups.length}
                    onSeeAll={()=>setCategoryBrowse(true)}
                    onEdit={()=>setCategoryOpen(true)}
                    onSelectCategory={(category) => {
                      setDirectPlay(false);setFilter(category.name);
                      setTab("TV KANALI");
                      setTop("CANLI");
                    }}
                  />
                </ScrollView>
              ) : videoCatalog ? (
                <View style={{flex:1}}>{loadingVod&&<Text style={[d.micro,{paddingHorizontal:16}]}>Film ve diziler yükleniyor…</Text>}<CatalogView key={top} title={top==="DIZI"?"Diziler":"Filmler"} overview={top==="DIZI"} items={listing} onBack={()=>setTop("ANASAYFA")} onSelect={setMediaDetails}/></View>
              ) : channelView ? (
                <FlatList
                  key="channels"
                  data={listing}
                  keyExtractor={(e) => e.id}
                  initialNumToRender={12}
                  maxToRenderPerBatch={12}
                  windowSize={7}
                  contentContainerStyle={d.screenList}
                  ListHeaderComponent={
                    <>

                      <View
                        style={[d.between, { marginTop: 18, marginBottom: 10 }]}
                      >
                        <View style={d.inline}>
                          <Text style={d.h2}>
                            {onlyFavorites ? "Favorileriniz" : "TV Kanalları"}
                          </Text>
                          <Text style={d.count}>{listing.length}</Text>
                        </View>
                        <View style={d.inline}>
                          <IconButton
                            small
                            icon={Star}
                            label="Favoriler"
                            color={
                              onlyFavorites ? colors.amber : colors.zinc400
                            }
                            onPress={() => setOnlyFavorites((v) => !v)}
                          />
                          <IconButton
                            small
                            icon={Search}
                            label="Ara"
                            onPress={() => setSearchOpen(true)}
                          />
                          <IconButton
                            small
                            icon={Grid2X2}
                            label="Çoklu ekran"
                            onPress={() => {
                              setSelecting((v) => !v);
                              setSelected([]);
                            }}
                          />
                        </View>
                      </View>
                      <FlatList horizontal data={["Tümü",...groups.map(g=>g.name)]} keyExtractor={g=>g} initialNumToRender={6} maxToRenderPerBatch={6} windowSize={3} showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:6,paddingBottom:16}} renderItem={({item:group})=><Pill label={group} active={group===filter} onPress={()=>setFilter(group)}/>}/>

                      {selecting && (
                        <View style={[d.between, { marginBottom: 14 }]}>
                          <Text style={d.secondary}>
                            2 veya 4 kanal seçin ({selected.length})
                          </Text>
                          <Pill
                            active
                            label="Çoklu Ekranı Aç"
                            disabled={
                              selected.length !== 2 && selected.length !== 4
                            }
                            onPress={() => {
                              setPlaying(
                                selected
                                  .map((id) => byId.get(id))
                                  .filter((e): e is Entry => !!e),
                              );
                              setMini(false);
                              setSelecting(false);
                              setSelected([]);
                            }}
                          />
                        </View>
                      )}
                    </>
                  }
                  renderItem={({ item }) => channelRow(item)}
                  ListEmptyComponent={
                    <Text style={d.emptyRail}>
                      Bu görünümde kanal bulunamadı.
                    </Text>
                  }
                />
              ) : null}
            </View>
            <CustomBottomNav currentTab={tab} onTabChange={changeTab} />
          </>
        )}
      </View>
      {preparing&&<Sheet visible compact title="Film açılıyor" onClose={()=>{playJob.current?.abort();setPreparing(null);}}><ActivityIndicator color={colors.blue}/><Text style={[d.secondary,{paddingVertical:20}]}>{preparing} · Gerçek yayın adresi kontrol ediliyor…</Text><Pill label="İptal" onPress={()=>{playJob.current?.abort();setPreparing(null);}}/></Sheet>}
      {playing.length > 0 && (
        <View
          pointerEvents="box-none"
          style={
            mini
              ? [StyleSheet.absoluteFill, { zIndex: 100 }]
              : [
                  s.fullPlayer,
                  { paddingTop: insets.top, paddingBottom: insets.bottom },
                ]
          }
        >
          <PlaybackPanel
            items={playing}
            positions={positions.current}
            onProgress={recordProgress}
            mini={mini}
            onMini={() => setMini((v) => !v)}
            onClose={() => setPlaying([])}
            onFeature={open}
            seekSeconds={settings.seekSeconds || 15}
            bufferSeconds={settings.bufferSeconds || 15}
            onMulti={() => {
              setMini(true);
              changeTab("TV KANALI");setDirectPlay(false);
              setSelecting(true);
            }}
          />
        </View>
      )}
      {followOpen&&<FollowPanel rules={followRules} initial={followDraft} onSave={addFollow} onClose={()=>setFollowOpen(false)} onRemove={async id=>{const next=followRules.filter(r=>r.id!==id);await saveFollows(next);setFollowRules(next);}}/>}
      {shareOpen&&<SharePanel item={playing.length===1?playing[0]:undefined} onClose={()=>setShareOpen(false)}/>}
      {pendingReminder&&<ReminderPicker item={pendingReminder.item} program={pendingReminder.program} onClose={()=>setPendingReminder(null)} onSave={async minutes=>{await toggleReminder(pendingReminder.item,pendingReminder.program,minutes);setReminders(await scheduledReminders());setPendingReminder(null);Alert.alert("Hatırlatıcı kuruldu",`${minutes} dakika önce bildirim gönderilecek.`);}}/>}
      {mediaDetails&&<MediaDetails key={mediaDetails.id} item={mediaDetails} onFollow={mediaDetails.kind==="series"||mediaDetails.kind==="episode"?()=>{setFollowDraft({kind:"series",label:mediaTitle(mediaDetails.name),playlistId:mediaDetails.playlistId,seriesId:mediaDetails.seriesId});setMediaDetails(null);setFollowOpen(true);}:undefined} provider={providerDetails[mediaDetails.id]} loading={detailsBusy} similar={entries.filter(e=>e.kind===mediaDetails.kind&&e.id!==mediaDetails.id&&e.group===mediaDetails.group).slice(0,12)} onSelect={setMediaDetails} onNavigate={changeTab} info={imdb[metadataKey(mediaDetails)]} onClose={()=>setMediaDetails(null)} onPlay={()=>{const item=mediaDetails;setMediaDetails(null);play(item);}}/>}
      {audioTestOpen&&<AudioDiagnostics onClose={()=>setAudioTestOpen(false)}/>}
      {categoryOpen&&<CategoryPicker groups={groups} selected={homeCategories} onClose={()=>setCategoryOpen(false)} onSave={values=>{setHomeCategories(values);setCategoryOpen(false);void AsyncStorage.setItem("kotak.homeCategories",JSON.stringify(values)).catch(()=>setMessage("Kategori seçimi kaydedilemedi."));}}/>}
      {voiceOpen&&<VoiceSearch onResolve={resolveAssistant} onFuture={(item,p)=>{setGuideFocus({channelId:item.id,programStart:p.start});changeTab("EPG");}} entries={entries} onFollowTeam={label=>{if(child){setParentOpen(true);return;}setFollowDraft({kind:"team",label});setFollowOpen(true);}} guide={guides} metadata={imdb} onDetails={setMediaDetails} onReminder={(item,p)=>void reminder(item,p)} onClose={()=>setVoiceOpen(false)} onPlay={item=>{
        if(item.kind!=="series"){play(item);return;}
        const config=configs.find(c=>c.id===item.playlistId);if(!config)return;
        const controller=new AbortController();episodeJob.current?.abort();episodeJob.current=controller;
        void loadEpisodes(config,item,controller.signal).then(values=>{if(!controller.signal.aborted&&values[0])play(values[0]);}).catch(()=>Alert.alert("Dizi","Bölüm bilgileri alınamadı."));
      }}/>}
      {imdbOpen&&<ImdbPanel entries={entries} cache={imdb} onUpdate={setImdb} onClose={()=>setImdbOpen(false)}/>}
      {epgSettingsOpen&&<EpgSettings configs={configs} onClose={()=>setEpgSettingsOpen(false)} onSave={async config=>{await savePlaylist(config);setConfigs(prev=>prev.map(c=>c.id===config.id?config:c));const controller=new AbortController();void readGuide(config,config.epgUrl,controller.signal,catalogs[config.id]||[]);}}/>}
      <PlaylistForm
        visible={add}
        busy={busy}
        error={formError}
        onClose={closeForm}
        onSave={(config) => void importList(config)}
      />
      <SearchPanel
        visible={searchOpen}
        entries={entries}
        onClose={() => setSearchOpen(false)}
        onPlay={play}
      />
      <Sheet
        visible={optionsOpen}
        title="Hızlı Seçenekler"
        compact
        onClose={() => setOptionsOpen(false)}
      >
        {[
          ["Yapay Zeka Sesli Komut", Mic],
          ["Yayını paylaş", Users],
          ["Çoklu Ekran & PiP", Grid2X2],
          ["Yeni Oynatma Listesi Ekle", Plus],
          ["Çevrimdışı Mod & 24s EPG", WifiOff],
          ["Ekran Paylaşımı", Tv],
          ["Kotak TV PRO", Sparkles],
          ["Profil Seçin", Shield],
          ["Kütüphaneniz", ListVideo],
          ["Ayarlar", Settings],
        ].map(([title, icon]) => {
          const Icon = icon as typeof Mic;
          return (
            <Pressable
              key={String(title)}
              style={s.optionRow}
              onPress={() =>
                title === "Yeni Oynatma Listesi Ekle"
                  ? addList()
                  : open(String(title))
              }
            >
              <Text style={d.name}>{String(title)}</Text>
              <Icon size={18} color={colors.blue} />
            </Pressable>
          );
        })}
      </Sheet>
      {episodes!==null&&<EpisodePanel items={episodes} busy={episodeBusy} onPlay={play} onClose={()=>{episodeJob.current?.abort();setEpisodes(null);}}/>}
      <Sheet
        visible={details !== null}
        title={details?.name || "Program Bilgisi"}
        onClose={() => setDetails(null)}
      >
        <Text style={d.h2}>{recentProgram?.title || "Canlı Yayın"}</Text>
        <Text style={[d.secondary, { marginVertical: 14 }]}>
          {details?.group}
        </Text>
        <ProgramBar program={recentProgram} now={now} />
        {details&&scheduleFor(details,guides).filter(p=>p.end>now).map(p=><View key={p.start} style={{flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12}}><Text style={d.micro}>{clock(p.start)}</Text><Text style={[d.secondary,{flex:1}]}>{p.title}</Text>{p.start>now&&<Pill label={reminders.includes(`kotak-${details.id}-${p.start}`)?"Hatırlatmayı kaldır":"Hatırlat"} onPress={()=>{const channel=details;setDetails(null);void reminder(channel,p);}}/>}</View>)}
        <View style={{ marginTop: 24 }}>
          <Pill
            active
            icon={Play}
            label="Canlı Yayını İzle"
            onPress={() => {
              if (details) play(details);
              setDetails(null);
            }}
          />
        </View>
      </Sheet>
      {parentOpen && <ParentPanel protection={protection} child={child} groups={[...new Set(allEntries.filter(e => e.kind === "live").map(e => e.group))]} onClose={() => setParentOpen(false)} onChange={(value, isChild) => {episodeJob.current?.abort(); setProtection(value); setChild(isChild); setPlaying([]); setScreen(null); setSearchOpen(false); setInfo(null); setOptionsOpen(false); setEpisodes(null); setDetails(null); setSelected([]);setFollowOpen(false);setShareOpen(false);setPendingReminder(null);setMediaDetails(null);setVoiceOpen(false);setImdbOpen(false);setCategoryOpen(false);setEpgSettingsOpen(false);}} />}
      {(info === "Kotak TV Özellikleri" || FEATURE_NAMES.includes(info || "")) && <FeaturesPanel key={info} active={info!} entries={entries} cacheTime={cacheTime} onOpen={open} onClose={() => setInfo(null)} onPlay={play}/>}
      {(info === "Kotak TV PRO" || info === "Pro Sürümüne Geç") && <ProPanel onClose={() => setInfo(null)}/>}
      {info === "Hakkında" && <AboutPanel onClose={() => setInfo(null)}/>}
      <Sheet
        visible={info !== null && !FEATURE_NAMES.includes(info) && !["Kotak TV Özellikleri","Kotak TV PRO","Pro Sürümüne Geç","Hakkında"].includes(info)}
        title={info || ""}
        onClose={() => setInfo(null)}
      >
        <View style={{ alignItems: "center", paddingVertical: 24, gap: 18 }}>
          {info?.includes("Sesli") ? (
            <View style={s.voiceOrb}>
              <Mic size={38} color={colors.blue} />
            </View>
          ) : (
            <Sparkles size={32} color={colors.blue} />
          )}
          <Text style={[d.h2, { textAlign: "center" }]}>{info}</Text>
          {info === "Kotak TV PRO" || info === "Pro Sürümüne Geç" ? (
            <>
              <View style={s.priceCards}>
                <View style={s.price}>
                  <Text style={d.secondary}>Aylık Kotak Pro</Text>
                  <Text style={s.priceText}>₺249</Text>
                </View>
                <View style={[s.price, { borderColor: colors.blue }]}>
                  <Text style={d.linkSmall}>YILLIK PAKET</Text>
                  <Text style={s.priceText}>₺999</Text>
                </View>
              </View>
              <Text style={d.secondary}>
                Mağaza üzerinden abonelik satın alma henüz etkin değil.
              </Text>
            </>
          ) : (
            <Text
              style={[d.secondary, { textAlign: "center", lineHeight: 22 }]}
            >
              {info === "Hakkında"
                ? "Kotak TV\nKendi IPTV listenizle canlı TV, film ve dizi deneyimi.\nSürüm 1.0.8 · kotaktv@gmail.com"
                : info === "İletişim"
                  ? "kotaktv@gmail.com"
                  : info?.includes("EPG")
                    ? guideNotice
                    : info === "Ses ve Altyazı" || info?.includes("Subwoofer")
                      ? "Yayının sunduğu ses ve altyazı parçalarını oynatıcı kontrollerinden seçebilirsiniz. Sanal subwoofer işlemesi henüz etkin değil."
                      : "Bu özellik henüz etkin değil. IPTV listelerinizden canlı yayın, film ve dizi izlemeye devam edebilirsiniz."}
            </Text>
          )}
        </View>
      </Sheet>
    </View>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  canvas: {
    flex: 1,
    width: "100%",
    maxWidth: 672,
    alignSelf: "center",
    backgroundColor: colors.bg,
  },
  notice: {
    marginHorizontal: 16,
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#1c1c1e",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  loading: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    padding: 12,
    justifyContent: "center",
  },
  fullPlayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.bg,
    justifyContent: "center",
    zIndex: 100,
  },
  movieCard: {
    flex: 1,
    maxWidth: "49%",
    marginBottom: 14,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#18181b",
  },
  moviePoster: { height: 180, width: "100%", backgroundColor: "#202024" },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ffffff0a",
  },
  voiceOrb: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#007AFF22",
    borderWidth: 1,
    borderColor: "#007AFF55",
    alignItems: "center",
    justifyContent: "center",
  },
  priceCards: { flexDirection: "row", gap: 10, width: "100%" },
  price: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffffff1a",
    backgroundColor: "#202024",
    gap: 10,
  },
  priceText: { fontSize: 27, fontWeight: "900", color: colors.white },
});
