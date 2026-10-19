import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  Cast,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  FolderOpen,
  Grid2X2,
  Info,
  Layers,
  ListVideo,
  Mail,
  Mic,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  Tv,
  Users,
  Volume2,
  WifiOff,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import type { Entry, Guide, PlaylistConfig, Program } from "../native/iptv";
import { colors as c } from "../theme";
import { scheduleFor } from "../native/catalog-tools";
import { TrendSection } from "../components/TrendSection";

export function IconButton({
  icon: Icon,
  label,
  onPress,
  blue = false,
  color,
  small = false,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  blue?: boolean;
  color?: string;
  small?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={({ pressed }) => [
        d.icon,
        small && d.smallIcon,
        blue && d.blueBg,
        (focused || pressed) && d.focus,
      ]}
    >
      <Icon size={small ? 17 : 20} color={color || c.white} strokeWidth={2} />
    </Pressable>
  );
}
export function Pill({
  label,
  onPress,
  active = false,
  icon: Icon,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  icon?: LucideIcon;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        d.pill,
        active && d.blueBg,
        focused && d.focus,
        disabled && { opacity: 0.4 },
      ]}
    >
      {Icon && <Icon size={14} color={active ? c.white : c.blue} />}
      <Text style={[d.pillText, active && { color: c.white }]}>{label}</Text>
    </Pressable>
  );
}
export function PageHeader({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={d.pageHeader}>
      {onBack ? (
        <IconButton icon={ChevronLeft} label="Geri" onPress={onBack} />
      ) : (
        <View style={{ width: 36 }} />
      )}
      <Text style={d.pageTitle}>{title}</Text>
      <View style={{ minWidth: 36 }}>{right}</View>
    </View>
  );
}
export function Sheet({
  visible,
  onClose,
  title,
  children,
  compact = false,
  full = false,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  compact?: boolean;
  full?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[
          d.backdrop,
          compact && { justifyContent: "center", paddingHorizontal: 16 },
          full && {
            justifyContent: "center",
            backgroundColor: "#000f",
            paddingTop: insets.top,
          },
        ]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Pencereyi kapat"
        />
        <View
          style={[
            d.sheet,
            compact && { maxWidth: 384, borderRadius: 24 },
            full && {
              flex: 1,
              maxWidth: 672,
              maxHeight: "100%",
              borderRadius: 0,
              borderWidth: 0,
              backgroundColor: "#000",
            },
            { paddingBottom: Math.max(20, insets.bottom) },
          ]}
        >
          {!full && <View style={d.sheetHandle} />}
          <View style={d.sheetHeader}>
            <Text style={d.sheetTitle}>{title}</Text>
            <IconButton small icon={X} label="Kapat" onPress={onClose} />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 6 }}
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function Logo({ item, size = 48 }: { item: Entry; size?: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[d.logo, { width: size, height: size }]}>
      {item.logo && !failed ? (
        <Image
          onError={() => setFailed(true)}
          source={{ uri: item.logo }}
          style={{ width: "90%", height: "90%" }}
          resizeMode="contain"
        />
      ) : (
        <Text style={d.logoText}>{item.name.slice(0, 5)}</Text>
      )}
    </View>
  );
}
export function currentProgram(
  item: Entry,
  guide: Guide,
  now: number,
): Program | undefined {
  return scheduleFor(item, guide).find(
    (p) => p.start <= now && p.end > now,
  );
}
export function clock(value: number): string {
  return new Date(value).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  });
}
export function ProgramBar({
  program,
  now,
}: {
  program?: Program;
  now: number;
}) {
  if (!program) return <Text style={d.micro}>Program bilgisi sağlanmadı</Text>;
  const value = Math.min(
    100,
    Math.max(0, ((now - program.start) / (program.end - program.start)) * 100),
  );
  return (
    <View style={d.progressRow}>
      <Text style={d.micro}>{clock(program.start)}</Text>
      <View style={d.progress}>
        <View style={[d.progressBlue, { width: `${value}%` }]} />
      </View>
      <Text style={d.micro}>{clock(program.end)}</Text>
    </View>
  );
}
export function SectionTitle({
  title,
  count,
  icon: Icon = Grid2X2,
  onPress,
}: {
  title: string;
  count?: number;
  icon?: LucideIcon;
  onPress?: () => void;
}) {
  return (
    <Pressable disabled={!onPress} onPress={onPress} style={d.sectionTitle}>
      <View style={d.inline}>
        <Text style={d.h2}>{title}</Text>
        {count !== undefined && <Text style={d.count}>{count}</Text>}
        <ChevronRight size={16} color={c.zinc500} />
      </View>
      <Icon size={17} color={c.blue} />
    </Pressable>
  );
}
export function RecentCard({
  item,
  guide,
  now,
  onPlay,
  onDetails,
}: {
  item: Entry;
  guide: Guide;
  now: number;
  onPlay: () => void;
  onDetails: () => void;
}) {
  const p = currentProgram(item, guide, now);
  return (
    <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
      <SectionTitle title="Son Kanallar" count={1} icon={Tv} />
      <Pressable onPress={onPlay} style={d.recentCard}>
        <Logo item={item} size={62} />
        <View style={{ flex: 1, gap: 7 }}>
          <View style={d.between}>
            <Text numberOfLines={1} style={[d.name, { flex: 1 }]}>
              {item.name}
            </Text>
            <Play size={14} color={c.white} />
          </View>
          <View style={d.between}>
            <Text numberOfLines={1} style={[d.secondary, { flex: 1 }]}>
              {p?.title || item.group}
            </Text>
            <Pressable onPress={onDetails}>
              <Text style={d.linkSmall}>DAHA FAZLA</Text>
            </Pressable>
          </View>
          <ProgramBar program={p} now={now} />
        </View>
      </Pressable>
    </View>
  );
}
export function MediaRail({
  title,
  items,
  onPlay,
  onMore,
}: {
  title: string;
  items: Entry[];
  onPlay: (entry: Entry) => void;
  onMore: () => void;
}) {
  return (
    <View style={{ marginTop: 8 }}>
      <TrendSection
        title={title}
        items={items.slice(0, 20).map((item, i) => ({
          id: item.id,
          title: item.name,
          posterUrl: item.logo,
          rating: item.imdbRating || 0,
          releaseDate: "",
          genre: item.imdbRating ? `IMDb ${item.imdbRating.toFixed(1)} / 10` : item.group,
          description: "",
          type: item.kind === "series" ? "series" : "movie",
          rank: i + 1,
        }))}
        onMore={onMore}
        onItemClick={(item) => {
          const entry = items.find((e) => e.id === item.id);
          if (entry) onPlay(entry);
        }}
      />
      {!items.length && (
        <Text style={d.emptyRail}>
          IMDb puanı doğrulanmış{" "}
          {title.toLocaleLowerCase("tr-TR").includes("dizi") ? "dizi" : "film"}{" "}
          bulunmuyor.
        </Text>
      )}
    </View>
  );
}
export function ChannelCard({
  item,
  guide,
  now,
  favorite,
  selected,
  onPlay,
  onFavorite,
  onGuide,
  selecting = false,
}: {
  item: Entry;
  guide: Guide;
  now: number;
  favorite: boolean;
  selected?: boolean;
  onPlay: () => void;
  onFavorite: () => void;
  onGuide?: () => void;
  selecting?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const p = currentProgram(item, guide, now);
  return (
    <View style={[d.channelCard, focused && d.focus, selected && d.selected]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.name}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPress={onPlay}
        style={d.channelMain}
      >
        <Logo item={item} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text numberOfLines={1} style={d.name}>
            {item.name}
          </Text>
          <Text numberOfLines={1} style={d.secondary}>
            {p?.title || item.group}
          </Text>
          <ProgramBar program={p} now={now} />
        </View>
      </Pressable>
      {!!onGuide&&<IconButton small icon={CalendarDays} label={`${item.name} yayın akışı`} onPress={onGuide}/>}
      <IconButton
        small
        icon={favorite ? Star : Star}
        color={favorite ? c.amber : c.zinc600}
        label={`${item.name} favori`}
        onPress={onFavorite}
      />
      <IconButton
        blue
        small
        icon={
          selecting
            ? selected
              ? Check
              : Plus
            : item.kind === "series"
              ? Layers
              : Play
        }
        label={
          selecting ? "Seç" : item.kind === "series" ? "Bölümleri aç" : "İzle"
        }
        onPress={onPlay}
      />
    </View>
  );
}
export function FeatureCards({
  onOpen,
}: {
  onOpen: (feature: string) => void;
}) {
  const { width } = useWindowDimensions();
  const features: {
    title: string;
    description: string;
    icon: LucideIcon;
    tint: string;
    bg: readonly [string, string];
  }[] = [
    {
      title: "Akış Ön Yükleme",
      description: "Kanal geçiş deneyimi",
      icon: Zap,
      tint: c.blue,
      bg: ["#121824", "#121316"],
    },
    {
      title: "Çift Ses & Subwoofer",
      description: "Ses parçaları ve oynatıcı",
      icon: Volume2,
      tint: c.purple,
      bg: ["#1a1324", "#141216"],
    },
    {
      title: "Çevrimdışı Mod & 24s EPG",
      description: "Program rehberi ve önbellek",
      icon: WifiOff,
      tint: c.amber,
      bg: ["#1d1712", "#141216"],
    },
    {
      title: "Ekran Paylaşımı",
      description: "Smart TV ve ikinci cihaz",
      icon: Cast,
      tint: c.blue,
      bg: ["#121b24", "#121316"],
    },
  ];
  return (
    <View style={{ paddingTop: 10 }}>
      <View style={d.featureHeading}>
        <Sparkles size={15} color={c.blue} />
        <Text style={[d.name, { fontSize: 13 }]}>
          Kotak TV • Yeni Nesil Özellikler
        </Text>
      </View>
      <View style={d.featureGrid}>
        {features.map((f) => (
          <Pressable
            key={f.title}
            style={[d.featureCell, { width: width >= 768 ? "50%" : "100%" }]}
            onPress={() => onOpen(f.title)}
          >
            <LinearGradient
              colors={f.bg}
              style={[d.featureCard, { borderColor: `${f.tint}44` }]}
            >
              <View style={d.between}>
                <View
                  style={[d.featureIcon, { backgroundColor: `${f.tint}22` }]}
                >
                  <f.icon size={18} color={f.tint} />
                </View>
                <ChevronRight size={15} color={f.tint} />
              </View>
              <Text style={d.featureName}>{f.title}</Text>
              <Text style={d.micro}>{f.description}</Text>
            </LinearGradient>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
export function SearchPanel({
  visible,
  entries,
  onClose,
  onPlay,
}: {
  visible: boolean;
  entries: Entry[];
  onClose: () => void;
  onPlay: (item: Entry) => void;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("Tümü");
  const q = query.toLocaleLowerCase("tr-TR").trim();
  const results = entries.filter(
    (e) =>
      (!q || e.name.toLocaleLowerCase("tr-TR").includes(q)) &&
      (kind === "Tümü" ||
        (kind === "Kanallar"
          ? e.kind === "live"
          : kind === "Filmler"
            ? e.kind === "movie"
            : e.kind === "series" || e.kind === "episode")),
  );
  return (
    <Sheet visible={visible} onClose={onClose} title="İçerik Ara" full>
      <View style={d.searchBox}>
        <Search color={c.zinc400} size={18} />
        <TextInput
          autoFocus
          value={query}
          onChangeText={setQuery}
          style={d.searchInput}
          placeholder="Kanal, film veya dizi ara…"
          placeholderTextColor={c.zinc500}
        />
      </View>
      <View style={d.pills}>
        {["Tümü", "Kanallar", "Filmler", "Diziler"].map((label) => (
          <Pill
            key={label}
            label={label}
            active={kind === label}
            onPress={() => setKind(label)}
          />
        ))}
      </View>
      <Text style={d.micro}>{results.length} sonuç</Text>
      {(["Kanallar", "Filmler", "Diziler"] as const).map((section) => {
        const matches = results.filter((item) =>
          section === "Kanallar"
            ? item.kind === "live"
            : section === "Filmler"
              ? item.kind === "movie"
              : item.kind === "series" || item.kind === "episode",
        );
        if (!matches.length) return null;
        return (
          <View key={section} style={{ marginTop: 20 }}>
            <View style={[d.inline, { marginBottom: 10 }]}>
              {section === "Kanallar" ? (
                <Tv size={14} color={c.blue} />
              ) : section === "Filmler" ? (
                <Film size={14} color={c.blue} />
              ) : (
                <Layers size={14} color={c.blue} />
              )}
              <Text
                style={[
                  d.micro,
                  {
                    fontWeight: "800",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  },
                ]}
              >
                {section}
              </Text>
            </View>
            <View
              style={
                section === "Kanallar"
                  ? undefined
                  : { flexDirection: "row", flexWrap: "wrap", gap: 10 }
              }
            >
              {matches.slice(0, 100).map((item) => (
                <Pressable
                  key={item.id}
                  style={
                    section === "Kanallar"
                      ? d.searchResult
                      : {
                          width: "48%",
                          padding: 8,
                          backgroundColor: "#18181b",
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: "#ffffff0d",
                        }
                  }
                  onPress={() => {
                    onClose();
                    onPlay(item);
                  }}
                >
                  {section === "Kanallar" ? (
                    <>
                      <Logo item={item} size={38} />
                      <View style={{ flex: 1 }}>
                        <Text style={d.name} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={d.micro}>{item.group}</Text>
                      </View>
                      <Play color={c.blue} size={16} />
                    </>
                  ) : (
                    <>
                      {item.logo ? (
                        <Image
                          source={{ uri: item.logo }}
                          style={{
                            width: "100%",
                            height: 96,
                            borderRadius: 8,
                            marginBottom: 8,
                          }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View
                          style={{
                            height: 96,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#222225",
                            borderRadius: 8,
                            marginBottom: 8,
                          }}
                        >
                          <Film size={25} color={c.zinc500} />
                        </View>
                      )}
                      <Text style={d.name} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={d.micro} numberOfLines={1}>
                        {item.group}
                      </Text>
                    </>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
      {!results.length && (
        <Text style={d.emptyRail}>Aramanıza uygun içerik bulunamadı.</Text>
      )}
      {results.length > 100 && (
        <Text style={d.micro}>Daha fazla sonuç için aramanızı daraltın.</Text>
      )}
    </Sheet>
  );
}
export { EpgScreen } from "./EpgView";
export function MoreScreen({
  streamCount,
  playlistCount,
  onOpen,
}: {
  streamCount: number;
  playlistCount: number;
  onOpen: (name: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={d.moreBody}>
      <PageHeader title="Kotak TV" />
      {[
        [
          "Kütüphaneniz",
          `${streamCount} AKIŞ · ${playlistCount} OYNATMA LİSTESİ`,
          ListVideo,
        ],
        ["Kaydedilmiş videolar", "", FolderOpen],
        ["Pro Sürümüne Geç", "KOTAK TV PRO", Sparkles],
        ["Ayarlar", "DİL • TEMA • EBEVEYN KONTROLÜ", Settings],
        ["Kotak AI & Birlikte İzle", "SESLİ ARAMA • ANALİZ • ÖZET • SHAREPLAY", Sparkles],
        ["Arkadaşınıza önerin", "", Share2],
        ["Bizimle iletişime geçin", "HERHANGİ BİR SORUNUZ VARSA", Mail],
        ["Hakkında", "", Info],
      ].map(([title, subtitle, icon]) => {
        const Icon = icon as LucideIcon;
        return (
          <Pressable
            key={String(title)}
            style={d.menuRow}
            onPress={() => onOpen(String(title))}
          >
            <View style={{ flex: 1 }}>
              <View style={d.inline}>
                <Text style={d.menuTitle}>{String(title)}</Text>
                {title === "Pro Sürümüne Geç" && (
                  <Text style={d.liveTag}>PRO</Text>
                )}
              </View>
              {!!subtitle && (
                <Text style={d.menuCaption}>{String(subtitle)}</Text>
              )}
            </View>
            <Icon size={18} color={c.zinc500} />
            <ChevronRight size={16} color={c.zinc600} />
          </Pressable>
        );
      })}
      <Text style={[d.micro, { textAlign: "center", marginTop: 24 }]}>
        Kotak TV · 1.0.4
      </Text>
    </ScrollView>
  );
}
export function LibraryScreen({
  configs,
  counts,
  busy,
  onAdd,
  onRefresh,
  onRemove,
  onBack,
}: {
  configs: PlaylistConfig[];
  counts: Record<string, number>;
  busy: boolean;
  onAdd: () => void;
  onRefresh: (config: PlaylistConfig) => void;
  onRemove: (config: PlaylistConfig) => void;
  onBack: () => void;
}) {
  return (
    <ScrollView contentContainerStyle={d.screenList}>
      <PageHeader
        title="Kütüphaneniz"
        onBack={onBack}
        right={
          <IconButton icon={Plus} blue label="Liste Ekle" onPress={onAdd} />
        }
      />
      {configs.map((config) => (
        <View key={config.id} style={d.libraryCard}>
          <View style={d.inline}>
            <View style={d.featureIcon}>
              <ListVideo size={22} color={c.blue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={d.name}>{config.name}</Text>
              <Text style={d.secondary}>
                {config.type.toUpperCase()} · {counts[config.id] || 0} içerik
              </Text>
            </View>
          </View>
          <View style={[d.between, { marginTop: 12 }]}>
            <Pill
              label={busy ? "Güncelleniyor…" : "Listeyi Yenile"}
              disabled={busy}
              onPress={() => onRefresh(config)}
            />
            <Pressable disabled={busy} onPress={() => onRemove(config)}>
              <Text style={{ color: c.red, fontSize: 12 }}>Listeyi Kaldır</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {configs.length === 0 && (
        <Text style={d.emptyRail}>Henüz oynatma listesi eklenmedi.</Text>
      )}
    </ScrollView>
  );
}
export const d = StyleSheet.create({
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1c1c1e",
    alignItems: "center",
    justifyContent: "center",
  },
  smallIcon: { width: 32, height: 32, borderRadius: 16 },
  blueBg: { backgroundColor: c.blue },
  focus: {
    borderWidth: 1.5,
    borderColor: "#70B5FF",
    backgroundColor: "#163154",
  },
  pill: {
    borderRadius: 999,
    backgroundColor: "#18181b",
    borderWidth: 1,
    borderColor: "#ffffff0d",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pillText: { color: c.zinc400, fontSize: 11, fontWeight: "700" },
  pills: { flexDirection: "row", gap: 7, marginVertical: 12, flexWrap: "wrap" },
  pageHeader: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: c.bg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ffffff0a",
  },
  pageTitle: {
    color: c.white,
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "#000c",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 38,
  },
  sheet: {
    width: "100%",
    maxWidth: 512,
    maxHeight: "94%",
    backgroundColor: "#141416",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ffffff1a",
  },
  sheetHandle: {
    width: 34,
    height: 4,
    backgroundColor: "#454548",
    borderRadius: 9,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 14,
  },
  sheetTitle: { color: c.white, fontSize: 17, fontWeight: "700", flex: 1 },
  logo: {
    backgroundColor: "#222225",
    borderWidth: 1,
    borderColor: "#ffffff14",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoText: {
    color: c.white,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  inline: { flexDirection: "row", alignItems: "center", gap: 6 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  name: { color: c.white, fontSize: 16, fontWeight: "700" },
  secondary: { color: c.zinc400, fontSize: 14, lineHeight: 21 },
  micro: { color: c.zinc500, fontSize: 10, lineHeight: 15 },
  h2: { color: c.white, fontSize: 22, fontWeight: "800" },
  linkSmall: { color: c.blue, fontSize: 10, fontWeight: "800" },
  count: { color: c.zinc500, fontSize: 14, fontWeight: "700" },
  sectionTitle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 5,
  },
  progress: {
    flex: 1,
    height: 4,
    borderRadius: 9,
    backgroundColor: c.zinc800,
    overflow: "hidden",
  },
  progressBlue: { height: "100%", backgroundColor: c.blue, borderRadius: 9 },
  recentCard: {
    flexDirection: "row",
    paddingVertical: 12,
    backgroundColor: "#000",
    gap: 12,
    alignItems: "center",
  },
  rail: { paddingHorizontal: 16, gap: 10 },
  mediaCard: { width: 168 },
  poster: { height: 116, flexDirection: "row", alignItems: "flex-end" },
  rank: {
    width: 46,
    fontSize: 76,
    lineHeight: 82,
    fontWeight: "900",
    color: "#686870",
    letterSpacing: -8,
  },
  posterImage: {
    width: 118,
    height: 116,
    borderRadius: 10,
    backgroundColor: "#18181b",
  },
  posterEmpty: {
    width: 118,
    height: 116,
    borderRadius: 10,
    backgroundColor: "#18181b",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaName: {
    color: c.white,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 8,
    paddingLeft: 4,
  },
  emptyRail: {
    color: c.zinc500,
    fontSize: 12,
    padding: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  channelCard: {
    padding: 12,
    backgroundColor: "#161618",
    borderWidth: 1,
    borderColor: "#ffffff0d",
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  channelMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  selected: { borderColor: c.blue, backgroundColor: "#141b27" },
  featureHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
  },
  featureGrid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4 },
  featureCell: { width: "50%", padding: 4 },
  featureCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    minHeight: 120,
    gap: 7,
  },
  featureIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#007AFF22",
    alignItems: "center",
    justifyContent: "center",
  },
  featureName: { color: c.white, fontSize: 12, fontWeight: "700" },
  searchBox: {
    backgroundColor: "#232326",
    borderRadius: 14,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, height: 48, color: c.white, fontSize: 14 },
  searchResult: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ffffff09",
  },
  screenList: { padding: 16, paddingBottom: 128 },
  timeline: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    padding: 12,
    backgroundColor: "#09090b",
    borderRadius: 12,
    marginBottom: 12,
  },
  epgCard: {
    backgroundColor: "#161618",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffffff0d",
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  epgProgram: {
    backgroundColor: "#1c1c1f",
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  liveTag: {
    color: c.white,
    backgroundColor: c.blue,
    fontSize: 9,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  moreBody: { paddingHorizontal: 24, paddingBottom: 130 },
  menuRow: {
    paddingVertical: 20,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  menuTitle: { color: c.white, fontSize: 19, fontWeight: "700" },
  menuCaption: {
    color: c.zinc500,
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 1,
    marginTop: 4,
  },
  libraryCard: {
    padding: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: "#161618",
    borderWidth: 1,
    borderColor: "#ffffff0d",
  },
});
