import React, { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from "../ui/Native";
import { ChevronRight, Glasses, ChevronsUpDown } from "lucide-react-native";
import { CategoryItem } from "../types/iptv";
import { colors } from "../theme";

interface CategoriesListProps {
  categories: CategoryItem[];
  onSelectCategory: (category: CategoryItem) => void;
  totalCategoriesCount?: number;
  onEdit?: () => void;
  onSeeAll?:()=>void;
}

export const CategoriesList: React.FC<CategoriesListProps> = ({
  categories,
  onSelectCategory,
  totalCategoriesCount,
  onEdit,
  onSeeAll,
}) => {
  const { width } = useWindowDimensions();
  const columnWidth = Math.max(230, Math.min(width, 672) - 54);
  const [sortOption, setSortOption] = useState<
    "Varsayılan" | "Ada Göre" | "Sayıya Göre"
  >("Varsayılan");
  const sorted = [...categories].sort((a, b) => {
    if (sortOption === "Sayıya Göre") return b.channelCount - a.channelCount;
    if (sortOption === "Ada Göre") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Tüm kategorileri göster" onPress={onSeeAll} style={styles.headerLeft}>
          <Text style={styles.title}>Kategoriler</Text>
          <Text style={styles.count}>
            {totalCategoriesCount ?? categories.length}
          </Text>
          <ChevronRight size={16} color={colors.zinc500} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Ana ekran kategorilerini seç" onPress={onEdit} style={{padding:8}}><Glasses size={22} color={colors.blue} /></Pressable>
      </View>
      <Pressable
        onPress={() =>
          setSortOption(
            sortOption === "Varsayılan"
              ? "Sayıya Göre"
              : sortOption === "Sayıya Göre"
                ? "Ada Göre"
                : "Varsayılan",
          )
        }
        style={styles.sort}
      >
        <Text style={styles.sortText}>{sortOption}</Text>
        <ChevronsUpDown size={14} color={colors.blue} />
      </Pressable>
      <FlatList horizontal showsHorizontalScrollIndicator={false}
        data={Array.from({length:Math.ceil(sorted.length/6)},(_,i)=>sorted.slice(i*6,i*6+6))}
        keyExtractor={(_,index)=>String(index)} initialNumToRender={2} maxToRenderPerBatch={2} windowSize={3}
        getItemLayout={(_,index)=>({length:columnWidth+12,offset:(columnWidth+12)*index,index})}
        renderItem={({item})=><View style={{width:columnWidth,marginRight:12}}>
            {item.map((category) => (
        <Pressable
          key={category.id}
          onPress={() => onSelectCategory(category)}
          style={styles.row}
        >
          <View style={styles.left}>
            <Text style={styles.name}>{category.name}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{category.badge || "CANLI"}</Text>
            </View>
          </View>
          <Text style={styles.num}>{category.channelCount}</Text>
        </Pressable>
            ))}
        </View>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { color: colors.white, fontWeight: "800", fontSize: 21 },
  count: { color: colors.zinc500, fontWeight: "800" },
  sort: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  sortText: { color: colors.blue, fontWeight: "700", fontSize: 15 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.16)",
  },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  name: { color: colors.white, fontSize: 15, fontWeight: "500" },
  badge: {
    backgroundColor: "#2c2c2e",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: colors.zinc300, fontSize: 9, fontWeight: "800" },
  num: { color: colors.blue, fontWeight: "800", fontSize: 21 },
});
