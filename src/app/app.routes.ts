import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { authGuard } from './auth/auth.guard';
import { Inicio } from './pages/inicio/inicio';

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
        path: '**',
        redirectTo: ''
    }
];
