import { BusinessHours } from "../types/business";

export const isBusinessOpen = (hours?: BusinessHours): boolean => {
  if (!hours) return true; // If no hours specified, assume always open
  
  const now = new Date();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const currentDay = dayNames[now.getDay()] as keyof BusinessHours;
  const todayHours = hours[currentDay];
  
  if (!todayHours || todayHours.closed) return false;
  
  const currentTime = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = todayHours.open.split(":").map(Number);
  const [closeHour, closeMin] = todayHours.close.split(":").map(Number);
  
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  return currentTime >= openTime && currentTime <= closeTime;
};

export const formatBusinessHours = (hours?: BusinessHours): string => {
  if (!hours) return "Hours not specified";
  
  const now = new Date();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const currentDay = dayNames[now.getDay()] as keyof BusinessHours;
  const todayHours = hours[currentDay];
  
  if (!todayHours || todayHours.closed) return "Closed today";
  
  return `${todayHours.open} - ${todayHours.close}`;
};

export const getDefaultBusinessHours = (): BusinessHours => {
  return {
    monday: { open: "09:00", close: "17:00" },
    tuesday: { open: "09:00", close: "17:00" },
    wednesday: { open: "09:00", close: "17:00" },
    thursday: { open: "09:00", close: "17:00" },
    friday: { open: "09:00", close: "17:00" },
    saturday: { open: "10:00", close: "14:00" },
    sunday: { open: "10:00", close: "14:00", closed: true },
  };
};
