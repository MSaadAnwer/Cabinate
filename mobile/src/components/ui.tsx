import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Animated,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ScrollViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "expo-router/react-navigation";
import { Icon, TomatoMark, type IconName } from "./art";
import { colors, motion, radius, spacing } from "./tokens";
import { Touch, selectionFeedback, useFeedback } from "./feedback";
export { colors, Touch };

export const s = StyleSheet.create({
  title: {
    fontFamily: "Georgia",
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -1,
    lineHeight: 41,
  },
  heading: { fontFamily: "Georgia", fontSize: 23, color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: colors.green,
    textTransform: "uppercase",
  },
  card: {
    padding: 20,
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.card,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: radius.field,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
  },
});

export function Page({
  children,
  bottom = 100,
  contentContainerStyle,
  ...props
}: ScrollViewProps & { children: ReactNode; bottom?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentInsetAdjustmentBehavior="automatic"
      {...props}
      contentContainerStyle={[
        {
          padding: spacing.xl,
          paddingBottom: bottom + insets.bottom,
          gap: 20,
          flexGrow: 1,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

export function FormPage({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={headerHeight}
    >
      <Page bottom={footer ? 24 : 40}>{children}</Page>
      {footer && (
        <View
          style={{
            paddingHorizontal: spacing.xl,
            paddingTop: spacing.md,
            paddingBottom: Math.max(insets.bottom, spacing.md),
            gap: spacing.sm,
            borderTopWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.cream,
          }}
        >
          {footer}
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

export function Button({
  title,
  onPress,
  secondary,
  destructive,
  disabled,
  pending,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  pending?: boolean;
  icon?: IconName;
}) {
  const foreground = secondary ? colors.ink : colors.cream;
  return (
    <Touch
      accessibilityState={{ busy: !!pending }}
      disabled={disabled || pending}
      onPress={onPress}
      style={{
        minHeight: 52,
        padding: 14,
        borderRadius: radius.button,
        backgroundColor: destructive
          ? colors.red
          : secondary
            ? colors.selected
            : colors.ink,
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <View style={{ width: 23, alignItems: "center", flexShrink: 0 }}>
        {pending ? (
          <ActivityIndicator color={foreground} />
        ) : (
          icon && <Icon name={icon} color={foreground} />
        )}
      </View>
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: foreground,
          flexShrink: 1,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
      <View style={{ width: 23, flexShrink: 0 }} />
    </Touch>
  );
}

export function IconButton({
  name,
  label,
  onPress,
  disabled,
  destructive,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Touch
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        flexShrink: 0,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Icon name={name} color={destructive ? colors.red : colors.ink} />
    </Touch>
  );
}

export function Field({
  label,
  error,
  inputRef,
  onNext,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  inputRef?: Ref<TextInput>;
  onNext?: () => void;
}) {
  const accessory = useId();
  return (
    <View style={{ gap: 7 }}>
      <Text style={[s.muted, { color: colors.ink, fontWeight: "600" }]}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error}
        aria-invalid={!!error}
        placeholderTextColor={colors.muted}
        {...props}
        ref={inputRef}
        inputAccessoryViewID={Platform.OS === "ios" ? accessory : undefined}
        style={[
          s.input,
          props.multiline && { minHeight: 120, textAlignVertical: "top" },
          error ? { borderColor: colors.red, borderWidth: 2 } : undefined,
          props.style,
        ]}
      />
      {!!error && <ErrorText message={error} />}
      {Platform.OS === "ios" && (
        <InputAccessoryView nativeID={accessory} backgroundColor={colors.cream}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              borderTopWidth: 1,
              borderColor: colors.line,
              paddingHorizontal: 16,
            }}
          >
            <Touch
              accessibilityLabel={`${onNext ? "Next field after" : "Done editing"} ${label}`}
              onPress={onNext || Keyboard.dismiss}
              style={{
                minHeight: 44,
                paddingHorizontal: 16,
                justifyContent: "center",
              }}
            >
              <Text style={[s.body, { fontWeight: "600" }]}>
                {onNext ? "Next" : "Done"}
              </Text>
            </Touch>
          </View>
        </InputAccessoryView>
      )}
    </View>
  );
}

export function SearchField({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}) {
  const input = useRef<TextInput>(null);
  return (
    <View style={{ gap: 7 }}>
      <Text style={[s.muted, { fontWeight: "600", color: colors.ink }]}>
        {label}
      </Text>
      <View style={[s.input, s.row, { paddingVertical: 0, paddingRight: 2 }]}>
        <Icon name="search" size={20} color={colors.muted} />
        <TextInput
          ref={input}
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          style={{
            flex: 1,
            minHeight: 50,
            color: colors.ink,
            fontSize: 16,
            paddingVertical: 10,
          }}
        />
        {!!value && (
          <IconButton
            name="close"
            label={`Clear ${label.toLowerCase()}`}
            onPress={() => {
              onChangeText("");
              input.current?.focus();
            }}
          />
        )}
      </View>
    </View>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ paddingVertical: 36, alignItems: "center", gap: 14 }}>
      <TomatoMark size={45} />
      <Text style={[s.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[s.muted, { textAlign: "center", maxWidth: 270 }]}>
        {text}
      </Text>
    </View>
  );
}

export function CheckRow({
  checked,
  title,
  detail,
  onPress,
  disabled,
}: {
  checked: boolean;
  title: string;
  detail?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { reduceMotion } = useFeedback();
  const progress = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: checked ? 1 : 0,
      duration: reduceMotion ? 0 : motion.check,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [checked, reduceMotion, progress]);
  return (
    <Touch
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={title}
      accessibilityHint={detail}
      disabled={disabled}
      onPress={() => {
        onPress();
        selectionFeedback();
      }}
      style={[
        s.row,
        {
          minHeight: 54,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderColor: colors.line,
        },
      ]}
    >
      <View
        style={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.green,
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: colors.green,
              opacity: progress,
              justifyContent: "center",
              alignItems: "center",
              transform: [
                {
                  scale: reduceMotion
                    ? 1
                    : progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.85, 1],
                      }),
                },
              ],
            },
          ]}
        >
          <Icon name="check" size={18} color={colors.cream} />
        </Animated.View>
      </View>
      <View style={{ flex: 1 }}>
        <Animated.Text
          style={[
            s.body,
            {
              color: checked ? colors.muted : colors.ink,
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.96],
              }),
              textDecorationLine: checked ? "line-through" : "none",
            },
          ]}
        >
          {title}
        </Animated.Text>
        {detail && <Text style={s.muted}>{detail}</Text>}
      </View>
    </Touch>
  );
}

