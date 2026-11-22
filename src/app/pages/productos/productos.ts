import { Component, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { Producto, ProductoRequest, ProductoService } from '../../services/productoService';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/auth.service';
import { Categoria, CategoriaService } from '../../services/categoriaService';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  imports: [FormsModule],
  selector: 'app-productos',
  styleUrl: './productos.css',
  templateUrl: './productos.html',
})
export class Productos implements OnInit {
  private productoService = inject(ProductoService);
  private categoriaService = inject(CategoriaService);
  private auth = inject(AuthService);

  @ViewChild('dialogProducto') dialogProducto?: ElementRef<HTMLDialogElement>;

  //Listado y paginación
  productos = signal<Producto[]>([]);
  paginaActual = signal(0);
  totalPaginas = signal(0);
  cargando = signal(false);
  errorListado = signal('');

  //Categorías para mostrar nombres y llenar el formulario
  categorias = signal<Categoria[]>([]);
  categoriasActivas = signal<Categoria[]>([]);
  cargandoCategorias = signal(true);
  errorCategorias = signal('');

  //Búsqueda y filtros
  tipoBusqueda = 'nombre';
  busqueda = '';
  categoriaFiltro: number | null = null;
  busquedaAplicada = '';
  categoriaAplicada: number | null = null;
  mostrandoActivos = true;

  //Formulario para registrar y editar
  nombre = '';
  precio: number | null = null;
  stock: number | null = null;
  idCategoria: number | null = null;
  idEditando: number | null = null;
  guardando = signal(false);
  errorFormulario = signal('');

  //Mensajes y operaciones sobre el estado
  procesandoId = signal<number | null>(null);
  mensajeOperacion = signal('');
  errorOperacion = signal('');

  ngOnInit(): void {
    this.cargarProductos();
    this.cargarCategorias(true);
    this.cargarCategorias(false);
  }

  esAdmin(): boolean {
    return this.auth.usuario()?.roles.includes('ROLE_ADMIN') ?? false;
  }

  private obtenerMensajeError(err: HttpErrorResponse, mensajePorDefecto: string): string {
    if (err.status === 0) {
      return 'No se pudo conectar con el servidor.';
    }

    if (err.status === 403) {
      return 'No tienes permisos para realizar esta operación.';
    }

    const validaciones = err.status === 400 ? err.error?.data : null;

    if (validaciones && typeof validaciones === 'object' && !Array.isArray(validaciones)) {
      return Object.values(validaciones).join(' ');
    }

    return err.error?.message || mensajePorDefecto;
  }

  cargarProductos(pagina: number = 0): void {
    this.cargando.set(true);
    this.errorListado.set('');

    this.productoService.listarProductos(pagina, this.mostrandoActivos, this.busquedaAplicada, this.categoriaAplicada).subscribe({
      next: (respuesta) => {
        if (!respuesta.success || !respuesta.data) {
          this.cargando.set(false);
          this.errorListado.set('No se pudieron obtener los productos.');
          return;
        }

        //Volver a una página válida al desactivar o reactivar el último registro
        if (pagina > 0 && pagina >= respuesta.data.totalPages) {
          this.cargarProductos(Math.max(0, respuesta.data.totalPages - 1));
          return;
        }

        this.productos.set(respuesta.data.content);
        this.paginaActual.set(respuesta.data.number);
        this.totalPaginas.set(respuesta.data.totalPages);
        this.cargando.set(false);
      },

      error: (err: HttpErrorResponse) => {
        this.cargando.set(false);
        this.errorListado.set(this.obtenerMensajeError(err, 'Error al obtener productos.'));
      }
    });
  }

  //Cargar todas las páginas para no mostrar solo las primeras 3 categorías
  cargarCategorias(activo: boolean, pagina: number = 0, acumuladas: Categoria[] = []): void {
    this.categoriaService.listarCategorias(pagina, activo, '', 100).subscribe({
      next: (respuesta) => {
        if (!respuesta.success || !respuesta.data) {
          this.errorCategorias.set('No se pudieron obtener las categorías.');
          if (activo) this.cargandoCategorias.set(false);
          return;
        }

        const categorias = [...acumuladas, ...respuesta.data.content];

        if (pagina + 1 < respuesta.data.totalPages) {
          this.cargarCategorias(activo, pagina + 1, categorias);
          return;
        }

        //Se conservan ambas listas para identificar la categoría de los productos inactivos
        this.categorias.update(actuales => [...actuales.filter(categoria => categoria.activo !== activo), ...categorias]);

        if (activo) {
          this.categoriasActivas.set(categorias);
          this.cargandoCategorias.set(false);
        }
      },

      error: (err: HttpErrorResponse) => {
        this.errorCategorias.set(this.obtenerMensajeError(err, 'Error al obtener categorías.'));
        if (activo) this.cargandoCategorias.set(false);
      }
    });
  }

  nombreCategoria(id: number): string {
    return this.categorias().find(categoria => categoria.id === id)?.nombre ?? `Categoría ID ${id}`;
  }

  cambiarTipoBusqueda(tipo: string): void {
    this.tipoBusqueda = tipo;
    this.busqueda = '';
    this.categoriaFiltro = null;
  }

