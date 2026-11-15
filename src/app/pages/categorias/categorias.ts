import { Component, inject, OnInit, signal } from '@angular/core';
import { Categoria, CategoriaRequest, CategoriaService } from '../../services/categoriaService';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';

@Component({
  imports: [FormsModule],
  selector: 'app-categorias',
  styleUrl: './categorias.css',
  templateUrl: './categorias.html',
})
export class Categorias implements OnInit {
  private categoriaService = inject(CategoriaService);
  private auth = inject(AuthService);

  //Campos del listado
  categorias = signal<Categoria[]>([]);
  paginaActual = signal(0);
  totalPaginas = signal(0);
  cargando = signal(false);
  error = signal('');

  //Campos del formulario
  nombre = '';
  descripcion = '';
  guardando = signal(false);
  mensajeRegistro = signal('');
  mensajeError = signal('');
  errorRegistro = signal('');

  //Ejecución automática al cargar el componente
  ngOnInit(): void {
    this.cargarCategorias();
  }

  esAdmin(): boolean {
    return this.auth.usuario()?.roles.includes('ROLE_ADMIN') ?? false;
  }

  cargarCategorias(pagina: number = 0): void {
    this.cargando.set(true);
    this.error.set('');

    this.categoriaService.listarCategorias(pagina).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.error.set('No se pudieron obtener las categorías');
          return;
        }
        this.categorias.set(respuesta.data.content);
        this.paginaActual.set(respuesta.data.number);
        this.totalPaginas.set(respuesta.data.totalPages);
      },

      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.error.set(err.status === 0
          ? 'No se pudo conectar al servidor.'
          : err.error?.message || 'Error al obtener categorías.');
      }
    });
  }

  siguientePagina(): void {
    if (this.paginaActual() + 1 < this.totalPaginas()) {
      this.cargarCategorias(this.paginaActual() + 1);
    }
  }

  anteriorPagina(): void {
    if (this.paginaActual() > 0) {
      this.cargarCategorias(this.paginaActual() - 1);
    }
  }

  registrarCategoria(): void {
    if (this.cargando() || !this.esAdmin()) {
      return;
    }

    this.errorRegistro.set('');
    this.mensajeError.set('');

    const categoria: CategoriaRequest = {
      nombre: this.nombre.trim(),
      descripcion: this.descripcion.trim()
    }

    if (!categoria.nombre || !categoria.descripcion) {
      this.errorRegistro.set('Completa todos los campos.');
      return;
    }

    if (categoria.nombre.length > 100 || categoria.descripcion.length > 500) {
      this.errorRegistro.set('Uno de los campos supera la longitud permitida.');
      return;
    }

    this.guardando.set(true);

    this.categoriaService.crearCategoria(categoria).subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        if (!respuesta.success || !respuesta.data) {
          this.errorRegistro.set('No se pudo registrar la categoría.');
          return;
        }

        this.mensajeRegistro.set(respuesta.message);
        this.nombre = '';
        this.descripcion = '';
        this.cargarCategorias(0);
      },

      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        const errores = err.error?.data;

        if (err.status === 400 && errores && typeof errores === 'object') {
          this.errorRegistro.set(Object.values(errores).join(' '));
        } else if (err.status === 403) {
          this.errorRegistro.set('No tienes permiso para registrar categorías.');
        } else if (err.status === 0) {
          this.errorRegistro.set('No se pudo conectar con el servidor.');
        } else {
          this.errorRegistro.set(err.error?.message || 'Error al registrar la categoría.');
        }
      }
    });
  }
}
