import { HttpClient } from "@angular/common/http";
import { inject, Injectable, signal } from "@angular/core";
import { API_URL } from "../config/api.config";
import { tap } from "rxjs";


//interfaz para el AuthResponse del backend
export interface AuthData {
    token: string;
    email: string;
    roles: string[];
}

//Estructura ApiResponse<T> del backend
interface ApiResponse<T> {
    success: boolean;
    message: string;
    data: T | null;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private http = inject(HttpClient);
    private readonly CLAVE_SESION = 'minimarket_sesion';
    private estado = signal<AuthData | null>(this.recuperarSesion());
    readonly usuario = this.estado.asReadonly();


    login(email: string, password: string) {
        return this.http.post<ApiResponse<AuthData>>(`${API_URL}/auth/login`,{ email, password }
        ).pipe(
            tap(respuesta => {
                if (!respuesta.success || !respuesta.data?.token) {
                    throw new Error('No se recibió un token válido');
                }
                //guardar sesión
                sessionStorage.setItem(this.CLAVE_SESION,JSON.stringify(respuesta.data));
                this.estado.set(respuesta.data);
            })
        );
    }

    //recuperar sesión
    private recuperarSesion(): AuthData | null {
        const sesion = sessionStorage.getItem(this.CLAVE_SESION);
        if (!sesion) {
            return null;
        }

        try {
            const datos = JSON.parse(sesion) as AuthData;
            if (!datos?.token) {
                return null;
            }
            return datos;
        } catch {
            sessionStorage.removeItem(this.CLAVE_SESION);
            return null;
        }
    }

    obtenerToken(): string | null {
        return this.estado()?.token ?? null;
    }

    cerrarSesion(): void {
        sessionStorage.removeItem(this.CLAVE_SESION);
        this.estado.set(null);
    }
}