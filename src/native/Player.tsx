import {VlcTile} from "./VlcTile";
import {needsSystemPlayer} from "./playback-tools";
import * as ScreenOrientation from "expo-screen-orientation";
import {CastControls} from "../ui/CastControls";
import React, { memo, useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEvent } from "expo";
import { setAudioModeAsync } from "expo-audio";
import {
  isPictureInPictureSupported,
  useVideoPlayer,
  VideoView,
  VideoAirPlayButton,
  type AudioTrack,
  type SubtitleTrack,
} from "expo-video";
import {
  Check,
  Sparkles,
  Grid2X2,
  Maximize2,
  Minimize2,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react-native";
import { RecoveryStar } from "../ui/RecoveryStar";
import { StreamRecovery, preferredAudio } from "./recovery";
import type { Entry } from "./iptv";
import { IconButton, Pill, Sheet, d } from "../ui/Design";
import { colors as c } from "../theme";

function stamp(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)
    .toString()
    .padStart(2, "0")}:${(whole % 60).toString().padStart(2, "0")}`;
}
const Tile = memo(function Tile({
  item,
  multi,
  audible,
  onAudio,
  seekSeconds,
  bufferSeconds,
  initialPosition=0,
  onProgress,
}: {
  item: Entry;
  initialPosition?:number;
  onProgress?:(id:string,position:number,duration:number)=>void;
  multi: boolean;
  audible: boolean;
  onAudio: () => void;
  seekSeconds: number;
  bufferSeconds: number;
}) {
  const view = useRef<VideoView>(null);
  const resume = useRef(false);
  const seekWidth = useRef(1);
  const pip = !multi && isPictureInPictureSupported();
  const [reload, setReload] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [userMuted, setUserMuted] = useState(false);
  const explicitAudio=useRef<string|null>(null);
  const audioIntent=useRef({audible,userMuted});audioIntent.current={audible,userMuted};
  const sourceFailure=useRef(false);
  const resumePosition=useRef(initialPosition);
  const [tracksOpen, setTracksOpen] = useState(false);
  const [recovery, setRecovery] = useState("");
  const watchdog = useRef(new StreamRecovery());
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [audioId, setAudioId] = useState<string | null>(null);
  const [subtitleId, setSubtitleId] = useState<string | null>(null);
  const player = useVideoPlayer(null, (p) => {
    p.loop = false;
    p.allowsExternalPlayback=true;
    p.muted = !audible;
    p.volume = 1;
    p.audioMixingMode = "doNotMix";
    p.staysActiveInBackground = !multi;
    p.showNowPlayingNotification = !multi;
    p.timeUpdateEventInterval = 1;
    p.bufferOptions = {
      preferredForwardBufferDuration: multi ? 6 : bufferSeconds,
      minBufferForPlayback: 1,
      maxBufferBytes: (multi ? 6 : 48) * 1024 * 1024,
    };
  });
  const { status } = useEvent(player, "statusChange", {
    status: player.status,
  });
  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { currentTime } = useEvent(player, "timeUpdate", {
    currentTime: player.currentTime,
    currentLiveTimestamp: null,
    currentOffsetFromLive: null,
    bufferedPosition: 0,
  });
  useEffect(()=>{if(item.kind!=="live"&&currentTime>0)onProgress?.(item.id,currentTime,player.duration);},[currentTime,item.id,item.kind,onProgress,player]);
  useEffect(()=>{if(status==="readyToPlay" && currentTime>0){setRecovery("");setLoadError(false);}},[currentTime,status]);
  useEffect(() => {
    const updateAudio = () => {
      const tracks=[...player.availableAudioTracks];setAudioTracks(tracks);
      if(tracks.length)player.audioTrack=tracks.find(t=>t.id===explicitAudio.current)||preferredAudio(tracks,null);
      setAudioId(player.audioTrack?.id || null);
    };
    const source = player.addListener("sourceLoad", () => {
      updateAudio();setSubtitleTracks([...player.availableSubtitleTracks]);setSubtitleId(player.subtitleTrack?.id || null);
    });
    const tracks=player.addListener("availableAudioTracksChange",updateAudio);
    const selected=player.addListener("audioTrackChange",()=>setAudioId(player.audioTrack?.id || null));
    return () => {source.remove();tracks.remove();selected.remove();};
  }, [player]);
  useEffect(() => {
    watchdog.current=new StreamRecovery();
    setUserMuted(false);
  },[item.id]);
  useEffect(() => {
    const check=(ended=false)=>{
      const action=watchdog.current.observe(Date.now(),{position:player.currentTime,status:sourceFailure.current?"error":player.status,playing:player.playing,live:item.kind==="live",active:AppState.currentState==="active",ended});
      if(action==="healthy")setRecovery("");
      if(action==="retry"){resumePosition.current=item.kind==="live"?0:player.currentTime;setRecovery(`Yeniden bağlanılıyor · ${watchdog.current.attempts}. deneme`);setReload(v=>v+1);}
    };
    const ended=player.addListener("playToEnd",()=>check(true));
    const timer=setInterval(()=>check(),2000);
    return()=>{clearInterval(timer);ended.remove();};
  },[player,item.kind]);
  useEffect(() => {
    let active = true;
    setLoadError(false);sourceFailure.current=false;
    watchdog.current.loadingSince=Date.now();
    setAudioTracks([]);
    setSubtitleTracks([]);
    void player
      .replaceAsync({
        uri: item.uri,
        headers: item.kind==="live" ? {"Cache-Control":"no-cache",...item.headers} : item.headers,
        contentType: item.contentType || (/\.m3u8(?:[?#]|$)/i.test(item.uri || "") ? "hls" : "auto"),
        metadata: { title: item.name },
      })
      .then(() => {
        if (active) {
          if(item.kind!=="live"&&resumePosition.current>0)player.currentTime=resumePosition.current;
          player.volume=1;player.muted=!audioIntent.current.audible || audioIntent.current.userMuted;
          void setAudioModeAsync({playsInSilentMode:true,shouldPlayInBackground:!multi,shouldRouteThroughEarpiece:false,allowsRecording:false,interruptionMode:"doNotMix"}).catch(()=>{});
          if(!watchdog.current.paused)player.play();
        }
      })
      .catch(() => {
        if (active) {sourceFailure.current=true;setLoadError(true);}
      });
    return () => {
      active = false;
    };
  }, [player, item.uri, item.headers, item.name, reload]);
  useEffect(() => {
    player.volume=1;
    player.muted = !audible || userMuted;
  }, [player, audible, userMuted]);
  useEffect(() => {
    if (!multi) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "background") {
        resume.current = player.playing;
        player.pause();
      } else if (state === "active" && resume.current) {
        resume.current = false;
        player.play();
      }
    });
    return () => sub.remove();
  }, [player, multi]);
  const failed = loadError || status === "error";
  const duration = player.duration;
  const live = item.kind === "live";
  const progress =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;
  return (
    <View style={s.tile}>
      <View style={s.videoBox}>
        <VideoView
          ref={view}
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: true, orientation: "landscape" }}
          allowsPictureInPicture={pip}
          startsPictureInPictureAutomatically={pip}
          allowsVideoFrameAnalysis={false}
        />
        {(status === "loading" || failed || !!recovery) && (
          <View pointerEvents="none" style={s.overlay}>
            <RecoveryStar/>
            <Text style={d.secondary}>{failed?"Kaynak yanıt vermiyor. Otomatik yeniden deneniyor…":"Yayın bağlanıyor…"}</Text>
          </View>
        )}
        {failed && <View style={{position:'absolute',bottom:20,alignSelf:'center'}}><Pill label="Şimdi yeniden bağlan" onPress={()=>{watchdog.current.next=0;watchdog.current.paused=false;setReload(v=>v+1)}}/></View>}
        {multi && (
          <View style={s.tileLabel}>
            <Text numberOfLines={1} style={s.label}>
              {item.name}
            </Text>
          </View>
        )}
      </View>
      {!!recovery && <Text style={[d.micro,{color:c.blue,padding:8}]}>{recovery}</Text>}
      {!multi&&true&&<View style={{paddingHorizontal:8,paddingTop:8,flexDirection:"row",justifyContent:"space-between"}}><CastControls item={item} position={currentTime} onTransferred={()=>{watchdog.current.paused=true;player.pause();}}/>{Platform.OS==="ios"&&<VideoAirPlayButton style={{width:36,height:36}} tint={c.blue}/>}</View>}
      <View style={s.transport}>
        {!multi && (
          <View style={s.progressLine}>
            <Text style={d.micro}>{live ? "● CANLI" : stamp(currentTime)}</Text>
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel="Video ilerlemesi"
              onLayout={(e) => {
                seekWidth.current = e.nativeEvent.layout.width;
              }}
              onPress={(e) => {
                if (!live && duration > 0){
                  player.currentTime = Math.max(
                    0,
                    Math.min(
                      duration,
                      (e.nativeEvent.locationX / seekWidth.current) * duration,
                    ),
                  );}
              }}
              style={s.seek}
            >
              <View
                style={[s.seekFill, { width: live ? "100%" : `${progress}%` }]}
              />
            </Pressable>
            <Text style={d.micro}>{live ? "IPTV" : stamp(duration)}</Text>
          </View>
        )}
        <View style={s.controls}>
          <View style={d.inline}>
            {!live && !multi && (
              <IconButton
                small
                icon={RotateCcw}
                label={`${seekSeconds} saniye geri`}
                onPress={() => {player.seekBy(-seekSeconds);}}
              />
            )}
            <IconButton
              blue
              small
              icon={isPlaying ? Pause : Play}
              label={isPlaying ? "Duraklat" : "Oynat"}
              onPress={() => {watchdog.current.paused=player.playing;if(player.playing)player.pause();else {watchdog.current.advancedAt=Date.now();player.play();}}}
            />
            {!live && !multi && (
              <IconButton
                small
                icon={RotateCw}
                label={`${seekSeconds} saniye ileri`}
                onPress={() => {player.seekBy(seekSeconds);}}
              />
            )}
            <IconButton
              small
              icon={audible && !userMuted ? Volume2 : VolumeX}
              label={
                multi
                  ? "Bu kanalın sesini seç"
                  : userMuted
                    ? "Sesi aç"
                    : "Sesi kapat"
              }
              onPress={() => {
                if (multi) {
                  onAudio();
                  setUserMuted(false);
                } else setUserMuted((v) => !v);
              }}
            />
          </View>
          <View style={d.inline}>
            {!multi && (
              <IconButton
                small
                icon={SlidersHorizontal}
                label="Ses ve altyazı"
                onPress={() => setTracksOpen(true)}
              />
            )}
            {pip && (
              <IconButton
                small
                icon={PictureInPicture2}
                label="Resim içinde resim"
                onPress={() => {
                  void view.current
                    ?.startPictureInPicture()
                    .catch(() =>
                      Alert.alert(
                        "PiP",
                        "Cihaz veya uygulama PiP izni vermiyor.",
                      ),
                    );
                }}
              />
            )}
            <IconButton
              small
              icon={Maximize2}
              label="Tam ekran"
              onPress={() => {
                void view.current
                  ?.enterFullscreen()
                  .catch(() =>
                    Alert.alert("Tam Ekran", "Tam ekran açılamadı."),
                  );
              }}
            />
          </View>
        </View>
      </View>
      <Sheet
        visible={tracksOpen}
        title="Ses ve Altyazı"
        onClose={() => setTracksOpen(false)}
      >
        <Pill label="Sesi Yenile" active onPress={() => {setUserMuted(false);onAudio();player.volume=1;player.muted=false;const tracks=player.availableAudioTracks;if(tracks.length)player.audioTrack=tracks.find(t=>/^(tr|tur)/i.test(t.language))||tracks[0];void setAudioModeAsync({playsInSilentMode:true,allowsRecording:false,shouldRouteThroughEarpiece:false,interruptionMode:"doNotMix"}).catch(()=>{});player.play();}}/>
        <Text style={[d.h2,{marginTop:20}]}>Ses Parçaları</Text>
        {!audioTracks.length && (
          <Text style={s.trackHint}>
            Yayının ses parçaları henüz alınamadı.
          </Text>
        )}
        {audioTracks.map((track) => (
          <Pressable
            key={track.id}
            style={s.trackRow}
            onPress={() => {
              explicitAudio.current=track.id;
              player.audioTrack = track;
              setAudioId(track.id);
            }}
          >
            <Text style={d.secondary}>
              {track.label || track.language || "Ses"}
            </Text>
            {audioId === track.id && <Check size={17} color={c.blue} />}
          </Pressable>
        ))}
        <Text style={[d.h2, { marginTop: 20 }]}>Altyazı</Text>
        <Pressable
          style={s.trackRow}
          onPress={() => {
            player.subtitleTrack = null;
            setSubtitleId(null);
          }}
        >
          <Text style={d.secondary}>Altyazı Kapalı</Text>
          {subtitleId === null && <Check size={17} color={c.blue} />}
        </Pressable>
        {subtitleTracks.map((track) => (
          <Pressable
            key={track.id}
            style={s.trackRow}
            onPress={() => {
              try{player.subtitleTrack = track;setSubtitleId(track.id);}catch{Alert.alert("Altyazı","Bu altyazı parçası seçilemedi. Başka bir parça veya uyumlu oynatıcıyı deneyin.");}
            }}
          >
            <Text style={d.secondary}>
              {track.label || track.language || "Altyazı"}
            </Text>
            {subtitleId === track.id && <Check size={17} color={c.blue} />}
          </Pressable>
        ))}
      </Sheet>
    </View>
  );
});
export function PlaybackPanel({
  items,
  mini,
  onMini,
  onClose,
  onMulti,
  onFeature,
  seekSeconds = 15,
  bufferSeconds = 15,
  positions={},
  onProgress,
}: {
  items: Entry[];
  positions?:Record<string,{position:number;duration:number}>;
  onProgress?:(id:string,position:number,duration:number)=>void;
  mini: boolean;
  onMini?: () => void;
  onClose: () => void;
  onMulti?: () => void;
  onFeature?: (name: string) => void;
  seekSeconds?: number;
  bufferSeconds?: number;
}) {
  const [engine,setEngine]=useState<"vlc"|"system">(Platform.OS==="android"?"vlc":"system");
  const [wide,setWide]=useState(false);
  useEffect(()=>()=>{void ScreenOrientation.unlockAsync().catch(()=>{});},[]);
  useEffect(()=>{if(mini){setWide(false);void ScreenOrientation.unlockAsync().catch(()=>{});}},[mini]);
  const [audio, setAudio] = useState(0);
  useEffect(() => setAudio(0), [items]);
  const multi = items.length > 1;
  return (
    <View style={[s.panel, mini && s.mini]}>
      <View style={s.header}>
        <IconButton icon={X} small label="Oynatıcıyı kapat" onPress={onClose} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={s.title} numberOfLines={1}>
            {multi ? "Çoklu Ekran" : items[0]?.name}
          </Text>
          <View style={d.inline}>
            <Text style={d.liveTag}>
              {multi
                ? `${items.length} EKRAN`
                : items[0]?.kind === "live"
                  ? "CANLI"
                  : "VOD"}
            </Text>
            {!mini && (
              <Text style={d.micro} numberOfLines={1}>
                {items[0]?.group}
              </Text>
            )}
          </View>
        </View>
        {!mini && onMulti && (
          <IconButton
            small
            icon={Grid2X2}
            label="Çoklu Ekran"
            onPress={onMulti}
          />
        )}
        {!!onMini&&<IconButton
          small
          icon={mini ? Maximize2 : Minimize2}
          label={mini ? "Büyüt" : "Küçült"}
          onPress={onMini}
        />}
      </View>
      {!mini&&<View style={{paddingHorizontal:12,paddingBottom:8}}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:8}}><Pill label="Yayını paylaş" onPress={()=>onFeature?.("Yayını paylaş")}/>{Platform.OS==="android"&&<Pill label={engine==="vlc"?"Oynatıcı: Uyumlu VLC":"Oynatıcı: Sistem"} onPress={()=>setEngine(v=>v==="vlc"?"system":"vlc")}/>}</ScrollView></View>}
      <View style={s.grid}>
        {items.map((item, index) => (
          <View
            key={`${item.id}:${multi}`}
            style={{
              width: multi ? "50%" : "100%",
              height: items.length === 4 ? "50%" : "100%",
            }}
          >
            {engine==="vlc"&&!needsSystemPlayer(item)?<VlcTile item={item} multi={multi} audible={index===audio} onAudio={()=>setAudio(index)} seekSeconds={seekSeconds} initialPosition={positions[item.id]?.position||0} onProgress={onProgress} onSystemPlayer={()=>setEngine("system")} onFullscreen={()=>{setWide(v=>!v);void (wide?ScreenOrientation.unlockAsync():ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE)).catch(()=>{});}}/>:<Tile
              item={item}
              initialPosition={positions[item.id]?.position||0}
              onProgress={onProgress}
              multi={multi}
              audible={index === audio}
              onAudio={() => setAudio(index)}
              seekSeconds={seekSeconds}
              bufferSeconds={bufferSeconds}
            />}
          </View>
        ))}

      </View>
    </View>
  );
}
const s = StyleSheet.create({
  analysis: {position:"absolute",right:8,top:8,bottom:8,width:240,maxWidth:"55%",backgroundColor:"#080e18e8",borderRadius:18,borderWidth:1,borderColor:"#007aff55",padding:14,zIndex:5},
  panel: { flex: 1, backgroundColor: c.bg },
  mini: {
    position: "absolute",
    flex: 0,
    width: 320,
    maxWidth: "95%",
    height: 230,
    right: 12,
    bottom: 98,
    borderWidth: 1,
    borderColor: "#007AFF99",
    borderRadius: 24,
    overflow: "hidden",
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#050505",
  },
  title: { color: c.white, fontSize: 13, fontWeight: "700" },
  grid: { flex: 1, flexDirection: "row", flexWrap: "wrap" },
  tile: { flex: 1, padding: 2 },
  videoBox: { flex: 1, backgroundColor: c.bg, minHeight: 0 },
  tileLabel: {
    position: "absolute",
    top: 6,
    left: 6,
    right: 6,
    alignItems: "flex-start",
  },
  label: {
    color: c.white,
    backgroundColor: "#000b",
    padding: 5,
    borderRadius: 6,
    fontSize: 11,
    maxWidth: "100%",
  },
  transport: { paddingHorizontal: 8, paddingVertical: 8, gap: 9 },
  progressLine: { flexDirection: "row", alignItems: "center", gap: 10 },
  seek: {
    flex: 1,
    height: 14,
    justifyContent: "center",
    backgroundColor: "#222225",
    borderRadius: 9,
    overflow: "hidden",
  },
  seekFill: { height: 4, backgroundColor: c.blue, borderRadius: 9 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000b",
    padding: 12,
    gap: 12,
  },
  error: { color: c.red, textAlign: "center", fontSize: 12 },
  trackHint: { color: c.zinc500, fontSize: 12, marginVertical: 16 },
  trackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff0a",
  },
});
