import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// ─── 타입 ───────────────────────────────────────────────────────────────────

type Drug = "wegovy" | "mounjaro" | "saxenda" | "unknown" | "other";
type Sex = "female" | "male";
type GoalChip = 30 | 90 | 180 | 365 | "custom";

interface Medication {
  id: number;
  name: string;
  freq: "daily" | "weekly";
  count: string;
  time: string;
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const DRUG_OPTIONS: Array<{ value: Drug; label: string }> = [
  { value: "wegovy",   label: "위고비 (세마글루타이드)" },
  { value: "mounjaro", label: "마운자로 (티르제파타이드)" },
  { value: "saxenda",  label: "삭센다 (리라글루타이드)" },
  { value: "unknown",  label: "잘 모르겠어요" },
  { value: "other",    label: "기타" },
];

const GOAL_CHIPS: Array<{ value: GoalChip; label: string }> = [
  { value: 30,       label: "1개월" },
  { value: 90,       label: "3개월" },
  { value: 180,      label: "6개월" },
  { value: 365,      label: "1년" },
  { value: "custom", label: "직접입력" },
];

// ─── 계산 ────────────────────────────────────────────────────────────────────

function calcBMR(sex: Sex, kg: number, cm: number, age: number): number {
  return sex === "male"
    ? 10 * kg + 6.25 * cm - 5 * age + 5
    : 10 * kg + 6.25 * cm - 5 * age - 161;
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

let medIdCounter = 1;

export default function Glp1SetupScreen() {
  const router = useRouter();

  // 전역 step (1~3)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Step 1 ──
  const [subStep, setSubStep] = useState<"1a" | "1b" | "1c" | "1d">("1a");
  const [takingGlp1, setTakingGlp1] = useState<boolean | null>(null);
  const [drug, setDrug] = useState<Drug | null>(null);
  const [glpStartDate, setGlpStartDate] = useState("");
  const [hasMeds, setHasMeds] = useState<boolean | null>(null);
  const [medications, setMedications] = useState<Medication[]>([
    { id: medIdCounter++, name: "", freq: "daily", count: "", time: "" },
  ]);

  // ── Step 2 ──
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [ageVal, setAgeVal] = useState("");
  const [sex, setSex] = useState<Sex | null>(null);
  const [muscleMass, setMuscleMass] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  // ── Step 3 ──
  const [goalWeight, setGoalWeight] = useState("");
  const [goalChip, setGoalChip] = useState<GoalChip | null>(null);
  const [customDays, setCustomDays] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ─── 헬퍼 ──────────────────────────────────────────────────────────────────

  function getDays(): number {
    if (goalChip === "custom") return Number(customDays) || 0;
    return goalChip ?? 0;
  }

  function getResults() {
    const kg = Number(weightKg);
    const cm = Number(heightCm);
    const age = Number(ageVal);
    const gKg = Number(goalWeight);
    const days = getDays();
    if (!sex || !kg || !cm || !age || !gKg || !days) return null;
    const bmr = calcBMR(sex, kg, cm, age);
    const daily = bmr * 1.55 - ((kg - gKg) * 7700) / days;
    const protein = kg * 1.6;
    const weeklyLoss = ((kg - gKg) / days) * 7;
    return {
      bmr: Math.round(bmr),
      daily: Math.round(daily),
      protein: Math.round(protein * 10) / 10,
      weeklyLoss: Math.round(weeklyLoss * 100) / 100,
    };
  }

  // ─── Step 1 서브 네비 ────────────────────────────────────────────────────────

  function handleStep1(answer: boolean) {
    setTakingGlp1(answer);
    setSubStep(answer ? "1b" : "1c");
  }

  function handleStep1b() {
    setSubStep("1c");
  }

  function handleStep1c(answer: boolean) {
    setHasMeds(answer);
    if (answer) {
      setSubStep("1d");
    } else {
      setStep(2);
    }
  }

  function handleStep1d() {
    setStep(2);
  }

  // ─── 약 리스트 관리 ──────────────────────────────────────────────────────────

  function addMed() {
    setMedications((prev) => [
      ...prev,
      { id: medIdCounter++, name: "", freq: "daily", count: "", time: "" },
    ]);
  }

  function removeMed(id: number) {
    setMedications((prev) => prev.filter((m) => m.id !== id));
  }

  function updateMed(id: number, field: keyof Omit<Medication, "id">, value: string) {
    setMedications((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [field]: value } : m))
    );
  }

