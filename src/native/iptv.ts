import {parseJsonArray} from "./json-array.ts";
export type Kind = "live" | "movie" | "series" | "episode";
export type Entry = {
  id: string;
  name: string;
  group: string;
  logo: string;
  kind: Kind;
  uri?: string;
  contentType?: "hls" | "auto";
  streamFormat?: string;
  providerId?:string;
  playbackResolved?:boolean;
  headers?: Record<string, string>;
  epgId?: string;
  seriesId?: string;
  playlistId: string;
  imdbRating?: number;
  imdbId?: string;
  rating?: number;
  added?: number;
  released?: string;
  genre?: string;
};
export type PlaylistConfig = {
  id: string;
  name: string;
  type: "m3u" | "xtream";
  url: string;
  username?: string;
  password?: string;
  epgUrl?: string;
};
export type Catalog = { entries: Entry[]; epgUrl?: string; warnings: string[] };
export type Program = { title: string; start: number; end: number; description?:string };
export type Guide = Record<string, Program[]>;

export function httpUrl(input: string, base?: string): string {
  let url: URL;
  try {
    url = new URL(input.trim(), base);
  } catch {
    throw new Error("Geçerli bir http:// veya https:// adresi girin.");
  }
  if (!["https:", "http:"].includes(url.protocol))
    throw new Error("Yalnızca HTTP ve HTTPS adresleri destekleniyor.");
  return url.href;
}

