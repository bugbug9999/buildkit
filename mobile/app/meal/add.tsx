import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { searchFood, FoodItem } from '../../src/lib/foodApi';

const MEAL_LABELS: Record<string, string> = {
  breakfast: '아침 식사',
  lunch: '점심 식사',
  dinner: '저녁 식사',
  snack: '간식',
};

type Mode = 'search' | 'manual' | 'detail';

interface MealLog {
  foodName: string;
  caloriesKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  mealType: string;
  sourceType: 'manual' | 'search';
  servingCount?: number;
}

async function logMeal(meal: MealLog) {
  // TODO: 실제 API 연동
  console.log('logMeal:', meal);
}

export default function AddMealScreen() {
  const { mealType } = useLocalSearchParams<{ mealType: string }>();
  const mealLabel = MEAL_LABELS[mealType ?? ''] ?? mealType ?? '식사';

  const [mode, setMode] = useState<Mode>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [servingCount, setServingCount] = useState(1);
  const [loading, setLoading] = useState(false);

  // 직접 등록 폼 상태
  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (mode !== 'search') return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchFood(query);
        setResults(items);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query, mode]);

  const handleSelectFood = (food: FoodItem) => {
    setSelectedFood(food);
    setServingCount(1);
    setMode('detail');
  };

  const handleManualSubmit = async () => {
    if (!manualName.trim() || !manualCalories.trim()) return;
    await logMeal({
      foodName: manualName.trim(),
      caloriesKcal: parseFloat(manualCalories) || 0,
      proteinG: parseFloat(manualProtein) || 0,
      carbsG: parseFloat(manualCarbs) || 0,
      fatG: parseFloat(manualFat) || 0,
      mealType: mealType ?? '',
      sourceType: 'manual',
    });
    router.back();
  };

  const handleAddDetail = async () => {
    if (!selectedFood) return;
    await logMeal({
      ...selectedFood,
      caloriesKcal: selectedFood.caloriesKcal * servingCount,
      proteinG: selectedFood.proteinG * servingCount,
      carbsG: selectedFood.carbsG * servingCount,
      fatG: selectedFood.fatG * servingCount,
      mealType: mealType ?? '',
      sourceType: 'search',
      servingCount,
    });
    router.back();
  };

  if (mode === 'manual') {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => setMode('search')}>
            <Text style={styles.backButtonText}>← 뒤로</Text>
          </TouchableOpacity>
          <Text style={styles.title}>직접 등록</Text>
          <Text style={styles.label}>음식 이름 *</Text>
          <TextInput
            style={styles.input}
            placeholder="음식 이름을 입력하세요"
            value={manualName}
            onChangeText={setManualName}
          />
          <Text style={styles.label}>칼로리 (kcal) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={manualCalories}
            onChangeText={setManualCalories}
            keyboardType="numeric"
          />
          <Text style={styles.label}>단백질 (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={manualProtein}
            onChangeText={setManualProtein}
            keyboardType="numeric"
          />
          <Text style={styles.label}>탄수화물 (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={manualCarbs}
            onChangeText={setManualCarbs}
            keyboardType="numeric"
          />
          <Text style={styles.label}>지방 (g)</Text>
          <TextInput
            style={styles.input}
            placeholder="0"
            value={manualFat}
            onChangeText={setManualFat}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.primaryButton, (!manualName.trim() || !manualCalories.trim()) && styles.primaryButtonDisabled]}
            onPress={handleManualSubmit}
            disabled={!manualName.trim() || !manualCalories.trim()}
          >
            <Text style={styles.primaryButtonText}>등록하기</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (mode === 'detail' && selectedFood) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setMode('search')}>
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>{selectedFood.foodName}</Text>
          {selectedFood.manufacturer ? (
            <Text style={styles.manufacturer}>{selectedFood.manufacturer}</Text>
          ) : null}
          <View style={styles.nutrientCard}>
            <View style={styles.nutrientRow}>
              <Text style={styles.nutrientLabel}>칼로리</Text>
              <Text style={styles.nutrientValue}>
                {(selectedFood.caloriesKcal * servingCount).toFixed(0)} kcal
              </Text>
            </View>
            <View style={styles.nutrientRow}>
              <Text style={styles.nutrientLabel}>단백질</Text>
              <Text style={styles.nutrientValue}>
                {(selectedFood.proteinG * servingCount).toFixed(1)} g
              </Text>
            </View>
            <View style={styles.nutrientRow}>
              <Text style={styles.nutrientLabel}>탄수화물</Text>
              <Text style={styles.nutrientValue}>
                {(selectedFood.carbsG * servingCount).toFixed(1)} g
              </Text>
            </View>
            <View style={styles.nutrientRow}>
              <Text style={styles.nutrientLabel}>지방</Text>
              <Text style={styles.nutrientValue}>
                {(selectedFood.fatG * servingCount).toFixed(1)} g
              </Text>
            </View>
          </View>
          <View style={styles.servingRow}>
            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => setServingCount(Math.max(1, servingCount - 1))}
            >
              <Text style={styles.servingButtonText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.servingCount}>{servingCount}인분</Text>
            <TouchableOpacity
              style={styles.servingButton}
              onPress={() => setServingCount(servingCount + 1)}
            >
              <Text style={styles.servingButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.primaryButton} onPress={handleAddDetail}>
            <Text style={styles.primaryButtonText}>기록에 추가</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // mode === 'search'
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>뭐 먹었어요?</Text>
        <Text style={styles.mealLabel}>{mealLabel}</Text>
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder="음식을 검색하세요"
        value={query}
        onChangeText={setQuery}
        autoFocus
        clearButtonMode="while-editing"
      />
      <TouchableOpacity style={styles.manualButton} onPress={() => setMode('manual')}>
        <Text style={styles.manualButtonText}>+ 직접 등록</Text>
      </TouchableOpacity>
      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#4CAF50" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item, index) => item.externalId ?? `${item.foodName}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectFood(item)}>
              <View style={styles.resultMain}>
                <Text style={styles.resultName}>{item.foodName}</Text>
                {item.manufacturer ? (
                  <Text style={styles.resultManufacturer}>{item.manufacturer}</Text>
                ) : null}
              </View>
              <View style={styles.resultNutrients}>
                <Text style={styles.resultCalories}>{item.caloriesKcal} kcal</Text>
                <Text style={styles.resultMacros}>
                  단 {item.proteinG}g · 탄 {item.carbsG}g · 지 {item.fatG}g
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            query.trim() && !loading ? (
              <Text style={styles.emptyText}>검색 결과가 없습니다</Text>
            ) : null
          }
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  mealLabel: {
    fontSize: 14,
    color: '#888',
  },
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  manualButton: {
    marginHorizontal: 20,
    marginBottom: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 10,
  },
  manualButtonText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '600',
  },
  loader: {
    marginTop: 40,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  resultMain: {
    flex: 1,
    marginRight: 12,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  resultManufacturer: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  resultNutrients: {
    alignItems: 'flex-end',
  },
  resultCalories: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4CAF50',
  },
  resultMacros: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: 40,
    fontSize: 15,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  backButtonText: {
    color: '#4CAF50',
    fontSize: 15,
  },
  label: {
    fontSize: 13,
    color: '#555',
    marginBottom: 4,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fafafa',
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#ccc',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  nutrientCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  nutrientLabel: {
    fontSize: 14,
    color: '#555',
  },
  nutrientValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 20,
  },
  servingButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#4CAF50',
  },
  servingCount: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 60,
    textAlign: 'center',
  },
  manufacturer: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
  },
});
