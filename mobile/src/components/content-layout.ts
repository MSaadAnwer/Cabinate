import { StyleSheet, useWindowDimensions } from "react-native";
import { colors } from "./tokens";

export function useContentLayout() {
  const { width, fontScale } = useWindowDimensions();
  return {
    gutter: width < 360 ? 16 : 24,
    fontScale,
    singleColumn: fontScale >= 1.4,
    showRecipeArt: fontScale < 1.4,
    recipeArtWidth: width < 360 ? 56 : 80,
    recipeArtHeight: width < 360 ? 76 : 104,
  };
}

// Loaded cards and their placeholders share geometry to avoid a layout jump.
export const collectionLayout = StyleSheet.create({
  pantryAll: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    minHeight: 49,
    backgroundColor: colors.selected,
    borderRadius: 12,
  },
  pantryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 16,
  },
  pantryTile: {
    width: "47%",
    alignItems: "center",
    paddingVertical: 12,
    gap: 4,
  },
  recipeCard: { padding: 14 },
});