export function ErrorText({ message }: { message: string }) {
  return message ? (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      selectable
      style={[s.body, { color: colors.red }]}
    >
      {message}
    </Text>
  ) : null;
}

export function LoadingRows({
  label = "Loading your kitchen",
}: {
  label?: string;
}) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 180);
    return () => clearTimeout(timer);
  }, []);
  return (
    <View
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      style={{ gap: 16, minHeight: 240, opacity: show ? 1 : 0 }}
    >
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          style={[s.card, s.row]}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: colors.selected,
            }}
          />
          <View style={{ flex: 1, gap: 12 }}>
            <View
              style={{
                height: 16,
                width: "75%",
                borderRadius: 8,
                backgroundColor: colors.selected,
              }}
            />
            <View
              style={{
                height: 12,
                width: "45%",
                borderRadius: 6,
                backgroundColor: colors.selected,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function DataNotice({
  loading,
  loaded,
  error,
  onRetry,
  subject = "your kitchen",
}: {
  loading: boolean;
  loaded: boolean;
  error: string;
  onRetry: () => void;
  subject?: string;
}) {
  if (loading && !loaded) return <LoadingRows label={`Loading ${subject}`} />;
  if (!error) return null;
  return (
    <View
      style={[s.card, { backgroundColor: "#F5EBE5", borderColor: "#E6CEC3" }]}
    >
      <Text style={[s.body, { fontWeight: "600" }]}>
        {loaded ? `Couldn’t refresh ${subject}` : `Couldn’t load ${subject}`}
      </Text>
      <Text style={s.muted}>
        {loaded
          ? "Your saved view is still here. Check your connection and try again."
          : "Check your connection and try again."}
      </Text>
      <Button title="Try again" secondary pending={loading} onPress={onRetry} />
    </View>
  );
}

export function reportError(error: unknown) {
  Alert.alert(
    "Could not save",
    (error as Error).message || "Please try again.",
  );
}

export function focusControl(control: View | null) {
  if (!control) return;
  if (Platform.OS === "web") control.focus();
  else AccessibilityInfo.sendAccessibilityEvent(control, "focus");
}

/** A modal surface traps focus and consumes outside taps on every platform. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
  onDismiss,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const heading = useRef<View>(null);
  const { reduceMotion } = useFeedback();
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? "none" : "fade"}
      onRequestClose={onClose}
      onDismiss={onDismiss}
      onShow={() => {
        Keyboard.dismiss();
        focusControl(heading.current);
      }}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#20352944",
        }}
        onAccessibilityEscape={onClose}
      >
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          aria-modal
          role="dialog"
          accessibilityLabel={title}
          style={{
            backgroundColor: colors.cream,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: Math.max(insets.bottom, 24),
            maxHeight: "85%",
            gap: 16,
          }}
        >
          <View style={s.row}>
            <View
              ref={heading}
              tabIndex={-1}
              accessible
              accessibilityRole="header"
              accessibilityLabel={title}
              style={{ flex: 1 }}
            >
              <Text style={s.heading}>{title}</Text>
            </View>
            <IconButton
              name="close"
              label={`Close ${title.toLowerCase()}`}
              onPress={onClose}
            />
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 12 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function FloatingAdd({
  actions,
}: {
  actions: { title: string; icon: IconName; onPress: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState({ left: 24, top: 100 });
  const trigger = useRef<View>(null);
  const first = useRef<View>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const { reduceMotion } = useFeedback();
  const action = useRef<(() => void) | null>(null);
  const openRef = useRef(false);
  const wasVisible = useRef(false);
  useEffect(() => {
    progress.stopAnimation();
    const animation = Animated.timing(progress, {
      toValue: open ? 1 : 0,
      duration: reduceMotion ? 0 : motion.menu,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start(({ finished }) => {
      if (finished && !open) setVisible(false);
    });
    return () => animation.stop();
  }, [open, reduceMotion, progress]);
  const completeDismiss = () => {
    const next = action.current;
    action.current = null;
    if (next) next();
    else focusControl(trigger.current);
  };
  // RN web/Android don't consistently call Modal.onDismiss.
  useEffect(() => {
    if (!visible && wasVisible.current && Platform.OS !== "ios")
      completeDismiss();
    wasVisible.current = visible;
  }, [visible]);
  const close = () => {
    openRef.current = false;
    setOpen(false);
  };
  const show = () => {
    Keyboard.dismiss();
    trigger.current?.measureInWindow((x, y) => {
      setAnchor({ left: x, top: y });
      openRef.current = true;
      setVisible(true);
      setOpen(true);
    });
  };
  return (
    <>
      <View
        pointerEvents="box-none"
        style={{ position: "absolute", bottom: 18, left: 24 }}
      >
        <Touch
          ref={trigger}
          accessibilityLabel="Open add menu"
          accessibilityState={{ expanded: open }}
          onPress={show}
          style={{
            width: 58,
            height: 58,
            borderRadius: 29,
            backgroundColor: colors.ink,
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px #324A3D22",
          }}
        >
          <Icon name="plus" color={colors.cream} size={28} />
        </Touch>
      </View>
      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={close}
        onDismiss={Platform.OS === "ios" ? completeDismiss : undefined}
        onShow={() => focusControl(first.current)}
      >
        <View style={{ flex: 1 }} onAccessibilityEscape={close}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "#20352933", opacity: progress },
            ]}
          >
            <Pressable
              accessible={false}
              importantForAccessibility="no"
              style={StyleSheet.absoluteFill}
              onPress={close}
            />
          </Animated.View>
          <View
            accessibilityViewIsModal
            aria-modal
            role="dialog"
            accessibilityLabel="Add menu"
            style={{
              position: "absolute",
              left: anchor.left,
              right: 24,
              top: 0,
              height: anchor.top + 58,
              justifyContent: "flex-end",
              gap: 12,
            }}
            pointerEvents="box-none"
          >
            <Animated.View
              pointerEvents={open ? "auto" : "none"}
              style={{
                opacity: progress,
                maxHeight: "75%",
                transform: [
                  {
                    translateY: reduceMotion
                      ? 0
                      : progress.interpolate({
                          inputRange: [0, 1],
                          outputRange: [12, 0],
                        }),
                  },
                ],
              }}
            >
              <ScrollView contentContainerStyle={{ gap: 10 }}>
                {actions.map((item, index) => (
                  <Touch
                    ref={index === 0 ? first : undefined}
                    key={item.title}
                    accessibilityLabel={item.title}
                    onPress={() => {
                      if (!openRef.current) return;
                      action.current = item.onPress;
                      close();
                      // Navigation waits only for native dismissal, not the decorative fade.
                      progress.stopAnimation();
                      progress.setValue(0);
                      setVisible(false);
                    }}
                    style={[
                      s.row,
                      {
                        alignSelf: "flex-start",
                        backgroundColor: colors.white,
                        borderRadius: 24,
                        padding: 14,
                        minHeight: 52,
                        boxShadow: "0 3px 16px #324A3D16",
                      },
                    ]}
                  >
                    <Icon name={item.icon} />
                    <Text style={[s.body, { flexShrink: 1 }]}>
                      {item.title}
                    </Text>
                  </Touch>
                ))}
              </ScrollView>
            </Animated.View>
            <Touch
              accessibilityLabel="Close add menu"
              accessibilityState={{ expanded: true }}
              onPress={close}
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: colors.ink,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Animated.View
                style={{
                  transform: [
                    {
                      rotate: reduceMotion
                        ? "45deg"
                        : progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ["0deg", "45deg"],
                          }),
                    },
                  ],
                }}
              >
                <Icon name="plus" color={colors.cream} size={28} />
              </Animated.View>
            </Touch>
          </View>
        </View>
      </Modal>
    </>
  );
}
