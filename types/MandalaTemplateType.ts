import { ImageSourcePropType } from "react-native";
type PathD = {
  id: number;
  d: string;
  defaultFill: string;
}
export interface MandalaTemplate {
  id: number;
  name: string;
  path: PathD[];
  strokeWidth: number;
  image_url: ImageSourcePropType;
}
