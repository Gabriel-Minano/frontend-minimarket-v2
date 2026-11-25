import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { API_URL } from '../config/api.config';

export interface Rol {
    id: number;
    nombre: string;
}

export interface Usuario {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    activo: boolean;
    roles: Rol[];
}

export interface UsuarioRequest {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    idRoles: number[];
}

export interface UsuarioUpdateRequest {
    nombre: string;
    apellido: string;
    email: string;
    idRoles: number[];
    password?: string;
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
export class UsuarioService {
    private http = inject(HttpClient);

    //Listar usuarios activos o inactivos con paginación
    listarUsuarios(pagina: number = 0, activo: boolean = true) {
        return this.http.get<ApiResponse<Pagina<Usuario>>>(`${API_URL}/usuarios`, {
            params: { activo, page: pagina, size: 10, sort: 'id,desc' }
        });
    }

    //Roles disponibles en el backend
    listarRoles() {
        return this.http.get<ApiResponse<Rol[]>>(`${API_URL}/roles`);
    }

    //Registrar usuario
    crearUsuario(usuario: UsuarioRequest) {
        return this.http.post<ApiResponse<Usuario>>(`${API_URL}/usuarios`, usuario);
    }

    //Editar usuario (contraseña opcional)
    actualizarUsuario(id: number, usuario: UsuarioUpdateRequest) {
        return this.http.put<ApiResponse<Usuario>>(`${API_URL}/usuarios/${id}`, usuario);
    }

    //Desactivar usuario
    desactivarUsuario(id: number) {
        return this.http.delete<ApiResponse<null>>(`${API_URL}/usuarios/${id}`);
    }

    //Reactivar usuario
    reactivarUsuario(id: number) {
        return this.http.patch<ApiResponse<Usuario>>(`${API_URL}/usuarios/${id}/reactivar`, {});
    }
}
