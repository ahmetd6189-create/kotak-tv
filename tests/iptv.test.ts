import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import {
  parsePlaylist,
  parseGuide,
  xmltvTime,
  httpUrl,
  loadCatalog,
  loadEpisodes,
  requestText,
} from "../src/native/iptv.ts";
const config = {
  id: "p",
  name: "Listem",
  type: "m3u" as const,
  url: "https://provider.example/list/playlist.m3u",
};

test("M3U: BOM, CRLF, quoted commas, logo, group, EPG and relative stream", () => {
  const result = parsePlaylist(
    '\uFEFF#EXTM3U x-tvg-url="../guide.xml"\r\n#EXTINF:-1 tvg-id="one" tvg-logo="/logo.png" group-title="News, TR",Kanal 1\r\n../live/one.m3u8',
    config,
  );
  assert.equal(result.entries[0].name, "Kanal 1");
  assert.equal(result.entries[0].group, "News, TR");
  assert.equal(result.entries[0].logo, "https://provider.example/logo.png");
  assert.equal(result.entries[0].uri, "https://provider.example/live/one.m3u8");
  assert.equal(result.entries[0].epgId, "one");
  assert.equal(result.epgUrl, "https://provider.example/guide.xml");
});
test("All 1001 channels survive, stable IDs, duplicate entries deduplicated", () => {
  const text =
    "#EXTM3U\n" +
    Array.from(
      { length: 1001 },
      (_, i) => `#EXTINF:-1,Kanal ${i}\nhttps://example.com/${i}.m3u8`,
    ).join("\n");
  const result = parsePlaylist(
    text + "\n#EXTINF:-1,Kanal 0\nhttps://example.com/0.m3u8",
    config,
  );
  assert.equal(result.entries.length, 1001);
  assert.equal(
    result.entries[999].id,
    parsePlaylist(text, config).entries[999].id,
  );
});
test("HLS master and segment manifests remain a single playable stream", () => {
  for (const text of [
    "#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nlow.m3u8",
    "#EXTM3U\n#EXT-X-TARGETDURATION:8\n#EXTINF:8,\nseg1.ts",
  ]) {
    const result = parsePlaylist(text, config);
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].uri, config.url);
  }
});
test("Film classification, single quoted attributes, per-channel headers", () => {
  const result = parsePlaylist(
    `#EXTM3U\n#EXTINF:-1 group-title='Film',Film\n#EXTVLCOPT:http-user-agent=Kotak\nhttps://example.com/movie.mkv|Referer=https%3A%2F%2Fexample.com\n#EXTINF:-1,TV\nhttps://example.com/tv.m3u8`,
    config,
  );
  assert.equal(result.entries[0].kind, "movie");
  assert.equal(result.entries[0].headers?.["User-Agent"], "Kotak");
  assert.equal(result.entries[0].headers?.Referer, "https://example.com");
  assert.deepEqual(result.entries[1].headers, {});
});
test("Rejects login HTML, unsupported schemes and empty playlists", () => {
  assert.throws(() => parsePlaylist("<html>Login</html>", config));
  assert.throws(() =>
    parsePlaylist("#EXTM3U\n#EXTINF:-1,TV\nrtmp://example.com/live", config),
  );
  assert.throws(() => httpUrl("javascript:alert(1)"));
});
test("XMLTV: real progress timestamps, timezone, CDATA, entity decoding and expiry", () => {
  const now = Date.UTC(2026, 9, 18, 18);
  assert.equal(xmltvTime("20261018210000 +0300"), now);
  const guide = parseGuide(
    `<tv><programme channel="ch&amp;1" start="20261018200000 +0300" stop="20261018220000 +0300"><title><![CDATA[Maç &amp; Haber]]></title></programme><programme channel="expired" start="20261018000000 +0300" stop="20261018010000 +0300"><title>Eski</title></programme></tv>`,
    now,
  );
  assert.equal(guide["ch&1"][0].title, "Maç & Haber");
  assert.equal(guide["ch&1"][0].start, now - 3600000);
  assert.equal(guide.expired, undefined);
});
test("HTTP integration: Xtream auth, live/VOD/series, episodes, categories and credential escaping", async () => {
  const server = createServer((req, res) => {
    const url = new URL(req.url!, "http://localhost");
    res.setHeader("content-type", "application/json");
    if (url.pathname === "/fail") {
      res.statusCode = 403;
      res.end("denied");
      return;
    }
    if (url.pathname === "/list") {
      res.end("#EXTM3U\n#EXTINF:-1,Live\n/live/test.m3u8");
      return;
    }
    assert.equal(url.searchParams.get("username"), "u +");
    assert.equal(url.searchParams.get("password"), "p&/?");
    const data: Record<string, unknown> = {
      auth: {
        user_info: {
          auth: 1,
          status: "Active",
          allowed_output_formats: ["m3u8"],
        },
      },
      get_live_streams: [
        { stream_id: 7, name: "TV", category_id: 1, epg_channel_id: "tv" },
      ],
      get_live_categories: [{ category_id: 1, category_name: "Ulusal" }],
      get_vod_streams: [
        { stream_id: 8, name: "Film", container_extension: "mp4" },
      ],
      get_vod_categories: [],
      get_series: [{ series_id: 9, name: "Dizi" }],
      get_series_categories: [],
      get_series_info: {
        episodes: {
          "1": [
            {
              id: 10,
              episode_num: 1,
              title: "Bölüm",
              container_extension: "mkv",
            },
          ],
        },
      },
    };
    res.end(JSON.stringify(data[url.searchParams.get("action") || "auth"]));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;
  const xtream = {
    ...config,
    type: "xtream" as const,
    url: base,
    username: "u +",
    password: "p&/?",
  };
  try {
    const result = await loadCatalog(xtream);
    assert.equal(result.entries.length, 3);
    assert.equal(result.entries[0].group, "Ulusal");
    assert.ok(
      result.entries[0].uri?.includes("/live/u%20%2B/p%26%2F%3F/7.m3u8"),
    );
    assert.ok(result.entries[1].uri?.endsWith("/8.mp4"));
    const episodes = await loadEpisodes(xtream, result.entries[2]);
    assert.ok(episodes[0].uri?.endsWith("/10.mkv"));
    assert.equal(episodes[0].kind, "episode");
    const m3u = await loadCatalog({ ...config, url: `${base}/list` });
    assert.equal(m3u.entries[0].uri, `${base}/live/test.m3u8`);
    await assert.rejects(requestText(`${base}/fail`), /HTTP 403/);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
test("Xtream partial VOD failure does not hide working live channels; expired auth rejected", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (async (input) => {
      const action = new URL(String(input)).searchParams.get("action");
      if (!action)
        return new Response(
          JSON.stringify({ user_info: { auth: 1, status: "Active" } }),
        );
      if (action === "get_live_streams")
        return new Response(JSON.stringify([{ stream_id: 5, name: "TV" }]));
      if (action === "get_vod_streams")
        return new Response("no", { status: 500 });
      return new Response("[]");
    }) as typeof fetch;
    const result = await loadCatalog({
      ...config,
      type: "xtream",
      username: "a",
      password: "b",
    });
    assert.equal(result.entries.length, 1);
    assert.deepEqual(result.warnings, ["Film listesi alınamadı."]);
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ user_info: { auth: 0 } }))) as typeof fetch;
    await assert.rejects(
      loadCatalog({ ...config, type: "xtream" }),
      /aktif değil/,
    );
  } finally {
    globalThis.fetch = original;
  }
});


