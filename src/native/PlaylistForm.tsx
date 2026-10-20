import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ArrowRightCircle, Check, ChevronDown, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { httpUrl, type PlaylistConfig } from "./iptv";
import { IconButton } from "../ui/Design";
import { colors as c } from "../theme";
export function PlaylistForm({
  visible,
  busy,
  error,
  onClose,
  onSave,
}: {
  visible: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (config: PlaylistConfig) => void;
}) {
  const insets = useSafeAreaInsets();
  const [type, setType] = useState<"m3u" | "xtream">("m3u");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [epgUrl, setEpgUrl] = useState("");
  const [advanced, setAdvanced] = useState(false);
  const [validation, setValidation] = useState("");
  function submit() {
    if (busy) return;
    try {
      const address = httpUrl(url);
      if (type === "xtream" && (!username.trim() || !password))
        throw new Error("Kullanıcı adı ve şifreyi girin.");
      setValidation("");
      onSave({
        id: `pl-${Date.now()}`,
        type,
        name: name.trim() || "Ana Oynatma Listesi",
        url: address.replace(/\/$/, ""),
        username: type === "xtream" ? username.trim() : undefined,
        password: type === "xtream" ? password : undefined,
        epgUrl: epgUrl.trim() ? httpUrl(epgUrl) : undefined,
      });
    } catch (e) {
      setValidation((e as Error).message);
    }
  }
  const input = (
    value: string,
    change: (v: string) => void,
    placeholder: string,
    secret = false,
  ) => (
    <TextInput
      editable={!busy}
      style={s.input}
      value={value}
      onChangeText={(v) => {
        change(v);
        setValidation("");
      }}
      placeholder={placeholder}
      placeholderTextColor={c.zinc500}
      autoCapitalize="none"
      autoCorrect={false}
      secureTextEntry={secret}
      keyboardType={placeholder.includes("URL") ? "url" : "default"}
    />
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Kapat"
        />
        <View
          style={[s.panel, { paddingBottom: Math.max(24, insets.bottom + 12) }]}
        >
          <View style={s.handle} />
          <View style={s.header}>
            <IconButton icon={X} label="Kapat" onPress={onClose} />
            <Text style={s.title}>
              {type === "xtream"
                ? "Xtream Codes Hesabı Ekle"
                : "Oynatma Listesi Ekle"}
            </Text>
            {busy ? (
              <ActivityIndicator style={{ width: 36 }} color={c.blue} />
            ) : (
              <IconButton
                icon={Check}
                blue
                label="Kaydet ve Onayla"
                onPress={submit}
              />
            )}
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 16, paddingTop: 16 }}
          >
            <Text style={s.description}>
              {type === "xtream"
                ? "Xtream Codes API sunucu bilgileri ile doğrudan bağlanın"
                : "M3U oynatma listesi bağlantınızı ekleyin"}
            </Text>
            {!!(validation || error) && (
              <Text style={s.error}>{validation || error}</Text>
            )}
            <View style={s.group}>
              {input(name, setName, "Ad (isteğe bağlı)")}
              <View style={s.separator} />
              {input(
                url,
                setUrl,
                type === "m3u"
                  ? "URL: https://sunucu/playlist.m3u"
                  : "Sunucu URL: http://domain.com:8080",
              )}
              {type === "xtream" && (
                <>
                  <View style={s.separator} />
                  {input(username, setUsername, "Kullanıcı Adı")}
                  <View style={s.separator} />
                  {input(password, setPassword, "Şifre", true)}
                </>
              )}
            </View>
            <Pressable
              onPress={() => setAdvanced((v) => !v)}
              style={s.switchRow}
            >
              <Text style={s.description}>EPG bağlantısı (isteğe bağlı)</Text>
              <ChevronDown size={16} color={c.zinc400} />
            </Pressable>
            {advanced && (
              <View style={s.group}>
                {input(epgUrl, setEpgUrl, "XMLTV URL")}
              </View>
            )}
            {busy && <Text style={s.description}>Liste alınıyor…</Text>}
            <View style={s.footer}>
              <Text style={[s.description, { flex: 1 }]}>
                {type === "m3u"
                  ? "Xtream Codes API oynatma listesi"
                  : "M3U linkiyle ekle"}
              </Text>
              <Pressable
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={
                  type === "m3u"
                    ? "Xtream Codes hesabına geç"
                    : "M3U bağlantısına geç"
                }
                onPress={() => {
                  setType(type === "m3u" ? "xtream" : "m3u");
                  setValidation("");
                  setUrl("");
                }}
              >
                <ArrowRightCircle size={29} color={c.blue} />
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000c",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingTop: 32,
  },
  panel: {
    width: "100%",
    maxWidth: 512,
    height: "94%",
    maxHeight: "94%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: "#1c1c1e",
    borderWidth: 1,
    borderColor: "#ffffff14",
    padding: 20,
  },
  handle: {
    width: 34,
    height: 4,
    backgroundColor: "#444448",
    borderRadius: 5,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  title: {
    color: c.white,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    flex: 1,
  },
  group: {
    backgroundColor: "#232326",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ffffff09",
    overflow: "hidden",
  },
  input: {
    color: c.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 52,
    fontSize: 16,
  },
  separator: { height: 1, backgroundColor: "#323236", marginHorizontal: 16 },
  description: { color: c.zinc400, fontSize: 15, lineHeight: 22 },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#ffffff0c",
    paddingTop: 16,
    marginTop: 10,
  },
  error: {
    color: c.red,
    backgroundColor: "#f8717116",
    padding: 12,
    borderRadius: 10,
    fontSize: 12,
  },
});
