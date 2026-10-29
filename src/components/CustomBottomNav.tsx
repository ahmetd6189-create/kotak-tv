import React from 'react';
import { Pressable, StyleSheet, Text, View } from '../ui/Native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutGrid, CalendarDays, Play, MoreHorizontal } from 'lucide-react-native';
import { BottomNavTab } from '../types/iptv';
import { colors } from '../theme';

interface CustomBottomNavProps {
  currentTab: BottomNavTab;
  onTabChange: (tab: BottomNavTab) => void;
}

export const CustomBottomNav: React.FC<CustomBottomNavProps> = ({ currentTab, onTabChange }) => {
  const insets = useSafeAreaInsets();
  const items: { tab: BottomNavTab; label: string; Icon: typeof Play }[] = [
    { tab: 'ANASAYFA', label: 'ANASAYFA', Icon: LayoutGrid },
    { tab: 'EPG', label: 'EPG', Icon: CalendarDays },
    { tab: 'TV KANALI', label: 'TV KANALI', Icon: Play },
    { tab: 'DAHA FAZLA', label: 'DAHA FAZLA', Icon: MoreHorizontal },
  ];

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]} pointerEvents="box-none">
      <View style={styles.bar}>
        {items.map((item) => {
          const active = currentTab === item.tab;
          const color = active ? colors.blue : colors.white;
          return (
            <Pressable accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{selected:active}} key={item.tab} onPress={() => onTabChange(item.tab)} style={[styles.item, active && styles.itemActive]}>
              <item.Icon size={21} color={color} />
              <Text style={[styles.label, { color }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, bottom: 8, zIndex: 40 },
  bar: {
    height: 58,
    borderRadius: 999,
    backgroundColor: 'rgba(28,28,30,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
  },
  item: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 9, borderRadius: 999 },
  itemActive: { backgroundColor: '#373739' },
  label: { fontSize: 8, fontWeight: '800', marginTop: 3, letterSpacing: 1 },
});

