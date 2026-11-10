import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Svg, { Circle, Path } from "react-native-svg";
import { TomatoMark } from "./art";

const FIRST_LAUNCH_KEY = "cabinate:welcome-seen:v1";
const GREEN = "#173E2D";

function Produce({ kind }: { kind: "tomato" | "citrus" | "leaf" }) {
  if (kind === "tomato") return <TomatoMark size={66} />;
  return (
    <Svg width={66} height={66} viewBox="0 0 66 66">
      {kind === "leaf" ? <>
        <Path d="M12 52C2 26 27 9 55 10c4 26-13 51-43 42Z" fill="#B6CF85" />
        <Path d="m12 54 31-31M26 40l-2-13M36 31l12 1" fill="none" stroke="#63894D" strokeWidth={2} strokeLinecap="round" />
      </> : <>
        <Circle cx={33} cy={33} r={29} fill="#E9B75D" />
        <Circle cx={33} cy={33} r={23} fill="#F6D992" />
        <Path d="M33 12v42M12 33h42M18 18l30 30M18 48l30-30" stroke="#FFF1CF" strokeWidth={3} />
        <Circle cx={33} cy={33} r={4} fill="#FFF1CF" />
      </>}
    </Svg>
  );
}

const pieces = [
  { kind: "leaf", x: -106, y: -112, angle: "-28deg" },
  { kind: "citrus", x: 105, y: -86, angle: "20deg" },
  { kind: "tomato", x: -119, y: 82, angle: "-16deg" },
  { kind: "leaf", x: 110, y: 110, angle: "104deg" },
] as const;

/** One welcome per installation; later cold launches use only the brand fade. */
export function LaunchExperience({ ready, children }: { ready: boolean; children: ReactNode }) {
  const [mode, setMode] = useState<"welcome" | "quick" | null>(null);
  const [reduced, setReduced] = useState(true);
  const [introDone, setIntroDone] = useState(false);
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;
  const logo = useRef(new Animated.Value(0)).current;
  const caption = useRef(new Animated.Value(0)).current;
  const sprouts = useRef(pieces.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    let active = true;
    void Promise.all([
      AsyncStorage.getItem(FIRST_LAUNCH_KEY).catch(() => "seen"),
      AccessibilityInfo.isReduceMotionEnabled().catch(() => true),
    ]).then(([seen, reduceMotion]) => {
      if (!active) return;
      setReduced(reduceMotion);
      setMode(seen ? "quick" : "welcome");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mode) return;
    if (mode === "quick" || reduced) {
      logo.setValue(1);
      caption.setValue(1);
      setIntroDone(true);
      return;
    }
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.spring(logo, { toValue: 1, damping: 11, stiffness: 150, mass: 0.8, useNativeDriver: true }),
        Animated.stagger(110, sprouts.map((value) => Animated.spring(value, {
          toValue: 1, damping: 9, stiffness: 125, mass: 0.7, useNativeDriver: true,
        }))),
        Animated.sequence([
          Animated.delay(450),
          Animated.timing(caption, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]),
      ]),
      Animated.delay(800),
    ]);
    animation.start(({ finished }) => { if (finished) setIntroDone(true); });
    return () => animation.stop();
  }, [mode, reduced, logo, caption, sprouts]);

  useEffect(() => {
    if (!introDone || !ready || !mode) return;
    const animation = Animated.timing(opacity, {
      toValue: 0, duration: reduced ? 150 : 500, easing: Easing.inOut(Easing.quad), useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (!finished) return;
      setVisible(false);
      if (mode === "welcome") void AsyncStorage.setItem(FIRST_LAUNCH_KEY, "seen").catch(() => {});
    });
    return () => animation.stop();
  }, [introDone, ready, mode, reduced, opacity]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} accessibilityElementsHidden={visible} importantForAccessibility={visible ? "no-hide-descendants" : "auto"}>
        {children}
      </View>
      {visible && <Animated.View
        onLayout={() => { void SplashScreen.hideAsync().catch(() => {}); }}
        accessibilityLabel="Welcome to Cabinate"
        accessibilityRole="image"
        style={[styles.cover, { opacity }]}
      >
        <StatusBar style="light" />
        {mode === "welcome" && !reduced && <View pointerEvents="none" style={styles.garden}>
          <View style={[styles.ring, { width: 290, height: 290, borderRadius: 145 }]} />
          <View style={[styles.ring, { width: 370, height: 370, borderRadius: 185 }]} />
          {pieces.map((piece, i) => <Animated.View key={i} style={{
            position: "absolute", left: "50%", top: "50%", marginLeft: -33, marginTop: -33,
            opacity: sprouts[i],
            transform: [
              { translateX: sprouts[i].interpolate({ inputRange: [0, 1], outputRange: [piece.x * 0.2, piece.x] }) },
              { translateY: sprouts[i].interpolate({ inputRange: [0, 1], outputRange: [piece.y * 0.2 + 45, piece.y] }) },
              { scale: sprouts[i] },
              { rotate: piece.angle },
            ],
          }}><Produce kind={piece.kind} /></Animated.View>)}
        </View>}
        <Animated.View style={[styles.brand, { transform: [{ scale: mode === "welcome" && !reduced ? logo.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1] }) : 1 }] }]}>
          <TomatoMark size={74} />
          <Text style={styles.wordmark}>Cabinate</Text>
        </Animated.View>
        {mode === "welcome" && <Animated.View style={[styles.caption, {
          opacity: caption, transform: [{ translateY: caption.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        }]}>
          <Text style={styles.eyebrow}>A FRESH START</Text>
          <Text style={styles.tagline}>Good things grow here.</Text>
        </Animated.View>}
      </Animated.View>}
    </View>
  );
}

const styles = StyleSheet.create({
  cover: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, zIndex: 1000, backgroundColor: GREEN, alignItems: "center", justifyContent: "center" },
  brand: { alignItems: "center", gap: 8 },
  wordmark: { fontFamily: "Georgia", fontSize: 43, letterSpacing: -1.5, color: "#FAF7EB" },
  garden: { position: "absolute", width: "100%", maxWidth: 430, height: 390, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", borderWidth: 1, borderColor: "#FAF7EB12" },
  caption: { position: "absolute", top: "50%", marginTop: 220, alignItems: "center", gap: 10 },
  eyebrow: { fontSize: 10, fontWeight: "600", letterSpacing: 3.5, color: "#B6CF85" },
  tagline: { fontFamily: "Georgia", fontSize: 21, color: "#FAF7EB" },
});