test('Offline snapshot strips playback credentials and expires after 24 hours', async () => {
 const { snapshot, readSnapshot } = await import('../src/native/offline.ts');
 const now = Date.now();
 const item = {id:'secure',name:'TRT',group:'Çocuk',logo:'https://host/logo?password=secret',kind:'live' as const,uri:'https://host/user/secret/1',headers:{Authorization:'secret'},playlistId:'p'};
 const data = snapshot([item], {'p:tv':[{title:'Now',start:now-1000,end:now+60000},{title:'Old',start:now-10000,end:now-1}]}, now);
 assert.equal(JSON.stringify(data).includes('secret'),false);
 assert.equal(data.guide['p:tv'].length,1);
 assert.ok(readSnapshot(JSON.stringify(data),now+1000));
 assert.equal(readSnapshot(JSON.stringify(data),now+24*3600000),null);
 assert.equal(readSnapshot('{bad',now),null);
});
test('Child profile is an explicit live-category allowlist and hides VOD', async () => {
 const { childEntries, smartMatches } = await import('../src/native/offline.ts');
 const base={id:'tv',name:'Çocuk TV',group:'Çocuk',logo:'',kind:'live' as const,playlistId:'p'};
 const items=[base,{...base,id:'adult',group:'Yetişkin'},{...base,id:'film',kind:'movie' as const}];
 assert.deepEqual(childEntries(items,true,['Çocuk']).map(e=>e.id),['tv']);
 assert.equal(childEntries(items,true,[]).length,0);
 assert.equal(childEntries(items,false,[]).length,3);
 assert.equal(smartMatches([{...base,name:'beIN SPORTS',group:'Spor'}],'Bana spor kanallarını bul').length,1);
});

