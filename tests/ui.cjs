// Bellek içi DOM testi; tarayıcı açmaz ve ağ isteği yapmaz.
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://test.invalid', pretendToBeVisual:true });
Object.assign(global, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, ShadowRoot: dom.window.ShadowRoot, SVGElement: dom.window.SVGElement, Element: dom.window.Element, MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle, requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout });
Object.defineProperty(global, 'navigator', { value: dom.window.navigator, configurable: true });
window.requestAnimationFrame = global.requestAnimationFrame;
window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
global.IS_REACT_ACT_ENVIRONMENT = true;
require('esbuild').buildSync({ stdin: { contents: `export {setLanguage} from './src/native/i18n'; export {Text as LocalText} from './src/ui/Native'; export {relocalizeNotifications} from './src/native/localized-notifications'; export {ChannelSchedule} from './src/ui/ChannelSchedule'; export {AppearanceProvider,useAppearance} from './src/ui/Appearance'; export {AccountGate} from './src/ui/AccountGate'; export {AccountForm} from './src/ui/AccountForm'; export {AccountError} from './src/native/account-core'; export {PlaybackPanel} from './src/native/Player'; export {VlcTile} from './src/native/VlcTile'; export {systemMock,vlcMock} from './tests/app-services.cjs'; export {DirectPlay} from './src/ui/DirectPlay'; export {CatalogView} from './src/ui/CatalogView'; export {CategoriesPage} from './src/ui/CategoriesPage'; import {KotakApp} from './App'; import React from 'react'; import {SafeAreaProvider as TestSafeArea} from 'react-native-safe-area-context'; export const App=()=>React.createElement(TestSafeArea,null,React.createElement(KotakApp,{entitlement:{id:'ui-test',kind:'trial',expiresAt:Date.now()+86400000,verifiedAt:Date.now()},accountEmail:'test@example.invalid',onSignOut(){}})); export {SharePanel} from './src/ui/SharePanel'; export * as secureMock from './tests/secure-store.cjs'; export {default as storeMock} from './tests/async-store.cjs'; export {PROTECTION_KEY} from './src/ui/ParentPanel'; export { seedFollows, observeFollowCatalog, syncTeamReminders, cancelFollowNotifications } from './src/native/follows'; export {FollowPanel} from './src/ui/FollowPanel'; export { ReminderPicker } from './src/ui/ReminderPicker'; export { MediaDetails } from './src/ui/MediaDetails'; export { parseEntitlement, expiryNotices, expiryMessage, scheduleExpiryNotices } from './src/native/entitlement'; export { PlaylistForm } from './src/native/PlaylistForm'; export { SearchPanel, MoreScreen, ChannelCard } from './src/ui/Design'; export { SettingsView } from './src/ui/SettingsView'; export { ProPanel, AboutPanel, FeaturesPanel } from './src/ui/KotakFeatures'; export { ParentPanel } from './src/ui/ParentPanel'; export { HomeActions, CategoryPicker } from './src/ui/HomeControls'; export { EpgScreen } from './src/ui/EpgView'; export { VoiceSearch } from './src/ui/VoiceSearch'; export { toggleReminder, scheduledReminders } from './src/native/reminders'; export { speechMock, notificationMock } from './tests/device-services.cjs'; export { TopBar } from './src/components/TopBar'; export { SafeAreaProvider } from 'react-native-safe-area-context';`, resolveDir: process.cwd(), loader: 'tsx' }, outfile: 'tests/.ui-bundle.cjs', bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', loader: { '.js': 'jsx', '.wav':'dataurl' }, alias: { 'react-native-webview':'./tests/webview.cjs','react-native-vlc-media-player':'./tests/app-services.cjs','expo-screen-orientation':'./tests/app-services.cjs','expo-keep-awake':'./tests/app-services.cjs', 'expo':'./tests/app-services.cjs','expo-video':'./tests/app-services.cjs','expo-linking':'./tests/app-services.cjs','expo-status-bar':'./tests/app-services.cjs','react-native-google-cast':'./tests/app-services.cjs', '@react-native-async-storage/async-storage':'./tests/async-store.cjs', 'react-native': 'react-native-web', 'expo-secure-store': './tests/secure-store.cjs', 'expo-audio':'./tests/device-services.cjs', 'expo-speech-recognition':'./tests/device-services.cjs', 'expo-notifications':'./tests/app-services.cjs' }, resolveExtensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'], mainFields: ['browser', 'module', 'main'], conditions: ['browser'], external: ['react', 'react-dom', 'react-native-web'], define: { __DEV__: 'false', 'process.env.EXPO_OS': '"web"' }, logLevel: 'error' });
const React = require('react');
const { render, fireEvent, screen, cleanup, act, waitFor } = require('@testing-library/react');
const assert = require('node:assert/strict');
const UI = require('./.ui-bundle.cjs');
const h = React.createElement;
const wrap = child => h(UI.SafeAreaProvider, { initialMetrics: { frame: { x: 0, y: 0, width: 393, height: 852 }, insets: { top: 24, bottom: 12, left: 0, right: 0 } } }, child);
let passes = 0;
async function check(name, fn) { try { await fn(); passes++; console.log(`PASS ${name}`); } finally { cleanup(); UI.setLanguage('tr'); } }
(async () => {
 await check('Dil: birleşik dinamik metin çevrilir, sağlayıcı adı korunur',async()=>{
  await UI.storeMock.setItem('kotak.appearance',JSON.stringify({language:'en',theme:'oled'}));
  render(wrap(h(UI.AppearanceProvider,null,h(React.Fragment,null,h(UI.LocalText,null,30,' saniye'),h(UI.LocalText,{verbatim:true},'Şimdi')))));
  await waitFor(()=>assert.ok(screen.getByText('30 seconds')));assert.ok(screen.getByText('Şimdi'));
 });
 await check('Dil: bildirim dili değişir, saat ve içerik kimliği korunur',async()=>{
  UI.notificationMock.reset();UI.setLanguage('de');const start=Date.now()+3600000;
  const item={id:'lang-channel',name:'TRT 1',playlistId:'p'},program={start,end:start+3600000,title:'Haberler'};
  await UI.toggleReminder(item,program,10);
  const [id,before]=[...UI.notificationMock.scheduled][0];assert.equal(before.content.title,'TRT 1 · Deine Sendung beginnt');assert.equal(before.content.body,'Haberler · In 10 Minuten');
  UI.setLanguage('fr');await UI.relocalizeNotifications();const after=UI.notificationMock.scheduled.get(id);
  assert.equal(after.content.title,'TRT 1 · Votre programme commence');assert.equal(after.trigger.date.getTime(),before.trigger.date.getTime());assert.equal(after.content.data.channelId,'lang-channel');
 });
 await UI.storeMock.setItem('kotak.teamSetup.test@example.invalid','done');
 await check('Hesap kapısı: girişsiz kullanıcı oynatıcıya erişemez',async()=>{
  const client={restore:async()=>null};
  render(wrap(h(UI.AccountGate,{client},()=>h('div',null,'PROTECTED PLAYER'))));
  await waitFor(()=>assert.ok(screen.getByText('Giriş yap')));
  assert.equal(screen.queryByText('PROTECTED PLAYER'),null);
 });
 await check('Hesap kapısı: demo yalnız düğmeyle başlar; çıkış erişimi kapatır',async()=>{
  let starts=0;let logged=true;
  const client={restore:async()=>logged?{user:{email:'test@example.invalid'}}:null,access:async start=>{if(!start)return null;starts++;return {verified:true,id:'t',kind:'trial',active:true,serverTime:Date.now(),verifiedAt:Date.now(),expiresAt:Date.now()+86400000};},signOut:async()=>{logged=false;}};
  render(wrap(h(UI.AccountGate,{client},props=>h('button',{onClick:props.onSignOut},'PROTECTED PLAYER'))));
  await waitFor(()=>assert.ok(screen.getByText('24 saatlik denemeyi başlat')));assert.equal(starts,0);
  fireEvent.click(screen.getByText('24 saatlik denemeyi başlat'));
  await waitFor(()=>assert.ok(screen.getByText('PROTECTED PLAYER')));assert.equal(starts,1);
  fireEvent.click(screen.getByText('PROTECTED PLAYER'));
  await waitFor(()=>assert.ok(screen.getByText('Giriş yap')));assert.equal(screen.queryByText('PROTECTED PLAYER'),null);
 });
 await check('Hesap kapısı: bitmiş demo ve sunucu hatası erişim vermez',async()=>{
  const client={restore:async()=>({user:{email:'test@example.invalid'}}),access:async()=>({id:'old',kind:'trial',active:false,serverTime:Date.now(),expiresAt:Date.now()-1,verifiedAt:Date.now()})};
  render(wrap(h(UI.AccountGate,{client},()=>h('div',null,'PROTECTED PLAYER'))));
  await waitFor(()=>assert.ok(screen.getByText('Kullanım süren doldu')));assert.equal(screen.queryByText('PROTECTED PLAYER'),null);
  client.access=async()=>{throw Error('offline');};fireEvent.click(screen.getByText('Durumu tekrar kontrol et'));
  await waitFor(()=>assert.ok(screen.getByText(/İşlem tamamlanamadı/)));assert.equal(screen.queryByText('PROTECTED PLAYER'),null);
 });

 await check('Hesap kapısı kataloğu her saniye çizmez, süre dolunca erişimi kapatır',async()=>{
  let renders=0;const now=Date.now();
  const client={restore:async()=>({user:{email:'test@example.invalid'}}),access:async()=>({id:'deadline',kind:'trial',active:true,serverTime:now,expiresAt:now+1600,verifiedAt:now})};
  render(wrap(h(UI.AccountGate,{client},()=>{renders++;return h('div',null,'EXPIRING PLAYER')})));
  await waitFor(()=>assert.ok(screen.getByText('EXPIRING PLAYER')));
  const initial=renders;await new Promise(r=>setTimeout(r,1100));assert.equal(renders,initial);
  await waitFor(()=>assert.ok(screen.getByText('Kullanım süren doldu')));
  assert.equal(screen.queryByText('EXPIRING PLAYER'),null);
 });
 await check('Canlı oynatıcı paylaşım ve motor seçimini gizler; VLC hatasında otomatik geçer',async()=>{
  const live={id:'live-auto',playlistId:'p',name:'Canlı',group:'TV',logo:'',kind:'live',uri:'https://example.invalid/live.ts'};
  const panel=render(wrap(h(UI.PlaybackPanel,{items:[live],mini:false,onClose(){}})));
  assert.equal(screen.queryByText('Yayını paylaş'),null);
  assert.equal(screen.queryByText(/Oynatıcı: /),null);
  panel.unmount();let fallback=false;render(wrap(h(UI.VlcTile,{item:live,multi:false,audible:true,seekSeconds:15,onAudio(){},onFullscreen(){},onSystemPlayer(){fallback=true;}})));
  await act(async()=>UI.vlcMock.props.onError({}));assert.equal(fallback,true);
 });
 await check('Arka plandan dönüş: geçici ağ hatası ekranı sıfırlamaz, 401 erişimi kapatır',async()=>{
 const appState=require('react-native-web').AppState;const original=appState.addEventListener;let change;let failure=null;let mounts=0;
 appState.addEventListener=(_,fn)=>{change=fn;return {remove(){}};};
 function Protected(){React.useEffect(()=>{mounts++;},[]);return h('div',null,'PRESERVED PLAYER');}
 const client={restore:async()=>({user:{email:'test@example.invalid'}}),access:async()=>{if(failure)throw failure;const now=Date.now();return {id:'preserve',kind:'trial',active:true,serverTime:now,expiresAt:now+60000,verifiedAt:now};}};
 try{render(wrap(h(UI.AccountGate,{client},()=>h(Protected))));await waitFor(()=>assert.ok(screen.getByText('PRESERVED PLAYER')));
 failure=new UI.AccountError('NETWORK_ERROR');await act(async()=>{change('active');});await waitFor(()=>assert.equal(mounts,1));assert.ok(screen.getByText('PRESERVED PLAYER'));
 failure=new UI.AccountError('SIGN_IN_REQUIRED',401);await act(async()=>{change('active');});await waitFor(()=>assert.equal(screen.queryByText('PRESERVED PLAYER'),null));
 }finally{appState.addEventListener=original;}
 });
 await check('Film oynatıcısı paylaşmaz, denetimler gizlenir ve dokununca geri gelir',async()=>{
 const movie={id:'hide-controls',playlistId:'p',name:'Film denetim testi',group:'Film',kind:'movie',uri:'https://example.invalid/movie.mp4',logo:''};
 render(wrap(h(UI.PlaybackPanel,{items:[movie],mini:false,onClose(){}})));
 assert.equal(screen.queryByText('Yayını paylaş'),null);assert.ok(screen.getByLabelText('Oynatıcıyı kapat'));
 await act(async()=>new Promise(r=>setTimeout(r,3600)));
 assert.equal(screen.queryByLabelText('Oynatıcıyı kapat'),null);assert.equal(screen.queryByLabelText('Tam ekran'),null);
 fireEvent.click(screen.getByLabelText('Oynatıcı denetimlerini göster veya gizle'));
 assert.ok(screen.getByLabelText('Oynatıcıyı kapat'));assert.ok(screen.getByLabelText('Tam ekran'));
 });
 await check('Sağlayıcı kadro fotoğrafı ve fragmanı detayda gösterilir',async()=>{
  const item={id:'cast-test',playlistId:'p',name:'Film',kind:'movie',group:'Film',logo:''};
  render(wrap(h(UI.MediaDetails,{item,provider:{backdrops:[],actors:[{name:'Oyuncu',photo:'https://example.invalid/actor.jpg'}],trailer:'https://www.youtube.com/watch?v=abcdefghijk',plot:'Detaylı özet',genre:'Dram'},onPlay(){},onClose(){}})));
  assert.ok(screen.getByLabelText('Oyuncu'));assert.ok(screen.getByRole('button',{name:'Fragmanı izle'}));assert.ok(screen.getByText('Tür Dram'));fireEvent.click(screen.getByRole('button',{name:'Fragmanı izle'}));assert.ok(screen.getByLabelText('Uygulama içi fragman'));fireEvent.click(screen.getByLabelText('Fragmanı kapat'));assert.ok(screen.getByText('Detaylı özet'));
 });
 await check('Şifre sıfırlama: OTP sonrası form, eşleşme kontrolü ve girişe dönüş',async()=>{
  let verified=0,updated=0,logged=0;
  const client={cancelRecovery(){},requestRecovery:async()=>{},verifyRecovery:async()=>{verified++},updateRecoveredPassword:async()=>{updated++;return {revoked:true}}};
  render(wrap(h(UI.AccountForm,{client,onAuthenticated:async()=>{logged++},onRecoveryChange(){}})));
  fireEvent.change(screen.getByLabelText('E-posta'),{target:{value:'test@example.invalid'}});
  fireEvent.click(screen.getByText('Şifremi unuttum'));fireEvent.click(screen.getByText('Sıfırlama kodu gönder'));
  await waitFor(()=>assert.ok(screen.getByLabelText('Doğrulama kodu')));
  assert.equal(screen.queryByText('Yeni şifreyi kaydet'),null);
  fireEvent.change(screen.getByLabelText('Doğrulama kodu'),{target:{value:'12345678'}});fireEvent.click(screen.getByText('Kodu doğrula'));
  await waitFor(()=>assert.ok(screen.getByText('Yeni şifreyi kaydet')));assert.equal(verified,1);assert.equal(logged,0);
  fireEvent.change(screen.getByLabelText('Hesap şifresi'),{target:{value:'New-password!'}});fireEvent.change(screen.getByLabelText('Şifre tekrarı'),{target:{value:'Wrong-password!'}});
  fireEvent.click(screen.getByText('Yeni şifreyi kaydet'));assert.ok(screen.getByText('Şifreler eşleşmiyor.'));assert.equal(updated,0);
  fireEvent.change(screen.getByLabelText('Şifre tekrarı'),{target:{value:'New-password!'}});fireEvent.click(screen.getByText('Yeni şifreyi kaydet'));
  await waitFor(()=>assert.ok(screen.getByText('Şifren güncellendi. Yeni şifrenle giriş yap.')));assert.equal(updated,1);assert.equal(logged,0);assert.equal(screen.getByLabelText('Hesap şifresi').value,'');
 });
 await check('Yanlış OTP: erişim yok; beş denemeden sonra yerel bekleme',async()=>{
  let attempts=0;
  const client={cancelRecovery(){},requestRecovery:async()=>{},verifyRecovery:async()=>{attempts++;throw new UI.AccountError('otp_expired',403)}};
  render(wrap(h(UI.AccountForm,{client,onAuthenticated:async()=>{throw Error('must not login')},onRecoveryChange(){}})));
  fireEvent.change(screen.getByLabelText('E-posta'),{target:{value:'test@example.invalid'}});fireEvent.click(screen.getByText('Şifremi unuttum'));fireEvent.click(screen.getByText('Sıfırlama kodu gönder'));
  await waitFor(()=>assert.ok(screen.getByLabelText('Doğrulama kodu')));fireEvent.change(screen.getByLabelText('Doğrulama kodu'),{target:{value:'111111'}});
  for(let i=0;i<5;i++){await act(async()=>{fireEvent.click(screen.getByText('Kodu doğrula'));});await waitFor(()=>assert.equal(attempts,i+1));}
  assert.equal(attempts,5);assert.ok(screen.getByText(/Çok fazla deneme/));fireEvent.click(screen.getByText('Kodu doğrula'));assert.equal(attempts,5);assert.equal(screen.queryByText('Yeni şifreyi kaydet'),null);
 });
 await check('Şifre görünürlüğü isteğe bağlı; kayıt için şifre tekrarı gerekli',async()=>{
  let calls=0;const client={cancelRecovery(){},signUp:async()=>{calls++;return null}};
  render(wrap(h(UI.AccountForm,{client,onAuthenticated:async()=>{},onRecoveryChange(){}})));
  assert.equal(screen.getByLabelText('Hesap şifresi').type,'password');fireEvent.click(screen.getByText('Şifreyi göster'));assert.equal(screen.getByLabelText('Hesap şifresi').type,'text');
  fireEvent.click(screen.getByText('Yeni hesap oluştur'));fireEvent.change(screen.getByLabelText('E-posta'),{target:{value:'test@example.invalid'}});fireEvent.change(screen.getByLabelText('Hesap şifresi'),{target:{value:'Password-123'}});
  fireEvent.click(screen.getByRole('button',{name:'Hesap oluştur'}));assert.equal(calls,0);assert.ok(screen.getByText('Şifreler eşleşmiyor.'));
 });

 await check('M3U paneli: gruplanmış alanlar ve onay simgesi gerçek bağlantı bilgisini gönderir', async () => {
   let saved;
   render(wrap(h(UI.PlaylistForm, { visible: true, busy: false, error: '', onClose() {}, onSave: value => { saved = value; } })));
   fireEvent.change(screen.getByPlaceholderText('Ad (isteğe bağlı)'), { target: { value: 'Listem' } });
   fireEvent.change(screen.getByPlaceholderText('URL: https://sunucu/playlist.m3u'), { target: { value: 'https://provider.example/playlist.m3u' } });
   fireEvent.click(screen.getByLabelText('Kaydet ve Onayla'));
   assert.equal(saved.type, 'm3u'); assert.equal(saved.name, 'Listem'); assert.equal(saved.url, 'https://provider.example/playlist.m3u');
   assert.equal(screen.queryByPlaceholderText('Kullanıcı Adı'), null);
 });
 await check('Xtream geçişi: orijinal alttaki okla sunucu/kullanıcı/şifre ekranına geçilir', async () => {
   let saved;
   render(wrap(h(UI.PlaylistForm, { visible: true, busy: false, error: '', onClose() {}, onSave: value => { saved = value; } })));
   fireEvent.click(screen.getByLabelText('Xtream Codes hesabına geç'));
   fireEvent.change(screen.getByPlaceholderText('Sunucu URL: http://domain.com:8080'), { target: { value: 'https://provider.example' } });
   fireEvent.change(screen.getByPlaceholderText('Kullanıcı Adı'), { target: { value: 'test-user' } });
   fireEvent.change(screen.getByPlaceholderText('Şifre'), { target: { value: 'test-password' } });
   fireEvent.click(screen.getByLabelText('Kaydet ve Onayla'));
   assert.equal(saved.type, 'xtream'); assert.equal(saved.username, 'test-user');
 });
 const channel = { id: 'tv', name: 'TRT 1', group: 'Ulusal', kind: 'live', logo: '', playlistId: 'p', uri: 'https://provider.example/live.m3u8' };
 const movie = { ...channel, id: 'film', name: 'Film A', kind: 'movie' };
 await check('Ayrı arama penceresinde film filtresi kanalı gizler ve seçimi oynatıcıya iletir', async () => {
   let played; let closed = false;
   render(wrap(h(UI.SearchPanel, { visible: true, entries: [channel, movie], onClose: () => { closed = true; }, onPlay: item => { played = item; } })));
   fireEvent.click(screen.getByRole('button', { name: 'Filmler', exact: true })); assert.equal(screen.queryByText('TRT 1'), null);
   fireEvent.click(screen.getByText('Film A')); assert.equal(played.id, 'film'); assert.equal(closed, true);
 });
 await check('Kanal kartında favori düğmesi yayını yanlışlıkla başlatmaz', async () => {
   let plays = 0; let favorites = 0;
   render(wrap(h(UI.ChannelCard, { item: channel, guide: {}, now: Date.now(), favorite: false, onPlay: () => plays++, onFavorite: () => favorites++ })));
   fireEvent.click(screen.getByLabelText('TRT 1 favori')); assert.equal(favorites, 1); assert.equal(plays, 0);
   fireEvent.click(screen.getByLabelText('İzle')); assert.equal(plays, 1);
 });
 await check('Daha Fazla: Kütüphaneniz ve Ayarlar, orijinal menüden ayrı sayfalara yönlenir', async () => {
   let target;
   render(wrap(h(UI.MoreScreen, { streamCount: 42, playlistCount: 1, onOpen: name => { target = name; } })));
   fireEvent.click(screen.getByText('Kütüphaneniz')); assert.equal(target, 'Kütüphaneniz');
   fireEvent.click(screen.getByText('Ayarlar')); assert.equal(target, 'Ayarlar');
 });
 await check('Ayarlar: Modern düzen seçimi görünüm tercihini değiştirir', async () => {
   let value;
   render(wrap(h(UI.SettingsView, { settings: { layout: 'Klasik', saveHistory: true }, onChange: v => { value = v; }, onBack() {}, onInfo() {}, onClearHistory() {} })));
   fireEvent.click(screen.getByText('Modern')); assert.equal(value.layout, 'Modern');
 });
 await check('Telefon üst menüsü beş ek simgeyle taşmaz; sekmeler ve yuvarlak arama/seçenek düğmeleri çalışır', async () => {
   let target;
   render(wrap(h(UI.TopBar, { currentTab:'ANASAYFA', onTabChange: v => target=v, onSearchClick:()=>target='search',onOptionsClick:()=>target='options' })));
   fireEvent.click(screen.getByText('CANLI')); assert.equal(target,'CANLI');
   fireEvent.click(screen.getByLabelText('Hızlı seçenekler')); assert.equal(target,'options');
   fireEvent.click(screen.getByLabelText('Ara')); assert.equal(target,'search');
 });
 await check('Kotak Pro: yalnız aylık/yıllık plan ve hizmet bağlanana kadar kapalı ödeme', async () => {
   render(wrap(h(UI.ProPanel, {onClose(){}})));
   assert.ok(screen.getByText('Aylık ₺249')); assert.ok(screen.getByText('Yıllık ₺999'));
   const button=screen.getByRole('button', {name:'Mağaza bağlantısı bekleniyor'});
   assert.equal(button.getAttribute('aria-disabled'),'true');
 });
 await check('Maç analizi servisi bağlı değilken sahte gol yüzdesi gösterilmez', async () => {
   render(wrap(h(UI.FeaturesPanel, {active:'AI Canlı Maç Analizi',entries:[],cacheTime:null,onOpen(){},onPlay(){},onClose(){}})));
   assert.ok(screen.getByText('Canlı maç ve oyuncu verisi sağlayıcısı bağlı değil.'));
   assert.equal(screen.queryByText(/%[0-9]/),null);
 });
 await check('Akıllı komut yerel listeden spor kanallarını filtreler ve seçimi oynatır', async () => {
   let played;
   render(wrap(h(UI.FeaturesPanel, {active:'Yapay Zeka Sesli Komut',entries:[{...channel,name:'beIN SPORTS',group:'Spor'},movie],cacheTime:null,onOpen(){},onPlay:e=>played=e,onClose(){}})));
   fireEvent.click(screen.getByText('Bana spor kanallarını bul'));
   assert.ok(screen.getByText('beIN SPORTS')); assert.equal(screen.queryByText('Film A'),null);
   fireEvent.click(screen.getByText('beIN SPORTS')); assert.equal(played.id,'tv');
 });
 await check('Çocuk profili yanlış PIN ile açılmaz, doğru PIN ile yetişkin profilini açar', async () => {
   let changed;
   render(wrap(h(UI.ParentPanel, {protection:{pin:'2468',groups:['Çocuk']},child:true,groups:['Çocuk','Spor'],onChange:(value,child)=>changed={value,child},onClose(){}})));
   fireEvent.change(screen.getByLabelText('Ebeveyn PIN'),{target:{value:'1111'}});
   await act(async()=>fireEvent.click(screen.getByText('PIN ile aç')));
   assert.ok(screen.getByText('PIN yanlış.')); assert.equal(changed.child,true);
   fireEvent.change(screen.getByLabelText('Ebeveyn PIN'),{target:{value:'2468'}});
   await act(async()=>fireEvent.click(screen.getByText('PIN ile aç')));
   assert.equal(changed.child,false);
 });
 await check('Ana ekrandaki asistan ve yenile düğmeleri doğru işlemi açar', async()=>{
   let target;
   render(wrap(h(UI.HomeActions,{onVoice:()=>target='voice',onRefresh:()=>target='refresh',loading:false})));
   fireEvent.click(screen.getByLabelText('Sesli TV asistanını aç'));assert.equal(target,'voice');
   fireEvent.click(screen.getByLabelText('Listeleri yenile'));assert.equal(target,'refresh');
 });
 await check('Kategori seçimi yalnız kullanıcının işaretlediği kategorileri kaydeder', async()=>{
   let saved;
   render(wrap(h(UI.CategoryPicker,{groups:[{id:'spor',name:'Spor',channelCount:10},{id:'haber',name:'Haber',channelCount:8}],selected:['Spor'],onClose(){},onSave:v=>saved=v})));
   fireEvent.click(screen.getByRole('checkbox',{name:'Haber'}));fireEvent.click(screen.getByRole('checkbox',{name:'Spor'}));
   fireEvent.click(screen.getByRole('button',{name:'Kaydet (1)'}));assert.deepEqual(saved,['Haber']);
 });
 await check('EPG Bu Akşam programı ve hatırlatma zili doğru kanal/programı iletir',async()=>{
   let selected;
   const now=Date.UTC(2026,9,19,13);const program={title:'Akşam Maçı',start:Date.UTC(2026,9,19,15,30),end:Date.UTC(2026,9,19,17)};
   render(wrap(h(UI.EpgScreen,{channels:[channel],guide:{'p:undefined':[program]},now,notice:'EPG hazır',onPlay(){},onReminder:(item,p)=>selected={item,p}})));
   fireEvent.click(screen.getByRole('button',{name:'Bu Akşam'}));fireEvent.click(screen.getByLabelText('Akşam Maçı hatırlat'));
   assert.equal(selected.item.id,'tv');assert.equal(selected.p.title,'Akşam Maçı');
 });
 await check('Gerçek konuşma tanıma olayı tek eşleşen kanalı otomatik açar',async()=>{
   let played;let closed=false;
   render(wrap(h(UI.VoiceSearch,{entries:[channel,movie],onClose:()=>closed=true,onPlay:item=>played=item})));
   await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Konuşmaya başla'})));
   assert.equal(UI.speechMock.options.lang,'tr-TR');
   await act(async()=>UI.speechMock.emit('result',{isFinal:true,results:[{transcript:'TRT 1 kanalını aç'}]}));
   assert.equal(played.id,'tv');assert.equal(closed,true);
 });
 await check('Mikrofon izni reddedilince dinliyormuş gibi davranılmaz',async()=>{
   UI.speechMock.granted=false;
   try{render(wrap(h(UI.VoiceSearch,{entries:[channel],onClose(){},onPlay(){}})));
    await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Konuşmaya başla'})));
    assert.ok(screen.getByText('Sesli arama için mikrofon ve konuşma tanıma izni gerekiyor.'));assert.equal(screen.queryByText('Dinliyorum…'),null);
   }finally{UI.speechMock.granted=true;}
 });
 await check('Hatırlatıcı OS bildirimine gerçek tarih ile yazılır; ikinci basış iptal eder',async()=>{
   UI.notificationMock.reset();const now=Date.now();const p={title:'Maç',start:now+3600000,end:now+7200000};
   assert.equal(await UI.toggleReminder(channel,p),true);
   const request=[...UI.notificationMock.scheduled.values()][0];
   assert.equal(request.trigger.date.getTime(),p.start-300000);assert.equal(request.content.data.channelId,'tv');
   assert.equal(await UI.toggleReminder(channel,p),false);assert.equal(UI.notificationMock.scheduled.size,0);
 });
 await check('Bildirim izni yoksa hatırlatıcı başarılı sayılmaz',async()=>{
   UI.notificationMock.reset();UI.notificationMock.granted=false;
   try{await assert.rejects(UI.toggleReminder(channel,{title:'Maç',start:Date.now()+3600000,end:Date.now()+7200000}),/bildirim izni/);assert.equal(UI.notificationMock.scheduled.size,0);}
   finally{UI.notificationMock.reset();}
 });

 await check('Hatırlatıcı penceresi 5/10/30/60 ve özel dakika seçimini kaydeder',async()=>{
  let minutes;render(wrap(h(UI.ReminderPicker,{item:channel,program:{title:'Maç',start:Date.now()+7200000,end:Date.now()+10800000},onClose(){},onSave:async n=>minutes=n})));
  fireEvent.click(screen.getByRole('button',{name:'1 saat kala'}));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Hatırlat',exact:true})));assert.equal(minutes,60);
  fireEvent.change(screen.getByLabelText('Hatırlatma süresi dakika'),{target:{value:'17'}});await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Hatırlat',exact:true})));assert.equal(minutes,17);
 });
 await check('Film penceresi afiş, tarih, gerçek puan, özet ve İzle eylemini gösterir',async()=>{
  let played=false;render(wrap(h(UI.MediaDetails,{item:movie,info:{title:'Film A',rating:8.8,id:'tt123',poster:'https://example.test/poster.jpg',released:'19 Oct 2026',plot:'Film özeti',updatedAt:Date.now()},onClose(){},onPlay:()=>played=true})));
  assert.ok(screen.getByText('Ekim 2026'));assert.ok(screen.getByText('IMDb 8.8'));assert.ok(screen.getByText('Film özeti'));fireEvent.click(screen.getByRole('button',{name:'İzle',exact:true}));assert.equal(played,true);
 });
 await check('Abonelik bildirimleri 48/24/16/8 saat önce; yenileme eski tarihleri iptal eder',async()=>{
  UI.notificationMock.reset();const now=Date.now();const entitlement=UI.parseEntitlement({verified:true,id:'sub',kind:'subscription',expiresAt:now+7*86400000,verifiedAt:now});
  assert.deepEqual(UI.expiryNotices(entitlement,now).map(x=>x.hours),[48,24,16,8]);assert.throws(()=>UI.parseEntitlement({verified:false}),/Doğrulanmış/);
  await UI.scheduleExpiryNotices(entitlement);assert.equal(UI.notificationMock.scheduled.size,4);assert.equal((await UI.scheduledReminders()).length,0);
  await UI.scheduleExpiryNotices({...entitlement,id:'renewed',expiresAt:now+30*86400000});assert.equal(UI.notificationMock.scheduled.size,4);assert.ok([...UI.notificationMock.scheduled.keys()].every(id=>id.includes('renewed')));
  await UI.scheduleExpiryNotices(null);assert.equal(UI.notificationMock.scheduled.size,0);
 });
 await check('Özel hatırlatma gerçek planlanan zamana yansır; geçmiş zaman sessizce şimdiye çevrilmez',async()=>{
  UI.notificationMock.reset();const p={title:'Program',start:Date.now()+7200000,end:Date.now()+10800000};await UI.toggleReminder(channel,p,30);const scheduled=[...UI.notificationMock.scheduled.values()][0];assert.equal(scheduled.trigger.date.getTime(),p.start-1800000);
  await assert.rejects(UI.toggleReminder({...channel,id:'other'}, {...p,start:Date.now()+60000},60),/saati geçmiş/);
 });


 await check('EPG: geçmiş pasif, gelecek hatırlatma ve sağlayıcı ayrıntıları',async()=>{
 const now=Date.now();let reminded;const past={title:'Geçmiş program',start:now-7200000,end:now-3600000},future={title:'Gelecek program',start:now+3600000,end:now+7200000,description:'Program konusu',category:'Spor',guests:'Konuk adı'};
 render(wrap(h(UI.ChannelSchedule,{item:channel,programs:[past,future],now,reminders:[],onClose(){},onPlay(){},onReminder:p=>reminded=p})));
 assert.equal(screen.getByRole('button',{name:past.title}).disabled,true);fireEvent.click(screen.getByRole('button',{name:future.title}));assert.ok(screen.getByText('Program konusu'));assert.ok(screen.getByText('Tür: Spor'));fireEvent.click(screen.getByRole('button',{name:'Hatırlat',exact:true}));assert.equal(reminded.title,future.title);
 });
 await check('Takım seçiminde dördüncü takım engellenir',async()=>{
 let saved=false;const rules=['Galatasaray','Fenerbahçe','Beşiktaş'].map((label,i)=>({id:String(i),kind:'team',label,leadMinutes:15,createdAt:0}));render(wrap(h(UI.FollowPanel,{rules,onSave:async()=>{saved=true},onRemove:async()=>{},onClose(){}})));
 fireEvent.click(screen.getByRole('button',{name:'İspanya',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Real Madrid',exact:true}));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Takip et',exact:true})));assert.equal(saved,false);assert.ok(screen.getByText('En fazla 3 takım takip edebilirsiniz.'));
 });
 await check('Dil ilk açılışta seçilir, İngilizce ayarlar ve tema kaydedilir',async()=>{
 await UI.storeMock.removeItem('kotak.appearance');function Settings(){return h(UI.SettingsView,{settings:{layout:'Modern',saveHistory:true},onChange(){},onBack(){},onInfo(){},onClearHistory(){}})}
 render(wrap(h(UI.AppearanceProvider,null,h(Settings))));await waitFor(()=>assert.ok(screen.getByText('Choose your language',{exact:false})));fireEvent.click(screen.getByText('English'));await waitFor(()=>assert.ok(screen.getByText('Settings')));fireEvent.click(screen.getByText('Theme'));const value=JSON.parse(await UI.storeMock.getItem('kotak.appearance'));assert.equal(value.language,'en');assert.equal(value.theme,'midnight');
 });
 await check('Takım takip formu 30 dakika seçimini ve takım adını kaydeder; takipten çıkılabilir',async()=>{
  let saved,removed;render(wrap(h(UI.FollowPanel,{rules:[{id:'old',kind:'team',label:'Fenerbahçe',leadMinutes:15,createdAt:0}],onClose(){},onSave:async(draft,n)=>saved={draft,n},onRemove:async id=>removed=id})));
  fireEvent.click(screen.getByRole('button',{name:'İspanya',exact:true}));fireEvent.click(screen.getByRole('button',{name:'Real Madrid',exact:true}));fireEvent.click(screen.getByRole('button',{name:'30 dk',exact:true}));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Takip et',exact:true})));assert.equal(saved.draft.label,'Real Madrid');assert.equal(saved.n,30);await act(async()=>fireEvent.click(screen.getByLabelText('Fenerbahçe takibi bırak')));assert.equal(removed,'old');
 });
 await check('Asistan maçın kanalını sorunca otomatik oynatmaz; Takip et takım adını iletir',async()=>{
  let played=false,team;const now=Date.now();render(wrap(h(UI.VoiceSearch,{entries:[{...channel,epgId:'sport'}],guide:{'p:sport':[{title:'Real Madrid - Barcelona',start:now-1000,end:now+3600000}]},onClose(){},onPlay:()=>played=true,onFollowTeam:name=>team=name})));
  await act(async()=>fireEvent.change(screen.getByLabelText('Sesli arama metni'),{target:{value:'RealMadridin maçı hangi kanalda'}}));assert.equal(played,false);assert.ok(screen.getByText('Real Madrid - Barcelona'));fireEvent.click(screen.getByRole('button',{name:'Takip et',exact:true}));assert.equal(team,'real madrid');
 });

 await check('İlk takip eski filmleri bildirmez; yeni film bir kez bildirilir ve yeniden gelince tekrarlanmaz',async()=>{
  UI.notificationMock.reset();const a={...movie,id:'follow-movie-old',playlistId:'follow-movies'},b={...a,id:'follow-movie-new',name:'New Film'};const rule={id:'movies-follow',kind:'movies',label:'Yeni filmler',leadMinutes:15,createdAt:0};
  await UI.seedFollows([a]);await UI.observeFollowCatalog(a.playlistId,[a,b],[rule],()=>true);assert.equal(UI.notificationMock.scheduled.size,1);UI.notificationMock.scheduled.clear();await UI.observeFollowCatalog(a.playlistId,[a],[rule],()=>true);await UI.observeFollowCatalog(a.playlistId,[a,b],[rule],()=>true);assert.equal(UI.notificationMock.scheduled.size,0);
 });
 await check('Dizi başlangıç bölümleri eski içeriktir; yalnız sonradan eklenen yeni bölüm bildirilir',async()=>{
  UI.notificationMock.reset();const a={...movie,id:'series-first',kind:'episode',playlistId:'follow-series',seriesId:'s',name:'Dizi S01 E01'},b={...a,id:'series-new',name:'Dizi S01 E02'},rule={id:'series-follow',kind:'series',label:'Dizi',playlistId:a.playlistId,seriesId:'s',leadMinutes:15,createdAt:0};
  await UI.seedFollows([a]);await UI.observeFollowCatalog(a.playlistId,[a],[rule],()=>true);assert.equal(UI.notificationMock.scheduled.size,0);await UI.observeFollowCatalog(a.playlistId,[a,b],[rule],()=>true);assert.equal(UI.notificationMock.scheduled.size,1);assert.equal([...UI.notificationMock.scheduled.values()][0].content.data.mediaId,'series-new');
 });
 await check('Çocuk modunda yetişkin içerik bildirimi üretilmez',async()=>{
  UI.notificationMock.reset();const a={...movie,id:'child-old',playlistId:'follow-child'},b={...a,id:'child-new'};await UI.seedFollows([a]);await UI.observeFollowCatalog(a.playlistId,[a,b],[{id:'child',kind:'movies',label:'Yeni filmler',leadMinutes:15,createdAt:0}],()=>false);assert.equal(UI.notificationMock.scheduled.size,0);
 });
 await check('Takım bildirimi seçilen 30 dakika önceye kurulur ve takip kalkınca iptal edilir',async()=>{
  UI.notificationMock.reset();const now=Date.now(),p={title:'Real Madrid - Barcelona',start:now+7200000,end:now+10800000},e={...channel,epgId:'real'};await UI.syncTeamReminders([e],{'p:real':[p]},[{id:'real',kind:'team',label:'Real Madrid',leadMinutes:30,createdAt:0}],()=>true);
  assert.equal(UI.notificationMock.scheduled.size,1);assert.equal([...UI.notificationMock.scheduled.values()][0].trigger.date.getTime(),p.start-1800000);await UI.syncTeamReminders([e],{'p:real':[p]},[],()=>true);assert.equal(UI.notificationMock.scheduled.size,0);
 });

 await check('Gerçek ana ekran akışı: Modern tercihte tanıtım kartları yok; yalnız canlı istekleri, Daha Fazla’da kartlar var',async()=>{
  const previous=global.fetch,calls=[];await UI.secureMock.deleteItemAsync(UI.PROTECTION_KEY);await UI.storeMock.setItem('kotak.playlists.v2',JSON.stringify(['startup-test']));await UI.secureMock.setItemAsync('kotak.startup-test',JSON.stringify({id:'startup-test',name:'Test',type:'xtream',url:'https://provider.example',username:'user',password:'pass'}));await UI.storeMock.setItem('kotak.preferences',JSON.stringify({layout:'Modern',saveHistory:true}));
  try{global.fetch=async input=>{const url=new URL(String(input)),action=url.searchParams.get('action');calls.push(action||url.pathname);return new Response(JSON.stringify(!action?{user_info:{auth:1,status:'Active'}}:action==='get_live_streams'?[{stream_id:1,name:'TRT 1',category_id:'1'}]:action==='get_live_categories'?[{category_id:'1',category_name:'Ulusal'}]:[]));};
   render(h(UI.App));await waitFor(()=>assert.ok(screen.getAllByText('TRT 1').length > 0));assert.equal(screen.queryByText(/Yeni Nesil Özellikler/),null);assert.equal(screen.queryByText(/İçerikler arka planda güncelleniyor/),null);assert.equal(calls.some(x=>/vod|series|xmltv/.test(x)),false);
   fireEvent.click(screen.getByRole('tab',{name:'DİZİ'}));assert.ok(screen.getByLabelText('Diziler içinde ara'));fireEvent.click(screen.getAllByLabelText('Geri')[0]);assert.equal(screen.queryByLabelText('Diziler içinde ara'),null);
   fireEvent.click(screen.getByRole('tab',{name:'DAHA FAZLA'}));await waitFor(()=>assert.ok(screen.getByText(/Yeni Nesil Özellikler/)));
  }finally{global.fetch=previous;await UI.storeMock.removeItem('kotak.playlists.v2');}
 });
 await check('Basit yayın paylaşımı sunucu çağırmadan telefonun paylaş menüsüne bağlantıyı iletir',async()=>{
  const share=require('react-native-web').Share;const previous=share.share;let payload;share.share=async value=>{payload=value;return {action:'sharedAction'}};
  try{render(wrap(h(UI.SharePanel,{item:{...movie,uri:'https://provider.example/movie.mp4'},onClose(){}})));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Bağlantıyı paylaş'})));assert.ok(payload.message.includes('https://provider.example/movie.mp4'));assert.equal(screen.queryByText('Servisi bağla'),null);}finally{share.share=previous;}
 });
 await check('Videodaki katalog: afişten detay açılır, arama filtreler, sütun düzeni değişir',async()=>{
  let selected;render(wrap(h(UI.CatalogView,{title:'Yeni Eklenen Filmler',items:[movie,{...movie,id:'b',name:'Başka Film'}],onBack(){},onSelect:item=>selected=item})));
  fireEvent.change(screen.getByLabelText('Yeni Eklenen Filmler içinde ara'),{target:{value:'Başka'}});assert.equal(screen.queryByRole('button',{name:'Film A detayları'}),null);
  fireEvent.click(screen.getByLabelText('Katalog sütun sayısını değiştir'));fireEvent.click(screen.getByRole('button',{name:'Başka Film detayları'}));assert.equal(selected.id,'b');
 });
 await check('Videodaki EPG: program hücresi açıklamayı açar; Bana hatırlat doğru programı iletir',async()=>{
  let selected;const now=Date.UTC(2026,9,20,12),p={title:'Yeni Bölüm',description:'Program açıklaması',start:now+1800000,end:now+5400000};
  render(wrap(h(UI.EpgScreen,{channels:[channel],guide:{'p:undefined':[p]},now,notice:'Hazır',onPlay(){},onReminder:(item,program)=>selected={item,program}})));
  fireEvent.click(screen.getByLabelText(/TRT 1 · Yeni Bölüm/));assert.ok(screen.getByText('Program açıklaması'));fireEvent.click(screen.getByRole('button',{name:'Bana hatırlat'}));assert.equal(selected.item.id,'tv');assert.equal(selected.program.start,p.start);
 });
 await check('Tüm kategoriler: arama ve seçim canlı kanal kategorisine yönlenir',async()=>{
  let selected;render(wrap(h(UI.CategoriesPage,{groups:[{id:'s',name:'Spor',channelCount:10},{id:'h',name:'Haber',channelCount:7}],onClose(){},onEdit(){},onSelect:e=>selected=e})));
  fireEvent.change(screen.getByLabelText('Tüm kategorilerde ara'),{target:{value:'spor'}});assert.equal(screen.queryByLabelText('Haber kategorisini aç'),null);fireEvent.click(screen.getByLabelText('Spor kategorisini aç'));assert.equal(selected.name,'Spor');
 });
 await check('Sağlayıcı detay puanı IMDb diye gösterilmez; kadro, resimler ve gerçek özet sunulur',async()=>{
  render(wrap(h(UI.MediaDetails,{item:movie,provider:{rating:8.3,plot:'Sağlayıcı özeti',cast:'Oyuncu Bir, Oyuncu İki',director:'Yönetmen',backdrops:['https://example.test/image.jpg']},onClose(){},onPlay(){}})));
  assert.ok(screen.getByText('Sağlayıcı 8.3'));assert.equal(screen.queryByText('IMDb 8.3'),null);assert.ok(screen.getByText('Sağlayıcı özeti'));assert.ok(screen.getByText('Ana Kadro'));assert.ok(screen.getByText('Resimler'));
 });
 await check('Doğrudan oynat: M3U liste adresini video diye açmaz, HLS bağlantısını oynatır',async()=>{
  let selected;render(wrap(h(UI.DirectPlay,{recent:[],onPlay:e=>selected=e,onAddList(){}})));
  fireEvent.change(screen.getByLabelText('Doğrudan yayın adresi'),{target:{value:'https://provider.example/get.php?username=u&password=p'}});fireEvent.click(screen.getByRole('button',{name:'Yayını aç'}));assert.equal(selected,undefined);assert.ok(screen.getByText(/Bu bir oynatma listesi/));
  fireEvent.change(screen.getByLabelText('Doğrudan yayın adresi'),{target:{value:'https://provider.example/live.m3u8'}});fireEvent.click(screen.getByRole('button',{name:'Yayını aç'}));assert.equal(selected.uri,'https://provider.example/live.m3u8');
 });
 await check('Ana ekranın gerçek VOD akışı: yeni filmler/diziler yüklenir, Trend tümü ve afiş detayları açılır',async()=>{
  const previous=global.fetch;await UI.storeMock.setItem('kotak.playlists.v2',JSON.stringify(['video-test']));await UI.secureMock.setItemAsync('kotak.video-test',JSON.stringify({id:'video-test',name:'Video',type:'xtream',url:'https://provider.example',username:'user',password:'pass'}));
  try{global.fetch=async input=>{const action=new URL(String(input)).searchParams.get('action');return new Response(JSON.stringify(!action?{user_info:{auth:1}}:action==='get_live_streams'?[{stream_id:1,name:'TRT 1'}]:action==='get_vod_streams'?[{stream_id:2,name:'Referans Film',imdb_rating:8.9,stream_icon:'https://images.example/poster.jpg'}]:action==='get_series'?[{series_id:3,name:'Referans Dizi',imdb_rating:8.5}]:action==='get_vod_info'?{movie_data:{container_extension:'mkv'},info:{plot:'Gerçek detay özeti',cast:'Oyuncu'}}:[]));};
   render(h(UI.App));await waitFor(()=>assert.ok(screen.getAllByText('Referans Film').length>0),{timeout:5000});assert.ok(screen.getByText('Son Güncellenen Diziler'));fireEvent.click(screen.getByText('Trend Filmler'));assert.ok(screen.getByLabelText('Trend Filmler içinde ara'));fireEvent.click(screen.getByRole('button',{name:'Referans Film detayları'}));await waitFor(()=>assert.ok(screen.getByText('Gerçek detay özeti')));assert.ok(screen.getByRole('button',{name:'İzle',exact:true}));fireEvent.click(screen.getByRole('button',{name:'İzle',exact:true}));await waitFor(()=>assert.equal(UI.systemMock.source?.uri,'https://provider.example/movie/user/pass/2.mkv'));
  }finally{global.fetch=previous;await UI.storeMock.removeItem('kotak.playlists.v2');}
 });

 await check('Enter ile film adı aranır; güncel katalog çözümlendikten sonra tek sonuç açılır',async()=>{
  let played,resolved;const film={...movie,name:'Umami (TR)'};
  render(wrap(h(UI.VoiceSearch,{entries:[],onResolve:async query=>{resolved=query;return {entries:[film],guide:{},metadata:{}}},onPlay:item=>played=item,onClose(){}})));
  fireEvent.change(screen.getByLabelText('Sesli arama metni'),{target:{value:'umami film adı bul'}});
  await act(async()=>fireEvent.keyDown(screen.getByLabelText('Sesli arama metni'),{key:'Enter',keyCode:13}));
  assert.equal(resolved,'umami film adı bul');await waitFor(()=>assert.equal(played?.id,'film'));
 });
 await check('İleriki maç komutu ilgili EPG programına gider, canlıymış gibi oynatılmaz',async()=>{
  let played=false,selected;const now=Date.now(),program={title:'Türkiye - İspanya',start:now+3600000,end:now+7200000};
  render(wrap(h(UI.VoiceSearch,{entries:[channel],guide:{'p:#tv':[program]},onFuture:(item,p)=>selected={item,p},onPlay:()=>played=true,onClose(){}})));
  fireEvent.change(screen.getByLabelText('Sesli arama metni'),{target:{value:'Türkiye maçını aç'}});
  await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Ara ve aç'})));
  assert.equal(played,false);await waitFor(()=>assert.equal(selected?.item.id,'tv'));assert.equal(selected.p.title,program.title);
 });
 await check('Üst menüde Film ve Dizi ayrı sekmelerdir; dizi kategorileri ayrı gruplar halinde açılır',async()=>{
  let tab;const bar=render(wrap(h(UI.TopBar,{currentTab:'DIZI',onTabChange:v=>tab=v,onSearchClick(){},onOptionsClick(){}})));
  fireEvent.click(screen.getByText('DİZİ'));assert.equal(tab,'DIZI');assert.ok(screen.getByText('FİLM'));bar.unmount();
  const series=[{...movie,id:'dub',kind:'series',name:'Dublaj Dizi',group:'Türkçe Dublaj'},{...movie,id:'sub',kind:'series',name:'Altyazılı Dizi',group:'Türkçe Altyazılı'}];
  render(wrap(h(UI.CatalogView,{title:'Diziler',items:series,overview:true,onBack(){},onSelect(){}})));
  assert.ok(screen.getByLabelText('Türkçe Dublaj tümünü göster'));assert.ok(screen.getByLabelText('Türkçe Altyazılı tümünü göster'));
  fireEvent.click(screen.getByLabelText('Türkçe Dublaj tümünü göster'));assert.equal(screen.queryByLabelText('Altyazılı Dizi detayları'),null);assert.ok(screen.getByLabelText('Dublaj Dizi detayları'));
 });
 await check('VLC gerçek ses seviyesini ve Türkçe ses/altyazı parçalarını kullanır; süre birimi çevrilir',async()=>{
  let progress;render(wrap(h(UI.VlcTile,{item:movie,multi:false,audible:true,onAudio(){},seekSeconds:15,onFullscreen(){},onSystemPlayer(){},initialPosition:30,onProgress:(id,p,d)=>progress={p,d}})));
  assert.equal(UI.vlcMock.props.volume,100);assert.equal(UI.vlcMock.props.muted,false);assert.equal(UI.vlcMock.props.autoplay,true);
  await act(async()=>UI.vlcMock.props.onLoad({duration:120000,videoSize:{width:1920,height:1080},audioTracks:[{id:-1,name:'Disable'},{id:1,name:'English'},{id:2,name:'Türkçe ses'}],textTracks:[{id:-1,name:'Disable'},{id:4,name:'Türkçe altyazı'}]}));
  assert.equal(UI.vlcMock.props.audioTrack,2);assert.equal(UI.vlcMock.props.seek,.25);
  fireEvent.click(screen.getByLabelText('Ses ve altyazı'));fireEvent.click(screen.getByRole('button',{name:'Türkçe altyazı'}));assert.equal(UI.vlcMock.props.textTrack,4);assert.equal(screen.queryByText('AI Türkçe Altyazı'),null);
  fireEvent.click(screen.getByRole('button',{name:'English'}));assert.equal(UI.vlcMock.props.audioTrack,1);
  await act(async()=>UI.vlcMock.props.onProgress({currentTime:45000,duration:120000}));assert.deepEqual(progress,{p:45,d:120});
 });
 await check('VLC progress does not redraw the native source and manual seek is retained',async()=>{
  render(wrap(h(UI.VlcTile,{item:movie,multi:false,audible:true,onAudio(){},seekSeconds:15,onFullscreen(){},onSystemPlayer(){}})));
  await act(async()=>UI.vlcMock.props.onLoad({duration:120000,audioTracks:[],textTracks:[]}));
  await act(async()=>UI.vlcMock.props.onProgress({currentTime:45000,duration:120000}));const renders=UI.vlcMock.renders,source=UI.vlcMock.props.source;
  for(let i=0;i<5;i++)await act(async()=>UI.vlcMock.props.onProgress({currentTime:45000+i*100,duration:120000}));
  assert.equal(UI.vlcMock.renders,renders);fireEvent.click(screen.getByLabelText('15 saniye ileri'));assert.ok(UI.vlcMock.props.seek>.49&&UI.vlcMock.props.seek<.51);assert.equal(UI.vlcMock.props.source,source);
  const target=UI.vlcMock.props.seek;await act(async()=>UI.vlcMock.props.onProgress({currentTime:60000,duration:120000}));assert.equal(UI.vlcMock.props.seek,target);assert.equal(UI.vlcMock.props.source,source);
 });
 await check('Trial notices are scheduled 3, 2 and 1 hours before the verified deadline',async()=>{
  UI.notificationMock.reset();const now=Date.now(),entitlement=UI.parseEntitlement({verified:true,id:'trial',kind:'trial',expiresAt:now+86400000,verifiedAt:now});
  assert.deepEqual(UI.expiryNotices(entitlement,now).map(x=>x.hours),[3,2,1]);await UI.scheduleExpiryNotices(entitlement);assert.equal(UI.notificationMock.scheduled.size,3);assert.match(UI.expiryMessage(entitlement,entitlement.expiresAt-90*60000),/1 saat 30 dakika/);
 });
 await check('EPG search and category taps remain available with missing program data',async()=>{
  render(wrap(h(UI.EpgScreen,{channels:[channel,{...channel,id:'sport',name:'Spor TV',group:'Spor'}],guide:{},now:Date.now(),notice:'Sağlayıcı program göndermedi',onPlay(){}})));
  fireEvent.change(screen.getByLabelText('EPG kanal ara'),{target:{value:'TRT'}});assert.ok(screen.getByLabelText('TRT 1 izle'));assert.equal(screen.queryByLabelText('Spor TV izle'),null);
  fireEvent.change(screen.getByLabelText('EPG kanal ara'),{target:{value:''}});fireEvent.click(screen.getByRole('button',{name:'Spor',exact:true}));assert.equal(screen.queryByLabelText('TRT 1 izle'),null);assert.ok(screen.getByLabelText('Spor TV izle'));
 });
 await check('VLC film hata verince sadece uygun sağlayıcı yolunun alternatif konteynerini dener',async()=>{
  render(wrap(h(UI.VlcTile,{item:{...movie,uri:'https://test.invalid/movie/u/p/71.mp4'},multi:false,audible:true,onAudio(){},seekSeconds:15,onFullscreen(){},onSystemPlayer(){}})));
  await act(async()=>UI.vlcMock.props.onError({}));assert.equal(UI.vlcMock.props.source.uri,'https://test.invalid/movie/u/p/71.mkv');
 });

 await check('Gerçek App: XMLTV hatası olsa da kanal API akışı EPG ekranına ve hatırlatmaya ulaşır',async()=>{
  const previous=global.fetch,now=Date.now();const id='guide-app';await UI.storeMock.setItem('kotak.playlists.v2',JSON.stringify([id]));await UI.secureMock.setItemAsync('kotak.'+id,JSON.stringify({id,name:'EPG',type:'xtream',url:'https://guide-app.test',username:'u',password:'p'}));
  try{global.fetch=async input=>{const url=new URL(String(input)),action=url.searchParams.get('action');if(url.pathname.includes('xmltv'))return new Response('No XMLTV',{status:404});return new Response(JSON.stringify(!action?{user_info:{auth:1}}:action==='get_live_streams'?[{stream_id:51,name:'TRT 1 HD',category_id:1},{stream_id:52,name:'İkinci Kanal',category_id:1}]:action==='get_live_categories'?[{category_id:1,category_name:'Ulusal'}]:action==='get_simple_data_table'?{epg_listings:[{title:Buffer.from(url.searchParams.get('stream_id')==='52'?'İkinci Kanal Programı':'Kanal API Programı').toString('base64'),description:Buffer.from('Gerçek API açıklaması').toString('base64'),start_timestamp:Math.floor(now/1000)+600,stop_timestamp:Math.floor(now/1000)+3600}]}:[]));};
   render(h(UI.App));await waitFor(()=>assert.ok(screen.getAllByText('TRT 1 HD').length));fireEvent.click(screen.getByRole('tab',{name:'EPG'}));await waitFor(()=>assert.ok(screen.getAllByText('Kanal API Programı').length),{timeout:5000});
   await waitFor(()=>assert.ok(screen.getAllByText('İkinci Kanal Programı').length));fireEvent.click(screen.getByLabelText(/TRT 1 HD · Kanal API Programı/));assert.ok(screen.getByText('Gerçek API açıklaması'));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'Bana hatırlat'})));await waitFor(()=>assert.ok(screen.getByRole('button',{name:'30 dk kala',exact:true})));
  }finally{global.fetch=previous;await UI.storeMock.removeItem('kotak.playlists.v2');}
 });
 await check('Background transition aborts catalog downloads instead of continuing synchronization',async()=>{
  const previous=global.fetch;let started=0,aborted=0;const id='background-perf';await UI.storeMock.setItem('kotak.playlists.v2',JSON.stringify([id]));await UI.secureMock.setItemAsync('kotak.'+id,JSON.stringify({id,name:'Background',type:'xtream',url:'https://background-perf.test',username:'u',password:'p'}));
  try{global.fetch=async(input,options)=>{const action=new URL(String(input)).searchParams.get('action');if(action==='get_vod_streams'||action==='get_series'){started++;return new Promise((resolve,reject)=>{options.signal.addEventListener('abort',()=>{aborted++;reject(new Error('aborted'));},{once:true});});}return new Response(JSON.stringify(!action?{user_info:{auth:1}}:action==='get_live_streams'?[{stream_id:1,name:'Background TV'}]:[]));};
   render(h(UI.App));await waitFor(()=>assert.ok(started>0),{timeout:4000});await act(async()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new window.Event('visibilitychange'));});await waitFor(()=>assert.ok(aborted>0));
  }finally{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});global.fetch=previous;await UI.storeMock.removeItem('kotak.playlists.v2');}
 });

 await check('Protected app return preserves the series route after correct PIN',async()=>{
 const previous=global.fetch;await UI.secureMock.setItemAsync(UI.PROTECTION_KEY,JSON.stringify({pin:'2468',groups:['Kids']}));await UI.storeMock.setItem('kotak.playlists.v2',JSON.stringify(['reentry']));await UI.secureMock.setItemAsync('kotak.reentry',JSON.stringify({id:'reentry',name:'Test',type:'xtream',url:'https://reentry.test',username:'u',password:'p'}));
 try{global.fetch=async()=>new Response('[]');render(h(UI.App));await waitFor(()=>assert.ok(screen.getByText('Çocuk Profili · Ebeveyn PIN’i ile aç')));fireEvent.click(screen.getByText('Çocuk Profili · Ebeveyn PIN’i ile aç'));fireEvent.change(screen.getByLabelText('Ebeveyn PIN'),{target:{value:'2468'}});await act(async()=>fireEvent.click(screen.getByText('PIN ile aç')));
 fireEvent.click(screen.getByRole('tab',{name:'DİZİ'}));assert.ok(screen.getByLabelText('Diziler içinde ara'));
 await act(async()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new window.Event('visibilitychange'));});assert.equal(screen.queryByLabelText('Diziler içinde ara'),null);
 await act(async()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new window.Event('visibilitychange'));});fireEvent.change(screen.getByLabelText('Ebeveyn PIN'),{target:{value:'2468'}});await act(async()=>fireEvent.click(screen.getByText('PIN ile aç')));assert.ok(screen.getByLabelText('Diziler içinde ara'));
 }finally{global.fetch=previous;Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});await UI.secureMock.deleteItemAsync(UI.PROTECTION_KEY);await UI.storeMock.removeItem('kotak.playlists.v2');}
 });
 console.log(`${passes} UI interaction tests passed`);
 require('node:fs').unlinkSync('tests/.ui-bundle.cjs'); dom.window.close();
})().catch(error => { console.error(error); process.exitCode = 1; dom.window.close(); });
