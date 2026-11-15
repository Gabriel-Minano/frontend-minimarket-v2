import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { API_URL } from '../../config/api.config';

@Component({
  selector: 'app-inicio',
  styleUrl: './inicio.css',
  templateUrl: './inicio.html',
})
export class Inicio {
  private http = inject(HttpClient);

  mensaje = signal('');

  probarApi(): void {
    this.http.get<unknown>(`${API_URL}/categorias`).subscribe({
      next: () => {
        this.mensaje.set('Petición autenticada correctamente. HTTP 200.');
      },

      error: (error: HttpErrorResponse) => {
        this.mensaje.set(`Error HTTP: ${error.status}`);
      }
    });
  }
}
