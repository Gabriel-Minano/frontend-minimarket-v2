import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { authGuard } from './auth/auth.guard';
import { Inicio } from './pages/inicio/inicio';
import { Categorias } from './pages/categorias/categorias';
import { Productos } from './pages/productos/productos';
import { Ventas } from './pages/ventas/ventas';

export const routes: Routes = [
    {
        path: 'login',
        component: Login
    },
    {
        path: '',
        component: Inicio,
        canActivate: [authGuard]
    },
    {
        path: 'categorias',
        component: Categorias,
        canActivate: [authGuard]
    },
    {
        path: 'productos',
        component: Productos,
        canActivate: [authGuard]
    },
    {
        path: 'ventas',
        component: Ventas,
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
