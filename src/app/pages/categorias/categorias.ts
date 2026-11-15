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
  idEditando: number | null = null;
  guardando = signal(false);
  mensajeRegistro = signal('');
  mensajeError = signal('');
  errorRegistro = signal('');

  //Desactivaciones y reactivaciones
  mostrandoActivas = true;
  procesandoId = signal<number | null>(null);
  mensajeEstado = signal('');
  errorEstado = signal('');

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

    this.categoriaService.listarCategorias(pagina, this.mostrandoActivas).subscribe({
      next: (respuesta) => {
        this.cargando.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.error.set('No se pudieron obtener las categorías');
          return;
        }
        if (pagina > 0 && pagina >= respuesta.data.totalPages) {
          this.cargarCategorias(Math.max(0, respuesta.data.totalPages - 1));
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
  cambiarVista(activo: boolean): void {
    if (this.mostrandoActivas === activo || this.guardando() || this.cargando() || this.procesandoId() !== null) {
      return;
    }
    this.mostrandoActivas = activo;
    // Limpiar una posible edición anterior
    this.cancelarEdicion();
    this.mensajeEstado.set('');
    this.errorEstado.set('');
    this.cargarCategorias(0);
  }

  guardarCategoria(): void {
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
      this.errorRegistro.set('Se superó la longitud permitida.');
      return;
    }

    //identificar si se esta editando o creando
    const id = this.idEditando;

    //conservar la página actual cuando se termina de editar
    const paginaRecargar = id === null ? 0 : this.paginaActual();

    const peticion = id === null
      ? this.categoriaService.crearCategoria(categoria)
      : this.categoriaService.actualizarCategoria(id, categoria);

    this.guardando.set(true);

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);
        if (!respuesta.success || !respuesta.data) {
          this.errorRegistro.set('No se pudo registrar la categoría.');
          return;
        }

        this.cancelarEdicion();
        this.mensajeRegistro.set(respuesta.message);
        this.cargarCategorias(paginaRecargar);
      },

      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        const errores = err.error?.data;
        this.mensajeRegistro.set('');

        if (err.status === 400 && errores && typeof errores === 'object') {
          this.errorRegistro.set(Object.values(errores).join(' '));
        } else if (err.status === 403) {
          this.errorRegistro.set('No tienes permiso para guardar categorías.');
        } else if (err.status === 404) {
          this.errorRegistro.set('La categoría que intentas actualizar no existe');
        } else if (err.status === 0) {
          this.errorRegistro.set('No se pudo conectar con el servidor.');
        } else {
          this.errorRegistro.set(err.error?.message || 'Error al guardar la categoría.');
        }
      }
    });
  }

  editarCategoria(categoria: Categoria): void {
    if (!this.esAdmin() || this.guardando()) {
      return;
    }

    this.idEditando = categoria.id;
    this.nombre = categoria.nombre;
    this.descripcion = categoria.descripcion;

    this.mensajeRegistro.set('');
    this.errorRegistro.set('');
  }

  cancelarEdicion(): void {
    if (this.guardando()) {
      return;
    }

    this.idEditando = null;
    this.nombre = '';
    this.descripcion = '';
    this.mensajeError.set('');
    this.errorRegistro.set('');
  }

  desactivarCategoria(categoria: Categoria): void {
    if (!this.esAdmin() || this.guardando() || this.procesandoId() !== null) {
      return;
    }
    const confirmar = window.confirm(
      `¿Deseas desactivar la categoría "${categoria.nombre}"?`
    );
    if (!confirmar) {
      return;
    }
    this.mensajeEstado.set('');
    this.errorEstado.set('');
    this.procesandoId.set(categoria.id);
    this.categoriaService.desactivarCategoria(categoria.id).subscribe({

      next: (respuesta) => {
        this.procesandoId.set(null);
        if (!respuesta.success) {
          this.errorEstado.set(respuesta.message);
          return;
        }
        //Cancelar edición si corresponde
        if (this.idEditando === categoria.id) {
          this.cancelarEdicion();
        }
        this.mensajeEstado.set(respuesta.message);
        //Actualizar la página actual
        this.cargarCategorias(this.paginaActual());
      },

      error: (err: HttpErrorResponse) => {
        this.procesandoId.set(null);
        if (err.status === 409) {
          this.errorEstado.set(
            err.error?.message ||
            'No se puede desactivar una categoría con productos activos.'
          );
        } else if (err.status === 404) {
          this.errorEstado.set('La categoría no existe.');
        } else if (err.status === 403) {
          this.errorEstado.set('No tienes permisos para desactivar categorías.');
        } else if (err.status === 0) {
          this.errorEstado.set('No se pudo conectar con el servidor.');
        } else {
          this.errorEstado.set(err.error?.message || 'Error al desactivar la categoría.');
        }
      }
    });
  }

  reactivarCategoria(categoria: Categoria): void {
    if (!this.esAdmin() || this.guardando() || this.procesandoId() !== null) {
      return;
    }
    this.mensajeEstado.set('');
    this.errorEstado.set('');
    this.procesandoId.set(categoria.id);

    this.categoriaService.reactivarCategoria(categoria.id).subscribe({
      next: (respuesta) => {
        this.procesandoId.set(null);
        if (!respuesta.success || !respuesta.data) {
          this.errorEstado.set('No se pudo reactivar la categoría.');
          return;
        }

        this.mensajeEstado.set(respuesta.message);
        // Actualizar categorías inactivas
        this.cargarCategorias(this.paginaActual());
      },

      error: (err: HttpErrorResponse) => {
        this.procesandoId.set(null);
        if (err.status === 404) {
          this.errorEstado.set('La categoría no existe.');
        } else if (err.status === 403) {
          this.errorEstado.set('No tienes permisos para reactivar categorías.');
        } else if (err.status === 0) {
          this.errorEstado.set('No se pudo conectar con el servidor.');
        } else {
          this.errorEstado.set(err.error?.message || 'Error al reactivar la categoría.');
        }
      }
    });
  }
}
