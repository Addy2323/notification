export const TRANSPORT_METHODS = [
  {
    id: 'BODA',
    icon: '🏍️',
    labelKey: 'merchant.transport_boda',
    descKey: 'merchant.transport_boda_desc',
    namePlaceholder: 'merchant.new_driver_name_optional',
    phonePlaceholder: 'merchant.new_driver_phone_optional',
    sectionLabel: 'merchant.driver_details_boda',
  },
  {
    id: 'BAJAJI',
    icon: '🛺',
    labelKey: 'merchant.transport_bajaji',
    descKey: 'merchant.transport_bajaji_desc',
    namePlaceholder: 'merchant.new_driver_name_optional',
    phonePlaceholder: 'merchant.new_driver_phone_optional',
    sectionLabel: 'merchant.driver_details_bajaji',
  },
  {
    id: 'BUS',
    icon: '🚌',
    labelKey: 'merchant.transport_bus',
    descKey: 'merchant.transport_bus_desc',
    namePlaceholder: 'merchant.driver_name_bus_placeholder',
    phonePlaceholder: 'merchant.driver_phone_bus_placeholder',
    sectionLabel: 'merchant.driver_details_bus',
  },
  {
    id: 'PERSONAL',
    icon: '👤',
    labelKey: 'merchant.transport_personal',
    descKey: 'merchant.transport_personal_desc',
    namePlaceholder: 'merchant.driver_name_personal_placeholder',
    phonePlaceholder: 'merchant.driver_phone_personal_placeholder',
    sectionLabel: 'merchant.driver_details_personal',
  },
] as const;

export type TransportMethodId = typeof TRANSPORT_METHODS[number]['id'];

export const getTransportMeta = (vehicleInfo?: string | null) => {
  const v = (vehicleInfo || 'BODA').toUpperCase();
  if (v.includes('BAJAJI')) return { label: 'Bajaji', icon: '🛺', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
  if (v.includes('BUS') || v.includes('BASI')) return { label: 'Bus', icon: '🚌', bg: 'bg-blue-50 text-blue-800 border-blue-200' };
  if (v.includes('PERSONAL') || v.includes('BINAFSI')) return { label: 'Personal', icon: '👤', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
  return { label: 'Boda', icon: '🏍️', bg: 'bg-orange-50 text-orange-800 border-orange-200' };
};
