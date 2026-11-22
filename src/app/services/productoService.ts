import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { API_URL } from "../config/api.config";

export interface Producto {
    id: number;
    nombre: string;
    precio: number;
    stock: number;
    idCategoria: number;
    activo: boolean;
}

export interface ProductoRequest {
    nombre: string;
    precio: number;
    stock: number;
    idCategoria: number;
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
export class ProductoService {
    private http = inject(HttpClient);

    //listar productos y filtrar por nombre o categoría
    listarProductos(pagina: number = 0, activo: boolean = true, nombre: string = '', categoriaId: number | null = null) {
        const params: { activo: boolean; page: number; size: number; sort: string; nombre?: string; categoriaId?: number } = {
            activo: activo,
            page: pagina,
            size: 10,
            sort: 'id,desc'
        };

        //El backend permite buscar por categoría O por nombre, no por ambos a la vez
        if (categoriaId !== null) {
            params.categoriaId = categoriaId;
        } else if (nombre.trim()) {
            params.nombre = nombre.trim();
        }

        return this.http.get<ApiResponse<Pagina<Producto>>>(`${API_URL}/productos`, { params });
    }

    //crear producto
    crearProducto(producto: ProductoRequest) {
        return this.http.post<ApiResponse<Producto>>(`${API_URL}/productos`, producto);
    }

    //actualizar producto
    actualizarProducto(id: number, producto: ProductoRequest) {
        return this.http.put<ApiResponse<Producto>>(`${API_URL}/productos/${id}`, producto);
    }

    //desactivar producto
    desactivarProducto(id: number) {
        return this.http.delete<ApiResponse<null>>(`${API_URL}/productos/${id}`);
    }

    //reactivar producto
    reactivarProducto(id: number) {
        return this.http.patch<ApiResponse<Producto>>(`${API_URL}/productos/${id}/reactivar`, {});
    }
}
