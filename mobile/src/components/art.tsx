import Svg, { Circle, Ellipse, G, Path, Rect } from "react-native-svg";
import { Platform, View } from "react-native";
import { categoryColors, type Category, categories } from "../utils/kitchen";

export type IconName =
  | "search"
  | "more"
  | "home"
  | "pantry"
  | "bell"
  | "calendar"
  | "plus"
  | "camera"
  | "link"
  | "edit"
  | "book"
  | "list"
  | "account"
  | "back"
  | "check"
  | "close"
  | "sparkles"
  | "chevron"
  | "trash";
const iconPaths: Record<IconName, string> = {
  search: "M21 21l-5-5M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0",
  more: "M6 12a1 1 0 1 0-2 0 1 1 0 0 0 2 0M13 12a1 1 0 1 0-2 0 1 1 0 0 0 2 0M20 12a1 1 0 1 0-2 0 1 1 0 0 0 2 0",
  home: "M3 11l9-8 9 8M5 10v11h14V10M9 21v-7h6v7",
  pantry: "M4 3h16v18H4zM4 10h16M8 6v1M8 14v3",
  bell: "M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3M10 21h4M12 2v2",
  calendar:
    "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4M8 14h1M12 14h1M16 14h1M8 18h1M12 18h1",
  plus: "M12 5v14M5 12h14",
  camera: "M3 7h5l2-3h4l2 3h5v13H3zM16 13a4 4 0 1 0-8 0 4 4 0 0 0 8 0",
  link: "M10 13a5 5 0 0 0 7 .5l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7-.5l-3 3a5 5 0 0 0 7 7l2-2",
  edit: "M12 4H4v17h16v-8M10 14l1-4L19 2l3 3-8 8-4 1M16 5l3 3",
  book: "M12 6c-4-3-7-3-10-2v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-6-1-10 2v15",
  list: "M8 6h13M8 12h13M8 18h13M2 6h1M2 12h1M2 18h1",
  account: "M16 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0M4 21v-3a8 8 0 0 1 16 0v3",
  back: "M15.5 5l-7 7 7 7",
  check: "M5 12l4 4L19 6",
  close: "M6 6l12 12M18 6L6 18",
  sparkles: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3zM20 1v4M18 3h4",
  chevron: "M9 5l7 7-7 7",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
};
export function Icon({
  name,
  size = 23,
  color = "#324A3D",
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      {...(Platform.OS === "web"
        ? { "aria-hidden": true }
        : {
            accessible: false,
            accessibilityElementsHidden: true,
            importantForAccessibility: "no-hide-descendants" as const,
          })}
      width={size}
      height={size}
      viewBox="-1 -1 26 26"
      style={{ flexShrink: 0 }}
    >
      <Path
        d={iconPaths[name]}
        stroke={color}
        strokeWidth={1.65}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
export function TomatoMark({ size = 34 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 60 60">
      <Path
        fill="#D78470"
        d="M30 18C4 5-3 47 22 54c6 2 10 2 16 0 25-7 18-49-8-36Z"
      />
      <Path fill="#60794B" d="m30 23-13-7 11 1 1-13 5 13 13-2-12 8-1-7Z" />
      <Path
        d="M16 28c-5 6-4 13-1 17"
        fill="none"
        stroke="#F5D2B8"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}
export const segmentPaths = [
  "M75 47C17 57 3 114 21 151c7 15 22 29 42 35l18-73Z",
  "M84 43c28-18 64-11 88-4l-12 165c-28 4-63-1-88-15l17-76Z",
  "M181 39c29-9 58-6 80 5l18 141c-28 14-61 20-109 20Z",
  "M270 48c54 5 84 61 66 105-9 21-24 32-47 34Z",
];
export const segmentColors = ["#B8D3DD", "#D9B95E", "#D89583", "#B6C998"];
export function TomatoSegments() {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 354 222">
      <Path
        d="m176 38-31-22 28 7 4-21 10 22 29-10-26 25-8-10Z"
        fill="#718658"
      />
      {segmentPaths.map((d, i) => (
        <Path key={d} d={d} fill={segmentColors[i]} />
      ))}
      <Path
        d="M43 95c-8 17-10 27-5 42M109 68c-9 32-14 73-12 95M206 65c-8 31-9 70-7 106M302 86c14 21 17 42 6 61"
        fill="none"
        stroke="#FAF7EB"
        strokeOpacity=".3"
        strokeWidth="2"
      />
    </Svg>
  );
}
export function FarmArt() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: "65%",
        opacity: 0.34,
      }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 400 480"
        preserveAspectRatio="xMidYMax slice"
      >
        <Path d="M0 350Q100 270 240 348T430 330V480H0Z" fill="#E4E7CF" />
        <Path d="M0 416Q165 300 410 402V480H0Z" fill="#D4DABD" />
        <G fill="#BFCBAA">
          <Path d="M36 395C32 284 21 249 24 193c40 43 42 82 12 202Z" />
          <Path d="M33 359C-8 335-18 300-9 266c33 12 43 45 42 93M38 333c2-50 19-72 51-77 4 40-15 65-51 77" />
          <Path d="M330 420c-26-36-45-87-34-118 43 17 52 61 34 118M332 418c-1-49 17-82 51-92 12 36-9 72-51 92" />
        </G>
        <G fill="none" stroke="#AEBF99" strokeWidth="2">
          <Path d="M10 480q166-111 373-49M65 480q124-70 305-37M146 480q100-33 210-20" />
          <Path d="M324 414q5-73 21-151" />
        </G>
        <G fill="#CAD3B4">
          <Ellipse
            cx="345"
            cy="264"
            rx="13"
            ry="29"
            transform="rotate(25 345 264)"
          />
          <Ellipse
            cx="328"
            cy="281"
            rx="11"
            ry="24"
            transform="rotate(-35 328 281)"
          />
          <Ellipse
            cx="351"
            cy="305"
            rx="12"
            ry="25"
            transform="rotate(42 351 305)"
          />
        </G>
      </Svg>
    </View>
  );
}
const foodPaths: Record<Category, string> = {
  Dairy: "M40 10h30v18l17 17v91H23V45l17-17ZM49 42h18v27H49Z",
  Frozen:
    "M30 60 55 139 82 60ZM27 59c-18-10-9-31 6-32-2-29 42-29 43 0 18 0 24 24 8 32Z",
  Produce:
    "M55 44C5 8-13 93 27 126c18 14 34 11 48-2 39-33 27-109-20-80ZM55 40C52 8 77 5 94 9 91 31 71 37 55 40Z",
  "Meat & fish": "M21 59C45 19 89 29 100 74 83 107 45 111 22 86L2 110V36Z",
  "Bread & grains":
    "M14 124V54C-1 35 16 10 37 19 52 1 76 9 80 24 104 18 119 44 98 59v65Z",
  Cupboard: "M28 10h54v16H28ZM21 32h69v102H21Z",
  Other: "M10 47h95L91 131H24ZM30 47C30 4 82 4 82 47Z",
};
export function FoodShape({
  category,
  width = 128,
  height = 156,
}: {
  category: Category;
  width?: number;
  height?: number;
}) {
  return (
    <Svg width={width} height={height} viewBox="0 0 112 145">
      <Path
        d={foodPaths[category]}
        fill={categoryColors[categories.indexOf(category)]}
        fillRule="evenodd"
      />
      {category === "Frozen" && (
        <Path
          d="m36 72 34 24M42 94l20 13M70 71 45 34"
          stroke="#B59169"
          strokeWidth="2"
          fill="none"
        />
      )}
      {category === "Dairy" && (
        <Path
          d="M27 87h56M32 47v24M30 119h49"
          stroke="#EFF5F0"
          strokeWidth="2"
        />
      )}
      {category === "Cupboard" && (
        <Rect x="29" y="56" width="53" height="47" rx="12" fill="#EFEAD8" />
      )}
      {category === "Meat & fish" && (
        <Circle cx="79" cy="62" r="3" fill="#FAF7EB" />
      )}
      {category === "Bread & grains" && (
        <Path
          d="m35 46-6 22m29-24-6 22m29-21-6 22"
          stroke="#B5A06A"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </Svg>
  );
}
