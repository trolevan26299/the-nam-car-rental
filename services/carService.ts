import { CarConfig } from "../types";

const STORAGE_KEY = 'the_nam_car_fleet';

// Dữ liệu mẫu ban đầu nếu chưa có gì
const INITIAL_CARS: CarConfig[] = [
  {
    id: '1',
    name: 'Toyota Vios 2023',
    plate: '30A-123.45',
    color: 'Trắng',
    price: 800000
  },
  {
    id: '2',
    name: 'Hyundai Accent 2022',
    plate: '29K-567.89',
    color: 'Đen',
    price: 750000
  },
  {
    id: '3',
    name: 'VinFast VF8',
    plate: '30H-999.99',
    color: 'Xanh VinFast',
    price: 1500000
  }
];

export const getCarFleet = (): CarConfig[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Nếu chưa có, lưu dữ liệu mẫu và trả về
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CARS));
    return INITIAL_CARS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return [];
  }
};

export const saveCarFleet = (fleet: CarConfig[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fleet));
};

export const addCarToFleet = (car: Omit<CarConfig, 'id'>) => {
  const fleet = getCarFleet();
  const newCar = { ...car, id: Date.now().toString() };
  const updatedFleet = [...fleet, newCar];
  saveCarFleet(updatedFleet);
  return updatedFleet;
};

export const removeCarFromFleet = (id: string) => {
  const fleet = getCarFleet();
  const updatedFleet = fleet.filter(c => c.id !== id);
  saveCarFleet(updatedFleet);
  return updatedFleet;
};