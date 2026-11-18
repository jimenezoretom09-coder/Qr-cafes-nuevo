export interface SalesByHourEntry {
  hour: number;
  total: number;
  orderCount: number;
}

export interface SalesByCategoryEntry {
  categoryId: string;
  categoryName: string;
  grossTotal: number;
  itemCount: number;
}

export interface SalesByWaiterEntry {
  waiterId: string;
  waiterName: string;
  total: number;
  orderCount: number;
}

export interface SalesReportDTO {
  from: string;
  to: string;
  totalRevenue: number;
  totalOrders: number;
  totalTips: number;
  averageTicket: number;
  byHour: SalesByHourEntry[];
  byCategory: SalesByCategoryEntry[];
  byWaiter: SalesByWaiterEntry[];
}

export interface StationPerformanceEntry {
  stationId: string;
  stationName: string;
  itemCount: number;
  avgPrepMinutes: number;
  delayedCount: number;
}

export interface KitchenReportDTO {
  from: string;
  to: string;
  byStation: StationPerformanceEntry[];
}
