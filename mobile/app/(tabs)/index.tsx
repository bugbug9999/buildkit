import { useRouter } from "expo-router";
import { useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useMealStore } from "../../src/store/mealStore";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function todayLabel() {
  const d = new Date();
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${DAYS[d.getDay()]}요일`;
}

const RADIUS = 90;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const SVG_SIZE = RADIUS * 2 + STROKE + 4;
const CENTER = SVG_SIZE / 2;

interface CalorieGaugeProps {
  current: number;
  goal: number;
}

function CalorieGauge({ current, goal }: CalorieGaugeProps) {
  const progress = goal > 0 ? Math.min(current / goal, 1) : 0;
  const offset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.gaugeContainer}>
      <Svg width={SVG_SIZE} height={SVG_SIZE}>
        {/* background circle */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="#E5E7EB"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* progress circle */}
        <Circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="#0D9488"
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${CENTER}, ${CENTER}`}
        />
      </Svg>
      <View style={styles.gaugeCenter}>
        <Text style={styles.gaugeKcal}>{Math.round(current)}</Text>
        <Text style={styles.gaugeGoal}>/ {Math.round(goal)} kcal</Text>
      </View>
    </View>
  );
}

interface MacroCardProps {
  label: string;
  current: number;
  goal: number;
  color: string;
}

function MacroCard({ label, current, goal, color }: MacroCardProps) {
  return (
    <View style={[styles.macroCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={[styles.macroCurrent, { color }]}>{Math.round(current)}g</Text>
      <Text style={styles.macroGoal}>/ {Math.round(goal)}g</Text>
    </View>
  );
}

const MEAL_CONFIG = [
  { key: "breakfast" as const, emoji: "🌅", label: "아침 식사" },
  { key: "lunch" as const, emoji: "🌤", label: "점심 식사" },
  { key: "dinner" as const, emoji: "🌙", label: "저녁 식사" },
  { key: "snack" as const, emoji: "🍎", label: "간식" },
];

type MealKey = "breakfast" | "lunch" | "dinner" | "snack";

interface MealItem {
  name: string;
  [key: string]: unknown;
}

interface MealTimeCardProps {
  mealKey: MealKey;
  emoji: string;
  label: string;
  items: MealItem[];
}

function MealTimeCard({ mealKey, emoji, label, items }: MealTimeCardProps) {
  const router = useRouter();
  const MAX = 3;
  const visible = items.slice(0, MAX);
  const extra = items.length - MAX;

  return (
    <TouchableOpacity
      style={styles.mealCard}
      activeOpacity={0.7}
      onPress={() => router.push(`/meal/add?mealType=${mealKey}`)}
    >
      <View style={styles.mealCardHeader}>
        <Text style={styles.mealEmoji}>{emoji}</Text>
        <Text style={styles.mealLabel}>{label}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push(`/meal/add?mealType=${mealKey}`)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text style={styles.emptyText}>아직 기록이 없어요</Text>
      ) : (
        <View style={styles.mealItems}>
          {visible.map((item, idx) => (
            <Text key={idx} style={styles.mealItemText}>
              • {item.name}
            </Text>
          ))}
          {extra > 0 && (
            <Text style={styles.mealItemExtra}>+{extra}개 더</Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { todaySummary, fetchTodaySummary } = useMealStore();

  useEffect(() => {
    void fetchTodaySummary();
  }, [fetchTodaySummary]);

  const summary = todaySummary?.summary;
  const calories = summary?.totalCaloriesKcal ?? 0;
  const protein = summary?.totalProteinG ?? 0;
  const carbs = summary?.totalCarbsG ?? 0;
  const fat = summary?.totalFatG ?? 0;

  const calorieGoal = todaySummary?.calorieGoalKcal ?? 2000;
  const proteinGoal = todaySummary?.proteinGoalG ?? 120;
  const carbsGoal = todaySummary?.carbsGoalG ?? 250;
  const fatGoal = todaySummary?.fatGoalG ?? 65;

  const meals = todaySummary?.meals;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 헤더 */}
        <Text style={styles.title}>오늘의 식단</Text>
        <Text style={styles.date}>{todayLabel()}</Text>

        {/* 칼로리 게이지 */}
        <View style={styles.card}>
          <CalorieGauge current={calories} goal={calorieGoal} />
        </View>

        {/* 3열 매크로 카드 */}
        <View style={styles.macroRow}>
          <MacroCard label="탄수화물" current={carbs} goal={carbsGoal} color="#F59E0B" />
          <MacroCard label="단백질" current={protein} goal={proteinGoal} color="#10B981" />
          <MacroCard label="지방" current={fat} goal={fatGoal} color="#F43F5E" />
        </View>

        {/* 기록하기 */}
        <Text style={styles.sectionHeader}>기록하기</Text>

        {MEAL_CONFIG.map(({ key, emoji, label }) => (
          <MealTimeCard
            key={key}
            mealKey={key}
            emoji={emoji}
            label={label}
            items={(meals?.[key] as MealItem[] | undefined) ?? []}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  date: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  gaugeContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  gaugeCenter: {
    position: "absolute",
    alignItems: "center",
  },
  gaugeKcal: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0F172A",
  },
  gaugeGoal: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  macroRow: {
    flexDirection: "row",
    gap: 8,
  },
  macroCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  macroLabel: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  macroCurrent: {
    fontSize: 18,
    fontWeight: "700",
  },
  macroGoal: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 8,
  },
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  mealCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  mealEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  mealLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 18,
    color: "#0D9488",
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
  },
  mealItems: {
    gap: 2,
  },
  mealItemText: {
    fontSize: 13,
    color: "#475569",
  },
  mealItemExtra: {
    fontSize: 12,
    color: "#0D9488",
    marginTop: 2,
  },
});
