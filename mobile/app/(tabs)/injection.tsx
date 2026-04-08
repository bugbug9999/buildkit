import { useState, useEffect } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { fetchInjections, createInjection, InjectionLog } from "../../src/lib/api";

const DRUGS = ["Ozempic", "Wegovy", "Mounjaro", "Saxenda"];
const SITES = ["abdomen", "thigh", "arm"];

export default function InjectionScreen() {
  const [drug, setDrug] = useState(DRUGS[0]);
  const [dose, setDose] = useState("");
  const [site, setSite] = useState(SITES[0]);
  const [date, setDate] = useState(new Date());
  const [memo, setMemo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [history, setHistory] = useState<InjectionLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await fetchInjections();
      setHistory(data.slice(0, 10));
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleSubmit = async () => {
    if (!dose) {
      Alert.alert("알림", "용량을 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      await createInjection({
        drug,
        dose: parseFloat(dose),
        site,
        date: date.toISOString(),
        memo: memo.trim() || undefined,
      });
      Alert.alert("성공", "기록되었습니다.");
      setDose("");
      setMemo("");
      void loadHistory();
    } catch (err) {
      Alert.alert("오류", "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, gap: 24 }}>
        <Text className="text-2xl font-bold text-slate-900">GLP-1 주사 기록</Text>

        {/* Form Section */}
        <View className="gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <View>
            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">약물 선택</Text>
            <View className="flex-row flex-wrap gap-2">
              {DRUGS.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setDrug(item)}
                  className={`px-4 py-2 rounded-full border ${
                    drug === item ? "bg-slate-900 border-slate-900" : "bg-white border-slate-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${drug === item ? "text-white" : "text-slate-600"}`}>
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">용량 (mg)</Text>
            <TextInput
              value={dose}
              onChangeText={setDose}
              placeholder="예: 0.25"
              keyboardType="decimal-pad"
              className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-900"
            />
          </View>

          <View>
            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">주사 부위</Text>
            <View className="flex-row gap-2">
              {SITES.map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setSite(item)}
                  className={`flex-1 items-center py-3 rounded-xl border ${
                    site === item ? "bg-slate-900 border-slate-900" : "bg-white border-slate-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${site === item ? "text-white" : "text-slate-600"}`}>
                    {item === "abdomen" ? "복부" : item === "thigh" ? "허벅지" : "팔"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View>
            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">날짜</Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              className="bg-slate-50 border border-slate-200 p-4 rounded-xl"
            >
              <Text className="text-slate-900 font-medium">{date.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={(_, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setDate(selectedDate);
                }}
              />
            )}
          </View>

          <View>
            <Text className="text-xs font-bold text-slate-500 uppercase mb-2">메모 (선택)</Text>
            <TextInput
              value={memo}
              onChangeText={setMemo}
              placeholder="특이사항이나 컨디션을 기록하세요"
              className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-slate-900 h-24"
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`mt-2 py-4 rounded-2xl items-center shadow-sm ${
              loading ? "bg-slate-300" : "bg-indigo-600"
            }`}
          >
            <Text className="text-white font-bold text-base">
              {loading ? "저장 중..." : "기록 저장하기"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* History Section */}
        <View className="gap-4 mb-8">
          <View className="flex-row justify-between items-center">
            <Text className="text-lg font-bold text-slate-900">최근 10회 기록</Text>
          </View>
          
          {history.length === 0 ? (
            <View className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 items-center">
              <Text className="text-slate-400">아직 주사 기록이 없습니다.</Text>
            </View>
          ) : (
            history.map((item) => (
              <View
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex-row items-center gap-4"
              >
                <View className="w-12 h-12 rounded-full bg-slate-100 items-center justify-center">
                  <Text className="text-lg">💉</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row justify-between items-start">
                    <Text className="font-bold text-slate-900 text-base">
                      {item.drug} {item.dose}mg
                    </Text>
                    <Text className="text-[10px] font-bold text-slate-400 uppercase">
                      {new Date(item.date).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text className="text-xs text-slate-500 mt-0.5">
                    부위: {item.site === "abdomen" ? "복부" : item.site === "thigh" ? "허벅지" : "팔"}
                  </Text>
                  {item.memo ? (
                    <Text className="text-xs text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg">
                      {item.memo}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
