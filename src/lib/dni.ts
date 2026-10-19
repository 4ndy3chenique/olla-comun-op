/** Toda salida de DNI pasa por aquí: `****1236`. Nunca volcar el DNI completo a consola, reportes ni logs. */
export const enmascararDni = (dni: string) => "****" + dni.slice(-4);
