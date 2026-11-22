import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { API_URL } from "../config/api.config";

export interface Categoria {
    id: number;
    nombre: string;
    descripcion: string;
    activo: boolean;
}

export interface CategoriaRequest {
    nombre: string;
    descripcion: string;
}

export interface Pagina<T> {
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
export class CategoriaService {
    private http = inject(HttpClient);

    //listar categorías por página
    listarCategorias(pagina: number = 0, activo: boolean = true, nombre: string = '', tamano: number = 3) {
        return this.http.get<ApiResponse<Pagina<Categoria>>>(
            `${API_URL}/categorias`, { params: { activo: activo, nombre: nombre.trim(), page: pagina, size: tamano, sort: 'id,desc' } }
        );
    }

    //crear categoría
    crearCategoria(categoria: CategoriaRequest) {
        return this.http.post<ApiResponse<Categoria>>(`${API_URL}/categorias`, categoria);
    }

    //actualizar categoría
    actualizarCategoria(id: number, categoria: CategoriaRequest) {
        return this.http.put<ApiResponse<Categoria>>(`${API_URL}/categorias/${id}`, categoria);
    }

    //desactivar categoría
    desactivarCategoria(id: number) {
        return this.http.delete<ApiResponse<null>>(`${API_URL}/categorias/${id}`);
    }

    //reactivar categoría
    reactivarCategoria(id: number) {
        return this.http.patch<ApiResponse<Categoria>>(`${API_URL}/categorias/${id}/reactivar`, {})
    }
}