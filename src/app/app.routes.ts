import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { authGuard, adminGuard } from './auth/auth.guard';
import { Inicio } from './pages/inicio/inicio';
import { Categorias } from './pages/categorias/categorias';
import { Productos } from './pages/productos/productos';
import { Ventas } from './pages/ventas/ventas';
import { Usuarios } from './pages/usuarios/usuarios';

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
        path: 'usuarios',
        component: Usuarios,
        canActivate: [authGuard, adminGuard]
    },
    {
        path: '**',
        redirectTo: ''
    }
];
