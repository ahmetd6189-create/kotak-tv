import React, { useState, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { TrendSection } from './components/TrendSection';
import { RecentChannelCard } from './components/RecentChannelCard';
import { CategoriesList } from './components/CategoriesList';
import { CustomBottomNav } from './components/CustomBottomNav';
import { PlayerModal } from './components/PlayerModal';
import { SearchModal } from './components/SearchModal';
import { EpgView } from './components/EpgView';
import { TvChannelsView } from './components/TvChannelsView';
import { MoreSettingsView } from './components/MoreSettingsView';
import { FlutterCodeViewer } from './components/FlutterCodeViewer';
import { NoPlaylistsView } from './components/NoPlaylistsView';
import { AddPlaylistModal } from './components/AddPlaylistModal';
import { MoreScreen } from './components/MoreScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ProPaywallModal } from './components/ProPaywallModal';
import { AboutModal } from './components/AboutModal';
import { AiVoiceSearchModal } from './components/AiVoiceSearchModal';
import {
  TREND_MOVIES,
  TREND_SERIES,
  RECENT_CHANNEL,
  CATEGORIES_LIST,
  CHANNELS_LIST,
} from './data/mockData';
import { MainTab, BottomNavTab, Channel, MediaItem, CategoryItem, Playlist, UserProfile } from './types/iptv';
import { ProfileModal, PROFILES } from './components/ProfileModal';
import { SubscriptionService, SubscriptionState } from './services/subscriptionService';
import { OfflineManagerModal } from './components/OfflineManagerModal';
import { RemoteScreenCastModal } from './components/RemoteScreenCastModal';
import { offlineService, OfflineState } from './services/offlineService';
import { FileCode, Smartphone, Info, X, Plus, RotateCcw, Mic, Sparkles, Users, Shield, Lock, ShieldCheck, Cast, WifiOff } from 'lucide-react';

export default function App() {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const saved = localStorage.getItem('iptv_playlists');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [topTab, setTopTab] = useState<MainTab>('ANASAYFA');
  const [bottomTab, setBottomTab] = useState<BottomNavTab>('ANASAYFA');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [activeMedia, setActiveMedia] = useState<MediaItem | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showFlutterCode, setShowFlutterCode] = useState(false);
  const [showAddPlaylistModal, setShowAddPlaylistModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState<Channel | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isPhoneFrame, setIsPhoneFrame] = useState(false);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | undefined>();

  const [showSettingsScreen, setShowSettingsScreen] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showAiVoiceModal, setShowAiVoiceModal] = useState(false);
  const [showM3uModal, setShowM3uModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showScreenCastModal, setShowScreenCastModal] = useState(false);
  const [offlineState, setOfflineState] = useState<OfflineState>(() => offlineService.getState());

  useEffect(() => {
    const unsub = offlineService.subscribe((s) => {
      setOfflineState(s);
    });
    return unsub;
  }, []);

  const [shareSession, setShareSession] = useState<{
    sessionId: string;
    friendName: string;
    isHost: boolean;
  } | null>(null);

  // ==========================================
  // ABONELİK & 7 GÜNLÜK ÜCRETSİZ DENEME (TRIAL) DURUMU
  // ==========================================
  const [subState, setSubState] = useState<SubscriptionState>(() => SubscriptionService.getState());
  const [isPaywallForced, setIsPaywallForced] = useState<boolean>(false);
  const [paywallReason, setPaywallReason] = useState<string>('');

  const refreshSubscription = () => {
    const updated = SubscriptionService.getState();
    setSubState(updated);
    return updated;
  };

  /**
   * KRİTİK FONKSİYON KORUMA (GUARD/MIDDLEWARE)
   * Canlı TV, Birlikte İzle, AI Arama ve Film Detayları öncesinde çalışır.
   * Deneme bittiyse ve PRO değilse zorunlu Paywall açar ve işlemi engeller.
   */
  const checkPremiumStatus = (actionDescription?: string): boolean => {
    const current = SubscriptionService.getState();
    setSubState(current);

    if (current.isPremium) {
      return true;
    }

    // Deneme süresi dolmuş ve PRO değil: KİLİTLE & PAYWALL AÇ
    setPaywallReason(
      actionDescription
        ? `${actionDescription} için 7 günlük ücretsiz deneme süreniz sona ermiştir. Devam etmek için lütfen Kotak TV PRO aboneliğinizi başlatın.`
        : '7 günlük ücretsiz deneme süreniz sona ermiştir. Kotak TV PRO özelliklerine erişmek için lütfen aboneliğinizi başlatın.'
    );
    setIsPaywallForced(true);
    setShowProModal(true);
    return false;
  };

  // Çocuk Profili & Ebeveyn Kilidi State'leri
  const [currentProfile, setCurrentProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('kotak_user_profile');
      if (saved) return JSON.parse(saved);
    } catch {}
    return PROFILES[0];
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [parentalPin, setParentalPin] = useState('1234');

  const isKidsMode = currentProfile.type === 'kids';

  const displayedMovies = isKidsMode
    ? TREND_MOVIES.filter((m) => m.genre.includes('Animasyon') || m.genre.includes('Macera') || m.id === 'm1' || m.id === 'm2')
    : TREND_MOVIES;

  const displayedSeries = isKidsMode
    ? TREND_SERIES.filter((s) => s.genre.includes('Animasyon') || s.genre.includes('Macera'))
    : TREND_SERIES;

  const displayedRecentChannel = isKidsMode
    ? CHANNELS_LIST.find((c) => c.isKidsFriendly) || RECENT_CHANNEL
    : RECENT_CHANNEL;

  const displayedCategories = isKidsMode
    ? CATEGORIES_LIST.filter((c) => c.name.includes('Çocuk') || c.name.includes('Kinder') || c.name.includes('Belgesel') || c.name.includes('Ulusal'))
    : CATEGORIES_LIST;

  // Yerel hafızaya kaydet
  useEffect(() => {
    try {
      localStorage.setItem('iptv_playlists', JSON.stringify(playlists));
    } catch (e) {
      console.error('Playlist kaydedilemedi:', e);
    }
  }, [playlists]);

  const handleSavePlaylist = (newPlaylist: Playlist) => {
    setPlaylists((prev) => [newPlaylist, ...prev]);
    // Otomatik olarak Kotak TV Anasayfa sekmesine geçiş yap
    setBottomTab('ANASAYFA');
    setTopTab('ANASAYFA');
  };

  const handleQuickLoadDemo = () => {
    const demoPlaylist: Playlist = {
      id: 'demo-1',
      name: 'Kotak TV Premium VIP List',
      url: 'http://iptv.kotaktv.net:8080/get.php?username=vip&password=4k',
      type: 'm3u',
      addedAt: new Date().toLocaleDateString('tr-TR'),
      channelCount: 655,
    };
    handleSavePlaylist(demoPlaylist);
  };

  const handleResetPlaylists = () => {
    setPlaylists([]);
    try {
      localStorage.removeItem('iptv_playlists');
    } catch {}
  };

  // Oynatıcıyı Başlat (Guard ile Korumalı)
  const handlePlayChannel = (channel: Channel) => {
    if (!checkPremiumStatus(`"${channel.name}" canlı yayınını izlemek`)) return;
    setActiveMedia(null);
    setActiveChannel(channel);
  };

  const handlePlayMedia = (item: MediaItem) => {
    if (!checkPremiumStatus(`"${item.title}" içeriğini izlemek`)) return;
    setActiveChannel(null);
    setActiveMedia(item);
  };

  const handleOpenAiVoice = () => {
    if (!checkPremiumStatus('Yapay Zeka Sesli Komut ve Arama motorunu kullanmak')) return;
    setShowAiVoiceModal(true);
  };

  const handleOpenSharePlay = () => {
    if (!checkPremiumStatus('Kotak SharePlay (Birlikte İzle) özelliğini başlatmak')) return;
    setShareSession({
      sessionId: 'ktk-' + Math.floor(100000 + Math.random() * 900000),
      friendName: 'Emre',
      isHost: true,
    });
    setActiveChannel(RECENT_CHANNEL);
  };

  const handleSelectCategory = (cat: CategoryItem) => {
    setSelectedCategoryName(cat.name);
    setBottomTab('TV KANALI');
  };

  const handleFilterCategory = (category: string) => {
    setSelectedCategoryName(category);
    setBottomTab('TV KANALI');
  };

  const isPlaylistEmpty = playlists.length === 0;

  return (
    <div className="min-h-screen bg-[#000000] text-white flex flex-col items-center justify-start select-none">
      {/* Üst Çerçeve & Durum Kontrol Çubuğu */}
      <header className="w-full bg-[#121214] border-b border-white/[0.08] px-4 py-2 flex items-center justify-between text-xs z-20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#007AFF] animate-pulse"></span>
          <span className="font-bold tracking-wide text-zinc-200">
            Kotak TV • Ultra 4K (OLED Mode)
          </span>
          <span className="hidden sm:inline-block text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            {isPlaylistEmpty ? '0 Liste (Boş Ekran)' : `${playlists.length} Liste Yüklü`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* 7 Günlük Deneme & PRO Durum Rozeti */}
          <button
            onClick={() => {
              setIsPaywallForced(!subState.isPremium);
              setShowProModal(true);
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              subState.isProUser
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-500/20'
                : subState.isTrialActive
                ? 'bg-[#007AFF]/20 text-[#007AFF] border-[#007AFF]/40 hover:bg-[#007AFF]/30'
                : 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse'
            }`}
            title="Abonelik ve 7 Günlük Deneme Durumu"
          >
            {subState.isProUser ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-current" />
                <span className="hidden sm:inline">PRO ABONE</span>
              </>
            ) : subState.isTrialActive ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-[#007AFF]" />
                <span>Deneme: {subState.trialDaysRemaining} Gün</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-red-400" />
                <span>Deneme Bitti (PRO)</span>
              </>
            )}
          </button>

          {/* Profil Seçici Butonu (Yetişkin vs Çocuk) */}
          <button
            onClick={() => setShowProfileModal(true)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
              isKidsMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-md shadow-amber-500/20'
                : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-white/10'
            }`}
            title="Profil Değiştir (Ebeveyn Kilidi)"
          >
            <span className="text-sm leading-none">{currentProfile.avatar}</span>
            <span className="hidden sm:inline">{currentProfile.name}</span>
            {isKidsMode && <span className="text-[9px] bg-amber-500 text-black px-1 rounded font-black">KIDS</span>}
          </button>

          {/* Yapay Zeka Sesli Komut Kısayolu */}
          <button
            onClick={handleOpenAiVoice}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold transition-all shadow-md shadow-[#007AFF]/25 cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Sesli Komut</span>
          </button>

          {/* Kotak SharePlay Birlikte İzle Kısayolu */}
          <button
            onClick={handleOpenSharePlay}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold transition-all shadow-md shadow-emerald-500/25 cursor-pointer"
            title="Arkadaşınla Birlikte İzle (SharePlay)"
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Birlikte İzle</span>
          </button>

          {/* Boş Durum / Dolu Durum Hızlı Test Geçiş Butonları */}
          {isPlaylistEmpty ? (
            <button
              onClick={handleQuickLoadDemo}
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold border border-emerald-500/30 cursor-pointer transition-colors"
            >
              <span>Örnek Listeyi Yükle</span>
            </button>
          ) : (
            <button
              onClick={handleResetPlaylists}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-red-400 text-xs cursor-pointer transition-colors"
              title="Oynatma listelerini sıfırla ve No Playlists ekranına dön"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Listeleri Sıfırla (Boş Ekran)</span>
            </button>
          )}

          <button
            onClick={() => setShowAddPlaylistModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="hidden sm:inline">Liste Ekle</span>
          </button>

          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
            title="Telefon / Tam Ekran Görünümünü Değiştir"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#007AFF]" />
            <span className="hidden sm:inline">
              {isPhoneFrame ? 'Tam Ekran' : 'Telefon Kasası'}
            </span>
          </button>

          <button
            onClick={() => setShowFlutterCode(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#007AFF] hover:bg-blue-600 text-white font-bold transition-all shadow-md shadow-[#007AFF]/25 cursor-pointer"
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Flutter Kodları</span>
          </button>
        </div>
      </header>

      {/* Ana Uygulama Konteyneri */}
      <main
        className={`w-full flex-1 flex flex-col bg-[#000000] relative transition-all duration-300 ${
          isPhoneFrame
            ? 'max-w-[414px] my-4 rounded-[40px] border-[6px] border-zinc-800 shadow-[0_0_50px_rgba(0,122,255,0.15)] overflow-hidden min-h-[840px]'
            : 'max-w-2xl'
        }`}
      >
        {/* Eğer henüz oynatma listesi eklenmemişse ve ANASAYFA sekmesindeyse: Screenshot 1 (NoPlaylistsView) */}
        {isPlaylistEmpty && bottomTab === 'ANASAYFA' ? (
          <NoPlaylistsView
            onAddPlaylistClick={() => setShowAddPlaylistModal(true)}
            onOptionsClick={() => setShowOptionsMenu(true)}
            bottomTab={bottomTab}
            onBottomTabChange={(tab) => setBottomTab(tab)}
            showStatusBar={isPhoneFrame}
            onQuickLoadDemo={handleQuickLoadDemo}
          />
        ) : (
          <>
            {/* Üst Bar (iOS Durum Çubuğu + Sekmeler + AI Ses + Arama) */}
            {bottomTab !== 'DAHA FAZLA' && (
              <TopBar
                currentTab={topTab}
                onTabChange={(tab) => {
                  setTopTab(tab);
                  if (bottomTab !== 'ANASAYFA') setBottomTab('ANASAYFA');
                }}
                onSearchClick={() => setShowSearch(true)}
                onOptionsClick={() => setShowOptionsMenu(true)}
                onAiVoiceClick={handleOpenAiVoice}
                onBackClick={() => {
                  if (bottomTab !== 'ANASAYFA') setBottomTab('ANASAYFA');
                  else setTopTab('ANASAYFA');
                }}
                showStatusBar={isPhoneFrame}
                isEffectiveOffline={offlineState.isEffectiveOffline}
                onOpenOfflineModal={() => setShowOfflineModal(true)}
                onOpenScreenCast={() => setShowScreenCastModal(true)}
              />
            )}

            {/* Sekmelere Göre İçerik Alanı */}
            <div className="flex-1 overflow-y-auto">
              {bottomTab === 'ANASAYFA' && (
                <>
                  {topTab === 'ANASAYFA' && (
                    <div className="pb-28">
                      {/* 1. Trend Filmler Bölümü (Netflix Numaralı) */}
                      <TrendSection
                        title={isKidsMode ? "Çocuk ve Aile Filmleri" : "Trend Filmler"}
                        items={displayedMovies}
                        onItemClick={handlePlayMedia}
                      />

                      {/* 2. Trend Diziler Bölümü (Netflix Numaralı) */}
                      <TrendSection
                        title={isKidsMode ? "Çocuk ve Animasyon Dizileri" : "Trend Diziler"}
                        items={displayedSeries}
                        onItemClick={handlePlayMedia}
                      />

                      {/* 3. Son Kanallar Bölümü (beIN SPORTS 1 HQ & Progress Bar) */}
                      <RecentChannelCard
                        channel={displayedRecentChannel}
                        onPlayChannel={handlePlayChannel}
                        onMoreDetails={(ch) => setShowProgramModal(ch)}
                      />

                      {/* 4. Kategoriler Listesi */}
                      <CategoriesList
                        categories={displayedCategories}
                        onSelectCategory={handleSelectCategory}
                        totalCategoriesCount={displayedCategories.length}
                      />
                    </div>
                  )}

                  {topTab === 'CANLI' && (
                    <TvChannelsView
                      onPlayChannel={handlePlayChannel}
                      initialCategory={isKidsMode ? 'Çocuk Dünyası' : 'Tümü'}
                      isKidsMode={isKidsMode}
                      onOpenSubwooferDemo={() => setActiveChannel(RECENT_CHANNEL)}
                      onOpenOfflineModal={() => setShowOfflineModal(true)}
                      onOpenScreenCast={() => setShowScreenCastModal(true)}
                    />
                  )}

                  {topTab === 'FILM' && (
                    <div className="px-4 py-4 pb-28 space-y-6">
                      <div>
                        <h3 className="text-white font-bold text-base mb-3">Tüm Trend Filmler</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {TREND_MOVIES.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => handlePlayMedia(m)}
                              className="bg-zinc-900 rounded-xl overflow-hidden border border-white/5 cursor-pointer group hover:border-[#007AFF]/50 transition-all"
                            >
                              <img
                                src={m.posterUrl}
                                alt={m.title}
                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="p-2.5">
                                <h4 className="text-white font-bold text-xs truncate">{m.title}</h4>
                                <div className="text-zinc-400 text-[10px] mt-0.5">
                                  %{m.rating} • {m.releaseDate}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-white font-bold text-base mb-3">Tüm Trend Diziler</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {TREND_SERIES.map((s) => (
                            <div
                              key={s.id}
                              onClick={() => handlePlayMedia(s)}
                              className="bg-zinc-900 rounded-xl overflow-hidden border border-white/5 cursor-pointer group hover:border-[#007AFF]/50 transition-all"
                            >
                              <img
                                src={s.posterUrl}
                                alt={s.title}
                                className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="p-2.5">
                                <h4 className="text-white font-bold text-xs truncate">{s.title}</h4>
                                <div className="text-zinc-400 text-[10px] mt-0.5">
                                  %{s.rating} • {s.releaseDate}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {bottomTab === 'EPG' && (
                <EpgView
                  onPlayChannel={handlePlayChannel}
                  isKidsMode={isKidsMode}
                  onOpenOfflineModal={() => setShowOfflineModal(true)}
                />
              )}

              {bottomTab === 'TV KANALI' && (
                <TvChannelsView
                  onPlayChannel={handlePlayChannel}
                  initialCategory={selectedCategoryName || (isKidsMode ? 'Çocuk Dünyası' : 'Tümü')}
                  isKidsMode={isKidsMode}
                  onOpenSubwooferDemo={() => setActiveChannel(RECENT_CHANNEL)}
                  onOpenOfflineModal={() => setShowOfflineModal(true)}
                  onOpenScreenCast={() => setShowScreenCastModal(true)}
                />
              )}

              {/* DAHA FAZLA (More Screen & Settings) */}
              {bottomTab === 'DAHA FAZLA' && (
                showSettingsScreen ? (
                  <SettingsScreen onBack={() => setShowSettingsScreen(false)} />
                ) : (
                  <MoreScreen
                    streamCount={playlists.length || 1}
                    onOpenSettings={() => setShowSettingsScreen(true)}
                    onOpenProPaywall={() => setShowProModal(true)}
                    onOpenAbout={() => setShowAboutModal(true)}
                    onOpenContact={() => {
                      window.location.href = 'mailto:kotaktv@gmail.com?subject=Kotak%20TV%20Destek%20Talebi';
                    }}
                    onOpenFlutterCode={() => setShowFlutterCode(true)}
                    onOpenM3uManager={() => setShowM3uModal(true)}
                    onTestPrefetch={() => setBottomTab('TV KANALI')}
                    onOpenSubwoofer={() => setActiveChannel(RECENT_CHANNEL)}
                    onOpenOfflineManager={() => setShowOfflineModal(true)}
                    onOpenScreenCast={() => setShowScreenCastModal(true)}
                    isProUser={subState.isProUser}
                    trialDaysRemaining={subState.trialDaysRemaining}
                    isEffectiveOffline={offlineState.isEffectiveOffline}
                  />
                )
              )}
            </div>

            {/* Sabit Oval Alt Menü (Bottom Navigation Bar) */}
            <CustomBottomNav
              currentTab={bottomTab}
              onTabChange={(tab) => {
                setBottomTab(tab);
                if (tab !== 'DAHA FAZLA') {
                  setShowSettingsScreen(false);
                }
              }}
            />
          </>
        )}
      </main>

      {/* Yapay Zeka Sesli Komut Modalı */}
      <AiVoiceSearchModal
        isOpen={showAiVoiceModal}
        onClose={() => setShowAiVoiceModal(false)}
        onSelectChannel={handlePlayChannel}
        onSelectMedia={handlePlayMedia}
        onFilterCategory={handleFilterCategory}
      />

      {/* Pro Sürümüne Geç Modalı (Screenshot 2 & 7 Günlük Deneme / RevenueCat Kilidi) */}
      <ProPaywallModal
        isOpen={showProModal}
        onClose={() => {
          if (!isPaywallForced || subState.isPremium) {
            setIsPaywallForced(false);
            setShowProModal(false);
          }
        }}
        isForced={isPaywallForced && !subState.isPremium}
        reason={paywallReason}
        onSuccess={() => {
          setIsPaywallForced(false);
          refreshSubscription();
        }}
        onStateChange={refreshSubscription}
      />

      {/* Hakkında Modalı (Screenshot 7) */}
      <AboutModal
        isOpen={showAboutModal}
        onClose={() => setShowAboutModal(false)}
      />

      {/* M3U & Sunucu Yönetim Modalı */}
      {showM3uModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#141416] rounded-3xl border border-white/10 p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <span className="text-white font-bold text-sm">IPTV Sunucu & M3U Yöneticisi</span>
              <button
                onClick={() => setShowM3uModal(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-2">
              <MoreSettingsView
                onOpenFlutterCode={() => {
                  setShowM3uModal(false);
                  setShowFlutterCode(true);
                }}
                isDeviceMode={isPhoneFrame}
                onToggleDeviceMode={() => setIsPhoneFrame(!isPhoneFrame)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Oynatma Listesi Ekle Modalı */}
      <AddPlaylistModal
        isOpen={showAddPlaylistModal}
        onClose={() => setShowAddPlaylistModal(false)}
        onSavePlaylist={handleSavePlaylist}
      />

      {/* Video Oynatıcı Modalı */}
      {(activeChannel || activeMedia) && (
        <PlayerModal
          channel={activeChannel}
          mediaItem={activeMedia}
          initialShareSession={shareSession}
          onClose={() => {
            setActiveChannel(null);
            setActiveMedia(null);
            setShareSession(null);
          }}
          onSelectChannel={(ch) => setActiveChannel(ch)}
        />
      )}

      {/* Arama Modalı */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onSelectChannel={handlePlayChannel}
          onSelectMedia={handlePlayMedia}
        />
      )}

      {/* Program "DAHA FAZLA" Bilgi Modalı */}
      {showProgramModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#161618] rounded-3xl p-5 border border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="text-xs bg-[#007AFF] text-white px-2 py-0.5 rounded font-black">
                  CANLI
                </span>
                <h3 className="font-bold text-white text-base">
                  {showProgramModal.currentProgram.title}
                </h3>
              </div>
              <button
                onClick={() => setShowProgramModal(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-zinc-300">
              <div className="flex items-center justify-between text-zinc-400">
                <span>Kanal:</span>
                <span className="font-bold text-white">{showProgramModal.name}</span>
              </div>
              <div className="flex items-center justify-between text-zinc-400">
                <span>Yayın Saati:</span>
                <span className="font-mono text-[#007AFF] font-bold">
                  {showProgramModal.currentProgram.startTime} - {showProgramModal.currentProgram.endTime}
                </span>
              </div>
              <p className="text-zinc-400 leading-relaxed pt-1">
                {showProgramModal.currentProgram.description}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => {
                  handlePlayChannel(showProgramModal);
                  setShowProgramModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-xs cursor-pointer transition-colors"
              >
                Canlı Yayını İzle
              </button>
              <button
                onClick={() => setShowProgramModal(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Üç Nokta Seçenekler Menüsü */}
      {showOptionsMenu && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-[#1a1a1d] rounded-2xl p-4 border border-white/10 shadow-2xl space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <span className="text-white font-bold text-sm">Hızlı Seçenekler</span>
              <button
                onClick={() => setShowOptionsMenu(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                handleOpenAiVoice();
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-white font-semibold flex items-center justify-between text-[#007AFF]"
            >
              <span>Yapay Zeka Sesli Komut</span>
              <Mic className="w-4 h-4 text-[#007AFF]" />
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                handleOpenSharePlay();
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-emerald-400 font-semibold flex items-center justify-between"
            >
              <span>Birlikte İzle (SharePlay)</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setShowAddPlaylistModal(true);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-white font-semibold flex items-center justify-between"
            >
              <span>Yeni Oynatma Listesi Ekle</span>
              <Plus className="w-4 h-4 text-[#007AFF]" />
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setShowOfflineModal(true);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-amber-300 font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <span>Çevrimdışı Mod & 24s EPG</span>
                {offlineState.isEffectiveOffline && (
                  <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1.5 rounded font-black">AKTİF</span>
                )}
              </div>
              <WifiOff className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setShowScreenCastModal(true);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-[#007AFF] font-semibold flex items-center justify-between"
            >
              <span>Ekran Paylaşımı & İkinci Cihaz</span>
              <Cast className="w-4 h-4 text-[#007AFF]" />
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setIsPaywallForced(!subState.isPremium);
                setShowProModal(true);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-amber-400 font-semibold flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <span>Kotak TV PRO</span>
                {subState.isProUser ? (
                  <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1.5 rounded font-black">AKTİF</span>
                ) : (
                  <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 rounded font-black">{subState.trialDaysRemaining} GÜN</span>
                )}
              </div>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>

            {/* Test Modu Deneme Butonları */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-1">
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  SubscriptionService.expireTrial();
                  refreshSubscription();
                  setIsPaywallForced(true);
                  setShowProModal(true);
                }}
                className="w-full text-left py-1.5 px-3 rounded-lg hover:bg-red-950/40 text-[11px] text-red-400 font-semibold flex items-center justify-between cursor-pointer"
                title="Denemeyi bitirip kilitli ekranı test edin"
              >
                <span>🔒 Denemeyi Bitir (Kilit Testi)</span>
                <Lock className="w-3.5 h-3.5 text-red-400" />
              </button>

              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  SubscriptionService.resetTrial();
                  refreshSubscription();
                  setIsPaywallForced(false);
                }}
                className="w-full text-left py-1.5 px-3 rounded-lg hover:bg-cyan-950/40 text-[11px] text-cyan-400 font-semibold flex items-center justify-between cursor-pointer"
                title="7 Günlük denemeyi yeniden başlatın"
              >
                <span>🔄 7 Günlük Denemeyi Yenile</span>
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>

            {playlists.length > 0 && (
              <button
                onClick={() => {
                  setShowOptionsMenu(false);
                  handleResetPlaylists();
                }}
                className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-red-400 font-semibold flex items-center justify-between"
              >
                <span>Listeleri Sıfırla (Boş Ekran)</span>
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setShowFlutterCode(true);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-white font-semibold flex items-center justify-between"
            >
              <span>Flutter Proje Kodları</span>
              <FileCode className="w-4 h-4 text-[#007AFF]" />
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setIsPhoneFrame(!isPhoneFrame);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-white font-semibold flex items-center justify-between"
            >
              <span>Görünüm Modunu Değiştir</span>
              <Smartphone className="w-4 h-4 text-[#007AFF]" />
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setShowProfileModal(true);
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-amber-400 font-semibold flex items-center justify-between"
            >
              <span>Profil Değiştir (Ebeveyn Kilidi)</span>
              <Shield className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={() => {
                setShowOptionsMenu(false);
                setBottomTab('DAHA FAZLA');
              }}
              className="w-full text-left py-2 px-3 rounded-lg hover:bg-zinc-800 text-xs text-white font-semibold flex items-center justify-between"
            >
              <span>Ayarlar & Menü</span>
              <Info className="w-4 h-4 text-[#007AFF]" />
            </button>
          </div>
        </div>
      )}

      {/* Profil Seçimi & Ebeveyn Kilidi Modalı */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        currentProfile={currentProfile}
        onSelectProfile={(p) => {
          setCurrentProfile(p);
          try {
            localStorage.setItem('kotak_user_profile', JSON.stringify(p));
          } catch {}
        }}
        parentalPin={parentalPin}
      />

      {/* Flutter Kod Görüntüleyici Tam Ekran Modalı */}
      {showFlutterCode && (
        <FlutterCodeViewer onClose={() => setShowFlutterCode(false)} />
      )}

      {/* 24 Saatlik Çevrimdışı Mod & EPG Yöneticisi Modalı */}
      <OfflineManagerModal
        isOpen={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
        onPlayOfflineChannel={handlePlayChannel}
      />

      {/* Ekran Paylaşımı & İkinci Cihaz (Cast / Smart TV) Modalı */}
      <RemoteScreenCastModal
        isOpen={showScreenCastModal}
        onClose={() => setShowScreenCastModal(false)}
        channel={activeChannel || RECENT_CHANNEL}
        mediaItem={activeMedia}
      />
    </div>
  );
}
