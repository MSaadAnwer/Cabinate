import * as ImagePicker from "expo-image-picker";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { newId } from "../utils/kitchen";

export async function capturePhoto(library = false): Promise<string | null> {
  if (!library && Platform.OS !== "web") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Allow camera access in Settings, or choose a photo from your library.",
      );
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.75,
    allowsEditing: false,
    base64: Platform.OS === "web",
  };
  const result = library
    ? await ImagePicker.launchImageLibraryAsync(options)
    : await ImagePicker.launchCameraAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (Platform.OS === "web") {
    // Picker blob URLs expire on reload; browser storage needs the image itself.
    if (!asset.base64) throw new Error("Could not read this photo. Choose another image and try again.");
    const uri = `data:${asset.mimeType || "image/jpeg"};base64,${asset.base64}`;
    URL.revokeObjectURL(asset.uri);
    return uri;
  }
  const folder = new Directory(Paths.document, "cabinate-photos");
  folder.create({ idempotent: true, intermediates: true });
  const source = new File(asset.uri);
  const extension = source.extension || ".jpg";
  const destination = new File(folder, `${newId()}${extension}`);
  source.copy(destination);
  return destination.uri;
}
