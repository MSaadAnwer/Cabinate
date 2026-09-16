import * as ImagePicker from "expo-image-picker";
import { Directory, File, Paths } from "expo-file-system";
import { newId } from "../utils/kitchen";

export async function capturePhoto(library = false): Promise<string | null> {
  if (!library) {
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
  };
  const result = library
    ? await ImagePicker.launchImageLibraryAsync(options)
    : await ImagePicker.launchCameraAsync(options);
  if (result.canceled) return null;
  const folder = new Directory(Paths.document, "cabinate-photos");
  folder.create({ idempotent: true, intermediates: true });
  const source = new File(result.assets[0].uri);
  const extension = source.extension || ".jpg";
  const destination = new File(folder, `${newId()}${extension}`);
  source.copy(destination);
  return destination.uri;
}
