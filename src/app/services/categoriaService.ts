import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { API_URL } from "../config/api.config";

export interface Categoria {
    id: number;
    nombre: string;
    descripcion: string;
    activo: boolean;
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
    listarCategorias(pagina: number = 0){
        return this.http.get<ApiResponse<Pagina<Categoria>>>(
            `${API_URL}/categorias`, {params: {activo: true, page: pagina, size: 15}}
        );
    }

}