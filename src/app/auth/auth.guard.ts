import { inject } from "@angular/core";
import { CanActivateFn, Router } from "@angular/router";
import { AuthService } from "./auth.service";

//Si existe una sesión local permite el acceso a la ruta si no redirige al login
export const authGuard: CanActivateFn = () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if(auth.obtenerToken()){
        return true;
    }

    return router.createUrlTree(['/login']);
}