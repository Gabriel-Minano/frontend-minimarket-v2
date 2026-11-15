import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  imports: [FormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = '';
  password = '';

  error = signal('');
  cargando = signal(false);

  ingresar(): void {
    this.error.set('');
    this.cargando.set(true);

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        this.cargando.set(false);
        void this.router.navigateByUrl('/');
      },

      error: (err: unknown) => {
        this.cargando.set(false);

        if (err instanceof HttpErrorResponse){
          if (err.status === 0){
            this.error.set('No se pudo conectar con el servidor.');
          } else {
            this.error.set(err.error?.message || 'No fue posible iniciar sesión.');
          }
        } else {
          this.error.set('No fue posible iniciar sesión.');
        }
      }
    });
  }

}
