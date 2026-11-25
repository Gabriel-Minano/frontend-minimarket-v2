import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';

export interface VentaPorDia {
    fecha: string;
    cantidadVentas: number;
    unidadesVendidas: number;
    totalVendido: number;
}

export interface ReporteVentas {
    fechaInicio: string;
    fechaFin: string;
    cantidadVentas: number;
    unidadesVendidas: number;
    totalVendido: number;
    ventasPorDia: VentaPorDia[];
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

@Injectable({
    providedIn: 'root'
})
export class ReporteService {
    private http = inject(HttpClient);

    consultarVentas(fechaInicio: string, fechaFin: string) {
        return this.http.get<ApiResponse<ReporteVentas>>(`${API_URL}/reportes/ventas`, {
            params: { fechaInicio, fechaFin }
        });
    }

    exportarVentas(fechaInicio: string, fechaFin: string) {
        return this.http.get(`${API_URL}/reportes/ventas/exportar`, {
            params: { fechaInicio, fechaFin },
            responseType: 'blob'
        });
    }
}
