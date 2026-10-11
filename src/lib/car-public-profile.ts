export function carPublicProfile(car: { registration_number: string; owner_name: string; make: string; model: string; color: string }) {
  return { registration_number: car.registration_number, owner_name: car.owner_name, make: car.make, model: car.model, color: car.color };
}