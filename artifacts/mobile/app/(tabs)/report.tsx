import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { CATEGORY_LABELS, ReportCategory } from "@/lib/riskScore";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ReportCategory[];

export default function ReportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addReport } = useApp();
  const params = useLocalSearchParams<{ inputUrl?: string }>();

  const [inputUrl, setInputUrl] = useState(params.inputUrl ?? "");
  const [category, setCategory] = useState<ReportCategory>("ai_slop");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  async function handleSubmit() {
    const trimmed = inputUrl.trim();
    if (!trimmed) { setError("Enter a URL or domain."); return; }
    setError("");
    setIsSubmitting(true);
    const result = await addReport({ inputUrl: trimmed, category, note: note.trim() || undefined });
    setIsSubmitting(false);
    if (!result.success) { setError(result.error ?? "Could not submit."); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSuccess(true);
    setInputUrl("");
    setNote("");
    setCategory("ai_slop");
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 12, paddingBottom: bottomPad + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.pageTitle, { color: colors.foreground }]}>Report Domain</Text>

        {success && (
          <View style={[styles.successRow, { backgroundColor: colors.clean + "20" }]}>
            <Feather name="check-circle" size={14} color={colors.clean} />
            <Text style={[styles.successText, { color: colors.clean }]}>
              Report submitted. Thank you for contributing.
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>URL or domain</Text>
          <View style={[styles.inputBox, { backgroundColor: colors.card, borderColor: error && !inputUrl.trim() ? colors.blockStrict : colors.border }]}>
            <Feather name="globe" size={14} color={colors.mutedForeground} />
            <TextInput
              style={[styles.textInput, { color: colors.foreground }]}
              placeholder="https://example.com"
              placeholderTextColor={colors.mutedForeground}
              value={inputUrl}
              onChangeText={(t) => { setInputUrl(t); setError(""); setSuccess(false); }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={300}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Category</Text>
          <View style={[styles.catGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {CATEGORIES.map((cat, i) => (
              <React.Fragment key={cat}>
                <Pressable
                  style={({ pressed }) => [styles.catRow, { opacity: pressed ? 0.7 : 1 }]}
                  onPress={() => { setCategory(cat); Haptics.selectionAsync(); }}
                >
                  <View style={[styles.catRadio, { borderColor: category === cat ? colors.primary : colors.border }]}>
                    {category === cat && <View style={[styles.catRadioDot, { backgroundColor: colors.primary }]} />}
                  </View>
                  <Text style={[styles.catLabel, { color: colors.foreground }]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </Pressable>
                {i < CATEGORIES.length - 1 && <View style={[styles.sep, { backgroundColor: colors.border }]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
          <View style={[styles.inputBox, styles.textareaBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TextInput
              style={[styles.textInput, styles.textarea, { color: colors.foreground }]}
              placeholder="What made this site suspicious?"
              placeholderTextColor={colors.mutedForeground}
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />
          </View>
        </View>

        {!!error && (
          <View style={[styles.errorRow, { backgroundColor: colors.blockStrict + "18" }]}>
            <Feather name="alert-circle" size={13} color={colors.blockStrict} />
            <Text style={[styles.errorText, { color: colors.blockStrict }]}>{error}</Text>
          </View>
        )}

        <View style={[styles.disclaimerBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="info" size={12} color={colors.mutedForeground} />
          <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
            Reports are community signals, not confirmed accusations. We use "AI-like" and "community-reported" — not "confirmed AI." Limits: 3 reports per domain/day, 25 total/day.
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            { backgroundColor: colors.primary, opacity: pressed || isSubmitting ? 0.75 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  pageTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  successRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 14 },
  successText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  section: { gap: 7 },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginLeft: 2 },
  inputBox: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, gap: 10 },
  textareaBox: { alignItems: "flex-start", paddingVertical: 12 },
  textInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", height: 48 },
  textarea: { height: 90 },
  catGroup: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  catRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 14 },
  catRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  catRadioDot: { width: 9, height: 9, borderRadius: 5 },
  catLabel: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  sep: { height: 1, marginLeft: 50 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  errorText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  disclaimerBox: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  disclaimerText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  submitBtn: { borderRadius: 14, paddingVertical: 17, alignItems: "center" },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
});
