export const getLocationInfo = async (
  lat: number,
  lng: number
): Promise<string> => {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&accept-language=es`
    );
    const data = await response.json();

    if (data && data.display_name) {
      const parts = data.display_name.split(", ");
      return parts.slice(0, 3).join(", ");
    }
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  } catch (error) {
    console.error("Error obteniendo ubicación:", error);
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

export default getLocationInfo;
