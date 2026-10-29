import {useAppearance,languages,teams,Language} from './Appearance';
import React from "react";
import {
  Pressable,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "./Native";
import { Check, ChevronRight, Layers, Tv } from "lucide-react-native";
import { PageHeader, d } from "./Design";
import { colors as c } from "../theme";
export type Preferences = { layout: "Klasik" | "Modern"; saveHistory: boolean; videoFit?:"cover"|"contain"; seekSeconds?: number; bufferSeconds?: number };
export function SettingsView({
  settings,
  onChange,
  onBack,
  onInfo,
  onClearHistory,
}: {
  settings: Preferences;
  onChange: (p: Preferences) => void;
  onBack: () => void;
  onInfo: (title: string) => void;
  onClearHistory: () => void;
}) {
  const {value:appearance,change:changeAppearance}=useAppearance();
  const row = (title: string, value: string, action?: () => void) => (
    <Pressable disabled={!action} onPress={action} style={s.row}>
      <Text style={s.label}>{title}</Text>
      <Text style={s.value}>{value}</Text>
      {action && <ChevronRight size={15} color={c.zinc500} />}
    </Pressable>
  );
  return (
    <ScrollView contentContainerStyle={d.screenList}>
      <PageHeader title="Ayarlar" onBack={onBack} />
      <Text style={s.section}>TEMA</Text>
      <View style={s.group}>
        <Text style={[s.label, { padding: 16 }]}>Ana Ekran Düzeni</Text>
        <View style={s.layouts}>
          {(["Klasik", "Modern"] as const).map((layout) => (
            <Pressable
              key={layout}
              style={[s.layout, settings.layout === layout && s.active]}
              onPress={() => onChange({ ...settings, layout })}
            >
              {layout === "Klasik" ? (
                <Tv size={62} color={c.blue} />
              ) : (
                <Layers size={62} color={c.blue} />
              )}
              <View style={d.inline}>
                <Text style={s.label}>{layout}</Text>
                {settings.layout === layout && (
                  <Check size={15} color={c.blue} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
        {row("Tema",appearance.theme==="oled"?"OLED Siyah":"Gece Mavisi",()=>changeAppearance({theme:appearance.theme==="oled"?"midnight":"oled"}))}
        {row("Takım renkleri ve logo",appearance.teamColors?"Etkin":"Kotak TV renkleri",()=>appearance.teamId?changeAppearance({teamColors:!appearance.teamColors}):onInfo("Takiplerim"))}
      </View>
      <Text style={s.section}>GENEL</Text>
      <View style={s.group}>
        <Text style={[s.label,{padding:16}]}>Dil</Text><View style={{flexDirection:"row",flexWrap:"wrap",padding:12,gap:8}}>{Object.entries(languages).map(([id,label])=><Pressable key={id} onPress={()=>changeAppearance({language:id as Language})} style={[{padding:12,borderRadius:12},appearance.language===id&&s.active]}><Text style={s.label}>{label}</Text></Pressable>)}</View>
        {row("Takiplerim", "Takım, dizi, yeni film", () => onInfo("Takiplerim"))}
        {row("Bildirimler", "Cihaz ayarları", () => {void Linking.openSettings();})}
        {row("Ebeveyn Kontrolü", "Profil ve PIN", () =>
          onInfo("Güvenli Çocuk Profili"),
        )}
      </View>
      <Text style={s.section}>OYNATMA LİSTELERİ</Text>
      <View style={s.group}>
        <View style={s.row}>
          <Text style={[s.label, { flex: 1 }]}>İzleme geçmişini kaydet</Text>
          <Switch
            value={settings.saveHistory}
            onValueChange={(saveHistory) =>
              onChange({ ...settings, saveHistory })
            }
            trackColor={{ true: c.blue, false: "#333337" }}
          />
        </View>
        {row("İzleme geçmişi", "Temizle", onClearHistory)}
        {row("Listeleri yönet", "", () => onInfo("Kütüphaneniz"))}
        {row("Oynatma listesini önbelleğe al", "Etkin")}
        {row("Maksimum liste yükleme süresi", "30 saniye")}
        {row("Maksimum EPG yükleme süresi", "30 saniye")}
        {row("24 saatlik EPG önbelleği", "Ayrıntılar", () => onInfo("Çevrimdışı Mod & 24s EPG"))}
      </View>
      <Text style={s.section}>OYNATICI</Text>
      <View style={s.group}>
        {row("Ses Testi", "Cihaz sesini kontrol et", () => onInfo("Ses Testi"))}
        {row("Video ölçekleme", settings.videoFit==="contain"?"Oranı koru":"Ekranı doldur",()=>onChange({...settings,videoFit:settings.videoFit==="contain"?"cover":"contain"}))}
        <Text style={[d.micro,{padding:16}]}>Ekranı doldur, görüntüyü esnetmeden kenarlardan kırpar.</Text>
        {row("İleri geri sarma aralığı", `${settings.seekSeconds || 15} saniye`, () => onChange({...settings, seekSeconds:(settings.seekSeconds || 15) === 15 ? 30 : 15}))}
        {row("Ağ önbellekleme", `${settings.bufferSeconds || 15} saniye`, () => onChange({...settings, bufferSeconds:(settings.bufferSeconds || 15) === 15 ? 30 : 15}))}
        {row("Canlı yayın", "Otomatik oynat")}
        {row("Tam ekran & PiP", "Cihaz desteğine göre")}
        {row("Ses ve altyazı", "Yayındaki parçalar", () =>
          onInfo("Ses ve Altyazı"),
        )}
      </View>
    </ScrollView>
  );
}
const s = StyleSheet.create({
  section: {
    color: c.zinc500,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1,
    marginTop: 28,
    marginBottom: 10,
    marginLeft: 4,
  },
  group: {
    backgroundColor: "#1c1c1e",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ffffff09",
  },
  row: {
    padding: 18,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ffffff08",
    minHeight: 66,
  },
  label: { color: c.white, fontSize: 16, fontWeight: "500", flex: 1 },
  value: { color: c.zinc400, fontSize: 14, flex: 1, textAlign: "right" },
  layouts: { flexDirection: "row", gap: 12, padding: 16, paddingTop: 0 },
  layout: {
    flex: 1,
    padding: 24,
    borderRadius: 24,
    gap: 12,
    backgroundColor: "#222225",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffffff09",
  },
  active: { backgroundColor: "#1a1f2c", borderWidth: 2, borderColor: c.blue },
});

