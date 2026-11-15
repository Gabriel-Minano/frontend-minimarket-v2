import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Categoria, CategoriaRequest, CategoriaService } from '../../services/categoriaService';
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

  @ViewChild('dialogCategoria') dialogCategoria?: ElementRef<HTMLDialogElement>;

  //Listado y paginación
  categorias = signal<Categoria[]>([]);
  paginaActual = signal(0);
  totalPaginas = signal(0);
  cargando = signal(false);
  errorListado = signal('');

  //Búsqueda y filtro
  busqueda = '';
  busquedaAplicada = '';
  mostrandoActivas = true;

  //Formulario para registrar y editar
  nombre = '';
  descripcion = '';
  idEditando: number | null = null;
  guardando = signal(false);
  errorFormulario = signal('');

  //Mensajes y operaciones sobre el estado
  procesandoId = signal<number | null>(null);
  mensajeOperacion = signal('');
  errorOperacion = signal('');

  ngOnInit(): void {
    this.cargarCategorias();
  }

  esAdmin(): boolean {
    return this.auth.usuario()?.roles.includes('ROLE_ADMIN') ?? false;
  }

  cargarCategorias(pagina: number = 0): void {
    this.cargando.set(true);
    this.errorListado.set('');

    this.categoriaService.listarCategorias(pagina, this.mostrandoActivas, this.busquedaAplicada).subscribe({
      next: (respuesta) => {
        if (!respuesta.success || !respuesta.data) {
          this.cargando.set(false);
          this.errorListado.set('No se pudieron obtener las categorías.');
          return;
        }

        //Volver a una página válida cuando se desactiva o reactiva el último registro
        if (pagina > 0 && pagina >= respuesta.data.totalPages) {
          this.cargarCategorias(Math.max(0, respuesta.data.totalPages - 1));
          return;
        }

        this.categorias.set(respuesta.data.content);
        this.paginaActual.set(respuesta.data.number);
        this.totalPaginas.set(respuesta.data.totalPages);
        this.cargando.set(false);
      },

      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorListado.set(this.obtenerMensajeError(err, 'Error al obtener categorías.'));
      }
    });
  }

  buscarCategorias(): void {
    if (this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.busquedaAplicada = this.busqueda.trim();
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.cargarCategorias(0);
  }

  limpiarBusqueda(): void {
    this.busqueda = '';
    this.buscarCategorias();
  }

  cambiarVista(activo: boolean): void {
    if (this.mostrandoActivas === activo || this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.mostrandoActivas = activo;
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.cargarCategorias(0);
  }

  cambiarPagina(desplazamiento: number): void {
    const nuevaPagina = this.paginaActual() + desplazamiento;

    if (!this.cargando() && nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.cargarCategorias(nuevaPagina);
    }
  }

  abrirFormulario(categoria?: Categoria): void {
    if (!this.esAdmin() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.idEditando = categoria?.id ?? null;
    this.nombre = categoria?.nombre ?? '';
    this.descripcion = categoria?.descripcion ?? '';
    this.errorFormulario.set('');
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');

    this.dialogCategoria?.nativeElement.showModal();
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.dialogCategoria?.nativeElement.close();
    this.limpiarFormulario();
  }

  cancelarDialogo(event: Event): void {
    if (this.guardando()) {
      event.preventDefault();
      return;
    }

    this.limpiarFormulario();
  }

  guardarCategoria(): void {
    if (!this.esAdmin() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.errorFormulario.set('');

    const categoria: CategoriaRequest = {
      nombre: this.nombre.trim(),
      descripcion: this.descripcion.trim()
    };

    if (!categoria.nombre || !categoria.descripcion) {
      this.errorFormulario.set('Completa todos los campos.');
      return;
    }

    if (categoria.nombre.length > 100 || categoria.descripcion.length > 500) {
      this.errorFormulario.set('Se superó la longitud permitida.');
      return;
    }

    const id = this.idEditando;
    const paginaRecargar = id === null ? 0 : this.paginaActual();

    const peticion = id === null
      ? this.categoriaService.crearCategoria(categoria)
      : this.categoriaService.actualizarCategoria(id, categoria);

    this.guardando.set(true);

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.errorFormulario.set('No se pudo guardar la categoría.');
          return;
        }

        this.cerrarFormulario();
        this.mensajeOperacion.set(respuesta.message);
        this.cargarCategorias(paginaRecargar);
      },

      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorFormulario.set(this.obtenerMensajeError(err, 'Error al guardar la categoría.'));
      }
    });
  }

  cambiarEstadoCategoria(categoria: Categoria): void {
    if (!this.esAdmin() || this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    if (categoria.activo && !window.confirm(`¿Deseas desactivar la categoría "${categoria.nombre}"?`)) {
      return;
    }

    const peticion: Observable<{ success: boolean; message: string }> = categoria.activo
      ? this.categoriaService.desactivarCategoria(categoria.id)
      : this.categoriaService.reactivarCategoria(categoria.id);

    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.procesandoId.set(categoria.id);

    peticion.subscribe({
      next: (respuesta) => {
        this.procesandoId.set(null);

        if (!respuesta.success) {
          this.errorOperacion.set(respuesta.message);
          return;
        }

        this.mensajeOperacion.set(respuesta.message);
        this.cargarCategorias(this.paginaActual());
      },

      error: (err: HttpErrorResponse) => {
        this.procesandoId.set(null);
        this.errorOperacion.set(this.obtenerMensajeError(err, 'Error al cambiar el estado de la categoría.'));
      }
    });
  }

  private limpiarFormulario(): void {
    this.idEditando = null;
    this.nombre = '';
    this.descripcion = '';
    this.errorFormulario.set('');
  }

  private obtenerMensajeError(err: HttpErrorResponse, mensajePorDefecto: string): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    if (err.status === 403) {
      return 'No tienes permisos para realizar esta operación.';
    }

    //Spring Boot devuelve las validaciones en data
    const validaciones = err.status === 400 ? err.error?.data : null;

    if (validaciones && typeof validaciones === 'object' && !Array.isArray(validaciones)) {
      return Object.values(validaciones).join(' ');
    }

    return err.error?.message || mensajePorDefecto;
  }
}