test('Live stream paths override ambiguous Film & Dizi category labels', () => {
 const text='#EXTM3U\n#EXTINF:-1 group-title="Film & Dizi",beIN SPORTS\nhttps://host/live/u/p/1.ts\n#EXTINF:-1 group-title="Dizi",TRT\nhttps://host/tv.m3u8\n#EXTINF:-1 group-title="Canlı",Episode\nhttps://host/series/u/p/2.mp4';
 assert.deepEqual(parsePlaylist(text,config).entries.map(e=>e.kind),['live','live','episode']);
});
test('10,000-entry M3U parsing yields to UI and can be cancelled', async () => {
 const {parsePlaylistAsync}=await import('../src/native/iptv.ts');
 const text='#EXTM3U\n'+Array.from({length:10000},(_,i)=>`#EXTINF:-1,Kanal ${i}\nhttps://host/${i}.m3u8`).join('\n');
 let heartbeat=false;setTimeout(()=>{heartbeat=true},0);
 const result=await parsePlaylistAsync(text,config);
 assert.equal(heartbeat,true);assert.equal(result.entries.length,10000);
 assert.equal(result.entries[9999].id,parsePlaylist(text,config).entries[9999].id);
 const abort=new AbortController();setTimeout(()=>abort.abort(),0);
 await assert.rejects(parsePlaylistAsync(text,config,config.url,abort.signal),/iptal/);
});
test('EPG parsing yields to UI and retains all relevant channel programs', async () => {
 const {parseGuideAsync}=await import('../src/native/iptv.ts');
 const now=Date.UTC(2026,9,18,18);
 const xml='<tv>'+Array.from({length:3000},(_,i)=>`<programme channel="ch${i}" start="20261018170000 +0000" stop="20261018190000 +0000"><title>Maç ${i}</title></programme>`).join('')+'</tv>';
 let heartbeat=false;setTimeout(()=>{heartbeat=true},0);
 const parsed=await parseGuideAsync(xml,now);
 assert.equal(heartbeat,true);assert.equal(Object.keys(parsed).filter(k=>!k.startsWith('@')).length,3000);
 assert.deepEqual(parsed,parseGuide(xml,now));
});
test('Xtream delivers live channels before delayed VOD, series and category responses', {timeout:3000}, async () => {
 const original=globalThis.fetch;
 let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve});
 let first!:()=>void;const firstLive=new Promise<void>(resolve=>{first=resolve});let done=false;
 try {
  globalThis.fetch=(async(input)=>{
   const action=new URL(String(input)).searchParams.get('action');
   if(!action)return new Response(JSON.stringify({user_info:{auth:1,status:'Active'}}));
   if(action==='get_live_streams')return new Response(JSON.stringify([{stream_id:5,name:'Live',category_id:1}]));
   await pending;
   return new Response(JSON.stringify(action==='get_live_categories'?[{category_id:1,category_name:'Spor'}]:[]));
  }) as typeof fetch;
  const finished=loadCatalog({...config,type:'xtream'},undefined,part=>{if(part.entries.some(e=>e.kind==='live'))first()}).then(value=>{done=true;return value});
  await firstLive;assert.equal(done,false);release();const result=await finished;
  assert.equal(result.entries[0].group,'Spor');assert.equal(result.entries.length,1);
 }finally{release();globalThis.fetch=original;}
});


test('Deadline rejects even if native fetch ignores abort, including a stalled response body', async () => {
 const previous=globalThis.fetch;
 try{
  globalThis.fetch=(()=>new Promise(()=>{})) as typeof fetch;
  await assert.rejects(requestText('https://host/list',undefined,15),/süre sınırında/);
  globalThis.fetch=(async()=>({ok:true,status:200,headers:new Headers(),url:'https://host/list',text:()=>new Promise(()=>{})})) as typeof fetch;
  await assert.rejects(requestText('https://host/list',undefined,15),/süre sınırında/);
 }finally{globalThis.fetch=previous;}
});
test('A standard get.php link automatically uses Xtream and supplies XMLTV without leaking credentials',async()=>{
 const previous=globalThis.fetch;const paths:string[]=[];
 try{
  globalThis.fetch=(async input=>{
   const u=new URL(String(input));paths.push(u.pathname);
   const action=u.searchParams.get('action');
   if(!action)return new Response(JSON.stringify({user_info:{auth:1,status:'Active'}}));
   return new Response(JSON.stringify(action==='get_live_streams'?[{stream_id:1,name:'Live'}]:[]));
  }) as typeof fetch;
  const result=await loadCatalog({...config,url:'https://host/prefix/get.php?username=user&password=pass&type=m3u_plus'});
  assert.equal(result.entries[0].kind,'live');assert.equal(paths.includes('/prefix/get.php'),false);
  assert.equal(new URL(result.epgUrl!).pathname,'/prefix/xmltv.php');
 }finally{globalThis.fetch=previous;}
});
test('Channel group labels never turn extensionless live channels into movie or series cards',()=>{
 const result=parsePlaylist('#EXTM3U\n#EXTINF:-1 group-title="Film & Dizi",beIN Movies\nhttps://host/user/pass/200\n#EXTINF:-1 group-title="Dizi",beIN Series\nhttps://host/user/pass/201',config);
 assert.deepEqual(result.entries.map(e=>e.kind),['live','live']);
});
