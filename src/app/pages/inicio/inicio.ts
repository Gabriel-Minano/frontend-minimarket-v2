import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { API_URL } from '../../config/api.config';

@Component({
  imports: [RouterLink],
  selector: 'app-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class Inicio {
  readonly auth = inject(AuthService);
  private http = inject(HttpClient);
  private router = inject(Router);

  mensaje =signal('');

  probarApi(): void {
    this.http.get<unknown>(`${API_URL}/categorias`).subscribe({
      next: () => {
        this.mensaje.set('Petición autenticada correctamente. HTTP 200.')
      },

      error: (error: HttpErrorResponse) => {
        this.mensaje.set(`Error HTTP: ${error.status}`);
      }
    });
  }

  salir(): void {
    this.auth.cerrarSesion();
    void this.router.navigateByUrl('/login');
  }
}
