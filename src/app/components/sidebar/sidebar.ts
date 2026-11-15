import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
    selector: 'app-sidebar',
    imports: [RouterLink, RouterLinkActive],
    templateUrl: './sidebar.html',
    styleUrl: './sidebar.css'
})
export class Sidebar {
    readonly auth = inject(AuthService);
    private router = inject(Router);

    cerrarSesion(): void {
        this.auth.cerrarSesion();
        void this.router.navigateByUrl('/login');
    }
}
