import { Platform } from "react-native";

export async function pickMealPhoto() {
  const ImagePicker = await import("expo-image-picker");
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) throw new Error("Щоб сфотографувати страву, дозволь камеру.");
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.6,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets[0]) return null;
  return persistPhoto(result.assets[0].uri);
}

export async function pickMealFromLibrary() {
  const ImagePicker = await import("expo-image-picker");
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("Щоб обрати фото, дозволь галерею.");
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.6,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled || !result.assets[0]) return null;
  return persistPhoto(result.assets[0].uri);
}

async function persistPhoto(uri: string) {
  if (Platform.OS === "web") return compressWeb(uri);
  const FileSystem = await import("expo-file-system/legacy");
  const directory = `${FileSystem.documentDirectory}photos/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const dest = `${directory}photo-${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

function compressWeb(uri: string) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = 800;
      const scale = Math.min(1, size / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    image.onerror = () => reject(new Error("Не вдалося прочитати фото."));
    image.src = uri;
  });
}
