import proteinImg from '../assets/images/dish_atelier_protein_1794529578370.jpg';
import carbsImg from '../assets/images/dish_atelier_carbs_1794529578367.jpg';
import fatsImg from '../assets/images/dish_atelier_fats_1794529579357.jpg';
import greensImg from '../assets/images/dish_atelier_greens_1794529579750.jpg';
import juicesImg from '../assets/images/dish_atelier_juices_1794529580140.jpg';
import { DishItem, FoodCategory, FoodItem } from '../types';

export const CATEGORY_IMAGES: Record<FoodCategory, string> = {
  protein: proteinImg,
  carb: carbsImg,
  fat: fatsImg,
  veg: greensImg,
  juice: juicesImg,
};

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  protein: 'بروتين صافي',
  carb: 'مصدر طاقة وكارب',
  fat: 'دهون صحية',
  veg: 'خضر وألياف',
  juice: 'عصير طبيعي',
};

export function getFoodImage(food?: FoodItem | null): string {
  if (!food) return proteinImg;
  if (food.imageUrl && food.imageUrl.trim()) return food.imageUrl.trim();
  return CATEGORY_IMAGES[food.cat] || proteinImg;
}

export function getDishImage(dish: DishItem | null | undefined, foods: FoodItem[]): string {
  if (!dish) return proteinImg;
  if (dish.imageUrl && dish.imageUrl.trim()) return dish.imageUrl.trim();
  // Use the primary protein or first ingredient category photo
  for (const [fid] of dish.ing) {
    const f = foods.find((x) => x.id === fid);
    if (f?.cat === 'protein') return getFoodImage(f);
  }
  const first = foods.find((x) => x.id === dish.ing[0]?.[0]);
  return first ? getFoodImage(first) : proteinImg;
}
