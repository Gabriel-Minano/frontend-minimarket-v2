import { HttpErrorResponse, HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "./auth.service";
import { Router } from "@angular/router";
import { API_URL } from "../config/api.config";
import { catchError, throwError } from "rxjs";

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    const token = auth.obtenerToken();
    const esApi = req.url.startsWith(`${API_URL}/`)
    const esLogin = req.url === `${API_URL}/auth/login`;

    //si es una petición a la API y no es la de login y hay token se agrega el header de autorización
    const peticion = esApi && !esLogin && token ? req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    }) : req;

    //si la petición falla y es un error 401 se cierra la sesión y se redirige al login
    return next(peticion).pipe(
        catchError((error: HttpErrorResponse) => {
            //token vencido o inválido redirigir al login
            if (error.status === 401 && esApi && !esLogin && token) {
                auth.cerrarSesion();
                void router.navigateByUrl('/login');
            }
            return throwError(() => error);
        })
    );
}