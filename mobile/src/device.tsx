import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Account = {
  provider: "apple" | "google";
  id: string;
  name: string;
  email: string;
};

export type Plan = "month" | "year";

export type Subscription = {
  status: "none" | "trial";
  plan: Plan | null;
  until: string | null;
};

export type ReminderTimes = {
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
  water: string;
  waterLate: string;
};

export type LocalPhoto = {
  id: string;
  uri: string;
  createdAt: string;
};

type DeviceState = {
  account: Account | null;
  subscription: Subscription;
  remindersOn: boolean;
  times: ReminderTimes;
  photos: LocalPhoto[];
};

const KEY = "daymark-device";

export const DEFAULT_TIMES: ReminderTimes = {
  breakfast: "08:30",
  lunch: "13:30",
  snack: "16:30",
  dinner: "19:30",
  water: "11:00",
  waterLate: "17:00",
};

function empty(): DeviceState {
  return {
    account: null,
    subscription: { status: "none", plan: null, until: null },
    remindersOn: false,
    times: DEFAULT_TIMES,
    photos: [],
  };
}

function load(): DeviceState {
  if (typeof localStorage === "undefined") return empty();
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "");
    return {
      ...empty(),
      ...parsed,
      times: { ...DEFAULT_TIMES, ...(parsed.times || {}) },
      photos: Array.isArray(parsed.photos) ? parsed.photos.slice(0, 24) : [],
    };
  } catch {
    return empty();
  }
}

type DeviceValue = {
  device: DeviceState;
  signIn: (account: Account) => void;
  signOut: () => void;
  deleteAccount: () => void;
  startTrial: (plan: Plan) => void;
  setReminders: (on: boolean, times?: ReminderTimes) => void;
  savePhoto: (uri: string) => string;
  photo: (id: string) => LocalPhoto | undefined;
};

const DeviceContext = createContext<DeviceValue | null>(null);

export function DeviceProvider({ children }: { children: ReactNode }) {
  const [device, setDevice] = useState<DeviceState>(load);

  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(KEY, JSON.stringify(device));
  }, [device]);

  const value = useMemo<DeviceValue>(() => ({
    device,
    signIn: (account) => setDevice((current) => ({ ...current, account })),
    signOut: () => setDevice((current) => ({ ...current, account: null })),
    deleteAccount: () => setDevice(empty()),
    startTrial: (plan) => {
      const until = new Date();
      until.setDate(until.getDate() + 7);
      setDevice((current) => ({
        ...current,
        subscription: { status: "trial", plan, until: until.toISOString() },
      }));
    },
    setReminders: (remindersOn, times) => setDevice((current) => ({ ...current, remindersOn, times: times ?? current.times })),
    savePhoto: (uri) => {
      const photo = { id: `photo-${Date.now()}`, uri, createdAt: new Date().toISOString() };
      setDevice((current) => ({ ...current, photos: [photo, ...current.photos].slice(0, 24) }));
      return photo.id;
    },
    photo: (id) => device.photos.find((item) => item.id === id),
  }), [device]);

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
  const value = useContext(DeviceContext);
  if (!value) throw new Error("Device missing");
  return value;
}

export function trialLabel(subscription: Subscription) {
  if (subscription.status !== "trial" || !subscription.until) return "Немає підписки";
  const until = new Date(subscription.until);
  if (until.getTime() < Date.now()) return "Пробний період закінчився";
  const day = until.toLocaleDateString("uk-UA", { day: "numeric", month: "long" });
  return `Пробний період до ${day}`;
}
