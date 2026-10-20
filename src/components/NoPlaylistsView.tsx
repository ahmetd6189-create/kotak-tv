import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, MoreHorizontal, Sparkles, Inbox } from 'lucide-react-native';
import { BottomNavTab } from '../types/iptv';
import { HomeActions } from '../ui/HomeControls';
import { CustomBottomNav } from './CustomBottomNav';
import { colors } from '../theme';

interface NoPlaylistsViewProps {
  onAddPlaylistClick: () => void;
  onOptionsClick: () => void;
  bottomTab: BottomNavTab;
  onBottomTabChange: (tab: BottomNavTab) => void;
  onQuickLoadDemo?: () => void;
  onAiVoiceClick?: () => void;
}

export const NoPlaylistsView: React.FC<NoPlaylistsViewProps> = ({
  onAddPlaylistClick,
  onOptionsClick,
  bottomTab,
  onBottomTabChange,
  onQuickLoadDemo,
  onAiVoiceClick,
}) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.fill}>
      <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 40 }} />
        <Text style={styles.title}>Kotak TV</Text>
        <View style={styles.topActions}>
          <Pressable onPress={onAddPlaylistClick} style={styles.plus}>
            <Plus size={20} color={colors.white} />
          </Pressable>
          <Pressable onPress={onOptionsClick} style={styles.more}>
            <MoreHorizontal size={20} color={colors.white} />
          </Pressable>
        </View>
      </View>
      {onAiVoiceClick && <HomeActions onVoice={onAiVoiceClick} onRefresh={onAddPlaylistClick} loading={false}/>}
      <View style={styles.center}>
        <Inbox size={58} color={colors.zinc500} style={{ marginBottom: 20 }} />
        <Text style={styles.h2}>Oynatma Listesi Yok</Text>
        <Text style={styles.hint}>Oynatma listesi oluşturmak için (+) tuşuna basın</Text>
        <Pressable onPress={onAddPlaylistClick}>
          <Text style={styles.link}>Oynatma Listesi Ekle</Text>
        </Pressable>
        {onQuickLoadDemo ? (
          <Pressable onPress={onQuickLoadDemo} style={styles.demo}>
            <Sparkles size={14} color={colors.emerald} />
            <Text style={styles.demoText}>Hızlı Test: Örnek Oynatma Listesini Yükle</Text>
          </Pressable>
        ) : null}
      </View>
      <CustomBottomNav currentTab={bottomTab} onTabChange={onBottomTabChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8 },
  title: { color: colors.white, fontWeight: '800', fontSize: 22 },
  topActions: { flexDirection: 'row', gap: 8 },
  plus: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  more: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 80 },
  folder: { color: colors.zinc600, fontSize: 54, marginBottom: 12 },
  h2: { color: colors.white, fontWeight: '900', fontSize: 22 },
  hint: { color: colors.zinc400, textAlign: 'center', marginTop: 8 },
  link: { color: colors.blue, fontWeight: '700', marginTop: 16 },
  demo: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.card2, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999 },
  demoText: { color: colors.zinc300, fontSize: 12, fontWeight: '600' },
});