  // ─── 최종 제출 ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setSubmitting(true);
    try {
      // TODO: API 호출
      router.replace("/(tabs)");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── 프로그레스 ──────────────────────────────────────────────────────────────

  const progress = step / 3;

  // ─── 렌더 ────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
        {/* 헤더 */}
        <Text style={s.stepLabel}>
          {step === 1 ? "1단계 · 약물 정보" : step === 2 ? "2단계 · 신체 정보" : "3단계 · 목표 설정"}
        </Text>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: `${progress * 100}%` as any }]} />
        </View>

        {/* ── STEP 1 ──────────────────────────────────────────────────────── */}
        {step === 1 && subStep === "1a" && (
          <View style={s.section}>
            <Text style={s.question}>다이어트 주사를 맞고 있나요?</Text>
            <Pressable style={s.bigBtn} onPress={() => handleStep1(true)}>
              <Text style={s.bigBtnText}>네, 맞고 있어요</Text>
            </Pressable>
            <Pressable style={[s.bigBtn, s.bigBtnOutline]} onPress={() => handleStep1(false)}>
              <Text style={[s.bigBtnText, s.bigBtnTextOutline]}>아니요, 안 맞아요</Text>
            </Pressable>
          </View>
        )}

        {step === 1 && subStep === "1b" && (
          <View style={s.section}>
            <Text style={s.question}>어떤 약을 맞고 있나요?</Text>
            {DRUG_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[s.radioRow, drug === opt.value && s.radioRowActive]}
                onPress={() => setDrug(opt.value)}
              >
                <View style={[s.radioCircle, drug === opt.value && s.radioCircleActive]} />
                <Text style={s.radioLabel}>{opt.label}</Text>
              </Pressable>
            ))}
            <Text style={s.inputLabel}>복용 시작일 (선택, YYYY-MM-DD)</Text>
            <TextInput
              style={s.input}
              value={glpStartDate}
              onChangeText={setGlpStartDate}
              placeholder="2024-01-01"
              placeholderTextColor="#aaa"
              keyboardType="numbers-and-punctuation"
            />
            <Pressable style={[s.bigBtn, { marginTop: 24 }]} onPress={handleStep1b}>
              <Text style={s.bigBtnText}>다음</Text>
            </Pressable>
          </View>
        )}

        {step === 1 && subStep === "1c" && (
          <View style={s.section}>
            <Text style={s.question}>복용하는 약이나 영양제가 있나요?</Text>
            <Pressable style={s.bigBtn} onPress={() => handleStep1c(true)}>
              <Text style={s.bigBtnText}>네, 있어요</Text>
            </Pressable>
            <Pressable style={[s.bigBtn, s.bigBtnOutline]} onPress={() => handleStep1c(false)}>
              <Text style={[s.bigBtnText, s.bigBtnTextOutline]}>아니요, 없어요</Text>
            </Pressable>
          </View>
        )}

        {step === 1 && subStep === "1d" && (
          <View style={s.section}>
            <Text style={s.question}>약 / 영양제 목록</Text>
            {medications.map((med, idx) => (
              <View key={med.id} style={s.medCard}>
                <View style={s.medCardHeader}>
                  <Text style={s.medCardTitle}>{idx + 1}번째 약</Text>
                  <Pressable onPress={() => removeMed(med.id)}>
                    <Text style={s.removeBtn}>✕</Text>
                  </Pressable>
                </View>
                <Text style={s.inputLabel}>약/영양제 이름</Text>
                <TextInput
                  style={s.input}
                  value={med.name}
                  onChangeText={(v) => updateMed(med.id, "name", v)}
                  placeholder="예: 오메가3"
                  placeholderTextColor="#aaa"
                />
                <Text style={s.inputLabel}>복용 빈도</Text>
                <View style={s.radioGroup}>
                  {(["daily", "weekly"] as const).map((f) => (
                    <Pressable
                      key={f}
                      style={[s.radioRow, med.freq === f && s.radioRowActive, s.radioRowHalf]}
                      onPress={() => updateMed(med.id, "freq", f)}
                    >
                      <View style={[s.radioCircle, med.freq === f && s.radioCircleActive]} />
                      <Text style={s.radioLabel}>{f === "daily" ? "매일" : "매주"}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={s.inputLabel}>
                  {med.freq === "daily" ? "하루 몇 회" : "주 몇 회"}
                </Text>
                <TextInput
                  style={s.input}
                  value={med.count}
                  onChangeText={(v) => updateMed(med.id, "count", v)}
                  placeholder="1"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                />
                <Text style={s.inputLabel}>복용 시간 (HH:MM)</Text>
                <TextInput
                  style={s.input}
                  value={med.time}
                  onChangeText={(v) => updateMed(med.id, "time", v)}
                  placeholder="08:00"
                  placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            ))}
            <Pressable style={s.addBtn} onPress={addMed}>
              <Text style={s.addBtnText}>+ 약/영양제 추가</Text>
            </Pressable>
            <Pressable style={[s.bigBtn, { marginTop: 24 }]} onPress={handleStep1d}>
              <Text style={s.bigBtnText}>다음</Text>
            </Pressable>
          </View>
        )}

        {/* ── STEP 2 ──────────────────────────────────────────────────────── */}
        {step === 2 && (
          <View style={s.section}>
            <Text style={s.question}>신체 정보를 입력해 주세요</Text>

            <Text style={s.inputLabel}>몸무게 (kg) *</Text>
            <TextInput
              style={s.input}
              value={weightKg}
              onChangeText={setWeightKg}
              placeholder="70"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
            />

            <Text style={s.inputLabel}>키 (cm) *</Text>
            <TextInput
              style={s.input}
              value={heightCm}
              onChangeText={setHeightCm}
              placeholder="165"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
            />

            <Text style={s.inputLabel}>나이 *</Text>
            <TextInput
              style={s.input}
              value={ageVal}
              onChangeText={setAgeVal}
              placeholder="30"
              placeholderTextColor="#aaa"
              keyboardType="number-pad"
            />

            <Text style={s.inputLabel}>성별 *</Text>
            <View style={s.sexRow}>
              {(["female", "male"] as const).map((sv) => (
                <Pressable
                  key={sv}
                  style={[s.sexBtn, sex === sv && s.sexBtnActive]}
                  onPress={() => setSex(sv)}
                >
                  <Text style={[s.sexBtnText, sex === sv && s.sexBtnTextActive]}>
                    {sv === "female" ? "여성" : "남성"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={s.divider} />
            <Text style={s.dividerLabel}>선택 입력</Text>

            <Text style={s.inputLabel}>근육량 (kg)</Text>
            <TextInput
              style={s.input}
              value={muscleMass}
              onChangeText={setMuscleMass}
              placeholder="예: 28.5"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
            />

            <Text style={s.inputLabel}>체지방률 (%)</Text>
            <TextInput
              style={s.input}
              value={bodyFat}
              onChangeText={setBodyFat}
              placeholder="예: 25"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
            />

            <Pressable
              style={[s.bigBtn, { marginTop: 32 }]}
              onPress={() => setStep(3)}
            >
              <Text style={s.bigBtnText}>다음</Text>
            </Pressable>
          </View>
        )}

        {/* ── STEP 3 ──────────────────────────────────────────────────────── */}
        {step === 3 && (
          <View style={s.section}>
            <Text style={s.question}>목표를 설정해 주세요</Text>

            <Text style={s.inputLabel}>목표 체중 (kg)</Text>
            <TextInput
              style={s.input}
              value={goalWeight}
              onChangeText={setGoalWeight}
              placeholder="60"
              placeholderTextColor="#aaa"
              keyboardType="decimal-pad"
            />

            <Text style={s.inputLabel}>목표 기간</Text>
            <View style={s.chipRow}>
              {GOAL_CHIPS.map((chip) => (
                <Pressable
                  key={String(chip.value)}
                  style={[s.chip, goalChip === chip.value && s.chipActive]}
                  onPress={() => setGoalChip(chip.value)}
                >
                  <Text style={[s.chipText, goalChip === chip.value && s.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {goalChip === "custom" && (
              <>
                <Text style={s.inputLabel}>목표 일수</Text>
                <TextInput
                  style={s.input}
                  value={customDays}
                  onChangeText={setCustomDays}
                  placeholder="예: 120"
                  placeholderTextColor="#aaa"
                  keyboardType="number-pad"
                />
              </>
            )}

            {/* 계산 결과 카드 */}
            {(() => {
              const r = getResults();
              if (!r) return null;
              return (
                <View style={s.resultCard}>
                  <Text style={s.resultTitle}>예상 목표 분석</Text>
                  <View style={s.resultRow}>
                    <Text style={s.resultKey}>기초대사량 (BMR)</Text>
                    <Text style={s.resultVal}>{r.bmr} kcal</Text>
                  </View>
                  <View style={s.resultRow}>
                    <Text style={s.resultKey}>일일 권장 칼로리</Text>
                    <Text style={s.resultVal}>{r.daily} kcal</Text>
                  </View>
                  <View style={s.resultRow}>
                    <Text style={s.resultKey}>단백질 목표</Text>
                    <Text style={s.resultVal}>{r.protein} g</Text>
                  </View>
                  <View style={s.resultRow}>
                    <Text style={s.resultKey}>주당 예상 감량</Text>
                    <Text style={s.resultVal}>{r.weeklyLoss} kg</Text>
                  </View>
                </View>
              );
            })()}

            <Pressable
              style={[s.bigBtn, { marginTop: 32 }, submitting && s.bigBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              <Text style={s.bigBtnText}>{submitting ? "처리 중..." : "시작하기"}</Text>
            </Pressable>
          </View>
        )}

        {/* 뒤로가기 */}
        {(step > 1 || (step === 1 && subStep !== "1a")) && (
          <Pressable
            style={s.backBtn}
            onPress={() => {
              if (step === 2) { setStep(1); setSubStep("1c"); return; }
              if (step === 3) { setStep(2); return; }
              // step === 1
              if (subStep === "1b") { setSubStep("1a"); return; }
              if (subStep === "1c") {
                if (takingGlp1) setSubStep("1b");
                else setSubStep("1a");
                return;
              }
              if (subStep === "1d") { setSubStep("1c"); return; }
            }}
          >
            <Text style={s.backBtnText}>← 이전</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 60 },

  stepLabel: { fontSize: 13, color: "#888", marginBottom: 8 },
  progressBg: {
    height: 6, backgroundColor: "#eee", borderRadius: 3, marginBottom: 32,
  },
  progressFill: { height: 6, backgroundColor: "#4CAF50", borderRadius: 3 },

  section: { gap: 8 },
  question: { fontSize: 22, fontWeight: "700", color: "#1a1a1a", marginBottom: 24 },

  // 큰 버튼
  bigBtn: {
    backgroundColor: "#4CAF50",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    marginVertical: 6,
  },
  bigBtnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#4CAF50",
  },
  bigBtnDisabled: { opacity: 0.5 },
  bigBtnText: { fontSize: 17, fontWeight: "600", color: "#fff" },
  bigBtnTextOutline: { color: "#4CAF50" },

  // 라디오
  radioGroup: { flexDirection: "row", gap: 8 },
  radioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    marginVertical: 4,
  },
  radioRowActive: { borderColor: "#4CAF50", backgroundColor: "#f0faf0" },
  radioRowHalf: { flex: 1 },
  radioCircle: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: "#ccc",
  },
  radioCircleActive: { borderColor: "#4CAF50", backgroundColor: "#4CAF50" },
  radioLabel: { fontSize: 15, color: "#333" },

  // 인풋
  inputLabel: { fontSize: 14, color: "#555", marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1.5, borderColor: "#ddd", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 16, color: "#1a1a1a",
  },

  // 성별
  sexRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  sexBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#ddd", alignItems: "center",
  },
  sexBtnActive: { borderColor: "#4CAF50", backgroundColor: "#f0faf0" },
  sexBtnText: { fontSize: 16, color: "#555", fontWeight: "500" },
  sexBtnTextActive: { color: "#4CAF50", fontWeight: "700" },

  // 구분선
  divider: { height: 1, backgroundColor: "#eee", marginTop: 24, marginBottom: 8 },
  dividerLabel: { fontSize: 12, color: "#aaa", marginBottom: 8 },

  // 약 카드
  medCard: {
    borderWidth: 1.5, borderColor: "#e0e0e0", borderRadius: 12,
    padding: 16, marginVertical: 8, gap: 4,
  },
  medCardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 8,
  },
  medCardTitle: { fontSize: 15, fontWeight: "600", color: "#333" },
  removeBtn: { fontSize: 18, color: "#e53935", paddingHorizontal: 4 },

  addBtn: {
    borderWidth: 1.5, borderColor: "#4CAF50", borderRadius: 10, borderStyle: "dashed",
    paddingVertical: 14, alignItems: "center", marginTop: 8,
  },
  addBtnText: { fontSize: 15, color: "#4CAF50", fontWeight: "600" },

  // 칩
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#ddd", backgroundColor: "#fafafa",
  },
  chipActive: { borderColor: "#4CAF50", backgroundColor: "#f0faf0" },
  chipText: { fontSize: 14, color: "#555" },
  chipTextActive: { color: "#4CAF50", fontWeight: "600" },

  // 결과 카드
  resultCard: {
    backgroundColor: "#f9fbe7", borderRadius: 14, padding: 18,
    marginTop: 20, gap: 10,
  },
  resultTitle: { fontSize: 15, fontWeight: "700", color: "#558b2f", marginBottom: 4 },
  resultRow: { flexDirection: "row", justifyContent: "space-between" },
  resultKey: { fontSize: 14, color: "#555" },
  resultVal: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },

  // 뒤로
  backBtn: { alignItems: "center", marginTop: 16 },
  backBtnText: { fontSize: 15, color: "#888" },
});
