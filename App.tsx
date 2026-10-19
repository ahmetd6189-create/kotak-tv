import {SharePanel} from "./src/ui/SharePanel";
import {serviceConfig,verifiedEntitlement,closeShareRoom,type ShareRoom} from "./src/native/shareplay";
import {scheduleExpiryNotices,expiryMessage,type Entitlement} from "./src/native/entitlement";
import {ReminderPicker} from "./src/ui/ReminderPicker";
import {MediaDetails} from "./src/ui/MediaDetails";
import React, { useEffect, useMemo, useRef, useState } from "react";
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
import {rankedMedia,scheduleFor} from "./src/native/catalog-tools";
import {metadataKey,type ImdbInfo} from "./src/native/imdb";
import {scheduledReminders,toggleReminder} from "./src/native/reminders";
import * as SecureStore from "expo-secure-store";
import { cacheCatalog, cachedCatalog, removeCache } from "./src/native/cache";
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
  FeatureCards,
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
  loadCatalog,
  loadEpisodes,
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
  const [loadingLists, setLoadingLists] = useState(false);
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [playing, setPlaying] = useState<Entry[]>([]);
  const [mini, setMini] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [episodes, setEpisodes] = useState<Entry[] | null>(null);
  const [episodeBusy, setEpisodeBusy] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [screen, setScreen] = useState<null | "library" | "settings">(null);
  const [info, setInfo] = useState<string | null>(null);
  const [shareOpen,setShareOpen]=useState(false);
  const [shareRoom,setShareRoom]=useState<ShareRoom|null>(null);
  const [entitlement,setEntitlement]=useState<Entitlement|null>(null);
  const [pendingReminder,setPendingReminder]=useState<{item:Entry;program:Program}|null>(null);
  const [mediaDetails,setMediaDetails]=useState<Entry|null>(null);
  const [details, setDetails] = useState<Entry | null>(null);
  const [settings, setSettings] = useState<Preferences>({
    layout: "Klasik",
    saveHistory: true,
  });
  const [protection, setProtection] = useState<Protection | null>(null);
  const [child, setChild] = useState(false);
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
  const allEntries=useMemo(()=>rawEntries.map(item=>{const data=imdb[metadataKey(item)];return data&&item.kind!=="live"?{...item,imdbRating:data.rating,imdbId:data.id,logo:data.poster||item.logo}:item}),[rawEntries,imdb]);
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

  const homeGroups=useMemo(()=>{const index=new Map(groups.map(g=>[g.name,g]));return homeCategories===null?groups:homeCategories.map(name=>index.get(name)).filter((g):g is typeof groups[number]=>!!g)},[groups,homeCategories]);
  const topMovies=useMemo(()=>rankedMedia(movies,"movie"),[movies]);
  const topSeries=useMemo(()=>rankedMedia(series,"series"),[series]);

  async function readGuide(config:PlaylistConfig,url:string|undefined,signal:AbortSignal,cacheEntries:Entry[]=[]){
    url=url||inferredEpgUrl(config);
    if(!url){setGuideNotice("EPG adresi yok. XMLTV bağlantısı ekleyin.");return;}
    const address=url;const key=config.id+":"+address;
    try{
      const previous=guideCache.current.get(config.id);
      let scoped:Guide;
      if(previous?.url===address&&Date.now()-previous.at<60000)scoped=previous.data;
      else{
        let request=guideFlights.current.get(key);
        if(!request||request.signal.aborted){
          setGuideNotice("EPG yükleniyor…");
          const promise=(async()=>{
            const data=await requestText(address,signal);const parsed=await parseGuideAsync(data.text,Date.now(),signal);
            const result:Guide={};for(const [name,programs] of Object.entries(parsed))result[`${config.id}:${name}`]=programs;
            if(!signal.aborted){guideCache.current.set(config.id,{url:address,at:Date.now(),data:result});setGuides(prev=>({...Object.fromEntries(Object.entries(prev).filter(([name])=>!name.startsWith(config.id+":"))),...result}));}
            return result;
          })();
          request={signal,promise};guideFlights.current.set(key,request);
          void promise.finally(()=>{if(guideFlights.current.get(key)?.promise===promise)guideFlights.current.delete(key)}).catch(()=>{});
        }
        scoped=await request.promise;
      }
      if(signal.aborted)return;
      setGuideNotice(Object.keys(scoped).length?"Sağlayıcının 24 saatlik mevcut programları alındı.":"XMLTV’de güncel program yok veya kanal eşleştirmesi bulunamadı.");
      if(cacheEntries.length)void cacheCatalog(config.id,cacheEntries,scoped).then(()=>setCacheTime(Date.now())).catch(()=>setMessage("EPG önbelleği kaydedilemedi."));
    }catch{if(!signal.aborted)setGuideNotice("EPG alınamadı. EPG Kaynağı bölümünden geçerli XMLTV adresini kontrol edin.");}
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
        setConfigs(saved);
        setFavorites(JSON.parse(fav || "[]"));
        setRecent(JSON.parse(history || "[]"));
        setBoot(false);
        setLoadingLists(saved.length > 0);
        // Show available metadata immediately while refreshing actual playback addresses.
        for (const config of saved) {
          const cache = await cachedCatalog(config.id).catch(() => null);
          if (controller.signal.aborted) return;
          if (cache) {
            setCatalogs(prev => ({...prev, [config.id]: cache.entries}));
            setGuides(prev => ({...prev, ...cache.guide}));
            setCacheTime(cache.savedAt);
            setGuideNotice("Kayıtlı 24 saatlik EPG gösteriliyor; güncellik bağlantıya bağlıdır.");
          }
        }
        if (controller.signal.aborted) return;
        setBoot(false);
        setLoadingLists(saved.length > 0);
        for (const config of saved) {
          void readGuide(config,inferredEpgUrl(config),controller.signal);
          try {
            const catalog = await loadCatalog(config, controller.signal, partial => {
              if (!controller.signal.aborted) setCatalogs(prev => ({...prev, [config.id]: partial.entries}));
            });
            if (controller.signal.aborted) return;
            setCatalogs((prev) => ({ ...prev, [config.id]: catalog.entries }));
            if (catalog.warnings.length) setMessage(catalog.warnings.join(" "));
            void cacheCatalog(config.id, catalog.entries).then(() => setCacheTime(Date.now())).catch(() => setMessage("Kanal önbelleği kaydedilemedi."));
            void readGuide(config, catalog.epgUrl, controller.signal, catalog.entries);
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
      episodeJob.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!protection || child) return;
    const listener = AppState.addEventListener("change", state => {
      if (state === "background") {
        episodeJob.current?.abort();
        setChild(true); setPlaying([]); setScreen(null); setEpisodes(null);
        setDetails(null); setSearchOpen(false); setInfo(null); setOptionsOpen(false); setAdd(false);setShareOpen(false);setPendingReminder(null);setMediaDetails(null);setVoiceOpen(false);setImdbOpen(false);setCategoryOpen(false);setEpgSettingsOpen(false);
      }
    });
    return () => listener.remove();
  }, [protection, child]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (playing.length && !mini) {
        setMini(true);
        return true;
      }
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
  }, [playing.length, mini, tab, screen]);

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
        await savePlaylist(config);
        if (controller.signal.aborted) return;
        published = true;
        void readGuide(config,catalog.epgUrl,controller.signal);
        setConfigs(prev => [...prev.filter(p => p.id !== config.id), config]);
        setAdd(false); setBusy(false); setFilter("Tümü"); setQuery("");
        if (!refreshing) {setTab("ANASAYFA"); setTop("ANASAYFA");}
      }
      setCatalogs(prev => ({...prev, [config.id]: catalog.entries}));
    };
    try {
      const catalog = await loadCatalog(config, controller.signal, publish);
      if (controller.signal.aborted) return;
      await publish(catalog);
      setMessage(`${catalog.entries.length} içerik alındı.${catalog.warnings.length ? ` ${catalog.warnings.join(" ")}` : ""}`);
      // Persistence and EPG are independent background work, never an import gate.
      void cacheCatalog(config.id, catalog.entries).then(() => setCacheTime(Date.now())).catch(() => setMessage("Kanal önbelleği kaydedilemedi. Yayın izlemeye devam edebilirsiniz."));
      void readGuide(config, catalog.epgUrl, controller.signal, catalog.entries);
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
      void readGuide(config,inferredEpgUrl(config),controller.signal);
      try{const result=await loadCatalog(config,controller.signal,partial=>{if(!controller.signal.aborted)setCatalogs(prev=>({...prev,[config.id]:partial.entries}));});
       if(controller.signal.aborted)return;setCatalogs(prev=>({...prev,[config.id]:result.entries}));
       void cacheCatalog(config.id,result.entries).catch(()=>{});void readGuide(config,result.epgUrl,controller.signal,result.entries);
      }catch(e){if(!controller.signal.aborted)setMessage((e as Error).message);}
    }}finally{if(!controller.signal.aborted)setLoadingLists(false);}
  }
  async function refreshEntitlement(){try{const config=await serviceConfig();if(!config)return;const verified=await verifiedEntitlement(config);setEntitlement(verified);await scheduleExpiryNotices(verified);}catch{ /* No verified store result: do not fabricate dates or billing entitlement. */ }}
  useEffect(()=>{void refreshEntitlement();const sub=AppState.addEventListener("change",state=>{if(state==="active")void refreshEntitlement();});return()=>sub.remove();},[]);
  useEffect(()=>{if(shareRoom&&(playing.length!==1||playing[0].id!==shareRoom.itemId)){void closeShareRoom(shareRoom).catch(()=>{});setShareRoom(null);}},[playing,shareRoom]);
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
      const id=response.notification.request.content.data.channelId;
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
  function play(item: Entry) {
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
          ? [...movies, ...series]
          : entries;
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
    if(name==="Ses Testi"){setPlaying([]);setAudioTestOpen(true);return;}
    if(name==="Yapay Zeka Sesli Komut"){setInfo(null);setPlaying([]);setVoiceOpen(true);return;}
    if(name==="Birlikte İzle (SharePlay)"){if(child){setParentOpen(true);return;}setShareOpen(true);return;}
    if(name==="IMDb Sıralaması"){setImdbOpen(true);return;}
    if(name==="EPG Kaynağı"){if(child){setParentOpen(true);return;}setEpgSettingsOpen(true);return;}
    if (name === "Profil Seçin" || name === "Güvenli Çocuk Profili" || (child && name === "Kütüphaneniz")) { setParentOpen(true); return; }
    if (name === "Çoklu Ekran & PiP") { changeTab("TV KANALI"); setSelecting(true); setSelected([]); return; }
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
  const videoCatalog = top === "FILM" && tab === "ANASAYFA" && !onlyFavorites;
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
            {screen ? (
              <View style={{ height: insets.top }} />
            ) : (
              tab !== "DAHA FAZLA" && (
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
            {(boot || busy || loadingLists) && (
              <View style={s.loading}>
                <ActivityIndicator color={colors.blue} />
                <Text style={d.secondary}>
                  {boot ? "Kayıtlı bilgiler açılıyor…" : entries.length ? "İçerikler arka planda güncelleniyor…" : "Sağlayıcıdan liste alınıyor…"}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              {screen === "library" ? (
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
                    setRecent([]);
                    void AsyncStorage.removeItem("kotak.recent");
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
                  channels={live}
                  guide={guides}
                  now={now}
                  notice={guideNotice}
                  onPlay={play}
                  reminders={reminders}
                  onReminder={(item,p)=>void reminder(item,p)}
                  onRefresh={()=>void refreshAll()}
                  onEpgSettings={()=>open("EPG Kaynağı")}
                />
              ) : showHome ? (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 160 }}
                  refreshControl={<RefreshControl refreshing={loadingLists} onRefresh={()=>void refreshAll()} tintColor={colors.blue}/>}
                >
                  {entitlement&&!!expiryMessage(entitlement,now)&&<View style={{padding:16}}><Text style={[d.secondary,{color:colors.blue}]}>{expiryMessage(entitlement,now)}</Text></View>}
                  <HomeActions onVoice={()=>open("Yapay Zeka Sesli Komut")} onRefresh={()=>void refreshAll()} loading={loadingLists}/>
                  <View style={{paddingHorizontal:16,marginBottom:12}}><Pill label="IMDb’ye göre sırala" onPress={()=>setImdbOpen(true)}/></View>
                  {settings.layout === "Modern" && (
                    <View style={{ paddingHorizontal: 16 }}>
                      <FeatureCards onOpen={open} />
                    </View>
                  )}
                  <MediaRail
                    title="Trend Filmler"
                    items={topMovies}
                    onPlay={setMediaDetails}
                    onMore={() => setTop("FILM")}
                  />
                  <MediaRail
                    title="Trend Diziler"
                    items={topSeries}
                    onPlay={setMediaDetails}
                    onMore={() => setTop("FILM")}
                  />
                  {recentEntry && (
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
                    onEdit={()=>setCategoryOpen(true)}
                    onSelectCategory={(category) => {
                      setFilter(category.name);
                      setTab("TV KANALI");
                      setTop("CANLI");
                    }}
                  />
                </ScrollView>
              ) : videoCatalog ? (
                <FlatList
                  key="media"
                  numColumns={2}
                  data={listing}
                  keyExtractor={(e) => e.id}
                  contentContainerStyle={d.screenList}
                  columnWrapperStyle={{ gap: 12 }}
                  ListHeaderComponent={
                    <View style={{ marginBottom: 16 }}>
                      <Text style={d.h2}>Filmler & Diziler</Text>
                      <Text style={d.secondary}>
                        {movies.length} film · {series.length} dizi / bölüm
                      </Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <Pressable onPress={() => setMediaDetails(item)} style={s.movieCard}>
                      {item.logo ? (
                        <Image
                          source={{ uri: item.logo }}
                          style={s.moviePoster}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={[
                            s.moviePoster,
                            { alignItems: "center", justifyContent: "center" },
                          ]}
                        >
                          <Film size={32} color={colors.zinc500} />
                        </View>
                      )}
                      <View style={{ padding: 10 }}>
                        <Text numberOfLines={1} style={d.name}>
                          {item.name}
                        </Text>
                        <Text numberOfLines={1} style={d.micro}>
                          {item.group}
                        </Text>
                      </View>
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <Text style={d.emptyRail}>
                      Bu listede film veya dizi bulunmuyor.
                    </Text>
                  }
                />
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
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 6, paddingBottom: 16 }}
                      >
                        {["Tümü", ...groups.map((g) => g.name)].map((group) => (
                          <Pill
                            key={group}
                            label={group}
                            active={group === filter}
                            onPress={() => setFilter(group)}
                          />
                        ))}
                      </ScrollView>
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
            room={shareRoom}
            mini={mini}
            onMini={() => setMini((v) => !v)}
            onClose={() => setPlaying([])}
            onFeature={open}
            seekSeconds={settings.seekSeconds || 15}
            bufferSeconds={settings.bufferSeconds || 15}
            onMulti={() => {
              setMini(true);
              changeTab("TV KANALI");
              setSelecting(true);
            }}
          />
        </View>
      )}
      {shareOpen&&<SharePanel item={playing.length===1?playing[0]:undefined} room={shareRoom} onRoom={setShareRoom} onClose={()=>setShareOpen(false)} onConfigured={()=>void refreshEntitlement()}/>}
      {pendingReminder&&<ReminderPicker item={pendingReminder.item} program={pendingReminder.program} onClose={()=>setPendingReminder(null)} onSave={async minutes=>{await toggleReminder(pendingReminder.item,pendingReminder.program,minutes);setReminders(await scheduledReminders());setPendingReminder(null);Alert.alert("Hatırlatıcı kuruldu",`${minutes} dakika önce bildirim gönderilecek.`);}}/>}
      {mediaDetails&&<MediaDetails item={mediaDetails} info={imdb[metadataKey(mediaDetails)]} onClose={()=>setMediaDetails(null)} onPlay={()=>{const item=mediaDetails;setMediaDetails(null);play(item);}}/>}
      {audioTestOpen&&<AudioDiagnostics onClose={()=>setAudioTestOpen(false)}/>}
      {categoryOpen&&<CategoryPicker groups={groups} selected={homeCategories} onClose={()=>setCategoryOpen(false)} onSave={values=>{setHomeCategories(values);setCategoryOpen(false);void AsyncStorage.setItem("kotak.homeCategories",JSON.stringify(values)).catch(()=>setMessage("Kategori seçimi kaydedilemedi."));}}/>}
      {voiceOpen&&<VoiceSearch entries={entries} guide={guides} metadata={imdb} onDetails={setMediaDetails} onReminder={(item,p)=>void reminder(item,p)} onClose={()=>setVoiceOpen(false)} onPlay={item=>{
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
          ["AI Canlı Maç Analizi", Sparkles],
          ["Kişisel AI TV Asistanı", Sparkles],
          ["AI Canlı Ses Çevirisi", Mic],
          ["Birlikte İzle (SharePlay)", Users],
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
      <Sheet
        visible={episodes !== null}
        title="Bölümler"
        onClose={() => {
          episodeJob.current?.abort();
          setEpisodes(null);
        }}
      >
        {episodeBusy && <ActivityIndicator color={colors.blue} />}
        {(episodes || []).map((item) => (
          <View key={item.id}>{channelRow(item)}</View>
        ))}
      </Sheet>
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
      {parentOpen && <ParentPanel protection={protection} child={child} groups={[...new Set(allEntries.filter(e => e.kind === "live").map(e => e.group))]} onClose={() => setParentOpen(false)} onChange={(value, isChild) => {episodeJob.current?.abort(); setProtection(value); setChild(isChild); setPlaying([]); setScreen(null); setSearchOpen(false); setInfo(null); setOptionsOpen(false); setEpisodes(null); setDetails(null); setSelected([]);setShareOpen(false);setPendingReminder(null);setMediaDetails(null);setVoiceOpen(false);setImdbOpen(false);setCategoryOpen(false);setEpgSettingsOpen(false);}} />}
      {(info === "Kotak AI & Birlikte İzle" || FEATURE_NAMES.includes(info || "")) && <FeaturesPanel key={info} active={info!} entries={entries} cacheTime={cacheTime} onOpen={open} onClose={() => setInfo(null)} onPlay={play}/>}
      {(info === "Kotak TV PRO" || info === "Pro Sürümüne Geç") && <ProPanel onClose={() => setInfo(null)}/>}
      {info === "Hakkında" && <AboutPanel onClose={() => setInfo(null)}/>}
      <Sheet
        visible={info !== null && !FEATURE_NAMES.includes(info) && !["Kotak AI & Birlikte İzle","Kotak TV PRO","Pro Sürümüne Geç","Hakkında"].includes(info)}
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
                ? "Kotak TV\nKendi IPTV listenizle canlı TV, film ve dizi deneyimi.\nSürüm 1.0.2 · kotaktv@gmail.com"
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
