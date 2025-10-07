import { MandalaTemplate } from "../../types/MandalaTemplateType";
import { mandala_1_paths } from "../mandala-paths/mandala1";
import { mandala_2_paths } from "../mandala-paths/mandala2";
import { mandala_3_paths } from "../mandala-paths/mandala3";
import { mandala_4_paths } from "../mandala-paths/mandala4";
import { mandala_5_paths } from "../mandala-paths/mandala5";

export const mandalaTemplates: MandalaTemplate[] = [
  {
    id: 1,
    name: 'Mandala 1',
    path: mandala_1_paths,
    strokeWidth: 2,
    image_url: require('@/assets/images/mandalas/original/mandala 1.jpeg')
  },
  {
    id: 2,
    name: 'Mandala 2',
    path: mandala_2_paths,
    strokeWidth: 2,
    image_url: require('@/assets/images/mandalas/original/mandala 2.jpeg')
  },
  {
    id: 3,
    name: 'Mandala 3',
    path: mandala_3_paths,
    strokeWidth: 2,
    image_url: require('@/assets/images/mandalas/original/mandala 3.jpeg')
  },
  {
    id: 4,
    name: 'Mandala 4',
    path: mandala_4_paths,
    strokeWidth: 2,
    image_url: require('@/assets/images/mandalas/original/mandala 4.jpeg')
  },
  {
    id: 5,
    name: 'Mandala 5',
    path: mandala_5_paths,
    strokeWidth: 2,
    image_url: require('@/assets/images/mandalas/original/mandala 5.jpeg')
  },
];
