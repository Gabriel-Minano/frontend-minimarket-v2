import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';

export interface DetalleVentaRequest {
    idProducto: number;
    cantidad: number;
}

export interface VentaRequest {
    detalles: DetalleVentaRequest[];
}

export interface DetalleVenta {
    idDetalleVenta: number;
    idProducto: number;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
}

export interface Venta {
    idVenta: number;
    idUsuario: number;
    nombreUsuario: string;
    fechaVenta: string;
    total: number;
    activo: boolean;
    detalles: DetalleVenta[];
}

interface Pagina<T> {
    content: T[];
    number: number;
    totalPages: number;
    totalElements: number;
}

interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

@Injectable({
    providedIn: 'root'
})
export class VentaService {
    private http = inject(HttpClient);

    //Listar ventas activas o anuladas
    listarVentas(pagina: number = 0, activo: boolean = true) {
        return this.http.get<ApiResponse<Pagina<Venta>>>(`${API_URL}/ventas`, {
            params: { activo, page: pagina, size: 10, sort: 'fechaVenta,desc' }
        });
    }

    //Obtener una venta con sus detalles
    obtenerVenta(id: number) {
        return this.http.get<ApiResponse<Venta>>(`${API_URL}/ventas/${id}`);
    }

    //Registrar venta: el backend identifica al vendedor por el token
    registrarVenta(venta: VentaRequest) {
        return this.http.post<ApiResponse<Venta>>(`${API_URL}/ventas`, venta);
    }

    //Anular venta (solo administrador)
    anularVenta(id: number) {
        return this.http.delete<ApiResponse<null>>(`${API_URL}/ventas/${id}`);
    }
}
