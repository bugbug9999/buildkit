import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          const iconMap = {
            index: "home",
            log: "book-open",
            report: "bar-chart",
            profile: "user"
          } as const;

          const iconName = iconMap[route.name as keyof typeof iconMap] ?? "circle";
          return <Feather name={iconName} size={size} color={color} />;
        }
      })}
    >
      <Tabs.Screen name="index" options={{ title: "홈" }} />
      <Tabs.Screen name="log" options={{ title: "기록" }} />
      <Tabs.Screen name="report" options={{ title: "리포트" }} />
      <Tabs.Screen name="profile" options={{ title: "프로필" }} />
    </Tabs>
  );
}
