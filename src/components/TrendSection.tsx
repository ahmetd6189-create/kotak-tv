import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "../ui/Native";
import { ChevronRight, LayoutGrid } from "lucide-react-native";
import { MediaItem } from "../types/iptv";
import { colors } from "../theme";

interface TrendSectionProps {
  title: string;
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onMore?: () => void;
}

export const TrendSection: React.FC<TrendSectionProps> = ({
  title,
  items,
  onItemClick,
  onMore,
}) => {
  const { width } = useWindowDimensions();
  const cardWidth = Math.min(230, Math.max(150, (width - 44) / 2));
  return (
    <View style={styles.wrap}>
      <Pressable onPress={onMore} disabled={!onMore} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{title}</Text>
          <ChevronRight size={16} color={colors.zinc400} />
        </View>
        <LayoutGrid size={16} color={colors.blue} />
      </Pressable>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {items.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onItemClick(item)}
            style={[styles.card, { width: cardWidth }]}
          >
            <View style={[styles.posterWrap, { height: cardWidth * 0.57 }]}>
              {item.posterUrl ? (
                <Image source={{ uri: item.posterUrl }} style={styles.poster} />
              ) : null}
              <Text style={styles.rank}>{item.rank}</Text>
            </View>
            <Text style={styles.name} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={styles.meta}>{item.genre}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingVertical: 10 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  title: { color: colors.white, fontWeight: "700", fontSize: 21 },
  list: { paddingHorizontal: 16, gap: 12 },
  card: { width: 172 },
  posterWrap: {
    height: 104,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  poster: { width: "100%", height: "100%" },
  rank: {
    position: "absolute",
    right: 6,
    bottom: -8,
    fontSize: 76,
    fontWeight: "900",
    color: "rgba(255,255,255,0.42)",
  },
  name: { color: colors.white, fontWeight: "500", fontSize: 14, marginTop: 5 },
  meta: { color: colors.zinc400, fontSize: 12, marginTop: 2 },
});