export async function requestText(url: string, signal?: AbortSignal, timeoutMs = 30000): Promise<{text:string;url:string}> {
  httpUrl(url);
  const controller = new AbortController();
  let stop!: (error: Error) => void;
  const stopped = new Promise<never>((_, reject) => {stop = reject;});
  const abort = () => { controller.abort(); stop(new Error("İşlem iptal edildi.")); };
  signal?.addEventListener("abort", abort);
  const timer = setTimeout(() => {controller.abort(); stop(new Error("Sunucu süre sınırında yanıt vermedi. Tekrar deneyin."));}, timeoutMs);
  try {
    if (signal?.aborted) abort();
    return await Promise.race([stopped, (async () => {
      const response = await fetch(url, {signal:controller.signal});
      if (!response.ok) throw new Error(`Sunucu HTTP ${response.status} döndürdü. Hesabı veya adresi kontrol edin.`);
      if (Number(response.headers.get("content-length") || 0) > 64*1024*1024) throw new Error("Liste 64 MB sınırını aşıyor.");
      const text = await response.text();
      if(text.length > 64*1024*1024) throw new Error("Liste işlenemeyecek kadar büyük.");
      return {text,url:response.url || url};
    })()]);
  } catch(error) {
    if(signal?.aborted) throw new Error("İşlem iptal edildi.");
    if(controller.signal.aborted) throw new Error("Sunucu süre sınırında yanıt vermedi. Tekrar deneyin.");
    if(error instanceof Error && /^(Sunucu HTTP|Liste )/.test(error.message))throw error;
    throw new Error("Sunucuya bağlanılamadı. Adresi, internet bağlantısını ve sağlayıcının erişim iznini kontrol edin.");
  } finally {clearTimeout(timer); signal?.removeEventListener("abort",abort);}
}
export function xtreamFromM3u(config: PlaylistConfig): PlaylistConfig | null {
  if(config.type !== "m3u") return null;
  try {
    const url=new URL(config.url); const username=url.searchParams.get("username"); const password=url.searchParams.get("password");
    if(!/\/get\.php$/i.test(url.pathname)||!username||!password)return null;
    return {...config,type:"xtream",url:url.origin+url.pathname.replace(/\/get\.php$/i,""),username,password};
  }catch{return null;}
}
export function inferredEpgUrl(config: PlaylistConfig): string | undefined {
  if(config.epgUrl)return config.epgUrl;
  const xtream=config.type==="xtream"?config:xtreamFromM3u(config);
  if(!xtream)return undefined;
  return `${xtream.url.replace(/\/$/,"")}/xmltv.php?${new URLSearchParams({username:xtream.username || "",password:xtream.password || ""})}`;
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++)
    h = Math.imul(h ^ value.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
}
function attributes(value: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of value.matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))
    out[m[1].toLowerCase()] = m[2] ?? m[3];
  return out;
}
function titleAfterComma(value: string): string {
  let quote = "";
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if ((c === '"' || c === "'") && (!quote || quote === c))
      quote = quote ? "" : c;
    else if (c === "," && !quote) return value.slice(i + 1).trim();
  }
  return "";
}
function mediaKind(uri: string, group: string): Kind {
  // Provider route / container takes precedence over ambiguous category labels.
  if (/\/series\//i.test(uri)) return "episode";
  if (/\/movie\//i.test(uri)) return "movie";
  if (/\/live\//i.test(uri) || /\.(m3u8|ts)(?:[?#]|$)/i.test(uri)) return "live";
  if (/\.(mp4|mkv|avi|mov)(?:[?#]|$)/i.test(uri)) return "movie";
  // A channel called "Film & Dizi" is still live. Category text alone is not VOD evidence.
  return "live";
}
export async function yieldToUI(signal?: AbortSignal) {
  if (signal?.aborted) throw new Error("İşlem iptal edildi.");
  await new Promise<void>(resolve => setTimeout(resolve, 0));
  if (signal?.aborted) throw new Error("İşlem iptal edildi.");
}

function* playlistSteps(
  text: string,
  config: PlaylistConfig,
  base = config.url,
): Generator<void, Catalog, void> {
  const input = text.replace(/^\uFEFF/, "").trim();
  if (!input.startsWith("#EXTM3U"))
    throw new Error(
      "Adres bir M3U listesi döndürmedi. Giriş sayfası veya yanlış link olabilir.",
    );
  // Bir HLS manifestinin .ts parçalarını ayrı kanallar olarak göstermeyiz.
  if (/#EXT-X-(TARGETDURATION|STREAM-INF|MEDIA-SEQUENCE|MAP):/i.test(input)) {
    return {
      entries: [
        {
          id: `${config.id}-hls`,
          playlistId: config.id,
          name: config.name || "Canlı yayın",
          group: "IPTV",
          logo: "",
          kind: "live",
          uri: config.url,
        },
      ],
      warnings: [],
    };
  }
  const header = attributes(input.split(/\r?\n/, 1)[0]);
  const epg = config.epgUrl || header["x-tvg-url"] || header["url-tvg"] || inferredEpgUrl(config);
  let epgUrl: string | undefined;
  try {
    if (epg) epgUrl = httpUrl(epg.split(",")[0], base);
  } catch {
    /* EPG kanalları engellemez. */
  }
  const entries: Entry[] = [];
  const seen = new Set<string>();
  let meta: Record<string, string> = {};
  let name = "";
  let group = "";
  let headers: Record<string, string> = {};
  let work = 0;
  for (const raw of input.split(/\r?\n/)) {
    if (++work % 400 === 0) yield;
    const line = raw.trim();
    if (!line) continue;
    if (/^#EXTINF:/i.test(line)) {
      meta = attributes(line);
      name = titleAfterComma(line) || meta["tvg-name"] || "Kanal";
      group = meta["group-title"] || "IPTV";
      headers = {};
    } else if (/^#EXTGRP:/i.test(line)) group = line.slice(8).trim() || "IPTV";
    else if (/^#EXTVLCOPT:http-(user-agent|referrer)=/i.test(line)) {
      const match = line.match(
        /^#EXTVLCOPT:http-(user-agent|referrer)=(.*)$/i,
      )!;
      headers[
        match[1].toLowerCase() === "user-agent" ? "User-Agent" : "Referer"
      ] = match[2];
    } else if (!line.startsWith("#")) {
      try {
        const [path, options] = line.split("|", 2);
        const uri = httpUrl(path, base);
        const identity = `${uri}|${name}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        if (options)
          for (const [key, value] of new URLSearchParams(options)) {
            if (/^(user-agent|referer|referrer)$/i.test(key))
              headers[/user-agent/i.test(key) ? "User-Agent" : "Referer"] =
                value;
          }
        let logo = "";
        try {
          if (meta["tvg-logo"]) logo = httpUrl(meta["tvg-logo"], base);
        } catch {}
        entries.push({
          id: `${config.id}-${hash(identity)}`,
          playlistId: config.id,
          name: name || `Kanal ${entries.length + 1}`,
          group: group || "IPTV",
          logo,
          uri,
          kind: mediaKind(uri, group),
          epgId: meta["tvg-id"],
          imdbRating: /^(?:[0-9](?:\.[0-9]+)?|10(?:\.0+)?)$/.test(meta["imdb-rating"] || "") ? Number(meta["imdb-rating"]) : undefined,
          imdbId: /^tt\d+$/.test(meta["imdb-id"] || "") ? meta["imdb-id"] : undefined,
          headers: { ...headers },
        });
      } catch {
        /* Desteklenmeyen adres, listedeki diğer kanalları engellemez. */
      }
      meta = {};
      name = "";
      group = "";
      headers = {};
    }
  }
  if (!entries.length)
    throw new Error("Listede oynatılabilir HTTP/HTTPS yayını bulunamadı.");
  return { entries, epgUrl, warnings: [] };
}

// Shared parsing logic: sync helper for small inputs/tests; cooperative production path.
export function parsePlaylist(text: string, config: PlaylistConfig, base = config.url): Catalog {
  const steps = playlistSteps(text, config, base);
  let result = steps.next();
  while (!result.done) result = steps.next();
  return result.value;
}
export async function parsePlaylistAsync(text: string, config: PlaylistConfig, base = config.url, signal?: AbortSignal): Promise<Catalog> {
  const steps = playlistSteps(text, config, base);
  let result = steps.next();
  while (!result.done) { await yieldToUI(signal); result = steps.next(); }
  if (signal?.aborted) throw new Error("İşlem iptal edildi.");
  return result.value;
}

type Row = Record<string, unknown>;
function rows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter(
        (v): v is Row => !!v && typeof v === "object" && !Array.isArray(v),
      )
    : [];
}
function baseUrl(config: PlaylistConfig): string {
  return httpUrl(config.url).replace(/\/$/, "");
}
const infoCache=new Map<string,{at:number;value:unknown}>();
async function api(
  config: PlaylistConfig,
  action?: string,
  signal?: AbortSignal,
  extra?: Record<string, string>,
  timeoutMs?: number,
): Promise<unknown> {
  if(signal?.aborted)throw new Error('İşlem iptal edildi.');
  const cacheKey=JSON.stringify([baseUrl(config),config.username,config.password,action,extra]);
  const cached=infoCache.get(cacheKey);if((action==='get_vod_info'||action==='get_series_info')&&cached&&Date.now()-cached.at<300000)return cached.value;
  const query = new URLSearchParams({
    username: config.username || "",
    password: config.password || "",
    ...(action ? { action } : {}),
    ...extra,
  });
  const response = await requestText(
    `${baseUrl(config)}/player_api.php?${query}`,
    signal,
    timeoutMs ?? (action ? 30000 : 8000),
  );
  try {
    const value=response.text.length>128000&&response.text.trimStart().startsWith("[")?await parseJsonArray(response.text,signal):JSON.parse(response.text);
    if((action==='get_vod_info'||action==='get_series_info')&&!signal?.aborted){infoCache.set(cacheKey,{at:Date.now(),value});if(infoCache.size>24)infoCache.delete(infoCache.keys().next().value!);}return value;
  } catch {
    throw new Error(
      "Xtream sunucusu geçerli JSON döndürmedi. Sunucu adresini kontrol edin.",
    );
  }
}
function stream(
  config: PlaylistConfig,
  kind: string,
  id: string,
  ext: string,
): string {
  return `${baseUrl(config)}/${kind}/${encodeURIComponent(config.username || "")}/${encodeURIComponent(config.password || "")}/${encodeURIComponent(id)}.${ext.replace(/[^a-z0-9]/gi, "") || "mp4"}`;
}
export async function loadCatalog(
  config: PlaylistConfig,
  signal?: AbortSignal,
  onPartial?: (catalog: Catalog) => void | Promise<void>,
  options: {kinds?:("live"|"movie"|"series")[];requestTimeoutMs?:number;categoryTimeoutMs?:number} = {},
): Promise<Catalog> {
  if (config.type === "m3u") {
    const account = xtreamFromM3u(config);
    if(account) {
      try { return await loadCatalog(account,signal,onPartial,options); }
      catch {if(signal?.aborted)throw new Error("İşlem iptal edildi.");}
    }
    const data = await requestText(config.url, signal,options.requestTimeoutMs);
    const catalog = await parsePlaylistAsync(data.text, config, data.url, signal);
    if (onPartial) await onPartial(catalog);
    return catalog;
  }
  const auth = (await api(config, undefined, signal,undefined,options.requestTimeoutMs?5000:undefined)) as {
    user_info?: {
      auth?: number | string;
      status?: string;
      allowed_output_formats?: string[];
    };
  };
  if (
    String(auth?.user_info?.auth) !== "1" ||
    (auth.user_info?.status && auth.user_info.status.toLowerCase() !== "active")
  )
    throw new Error(
      "Xtream hesabı aktif değil veya kullanıcı adı/şifre yanlış.",
    );
  const entries: Entry[] = [];
  const warnings: string[] = [];
  const query = new URLSearchParams({ username: config.username || "", password: config.password || "" });
  const epgUrl = config.epgUrl || `${baseUrl(config)}/xmltv.php?${query}`;
  const batches = new Map<string, Entry[]>();
  let notifications = Promise.resolve();
  const notify = (kind: string, batch: Entry[]) => {
    batches.set(kind, batch);
    const partial = { entries: ["live", "movie", "series"].flatMap(k => batches.get(k) || []), warnings: [] as string[], epgUrl };
    notifications = notifications.then(async () => {
      if (!signal?.aborted && partial.entries.length) await onPartial?.(partial);
    });
    return notifications;
  };
  const tasks = [
    ["live", "get_live_streams", "get_live_categories"],
    ["movie", "get_vod_streams", "get_vod_categories"],
    ["series", "get_series", "get_series_categories"],
  ] as const;
  const selectedTasks=tasks.filter(([kind])=>!options.kinds||options.kinds.includes(kind));
  const results = await Promise.allSettled(
    selectedTasks.map(async ([kind, action, categoryAction]) => {
      // Category requests may be slow; they must not hide already usable streams.
      let categoryRows: Row[] = [];
      const categoryJob = api(config, categoryAction, signal,undefined,options.categoryTimeoutMs).then(value => { categoryRows = rows(value); }).catch(() => {});
      const data = await api(config, action, signal,undefined,options.requestTimeoutMs);
      if (!Array.isArray(data)) throw new Error("Katalog yanıtı geçersiz.");
      const groups = new Map(
        categoryRows.map((c) => [
          String(c.category_id),
          String(c.category_name || "IPTV"),
        ]),
      );
      const source = rows(data);
      const batch: Entry[] = [];
      for (let index = 0; index < source.length; index++) {
        if (index && index % 300 === 0) await yieldToUI(signal);
        const r = source[index];
        const id = String(kind === "series" ? r.series_id : r.stream_id);
        const output = auth.user_info?.allowed_output_formats?.includes("m3u8")
          ? "m3u8"
          : "ts";
        batch.push({
          id: `${config.id}-${kind}-${id}`,
          providerId:id,
          playlistId: config.id,
          kind,
          name: String(r.name || "İçerik"),
          group: groups.get(String(r.category_id)) || "IPTV",
          logo: String(r.stream_icon || r.cover || ""),
          epgId: r.epg_channel_id ? String(r.epg_channel_id) : undefined,
          seriesId: kind === "series" ? id : undefined,
          streamFormat:kind==="live"?output:String(r.container_extension||"mp4"),
          rating: Number.isFinite(Number(r.rating)) ? Number(r.rating) : undefined,
          added:Number(r.added||r.last_modified)||undefined,
          released:String(r.releaseDate||r.release_date||r.releasedate||r.year||'')||undefined,
          genre:String(r.genre||'')||undefined,
          imdbRating: r.imdb_rating !== undefined && Number.isFinite(Number(r.imdb_rating)) ? Number(r.imdb_rating) : undefined,
          imdbId: /^tt\d+$/.test(String(r.imdb_id || "")) ? String(r.imdb_id) : undefined,
          uri:
            kind === "series"
              ? undefined
              : stream(
                  config,
                  kind === "live" ? "live" : "movie",
                  id,
                  kind === "live"
                    ? output
                    : String(r.container_extension || "mp4"),
                ),
        });
      }
      await notify(kind, batch);
      await categoryJob;
      const finalGroups = new Map(categoryRows.map(c => [String(c.category_id), String(c.category_name || "IPTV")]));
      const grouped = batch.map((entry, i) => ({...entry, group: finalGroups.get(String(source[i].category_id)) || entry.group}));
      return grouped;
    }),
  );
  results.forEach((r, i) => {
    if (r.status === "fulfilled") { for (const entry of r.value) entries.push(entry); }
    else warnings.push(`${({live:"Canlı TV",movie:"Film",series:"Dizi"})[selectedTasks[i][0]]} listesi alınamadı.`);
  });
  if (!entries.length)
    throw new Error(
      "Hesaba bağlanıldı ancak kanal veya içerik listesi alınamadı.",
    );
  if (signal?.aborted) throw new Error("İşlem iptal edildi.");
  return { entries, warnings, epgUrl  };
}
export async function loadEpisodes(
  config: PlaylistConfig,
  series: Entry,
  signal?: AbortSignal,
): Promise<Entry[]> {
  config = xtreamFromM3u(config) || config;
  const result = (await api(config, "get_series_info", signal, {
    series_id: series.seriesId || "",
  })) as { episodes?: Record<string, unknown> };
  const entries = Object.entries(result?.episodes || {})
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([season, value]) =>
      rows(value).map((r) => ({
        id: `${config.id}-episode-${r.id}`,
        playlistId: config.id,
        seriesId: series.seriesId,
        providerId:String(r.id),
        streamFormat:String(r.container_extension||"mp4"),
        name: `S${season} B${r.episode_num || ""} · ${r.title || series.name}`,
        group: series.name,
        logo: series.logo,
        kind: "episode" as const,
        uri: stream(
          config,
          "series",
          String(r.id),
          String(r.container_extension || "mp4"),
        ),
      })),
    );
  if (!entries.length) throw new Error("Bu dizi için bölüm bulunamadı.");
  return entries;
}
function xmlText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, n: string) => {
      const p =
        n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return p <= 0x10ffff ? String.fromCodePoint(p) : "";
    })
    .replace(
      /&(amp|lt|gt|quot|apos);/g,
      (_, e: string) =>
        ({ amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" })[e] || "",
    );
}
export function xmltvTime(value: string): number {
  const m = value.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*(Z|[+-]\d{4})?$/,
  );
  if (!m) return NaN;
  const offset =
    m[7] && m[7] !== "Z"
      ? (m[7][0] === "+" ? 1 : -1) *
        (Number(m[7].slice(1, 3)) * 60 + Number(m[7].slice(3)))
      : 0;
  return (
    Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) - offset * 60000
  );
}
function* guideSteps(xml: string, now = Date.now()): Generator<void, Guide, void> {
  if (!/<tv[\s>]/i.test(xml))
    throw new Error("EPG adresi XMLTV verisi döndürmedi.");
  const guide: Guide = Object.create(null);
  let work = 0;
  for (const m of xml.matchAll(
    /<programme\b([^>]*)>([\s\S]*?)<\/programme>/gi,
  )) {
    if (++work % 300 === 0) yield;
    const a = attributes(m[1]);
    const start = xmltvTime(a.start || "");
    const end = xmltvTime(a.stop || "");
    if (
      !a.channel ||
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      end <= start ||
      end <= now ||
      start > now + 86400000
    )
      continue;
    const title =
      m[2].match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || "Program";
    (guide[xmlText(a.channel)] ||= []).push({
      title: xmlText(title),
      ...(m[2].match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/i)?.[1]?{description:xmlText(m[2].match(/<desc\b[^>]*>([\s\S]*?)<\/desc>/i)![1]).slice(0,8000)}:{}),
      start,
      end,
    });
  }
  for (const list of Object.values(guide)) list.sort((a,b)=>a.start-b.start);
  const key = (s:string) => s.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i").replace(/[^a-z0-9]+/g," ").trim().replace(/\b(?:hd|fhd|uhd|4k)\b/g,"").replace(/\s+/g,"");
  for(const [id,programs] of Object.entries(guide)) guide[`@${key(id)}`] ||= programs;
  let channels=0;
  for(const match of xml.matchAll(/<channel\b([^>]*)>([\s\S]*?)<\/channel>/gi)) {
    if(++channels%300===0)yield;
    const id=attributes(match[1]).id;const programs=guide[xmlText(id || "")];if(!programs)continue;
    for(const name of match[2].matchAll(/<display-name\b[^>]*>([\s\S]*?)<\/display-name>/gi)) guide[`@${key(xmlText(name[1]))}`] ||= programs;
  }
  return guide;
}

export function parseGuide(xml: string, now = Date.now()): Guide {
  const steps = guideSteps(xml, now); let result = steps.next();
  while (!result.done) result = steps.next();
  return result.value;
}
export async function parseGuideAsync(xml: string, now = Date.now(), signal?: AbortSignal): Promise<Guide> {
  const steps = guideSteps(xml, now); let result = steps.next();
  while (!result.done) { await yieldToUI(signal); result = steps.next(); }
  if (signal?.aborted) throw new Error("İşlem iptal edildi.");
  return result.value;
}

export type ProviderInfo={title?:string;poster?:string;backdrops:string[];plot?:string;released?:string;genre?:string;cast?:string;director?:string;duration?:string;rating?:number;imdbRating?:number;imdbId?:string};
/** Read only the selected title, using the user's existing provider account. */
export async function loadMediaInfo(config:PlaylistConfig,item:Entry,signal?:AbortSignal):Promise<ProviderInfo|null>{
 config=xtreamFromM3u(config)||config;if(config.type!=="xtream")return null;
 const series=item.kind==='series'||item.kind==='episode';const id=series?item.seriesId:item.id.slice(`${config.id}-movie-`.length);if(!id||!/^[0-9]+$/.test(id))return null;
 const result=await api(config,series?'get_series_info':'get_vod_info',signal,series?{series_id:id}:{vod_id:id},8000) as {info?:Record<string,unknown>};const data=result.info;if(!data)return null;
 const str=(v:unknown)=>typeof v==='string'&&v!=='N/A'?v:undefined;
 const image=(v:unknown)=>typeof v==='string'&&/^https?:\/\//i.test(v)?v:undefined;
 const imdb=Number(data.imdb_rating);const rating=Number(data.rating);
 return {title:str(data.name),poster:image(data.movie_image)||image(data.cover),backdrops:(Array.isArray(data.backdrop_path)?data.backdrop_path:[]).map(image).filter((v):v is string=>!!v).slice(0,8),plot:str(data.plot)||str(data.description),released:str(data.releasedate)||str(data.releaseDate)||str(data.release_date),genre:str(data.genre),cast:str(data.cast)||str(data.actors),director:str(data.director),duration:str(data.duration),rating:rating>0&&rating<=10?rating:undefined,imdbRating:imdb>0&&imdb<=10?imdb:undefined,imdbId:/^tt\d+$/.test(String(data.imdb_id||''))?String(data.imdb_id):undefined};
}

export {api as providerApi};