  buscarProductos(): void {
    if (this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.busquedaAplicada = this.tipoBusqueda === 'nombre' ? this.busqueda.trim() : '';
    this.categoriaAplicada = this.tipoBusqueda === 'categoria' ? this.categoriaFiltro : null;
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.cargarProductos(0);
  }

  limpiarBusqueda(): void {
    this.tipoBusqueda = 'nombre';
    this.busqueda = '';
    this.categoriaFiltro = null;
    this.buscarProductos();
  }

  cambiarVista(activo: boolean): void {
    if (this.mostrandoActivos === activo || this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.mostrandoActivos = activo;
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.cargarProductos(0);
  }

  cambiarPagina(desplazamiento: number): void {
    const nuevaPagina = this.paginaActual() + desplazamiento;

    if (!this.cargando() && nuevaPagina >= 0 && nuevaPagina < this.totalPaginas()) {
      this.cargarProductos(nuevaPagina);
    }
  }

  abrirFormulario(producto?: Producto): void {
    if (!this.esAdmin() || this.cargando() || this.guardando() || this.procesandoId() !== null || this.cargandoCategorias()) {
      return;
    }

    this.idEditando = producto?.id ?? null;
    this.nombre = producto?.nombre ?? '';
    this.precio = producto?.precio ?? null;
    this.stock = producto?.stock ?? null;
    this.idCategoria = producto?.idCategoria ?? null;
    this.errorFormulario.set('');
    this.mensajeOperacion.set('');
    this.errorOperacion.set('');

    this.dialogProducto?.nativeElement.showModal();
  }

  cerrarFormulario(): void {
    if (this.guardando()) {
      return;
    }

    this.dialogProducto?.nativeElement.close();
    this.limpiarFormulario();
  }

  cancelarDialogo(event: Event): void {
    if (this.guardando()) {
      event.preventDefault();
      return;
    }

    this.limpiarFormulario();
  }

  guardarProducto(): void {
    if (!this.esAdmin() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    this.errorFormulario.set('');

    const nombre = this.nombre.trim();
    const precio = this.precio;
    const stock = this.stock;
    const idCategoria = this.idCategoria;

    if (!nombre || precio === null || stock === null || idCategoria === null) {
      this.errorFormulario.set('Completa todos los campos.');
      return;
    }

    if (nombre.length > 150) {
      this.errorFormulario.set('El nombre no puede superar los 150 caracteres.');
      return;
    }

    if (!Number.isFinite(precio) || precio < 0.01 || precio > 99999999.99 || !/^\d+(\.\d{1,2})?$/.test(String(precio))) {
      this.errorFormulario.set('El precio debe ser mayor a 0 y tener como máximo 2 decimales.');
      return;
    }

    if (!Number.isInteger(stock) || stock < 0 || stock > 2147483647) {
      this.errorFormulario.set('El stock debe ser un número entero entre 0 y 2147483647.');
      return;
    }

    if (!this.categoriasActivas().some(categoria => categoria.id === idCategoria)) {
      this.errorFormulario.set('Selecciona una categoría activa.');
      return;
    }

    const producto: ProductoRequest = { nombre, precio, stock, idCategoria };
    const id = this.idEditando;
    const paginaRecargar = id === null ? 0 : this.paginaActual();

    const peticion = id === null
      ? this.productoService.crearProducto(producto)
      : this.productoService.actualizarProducto(id, producto);

    this.guardando.set(true);

    peticion.subscribe({
      next: (respuesta) => {
        this.guardando.set(false);

        if (!respuesta.success || !respuesta.data) {
          this.errorFormulario.set(respuesta.message || 'No se pudo guardar el producto.');
          return;
        }

        this.cerrarFormulario();
        this.mensajeOperacion.set(respuesta.message);
        this.cargarProductos(paginaRecargar);
      },

      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        this.errorFormulario.set(this.obtenerMensajeError(err, 'Error al guardar el producto.'));
      }
    });
  }

  cambiarEstadoProducto(producto: Producto): void {
    if (!this.esAdmin() || this.cargando() || this.guardando() || this.procesandoId() !== null) {
      return;
    }

    if (producto.activo && !window.confirm(`¿Deseas desactivar el producto "${producto.nombre}"?`)) {
      return;
    }

    const peticion: Observable<{ success: boolean; message: string }> = producto.activo
      ? this.productoService.desactivarProducto(producto.id)
      : this.productoService.reactivarProducto(producto.id);

    this.mensajeOperacion.set('');
    this.errorOperacion.set('');
    this.procesandoId.set(producto.id);

    peticion.subscribe({
      next: (respuesta) => {
        this.procesandoId.set(null);

        if (!respuesta.success) {
          this.errorOperacion.set(respuesta.message);
          return;
        }

        this.mensajeOperacion.set(respuesta.message);
        this.cargarProductos(this.paginaActual());
      },

      error: (err: HttpErrorResponse) => {
        this.procesandoId.set(null);
        this.errorOperacion.set(this.obtenerMensajeError(err, 'Error al cambiar el estado del producto.'));
      }
    });
  }

  private limpiarFormulario(): void {
    this.idEditando = null;
    this.nombre = '';
    this.precio = null;
    this.stock = null;
    this.idCategoria = null;
    this.errorFormulario.set('');
  }
}
